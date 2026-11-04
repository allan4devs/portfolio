"""Resumable checks of public company/careers pages for the Comp catalog.

Input: output/comp-expansion-candidates.json (Remote In Tech profile metadata).
Output: output/comp-expansion-checks.json. A reachable page is not a job guarantee.
"""
import concurrent.futures
import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/comp-expansion-checks.json"
CHECKED_ON = "2026-10-29"
TECH = {
    "Java": r"\bjava\b|\bspring(?: boot)?\b",
    "React": r"\breact(?:js|\.js)?\b|\bnext\.?js\b",
    "Python": r"\bpython\b|\bdjango\b|\bfastapi\b|\bflask\b",
    "Node.js": r"\bnode(?:js|\.js| js)\b|\bnest\.?js\b|\bexpress\.?js\b",
    "JavaScript": r"\bjavascript\b",
    "TypeScript": r"\btypescript\b",
}
ROLES = {
    "Full stack": r"\bfull[\s-]?stack\b",
    "Backend": r"\bback[\s-]?end\b",
    "Frontend": r"\bfront[\s-]?end\b",
}
LEVELS = {
    "Mid-level": r"\bmid[\s-]?(?:level|senior)\b|\bintermediate\b|\bsemi[\s-]?senior\b|\b(?:software|backend|frontend|full.stack) (?:engineer|developer) (?:ii|2)\b",
    "Junior": r"\bjunior\b|\bentry[\s-]level\b",
    "Senior": r"\bsenior\b|\bstaff (?:software|engineer)\b|\bprincipal (?:software|engineer)\b",
}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.links = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden += 1
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.text.append(data)


def safe_url(value):
    if not isinstance(value, str):
        return None
    try:
        url = urllib.parse.urlsplit(value)
        if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password:
            return None
        if url.hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return None
        return value
    except ValueError:
        return None


def fetch(url):
    url = safe_url(url)
    if not url:
        return {"url": url, "status": "invalid-url"}, None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; CompanyDirectoryResearch/1.0)"})
        with urllib.request.urlopen(req, timeout=9) as response:
            content = response.read(1_500_000).decode("utf-8", errors="replace")
            result = {"url": url, "finalUrl": response.url, "status": response.status,
                      "sha256": hashlib.sha256(content.encode()).hexdigest()}
        page = Page()
        page.feed(content)
        text = re.sub(r"\s+", " ", " ".join(page.text)).strip()
        result["characters"] = len(text)
        target = urllib.parse.urlsplit(result["finalUrl"])
        original = urllib.parse.urlsplit(url)
        target_host = (target.hostname or "").removeprefix("www.")
        original_host = (original.hostname or "").removeprefix("www.")
        non_employer_hosts = {"bamboohr.com", "jazzhr.com", "x.com", "twitter.com", "linkedin.com", "angel.co", "wellfound.com", "weworkremotely.com", "remoteok.com", "remoters.net", "welcometothejungle.com"}
        if target_host in non_employer_hosts and target_host != original_host:
            result["status"] = "non-employer-redirect"
        if re.search(r"domain (?:is )?for sale|buy this domain|this domain (?:is|may be) for sale|domain has expired", text, re.I):
            result["status"] = "parked-domain"
        return result, (text, page.links)
    except urllib.error.HTTPError as error:
        return {"url": url, "status": error.code}, None
    except Exception as error:
        return {"url": url, "status": "unreachable", "error": str(error)[:180]}, None


def matches(patterns, text):
    return [label for label, pattern in patterns.items() if re.search(pattern, text, re.I)]


def check(profile):
    requests = []
    careers = safe_url(profile.get("careersUrl"))
    if not careers:
        urls = re.findall(r"https?://[^\s)<>\]]+", profile.get("applyText", ""))
        careers = next((safe_url(url) for url in urls if re.search(r"career|jobs|greenhouse|lever|ashby|workable|join", url, re.I)), None)
    first = careers or profile["website"]
    result, parsed = fetch(first)
    requests.append(result)
    careers_text = parsed[0] if parsed and careers and result["status"] == 200 else ""
    if (not careers or not parsed or result["status"] != 200) and profile["website"].rstrip("/") != first.rstrip("/"):
        home_result, home = fetch(profile["website"])
        requests.append(home_result)
    else:
        home_result, home = result, parsed
    if not careers and home:
        href = next((link for link in home[1] if re.search(r"(?:careers?|jobs|join-us|join-our-team)(?:/|$|\?|#)", link, re.I)
                     and not re.search(r"linkedin|facebook|/blog|/posts|/articles|javascript:", link, re.I)), None)
        if href:
            careers = safe_url(urllib.parse.urljoin(home_result.get("finalUrl", profile["website"]), href))
            if careers:
                career_result, career_page = fetch(careers)
                requests.append(career_result)
                if career_page and career_result["status"] == 200:
                    careers_text = career_page[0]
    tech_text = " ".join(profile.get("technologies", [])) + " " + profile.get("techText", "")
    tech = matches(TECH, tech_text)
    live_tech = matches(TECH, careers_text)
    roles = matches(ROLES, tech_text + " " + careers_text)
    levels = matches(LEVELS, careers_text)
    active_pages = [item for item in requests if item["status"] == 200 and item.get("characters", 0) > 150]
    career_page = next((item for item in requests if item["url"] == careers), None)
    return {
        "slug": profile["slug"], "checkedOn": CHECKED_ON, "requests": requests,
        "careersUrl": careers, "careersStatus": career_page["status"] if career_page else "not-found",
        "reachable": bool(active_pages), "parked": any(item["status"] == "parked-domain" for item in requests),
        "technologies": list(dict.fromkeys(tech + live_tech)), "profileTechnologies": tech,
        "careersTechnologies": live_tech, "roles": roles, "levels": levels,
        "signalSource": careers if careers_text else profile["source"],
    }


def main():
    profiles = json.loads((ROOT / "output/comp-expansion-candidates.json").read_text(encoding="utf-8"))
    saved = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else []
    by_slug = {row["slug"]: row for row in saved}
    remaining = [profile for profile in profiles if profile["slug"] not in by_slug]
    print(f"Checking {len(remaining)} profiles; {len(saved)} cached.", flush=True)
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        futures = {pool.submit(check, profile): profile for profile in remaining}
        for future in concurrent.futures.as_completed(futures):
            profile = futures[future]
            try:
                by_slug[profile["slug"]] = future.result()
            except Exception as error:
                by_slug[profile["slug"]] = {"slug": profile["slug"], "error": str(error), "reachable": False}
            if len(by_slug) % 25 == 0 or len(by_slug) == len(profiles):
                OUTPUT.write_text(json.dumps(list(by_slug.values()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                print(f"{len(by_slug)}/{len(profiles)} checked; {sum(bool(row.get('reachable')) for row in by_slug.values())} reachable; {time.monotonic()-started:.0f}s", flush=True)


if __name__ == "__main__":
    main()
