const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { generationJob, extractGenerationJobs } = require("./import-mongo-job-backlog.cjs");

const cache = new Map();
function load(file) {
  const filename = path.resolve(__dirname, "..", file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localRequire = (name) => name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}
const base = "app/jobs/";
const { mergeJobSources } = load(base + "java-react-jobs-merge.ts");
const { resolveJobApplication } = load(base + "java-react-jobs-applications.ts");
const { defaultApplicationState } = load("app/(page_routes)/cv/applications.ts");
const { readStoredJobs, writeStoredJobs } = load(base + "java-react-jobs-memory.ts");
const { jobPostingKey } = load(base + "java-react-jobs-helpers.ts");
const { JOBS_STORAGE_KEY } = load(base + "java-react-jobs-constants.ts");
const { MONGO_BACKLOG_JOBS, MONGO_BACKLOG_IMPORT_STATS } = load(base + "data/job-mongo-imports.ts");

const fixture = {
  _id: "one", ownerId: "private-owner", sourceSnapshot: { email: "private@example.com" }, result: { privateCv: "private-result" },
  status: "error", title: "Generating CV", company: null, createdAt: "2026-10-02T05:08:44.341Z",
  jobDescription: "Banner\nExample Co Logo\nSenior Backend Engineer\nRemote - Costa Rica\nRequirements: Java, React and Python.\nhttps://example.com/privacy-policy/",
};
const extracted = generationJob(fixture);
assert.equal(extracted.company, "Example Co");
assert.equal(extracted.title, "Senior Backend Engineer");
assert.equal(extracted.url, "", "A privacy-policy link is not a job posting");
assert.equal(extracted.postedOn, undefined, "Generation date is never a publication date");
assert.equal(extracted.initialStatus, "draft", "CV generation errors do not become rejected applications");
assert.equal(extracted.firstSeen, "2026-10-02");
assert.ok(!/private-owner|private@example|private-result/.test(JSON.stringify(extracted)), "Only job metadata is imported");
assert.equal(generationJob({ _id: "bad", jobDescription: "No identifiable target" }), null);
const duplicate = { ...fixture, _id: "two", createdAt: "2026-10-03T00:00:00Z", jd: { title: extracted.title, company: extracted.company, keywords: [{ term: "Java" }] } };
const extractedJobs = extractGenerationJobs([duplicate, fixture]);
assert.equal(extractedJobs.length, 1);
assert.equal(extractedJobs[0].sourceIds.length, 2);
assert.deepEqual(extractedJobs, extractGenerationJobs([fixture, duplicate]), "Repeat import order cannot change identities");

const job = (id, patch = {}) => ({ ...extracted, id, applicationSlug: `job-search/${id}`, sourceIds: undefined, company: "Example Co", url: `https://example.com/jobs/${id}`, ...patch });
const original = job("original", { sourceNotes: "Original recruiter note" });
const other = job("other", { url: original.url + "?utm_source=copy", initialStatus: "applied", seen: true, sourceNotes: "Imported application note" });
const originals = JSON.stringify([original, other]);
const merged = mergeJobSources([original], [other]);
assert.equal(merged.length, 1);
assert.equal(merged[0].id, "original");
assert.equal(merged[0].applicationSlug, "job-search/original");
assert.ok(merged[0].applicationAliases.includes("job-search/other"));
assert.deepEqual(merged[0].sourceIds, ["original", "other"]);
assert.equal(merged[0].initialStatus, "applied");
assert.equal(merged[0].seen, true);
assert.match(merged[0].sourceNotes, /Original recruiter note/);
assert.match(merged[0].sourceNotes, /Imported application note/);
assert.equal(JSON.stringify([original, other]), originals, "Source data is immutable");
assert.equal(mergeJobSources([job("a")], [job("b")]).length, 2, "Distinct posting URLs at one company remain distinct jobs");
const linked = mergeJobSources([job("blank", { url: "" })], [job("linked")]);
assert.equal(linked.length, 1);
assert.equal(linked[0].url, "https://example.com/jobs/linked");

const canonical = merged[0];
const apps = {
  [canonical.applicationSlug]: { ...defaultApplicationState(), updatedOn: "2026-10-23", notes: "New draft" },
  "job-search/other": { ...defaultApplicationState(), status: "applied", appliedOn: "2026-10-02", notes: "Already sent the CV", updatedOn: "2026-10-02" },
};
const resolved = resolveJobApplication(canonical, apps, defaultApplicationState());
assert.equal(resolved.status, "applied", "An alias retains submission history even when another source is a draft");
assert.equal(resolved.appliedOn, "2026-10-02");
assert.equal(resolved.notes, "Already sent the CV");
const cleared = resolveJobApplication(job("blank"), { "job-search/blank": { notes: "", stage: "", priority: 0 } }, defaultApplicationState());
assert.equal(cleared.notes, "");
assert.equal(cleared.stage, "");
assert.equal(cleared.priority, 0);

const storage = new Map();
global.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
writeStoredJobs([job("original", { url: "" }), job("other", { url: "", seen: true, company: "Edited employer" })]);
const restored = readStoredJobs([canonical])[0];
assert.equal(restored.seen, true, "Seen flags from merged source IDs survive catalog refresh");
assert.equal(restored.url, canonical.url, "An old blank stored URL cannot erase a recovered posting link");
assert.ok(storage.get(JOBS_STORAGE_KEY));

const { createDefaultJobs } = load(base + "java-react-jobs-data.ts");
const catalog = createDefaultJobs();
const sourceFiles = [
  [base + "data/job-search-records.ts", "JOB_SEARCH_RECORDS"],
  [base + "data/job-search-new.ts", "NEW_JOB_SEARCH_RECORDS"],
  [base + "data/job-search-october-2026.ts", "OCTOBER_2026_JOB_SEARCH_RECORDS"],
  [base + "java-react-jobs-researched.ts", "RESEARCHED_JOBS"],
];
const sources = [...sourceFiles.flatMap(([file, key]) => load(file)[key]), ...load(base + "java-react-jobs-cv.ts").createCvBacklogJobs(), ...MONGO_BACKLOG_JOBS];
const sourceIds = new Set(catalog.flatMap((entry) => entry.sourceIds));
for (const entry of sources) assert.ok(sourceIds.has(entry.id), `Missing source job ${entry.id}`);
assert.equal(new Set(catalog.map((entry) => entry.id)).size, catalog.length);
const postings = catalog.map((entry) => jobPostingKey(entry.url)).filter(Boolean);
assert.equal(new Set(postings).size, postings.length, "Every normalized posting URL appears once");
for (const entry of MONGO_BACKLOG_JOBS) {
  assert.equal(entry.postedOn, undefined);
  assert.equal(entry.listingStatus, "unknown");
  assert.ok(catalog.some((candidate) => candidate.sourceIds.includes(entry.id)));
}
assert.equal(MONGO_BACKLOG_IMPORT_STATS.distinctJobs, MONGO_BACKLOG_JOBS.length);
assert.ok(!/ownerId|sourceSnapshot|"calls"|"result"/.test(fs.readFileSync(path.resolve(__dirname, "..", base, "data/job-mongo-imports.ts"), "utf8")));
console.log(`Backlog import checks passed: ${sources.length} source targets consolidated into ${catalog.length} postings, all source identities retained, safe Mongo extraction, duplicate merging and browser history migration.`);
