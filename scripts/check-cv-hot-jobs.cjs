const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Execute the shipped TypeScript, including the provider, without generated app files.
const cache = new Map();
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (name) => name in mocks ? mocks[name]
    : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const base = "app/jobs/";
const { selectHotIds, rankHotCandidates, loadHotIds, saveHotIds, loadDismissedHotIds, saveDismissedHotIds, loadRotatedHotIds, saveRotatedHotIds, seedHotIds } = load(base + "java-react-jobs-hot.ts");
const { defaultApplicationState, loadApps, saveApps } = load("app/(page_routes)/cv/applications.ts");
const { readStoredJobs, writeStoredJobs } = load(base + "java-react-jobs-memory.ts");
const { jobPostingKey, matchesJobFilters, toJobRows } = load(base + "java-react-jobs-helpers.ts");
const { auditJobRows, jobCompanyKey } = load(base + "java-react-jobs-audit.ts");
const { HOT_LIMIT, HOT_ROTATED_STORAGE_KEY } = load(base + "java-react-jobs-constants.ts");

function row(id, rating = 9, overrides = {}) {
  return {
    index: Number(id) || 0, hot: false,
    job: {
      id, applicationSlug: `job-search/${id}`, company: `Company ${id}`, title: `Senior Engineer ${id}`,
      url: `https://example.com/jobs/${id}`, rating10: rating, listingStatus: "unknown",
      postedOn: "2026-10-20", initialStatus: "draft", firstSeen: "2026-10-21", lastSeen: "2026-10-24",
      initialPriority: 0, sourceNotes: "", nextStep: "", track: "Full Stack", stack: "React Python",
      ...overrides.job,
    },
    state: { ...defaultApplicationState(), ...overrides.state },
    ...(overrides.archiveReason ? { archiveReason: overrides.archiveReason } : {}),
  };
}
const rows = Array.from({ length: 35 }, (_, index) => row(String(index), 10 - index / 10));
assert.equal(HOT_LIMIT, 8, "The HOT queue has eight places");
assert.deepEqual(selectHotIds(rows, [], []), rows.slice(0, HOT_LIMIT).map(({ job }) => job.id));
assert.equal(rankHotCandidates(rows, [], []).length, rows.length, "The ranked backlog is not capped at the batch size");
assert.equal(selectHotIds(rows, ["14"], [])[0], "14", "Eligible personal picks retain priority");
assert.ok(!selectHotIds(rows, [], ["0"]).includes("0"));
assert.deepEqual(selectHotIds(rows, [], rows.map(({ job }) => job.id)), [], "Dismissed jobs must never reappear to fill the queue");
assert.deepEqual(selectHotIds([], [], []), []);
assert.deepEqual(selectHotIds(rows.slice(0, 2), [], []), ["0", "1"]);

// Rotation walks the complete backlog once, with an honest partial final batch.
const rotationHistory = [];
const rotationBatches = [];
for (;;) {
  const next = selectHotIds(rows, [], [], rotationHistory);
  if (!next.length) break;
  rotationBatches.push(next);
  rotationHistory.push(...next);
}
assert.deepEqual(rotationBatches.map((batch) => batch.length), [8, 8, 8, 8, 3]);
assert.deepEqual(rotationHistory, rows.map(({ job }) => job.id));
assert.equal(new Set(rotationHistory).size, rows.length, "Previous batches never reappear automatically");
assert.deepEqual(selectHotIds(rows, ["0"], [], ["0"]), rows.slice(1, 9).map(({ job }) => job.id), "A saved preference cannot revive a rotated job");

// Neither a preferred ID nor empty queue may revive old, reviewed, submitted, or poor-fit jobs.
for (const patch of [
  { job: { seen: true } }, { job: { listingStatus: "closed" } },
  { job: { postedOn: "2026-09-30" } },
  { job: { postedOn: undefined, firstSeen: "2026-10-24", lastSeen: "2026-10-24" } },
  { job: { postedOn: "2026-10-25" } }, { job: { rating10: 4.9 } },
  { job: { initialStatus: "applied" } }, { job: { url: "" } },
  { state: { appliedOn: "2026-10-22" } }, { archiveReason: "Outside October shortlist" },
  ...["applied", "archived", "rejected", "screening", "interviewing", "assessment", "offer"].map((status) => ({ state: { status } })),
]) {
  assert.deepEqual(selectHotIds([row("bad", 10, patch)], ["bad"], []), [], `Excluded personal pick: ${JSON.stringify(patch)}`);
}
assert.deepEqual(selectHotIds([row("threshold", 5)], [], []), ["threshold"], "Exactly 50% fit remains eligible");

const duplicatePosting = row("duplicate-url", 9.9, { job: { url: rows[0].job.url + "?source=duplicate" } });
const duplicateCompany = row("duplicate-company", 9.8, { job: { company: rows[0].job.company } });
const duplicateSelection = selectHotIds([...rows, duplicatePosting, duplicateCompany], ["duplicate-url"], []);
const duplicatesById = new Map([...rows, duplicatePosting, duplicateCompany].map((entry) => [entry.job.id, entry]));
assert.equal(new Set(duplicateSelection.map((id) => jobPostingKey(duplicatesById.get(id).job.url))).size, duplicateSelection.length);
assert.equal(new Set(duplicateSelection.map((id) => jobCompanyKey(duplicatesById.get(id).job.company))).size, duplicateSelection.length);
const reviewedDuplicate = { ...duplicatePosting, job: { ...duplicatePosting.job, seen: true } };
assert.ok(!selectHotIds([...rows, reviewedDuplicate], ["0"], []).includes("0"), "Reviewed posting aliases stay excluded");
const rotatedSelection = selectHotIds([...rows, duplicatePosting, duplicateCompany], ["duplicate-url", "duplicate-company"], [], ["0"]);
assert.ok(!rotatedSelection.some((id) => ["0", "duplicate-url", "duplicate-company"].includes(id)), "Rotated companies and posting aliases cannot return in a later batch");

const storage = new Map();
global.window = { localStorage: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
} };
saveHotIds(["14", "14"]);
saveDismissedHotIds(["0", "0"]);
saveRotatedHotIds(["1", "1"]);
assert.deepEqual(loadHotIds(), ["14"]);
assert.deepEqual(loadDismissedHotIds(), ["0"]);
assert.deepEqual(loadRotatedHotIds(), ["1"]);
const restoredIds = selectHotIds(rows, loadHotIds(), loadDismissedHotIds(), loadRotatedHotIds());
assert.equal(restoredIds[0], "14");
assert.ok(!restoredIds.includes("0"));
assert.ok(!restoredIds.includes("1"));
saveHotIds(rows.map(({ job }) => job.id));
assert.equal(loadHotIds().length, HOT_LIMIT);
saveRotatedHotIds(rows.map(({ job }) => job.id));
assert.equal(loadRotatedHotIds().length, rows.length, "Rotation history is not capped to a single HOT batch");
storage.set(HOT_ROTATED_STORAGE_KEY, JSON.stringify(["0", 123, null, "0", "1"]));
assert.deepEqual(loadRotatedHotIds(), ["0", "1"], "Malformed rotation entries are ignored and duplicates removed");
storage.set(HOT_ROTATED_STORAGE_KEY, "invalid JSON");
assert.deepEqual(loadRotatedHotIds(), [], "Corrupt browser history does not break the board");
saveHotIds(null);
saveDismissedHotIds([]);
saveRotatedHotIds([]);
assert.equal(loadHotIds(), null);
assert.deepEqual(loadDismissedHotIds(), []);
assert.deepEqual(loadRotatedHotIds(), []);

// Browser history participates after reload; catalog refreshes retain seen and submitted evidence.
const persistedSeen = row("persisted-seen", 9, { job: { company: "Bluelight Consulting", seen: true } });
const persistedFresh = row("persisted-fresh", 10, { job: { company: "Bluelight" } });
writeStoredJobs([persistedSeen.job, persistedFresh.job]);
const restoredJobs = readStoredJobs([
  { ...persistedSeen.job, seen: undefined, postedOn: "2026-10-23" }, persistedFresh.job,
]);
assert.equal(restoredJobs[0].seen, true);
assert.equal(restoredJobs[0].postedOn, "2026-10-23", "Local edits cannot overwrite fresh source metadata");
const restoredAudit = auditJobRows(toJobRows(restoredJobs, defaultApplicationState, new Set()));
assert.equal(restoredAudit.filter((entry) => !entry.archiveReason).length, 1, "Unreviewed company sibling remains in the backlog");
assert.deepEqual(selectHotIds(restoredAudit, [], []), [], "Reviewed company aliases cannot return to HOT");
saveApps({
  [rows[0].job.applicationSlug]: { ...defaultApplicationState(), status: "applied", notes: "CV sent earlier" },
  [rows[1].job.applicationSlug]: { ...defaultApplicationState(), stage: "", notes: "", priority: 0 },
});
const restoredApps = loadApps();
assert.equal(restoredApps[rows[0].job.applicationSlug].status, "applied");
assert.deepEqual(selectHotIds(toJobRows([rows[0].job], (job) => restoredApps[job.applicationSlug], new Set()), [], []), []);
const restoredBlankApp = restoredApps[rows[1].job.applicationSlug];
assert.equal(restoredBlankApp.stage, "", "Loading saved state preserves explicitly cleared stage");
assert.equal(restoredBlankApp.notes, "", "Loading saved state preserves explicitly cleared notes");
assert.equal(restoredBlankApp.priority, 0, "Loading saved state preserves zero priority");

// A deterministic provider fixture ensures live research cannot hide state/filter regressions.
const hookState = [];
let cursor = 0;
const effectDependencies = new Map();
let pendingEffects = [];
let stateChanged = false;
const applications = {};
const fixtureJobs = rows.map(({ job }) => ({
  ...job, nextStep: `Source stage ${job.id}`, sourceNotes: `Source notes ${job.id}`, initialPriority: 4,
}));
// The provider merges raw patches; loadApps-resolved explicit blanks must still win over source data.
applications[fixtureJobs[14].applicationSlug] = { status: "draft", notes: "User saved note" };
applications[fixtureJobs[13].applicationSlug] = restoredBlankApp;
const { JobBoardProvider } = load(base + "components/JavaReactJobsContext.tsx", {
  react: {
    createContext: () => ({ Provider: () => null }), useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useEffect: (effect, dependencies) => {
      const slot = cursor++;
      const previous = effectDependencies.get(slot);
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous[index]))) {
        effectDependencies.set(slot, dependencies);
        pendingEffects.push(effect);
      }
    },
    useState: (initial) => {
      const slot = cursor++;
      if (!(slot in hookState)) hookState[slot] = typeof initial === "function" ? initial() : initial;
      return [hookState[slot], (next) => {
        const value = typeof next === "function" ? next(hookState[slot]) : next;
        if (!Object.is(value, hookState[slot])) stateChanged = true;
        hookState[slot] = value;
      }];
    },
  },
  "../java-react-jobs-data": { createDefaultJobs: () => fixtureJobs.map((job) => ({ ...job })) },
  "../../(page_routes)/cv/useApplications": {
    useApplications: () => ({
      ready: true, raw: applications,
      get: (slug) => ({ ...defaultApplicationState(), ...applications[slug] }),
      update: (slug, patch) => { applications[slug] = { ...defaultApplicationState(), ...applications[slug], ...patch }; },
    }),
  },
});
function renderProvider(view = "active") {
  for (let pass = 0; pass < 10; pass++) {
    cursor = 0;
    pendingEffects = [];
    stateChanged = false;
    const board = JobBoardProvider({ children: null, view }).props.value;
    for (const effect of pendingEffects) effect();
    if (!stateChanged) return board;
  }
  assert.fail("Provider failed to settle after hydration");
}
function remountProvider() {
  hookState.length = 0;
  effectDependencies.clear();
  return renderProvider();
}
function providerHistorySnapshot() {
  const active = renderProvider();
  const archived = renderProvider("archive");
  return [...active.hotRows, ...active.rows, ...archived.rows]
    .map(({ job, state, archiveReason }) => ({ id: job.id, seen: job.seen, state: { ...state }, archiveReason }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
let board = renderProvider();
assert.equal(board.ready, true, "Provider restores browser state before actions are available");
assert.equal(board.hotRows.length, HOT_LIMIT);
assert.equal(board.remainingHotCount, rows.length - HOT_LIMIT);
assert.equal(board.auditCounts.total, rows.length);
const sparseSavedRow = board.rows.find(({ job }) => job.id === "14");
assert.equal(sparseSavedRow.state.notes, "User saved note", "Saved fields override source defaults");
assert.equal(sparseSavedRow.state.stage, "Source stage 14", "Sparse saved application preserves source stage");
assert.equal(sparseSavedRow.state.priority, 4, "Sparse saved application preserves source priority");
const blankSavedRow = board.rows.find(({ job }) => job.id === "13");
assert.equal(blankSavedRow.state.stage, "", "Explicit saved empty stage is retained");
assert.equal(blankSavedRow.state.notes, "", "Explicit saved empty notes are retained");
assert.equal(blankSavedRow.state.priority, 0, "Explicit saved zero priority is retained");

const firstBatch = [...board.hotIds];
const beforeReloadHistory = providerHistorySnapshot();
board = renderProvider();
assert.equal(board.reloadHot(), HOT_LIMIT);
board = renderProvider();
const secondBatch = [...board.hotIds];
assert.equal(secondBatch.length, HOT_LIMIT);
assert.ok(secondBatch.every((id) => !firstBatch.includes(id)), "Reload replaces every current HOT job");
assert.equal(board.remainingHotCount, rows.length - 2 * HOT_LIMIT);
assert.deepEqual(providerHistorySnapshot(), beforeReloadHistory, "Reload preserves Seen, notes, application history and archive membership for the entire backlog");
assert.deepEqual(loadRotatedHotIds(), firstBatch, "Reload persists the previous batch separately from dismissed jobs");
assert.deepEqual(loadHotIds(), secondBatch, "Reload persists the newly visible batch");
assert.deepEqual(loadDismissedHotIds(), [], "Reload does not dismiss jobs");
board = remountProvider();
assert.deepEqual(board.hotIds, secondBatch, "A browser remount restores the replacement batch");
assert.equal(board.remainingHotCount, rows.length - 2 * HOT_LIMIT);

const providerBatches = [firstBatch, secondBatch];
while (board.remainingHotCount) {
  const count = board.reloadHot();
  board = renderProvider();
  assert.equal(board.hotRows.length, count);
  providerBatches.push([...board.hotIds]);
}
assert.deepEqual(providerBatches.map((batch) => batch.length), [8, 8, 8, 8, 3]);
assert.equal(new Set(providerBatches.flat()).size, rows.length, "Provider rotation visits each eligible company once");
const finalBatch = [...board.hotIds];
assert.equal(board.reloadHot(), 0);
board = renderProvider();
assert.deepEqual(board.hotIds, finalBatch, "An exhausted reload leaves the current batch visible");
assert.deepEqual(providerHistorySnapshot(), beforeReloadHistory, "Exhausting the queue preserves every backlog record");
board = renderProvider();
board.resetHot();
board = renderProvider();
assert.deepEqual(board.hotIds, firstBatch, "Reset restarts the rotation");
assert.deepEqual(loadRotatedHotIds(), []);
assert.equal(board.remainingHotCount, rows.length - HOT_LIMIT);

board = renderProvider();
const skippedId = board.hotIds[0];
assert.equal(board.toggleHot(skippedId), true);
board = renderProvider();
assert.equal(board.hotRows.length, HOT_LIMIT, "Skipping promotes the next eligible company");
assert.ok(!board.hotIds.includes(skippedId));
const seenJob = board.hotRows[0].job;
board.updateJob(seenJob.id, { seen: true });
board = renderProvider();
assert.ok(!board.hotIds.includes(seenJob.id));
const submittedJob = board.hotRows[0].job;
board.updateApplication(submittedJob.applicationSlug, { status: "applied", notes: "CV already sent" });
board = renderProvider();
assert.ok(!board.hotIds.includes(submittedJob.id));
assert.equal(applications[submittedJob.applicationSlug].status, "applied", "Audit preserves the application status");
assert.equal(applications[submittedJob.applicationSlug].notes, "CV already sent");
const partialUpdateJob = board.hotRows[0].job;
board.updateApplication(partialUpdateJob.applicationSlug, { status: "screening" });
assert.equal(applications[partialUpdateJob.applicationSlug].stage, `Source stage ${partialUpdateJob.id}`, "First partial status change retains seeded stage");
assert.equal(applications[partialUpdateJob.applicationSlug].notes, `Source notes ${partialUpdateJob.id}`, "First partial status change retains seeded notes");
assert.equal(applications[partialUpdateJob.applicationSlug].priority, 4, "First partial status change retains seeded priority");
const archive = renderProvider("archive");
assert.equal(archive.hotRows.length, 0);
assert.ok(archive.rows.some(({ job }) => job.id === seenJob.id));
assert.ok(archive.rows.some(({ job }) => job.id === submittedJob.id));

board = renderProvider();
const beforeFilters = [...board.hotIds];
board.setQuery("no job can match this query 189273");
board.setTrackFilter("missing track");
board.setStatusFilter("rejected");
board.setMinRating(11);
board.setSortMode("board");
board = renderProvider();
assert.equal(board.rows.length, 0);
assert.deepEqual(board.hotRows.map(({ job }) => job.id), beforeFilters, "Ordinary filters never change the HOT queue");
board = renderProvider();
assert.equal(board.reloadHot(), HOT_LIMIT, "Filters do not prevent loading a full next batch");
board = renderProvider();
assert.equal(board.rows.length, 0);
assert.equal(board.hotRows.length, HOT_LIMIT);
assert.ok(board.hotIds.every((id) => !beforeFilters.includes(id)));
// Clear filters so the complete record snapshot remains comparable.
board.setQuery("");
board.setTrackFilter("all");
board.setStatusFilter("all");
board.setMinRating(0);
assert.equal(providerHistorySnapshot().length, rows.length, "Filtered reload leaves the complete catalog intact");

// Actual catalog verification does not assume research can fill every later batch.
const { createDefaultJobs } = load(base + "java-react-jobs-data.ts");
const catalog = auditJobRows(toJobRows(createDefaultJobs(), (job) => ({ ...defaultApplicationState(), status: job.initialStatus }), new Set()));
const catalogIds = selectHotIds(catalog, seedHotIds(), []);
assert.ok(catalogIds.length <= HOT_LIMIT);
const selectedCatalog = catalog.filter(({ job }) => catalogIds.includes(job.id));
assert.equal(new Set(selectedCatalog.map(({ job }) => jobCompanyKey(job.company))).size, selectedCatalog.length);
for (const selectedRow of selectedCatalog) {
  assert.ok(matchesJobFilters(selectedRow, { query: "", statusFilter: "all", trackFilter: "all", minRating: 0, view: "active" }));
  assert.match(selectedRow.job.postedOn, /^2026-10-/);
  assert.equal(selectedRow.state.status, "draft");
  assert.ok(selectedRow.job.rating10 >= 5);
}
console.log(`HOT checks passed: eight-job batches, complete backlog rotation, partial/exhausted batches, browser remount persistence, unchanged review history, company/URL dedupe, reset, filter independence, and ${catalogIds.length} initial catalog candidates.`);
