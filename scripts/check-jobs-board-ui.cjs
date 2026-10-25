const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Inspect the shipped screen's JSX and event handlers without a browser or DOM.
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

function* elements(node) {
  if (Array.isArray(node)) {
    for (const child of node) yield* elements(child);
  } else if (node && typeof node === "object" && node.props) {
    yield node;
    yield* elements(node.props.children);
  }
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node == null || typeof node === "boolean") return "";
  return typeof node === "object" ? text(node.props?.children) : String(node);
}
const find = (tree, predicate) => [...elements(tree)].find(predicate);
const section = (tree, label) => find(tree, (node) => node.type === "section" && node.props["aria-label"] === label);
const button = (tree, label) => find(tree, (node) => node.type === "button" && text(node).trim() === label);
const noOp = () => {};
function JobRow() {}
function Stat() {}
const row = (index, prefix = "backlog") => ({
  job: { id: `${prefix}-${index}`, applicationSlug: `job-search/${prefix}-${index}` },
  state: { status: "draft" }, index, hot: prefix === "hot",
});
const allRows = Array.from({ length: 5000 }, (_, index) => row(index));
let reloadCalls = 0;
const board = {
  ready: true, rows: allRows, hotRows: Array.from({ length: 8 }, (_, index) => row(index, "hot")),
  hotIds: [], hotFromSeed: true, toggleHot: () => true, resetHot: noOp,
  reloadHot: () => { reloadCalls++; return 8; }, remainingHotCount: 4992,
  tracks: ["Full Stack", "Python Backend"], hotExport: "",
  auditCounts: { total: 5008, selected: 5008, backlog: 5008, archived: 0 },
  stats: { filled: 5008, matched: 5008, applied: 0, active: 0, offers: 0 },
  query: "", setQuery: (value) => { board.query = value; },
  statusFilter: "all", setStatusFilter: (value) => { board.statusFilter = value; },
  trackFilter: "all", setTrackFilter: (value) => { board.trackFilter = value; },
  minRating: 0, setMinRating: (value) => { board.minRating = value; },
  sortMode: "rating", setSortMode: (value) => { board.sortMode = value; },
  view: "active", openId: null, toggleOpen: noOp, updateJob: noOp, updateApplication: noOp,
};
const hookState = [];
let cursor = 0;
const { JobBoardScreen } = load("app/jobs/components/JobBoardScreen.tsx", {
  react: {
    useEffect: noOp,
    useState: (initial) => {
      const slot = cursor++;
      if (!(slot in hookState)) hookState[slot] = initial;
      return [hookState[slot], (next) => { hookState[slot] = typeof next === "function" ? next(hookState[slot]) : next; }];
    },
  },
  "next/link": { default: function Link() {} },
  "lucide-react": new Proxy({}, { get: () => function Icon() {} }),
  "./JobBoardRow": { JobRow }, "./JobBoardStat": { Stat },
  "./JavaReactJobsContext": { useJobBoard: () => board },
});
function render() {
  cursor = 0;
  return JobBoardScreen();
}
const renderedRows = (tree) => [...elements(tree)].filter((node) => node.type === JobRow);
const backlogIds = (tree) => renderedRows(section(tree, "Job backlog")).map((node) => node.props.job.id);

let tree = render();
assert.equal(renderedRows(tree).length, 58, "5,000 backlog records render 50 rows plus eight HOT cards");
assert.equal(renderedRows(section(tree, "HOT jobs")).length, 8);
assert.deepEqual(backlogIds(tree), allRows.slice(0, 50).map(({ job }) => job.id));
assert.equal(button(tree, "Previous").props.disabled, true);
assert.equal(button(tree, "Next").props.disabled, false);
button(tree, "Next").props.onClick();
tree = render();
assert.deepEqual(backlogIds(tree), allRows.slice(50, 100).map(({ job }) => job.id));
assert.match(text(find(tree, (node) => node.props["aria-label"] === "Job pagination")), /Page 2 of 100/);
button(tree, "Previous").props.onClick();
tree = render();
assert.equal(backlogIds(tree)[0], "backlog-0");

button(tree, "Next").props.onClick();
tree = render();
find(tree, (node) => node.type === "input").props.onChange({ target: { value: "Python" } });
tree = render();
assert.equal(backlogIds(tree)[0], "backlog-0", "Changing filters returns the backlog to page one");
button(tree, "Next").props.onClick();
tree = render();
button(tree, "Next").props.onClick();
board.rows = allRows.slice(0, 65);
tree = render();
assert.deepEqual(backlogIds(tree), allRows.slice(50, 65).map(({ job }) => job.id), "Shrinking results clamps the current page to the last valid page");
assert.equal(button(tree, "Next").props.disabled, true);

button(tree, "Reload next 8").props.onClick();
tree = render();
assert.equal(reloadCalls, 1, "The reload button invokes the provider action");
assert.match(text(find(tree, (node) => node.props.role === "status")), /Loaded 8 next HOT jobs/);
board.remainingHotCount = 0;
tree = render();
assert.equal(button(tree, "Reload next 8").props.disabled, true, "Exhausted queues disable reload");

board.rows = [];
tree = render();
const trackSelect = find(tree, (node) => node.type === "select" && text(node).includes("All technical tracks"));
assert.deepEqual([...elements(trackSelect)].filter((node) => node.type === "option").map((node) => node.props.value), ["all", ...board.tracks], "Track options remain available when filters match no rows");
assert.equal(renderedRows(tree).length, 8, "Empty filtered backlog does not hide HOT");

board.view = "archive";
board.rows = allRows;
tree = render();
assert.equal(renderedRows(tree).length, 50, "Archive also paginates 5,000 records");
assert.equal(renderedRows(section(tree, "Archived job records"))[0].props.job.id, "backlog-0", "Switching views starts on page one");
assert.equal(section(tree, "HOT jobs"), undefined);
console.log("Jobs board UI checks passed: 5,000-row pagination, navigation, filter/view resets, shrinking results, HOT reload wiring/exhaustion, and stable track options.");
