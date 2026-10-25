"""List every job lead from the /jobs app in the mundial project.

Job sources include the TypeScript catalog, CV targets and a sanitized Mongo snapshot:
  - data/job-search-records.ts   (imported from the Master Jobs worksheet)
  - data/job-search-new.ts       (new direct-company leads)
  - data/job-search-october-2026.ts (source-dated October shortlist leads)
  - java-react-jobs-researched.ts (LinkedIn Java + React search results)
  - java-react-jobs-cv.ts (company-specific CV targets)
  - data/job-mongo-imports.ts (refresh with import-mongo-job-backlog.cjs)
The script prints the same merged records as the board, retaining source aliases.

Each job also gets rating10 / ratingReason (data/job-ratings.ts, built by
scripts/rate_jobs.py) and hot (committed seed in data/hot-jobs.ts; the board's
browser override is not visible here).

Usage:  python scripts/get_jobs.py [--json] [--csv jobs.csv]
"""
import csv, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JOBS = ROOT / "app" / "jobs"
SOURCES = [
    ("worksheet", JOBS / "data" / "job-search-records.ts", "JOB_SEARCH_RECORDS"),
    ("new", JOBS / "data" / "job-search-new.ts", "NEW_JOB_SEARCH_RECORDS"),
    ("october2026", JOBS / "data" / "job-search-october-2026.ts", "OCTOBER_2026_JOB_SEARCH_RECORDS"),
    ("linkedin", JOBS / "java-react-jobs-researched.ts", "RESEARCHED_JOBS"),
    ("cv", JOBS / "java-react-jobs-cv.ts", "createCvBacklogJobs"),
    ("mongo", JOBS / "data" / "job-mongo-imports.ts", "MONGO_BACKLOG_JOBS"),
]

NODE = """
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const localRequire = (name) => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}
const [file, name] = process.argv.slice(1), value = load(file)[name];
process.stdout.write(JSON.stringify(typeof value === 'function' ? value() : value ?? []));
"""

def load(file, name):
    out = subprocess.run(["node", "--no-warnings", "-e", NODE, str(file), name],
                         capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)

RATINGS = JOBS / "data" / "job-ratings.ts"
HOT = JOBS / "data" / "hot-jobs.ts"


def load_optional(file, name, default):
    return load(file, name) if file.exists() else default


def main():
    hot = set(load_optional(HOT, "HOT_JOB_IDS", []))
    jobs = load(JOBS / "java-react-jobs-data.ts", "createDefaultJobs")
    for job in jobs:
        job["source"] = job.get("sources", "")
        job["hot"] = job["id"] in hot or bool(set(job.get("sourceIds", [])) & hot)
    if "--json" in sys.argv:
        print(json.dumps(jobs, indent=2, ensure_ascii=False)); return
    if "--csv" in sys.argv:
        path = sys.argv[sys.argv.index("--csv") + 1]
        keys = sorted({k for j in jobs for k in j})
        with open(path, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.DictWriter(fh, fieldnames=keys); w.writeheader(); w.writerows(jobs)
        print(f"Wrote {len(jobs)} jobs to {path}"); return
    print(f"{len(jobs)} consolidated jobs found\n")
    for j in jobs:
        score = j.get("matchScore", j.get("match", ""))
        rating = "-" if j["rating10"] is None else f"{j['rating10']:g}/10"
        flag = " HOT" if j["hot"] else ""
        print(f"[{j['source']}]{flag} {j.get('company')} | {j.get('title')} | {score} | rating {rating} | {j.get('url')}")

if __name__ == "__main__":
    main()
