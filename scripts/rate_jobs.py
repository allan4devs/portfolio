"""Rate every /jobs job lead from 0 to 10 and write job-ratings.ts.

Deterministic, rule-based scoring (no network, no randomness) so every score can
be reviewed. Inputs are the same catalog/CV/Mongo sources get_jobs.py reads. Output:
  app/jobs/data/job-ratings.ts   JOB_RATINGS keyed by job id
  app/jobs/data/hot-jobs.ts      only with --seed-hot (audited October top 8)

Scoring (start at 1, clamp to 0-10, round to 0.5; a perfect job reaches 10):
  Location   Costa Rica explicit +3 | LATAM/Americas +2.5 | global remote +1.5 |
             CR "verify/confirm" +1 | US-only -3.5 | other region-locked -3 |
             onsite/hybrid city outside Costa Rica -3 | location unknown 0
  Stack      Java, React, Node.js, Python: +1 each when in the title, +0.5 when
             only in the stack/track; TypeScript +0.5; capped at +3.
             Off-stack title (.NET, Go, Kotlin, Ruby, PHP...) -1
  Role       full-stack +2 | back-end / front-end +1.5 | generic software eng +1 |
             non-core (data, QA, DevOps, mobile, manager...) -2
  Level      senior +1 | mid +0.75 | not stated +0.25 | staff/principal/lead 0 |
             junior/intern -2
  Flags      "Geography restricted"/"excludes Costa Rica" -2; "likely closed" -1
Closed jobs (Rejected/Archived/Closed) keep their score; the page ranks them
below active ones, and the HOT seed skips them.

Usage:  python scripts/rate_jobs.py [--seed-hot] [--top N]
"""
import json, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from get_jobs import JOBS, SOURCES, load  # noqa: E402

OUT = JOBS / "data" / "job-ratings.ts"
HOT = JOBS / "data" / "hot-jobs.ts"
CLOSED = {"rejected", "archived", "closed", "withdrawn"}
NOT_APPLIED = {"", "not applied", "needs review", "interested", "check status"}
LATAM = r"latam|latin america|south america|americas|central america"
GLOBAL = r"global|worldwide|anywhere|remote worldwide"
LATAM_COUNTRIES = r"brazil|mexico|chile|argentina|peru|colombia|uruguay|ecuador|venezuela|bolivia|paraguay|guatemala|panama|el salvador|honduras|nicaragua|dominican"
OTHER_REGIONS = r"emea|europe|eea|\buk\b|united kingdom|india|singapore|canada|france|germany|spain|portugal|poland|philippines|australia|ontario"
US_ONLY = r"\bus only\b|\busa only\b|united states only|us-based|u\.s\. only|must (?:be|reside) in the (?:us|united states)|\bunited states\b"


def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def url_key(url):
    url = (url or "").strip().lower().split("?")[0].split("#")[0].rstrip("/")
    m = re.search(r"linkedin\.com/jobs/view/(?:[^/]*-)?(\d+)", url)
    return f"linkedin:{m.group(1)}" if m else re.sub(r"^https?://(www\.)?", "", url)


def status_of(job):
    return (job.get("sourceStatus") or job.get("status") or "").strip().lower()


def location_score(job):
    place = norm(" ".join(job.get(k) or "" for k in ("eligibility", "locationFit", "location", "title")))
    flags = norm(job.get("preferenceExclusion"))
    mode = norm(job.get("workMode"))
    linkedin = job["source"] == "linkedin"
    if re.search(r"not eligible|excludes costa rica|costa rica not|not costa rica", place):
        return -3, "Costa Rica excluded"
    if re.search(US_ONLY, place):
        return -3.5, "US-only"
    if "costa rica" in place or re.search(r"\b(heredia|alajuela|san jose|escazu|cartago|guanacaste)\b", place):
        if re.search(r"verify costa rica|confirm costa rica|verify cr", place):
            return 1, "LATAM, Costa Rica to confirm"
        return 3, "Costa Rica eligible"
    if re.search(LATAM, place):
        if "geography restricted" in flags:
            return 0.5, "LATAM but geography-restricted"
        return 2.5, "LATAM remote"
    if re.search(GLOBAL, place):
        return 1.5, "Global remote"
    if re.search(OTHER_REGIONS, place):
        return -3, "Region-locked outside LATAM"
    if re.search(LATAM_COUNTRIES, place):
        if linkedin or "hybrid" in mode or "onsite" in mode:
            return -3, "City-based outside Costa Rica"
        return 0.5, "Single LATAM country"
    if not norm(" ".join(job.get(k) or "" for k in ("eligibility", "locationFit", "location"))):
        return 0, "Location unknown"
    return -1, "Location unclear"


STACKS = (("Java", r"\bjava\b(?!script)"), ("React", r"\breact|\bnext ?js\b|\bremix\b"), ("Node", r"\bnode|nestjs|express"), ("Python", r"\bpython|django|fastapi|flask"))
OFF_STACK = r"\bnet\b|c#|dotnet|\bgo\b|golang|kotlin|ruby|rails|php|laravel|scala|swift|rust|elixir|salesforce|\bsap\b"


def stack_score(title, text):
    hits, score = [], 0.0
    for name, rx in STACKS:
        if re.search(rx, title):
            hits.append(name); score += 1
        elif re.search(rx, text):
            hits.append(name); score += 0.5
    if re.search(r"typescript|\bts\b", text):
        score += 0.5
    score = min(3.0, score)
    if re.search(OFF_STACK, title):
        score -= 1
        hits.append("off-stack title")
    return score, "+".join(hits) if hits else "stack unclear"


def role_score(title, text):
    if re.search(r"data (?:engineer|scientist|analyst)|\bqa\b|quality|devops|\bsre\b|manager|designer|sales|support|mobile|android|\bios\b|react native|machine learning engineer|security", title):
        return -2, "non-core role"
    if re.search(r"full ?stack|fullstack", title):
        return 2, "full-stack"
    if re.search(r"back ?end|front ?end", title):
        return 1.5, "back-end" if re.search(r"back ?end", title) else "front-end"
    if re.search(r"full ?stack|fullstack", text):
        return 2, "full-stack"
    if re.search(r"java|python|node|react", title):
        return 1.5, "stack-specific eng"
    if re.search(r"software|developer|engineer|programador|desarrollador", title):
        return 1, "software eng"
    return 0, "role unclear"


def level_score(text):
    if re.search(r"junior|\bjr\b|intern|trainee|graduate", text):
        return -2, "junior"
    if re.search(r"staff|principal|\blead\b|\barchitect\b|director|head of", text):
        return 0, "lead/staff"
    if re.search(r"senior|\bsr\b|\biii\b", text):
        return 1, "senior"
    if re.search(r"\bmid\b|middle|semi|\bssr\b|\bii\b", text):
        return 0.75, "mid"
    return 0.25, "level not stated"


def rate(job):
    title = norm(job.get("title"))
    text = norm(" ".join(job.get(k) or "" for k in ("title", "track", "stack", "seniority")))
    flags = norm(job.get("preferenceExclusion"))
    parts = [location_score(job), stack_score(title, text), role_score(title, text), level_score(text)]
    score = 1 + sum(p[0] for p in parts)
    notes = [p[1] for p in parts if p[1]]
    if re.search(r"geography restricted|excludes costa rica", flags) and parts[0][0] > 0:
        score -= 2
        notes.append("geo flag")
    if "likely closed" in flags:
        score -= 1
        notes.append("likely closed")
    if status_of(job) in CLOSED:
        notes.append(status_of(job))
    score = max(0.0, min(10.0, round(score * 2) / 2))
    return score, "; ".join(notes)


def dedupe(jobs):
    """LinkedIn rows that already exist in the worksheet/new sources (same URL or company+role)."""
    seen_urls, seen_names, dupes = set(), set(), set()
    for job in jobs:
        if job["source"] != "linkedin":
            if job.get("url"):
                seen_urls.add(url_key(job["url"]))
            seen_names.add((norm(job.get("company")), norm(job.get("title"))))
    for job in jobs:
        if job["source"] == "linkedin":
            key = (norm(job.get("company")), norm(job.get("title")))
            if url_key(job.get("url")) in seen_urls or key in seen_names:
                dupes.add(job["id"])
            seen_urls.add(url_key(job.get("url")))
            seen_names.add(key)
    return dupes


def ts_string(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    jobs = []
    for source, file, name in SOURCES:
        for job in load(file, name):
            job["source"] = source
            jobs.append(job)
    dupes = dedupe(jobs)
    ratings = {job["id"]: rate(job) for job in jobs}

    lines = [
        "// Generated by scripts/rate_jobs.py. Do not hand-edit; rerun the script instead.",
        "// Deterministic 0-10 fit score per job id (location, stack, role, level).",
        "",
        "export type JobRating = { rating10: number; ratingReason: string };",
        "",
        "export const JOB_RATINGS: Readonly<Record<string, JobRating>> = {",
    ]
    for job_id, (score, reason) in ratings.items():
        lines.append(f"  {ts_string(job_id)}: {{ rating10: {score:g}, ratingReason: {ts_string(reason)} }},")
    lines += ["};", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")

    visible = [j for j in jobs if j["id"] not in dupes]
    ranked = sorted(visible, key=lambda j: (status_of(j) in CLOSED, -ratings[j["id"]][0], j["id"]))
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 15
    print(f"Rated {len(ratings)} jobs ({len(dupes)} LinkedIn duplicates hidden on the page) -> {OUT.relative_to(JOBS.parent.parent)}")
    for j in ranked[:top]:
        score, reason = ratings[j["id"]]
        print(f"{score:>4g}  {j['id']:<11} {j.get('company')} | {j.get('title')} | {status_of(j) or '-'} | {reason}")

    if "--seed-hot" in sys.argv:
        # Reuse the board's policy so a later refresh cannot reintroduce old/applied jobs.
        report = subprocess.run(
            ["node", str(Path(__file__).with_name("check-cv-job-audit.cjs")), "--report"],
            capture_output=True, text=True, encoding="utf-8", check=True)
        hot = json.loads(report.stdout)["selectedRows"][:8]
        body = "\n".join(f"  {ts_string(j['id'])}, // {j['company']} - {j['title']} ({j['fit']}%)" for j in hot)
        HOT.write_text(
            "// Generated by scripts/rate_jobs.py --seed-hot using the October 2026 audit.\n"
            "// Up to 8 new postings, one per company; browser history can reduce this list.\n\n"
            f"export const HOT_JOB_IDS: readonly string[] = [\n{body}\n];\n",
            encoding="utf-8", newline="\n")
        print("\nSeeded HOT jobs:")
        for j in hot:
            print(f"  {j['id']} {j['company']} | {j['title']} ({j['fit']}%)")


if __name__ == "__main__":
    main()
