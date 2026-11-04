"""Read discovered employers' public ATS feeds; retain engineering-role metadata only."""
import concurrent.futures
import html
import json
import re
import urllib.request
from pathlib import Path
import importlib.util
_spec = importlib.util.spec_from_file_location("comp_research", Path(__file__).with_name("research-comp-expansion.py"))
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
TECH, ROLES, LEVELS, matches = _module.TECH, _module.ROLES, _module.LEVELS, _module.matches

ROOT = Path(__file__).resolve().parents[1]


def check(board):
    token = board["board"]
    host = board["host"]
    if "greenhouse" in host:
        api = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
    elif "lever" in host:
        api = f"https://api.lever.co/v0/postings/{token}?mode=json"
    else:
        api = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
    try:
        req = urllib.request.Request(api, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.loads(response.read(20_000_000))
        jobs = payload if isinstance(payload, list) else payload.get("jobs", [])
        selected = []
        for job in jobs:
            if job.get("isListed") is False:
                continue
            title = job.get("title") or job.get("text") or ""
            if not re.search(r"engineer|developer|desarrollador|programmer|full.?stack|front.?end|back.?end", title, re.I):
                continue
            description = job.get("descriptionPlain") or job.get("description") or job.get("content") or ""
            if "lever" in host:
                description += " ".join(item.get("content", "") for item in job.get("lists", []))
            text = re.sub(r"<[^>]+>", " ", html.unescape(description))
            technologies = matches(TECH, title + " " + text)
            if not any(tech in technologies for tech in ("Java", "React", "Python", "Node.js", "JavaScript", "TypeScript")):
                continue
            location = job.get("location", "")
            if isinstance(location, dict):
                location = location.get("name", "")
            if "lever" in host:
                location = job.get("categories", {}).get("location", "")
            url = job.get("absolute_url") or job.get("hostedUrl") or job.get("jobUrl") or ""
            levels = matches(LEVELS, title)
            # Seniority is derived from the title only: mentioning senior colleagues does not make a role senior.
            selected.append({
                "id": "ats-" + str(job.get("id") or url.rsplit("/", 1)[-1]),
                "title": title, "location": location, "url": url,
                "workMode": "Remote" if job.get("isRemote") else job.get("workplaceType") or "Check posting",
                "stack": ", ".join(technologies), "technologies": technologies,
                "roles": matches(ROLES, title), "levels": levels,
                "listingStatus": "Listed on employer board when checked", "checkedOn": "2026-10-29",
                "sourceNotes": "Employer ATS listing; country eligibility and availability must be checked in the posting.",
            })
        selected.sort(key=lambda job: ("Mid-level" not in job["levels"], "Senior" in job["levels"], job["title"]))
        return {**board, "api": api, "status": 200, "totalBoardJobs": len(jobs), "jobs": selected, "checkedOn": "2026-10-29"}
    except Exception as error:
        return {**board, "api": api, "error": str(error), "jobs": []}


if __name__ == "__main__":
    boards = json.loads((ROOT / "output/comp-ats-boards.json").read_text(encoding="utf-8"))
    output = ROOT / "output/comp-role-checks.json"
    previous = json.loads(output.read_text(encoding="utf-8")) if output.exists() else []
    cache = {(row["host"], row["board"]): row for row in previous}
    pending = [board for board in boards if (board["host"], board["board"]) not in cache]
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        fresh = list(pool.map(check, pending))
    for row in fresh:
        cache[(row["host"], row["board"])] = row
    results = [cache[(board["host"], board["board"])] for board in boards]
    output.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Checked {len(results)} boards; {sum(r.get('status') == 200 for r in results)} readable; {sum(len(r['jobs']) for r in results)} matching engineering roles.")
