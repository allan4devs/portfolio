const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const ts = require("typescript");

function createLoader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(__dirname, "..", file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => name in mocks ? mocks[name]
      : name.startsWith("@/") ? load(name.slice(2) + ".ts")
        : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
    new Function("require", "module", "exports", js)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

let authenticated = true;
const load = createLoader({ "@/lib/admin-auth": { getAdminFromRequest: () => authenticated ? { id: "test" } : null } });
const { analyzeJobAvailability } = load("lib/cv/job-availability/analyze.ts");
const fetcher = load("lib/cv/scraper/fetch.ts");
const { checkJobAvailability } = load("lib/cv/job-availability/check.ts");
const route = load("app/api/scrape/route.ts");
const title = "Senior Java Engineer";
const url = "https://employer.example/jobs/123";
const now = new Date("2026-10-22T12:00:00Z");
const page = (text, extra = "") => `<html><head><title>${title}</title>${extra}</head><body><main><h1>${title}</h1>${text}</main></body></html>`;
const analyze = (html, expected = title) => analyzeJobAvailability(html, url, expected, now);
const schema = (validThrough, jobTitle = title) => `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title: jobTitle, description: "Build Java services", validThrough })}</script>`;
let checks = 0;
function status(html, expected) {
  const result = analyze(html);
  assert.equal(result.status, expected, html.slice(0, 180));
  checks++;
  return result;
}

for (const notice of [
  "This job is no longer available", "This job is not posted", "This job has expired",
  "The job you are looking for is no longer available", "This job isn't available", "This posting has been taken down",
  "Applications for this job are closed",
  "This position has been filled", "This role is no longer open", "No longer accepting applications",
  "Not receiving applications", "Not currently accepting new applications", "Applications are closed",
  "This job does not exist", "Esta vacante ya no está disponible", "Esta oferta está cerrada",
  "Este puesto ha sido cubierto", "Ya no se aceptan solicitudes", "No se están recibiendo candidaturas",
]) {
  const result = status(page(`<p>${notice}</p><a href="/apply">Apply now</a>`), "closed");
  assert.ok(result.evidence.length);
}
for (const notice of ["403 Forbidden", "Access denied", "Error 403", "Verify you are human", "CAPTCHA", "Sign in to continue", "Checking your browser"]) {
  status(page(`<p>${notice}</p><a href="/apply">Apply now</a>`), "blocked");
}
status("<title>403</title><body>This job is no longer available</body>", "blocked");
status("<title>404 Page not found</title><body>Page not found</body>", "closed");
status(page("<p>Service unavailable</p><button>Apply now</button>"), "unknown");
status(page("<p>We are hiring. Requirements and benefits...</p>"), "unknown");
status(page("<button disabled>Apply now</button>"), "unknown");
status(page("<button aria-disabled='true'>Apply now</button>"), "unknown");
status(page("<div hidden><button>Apply now</button></div>"), "unknown");
status(page("<a href='#'>Apply now</a>"), "unknown");
status(page("<button>Apply filters</button>"), "unknown");
status("<title>Careers</title><body><h1>Other opportunities</h1><a href='/apply'>Apply now</a></body>", "unknown");
status(page("<a href='/apply'>Apply now</a>"), "open");
status(page("<input type='submit' value='Submit application'>"), "open");
status(page("<button>Postularme</button>"), "open");
status(page("<script>const text = 'This job is no longer available';</script><div hidden>This job is closed</div><div style='display:none'>Access denied</div><a href='/apply'>Apply now</a>"), "open");
status(page("<aside>This job is closed</aside><div class='related-jobs'>This position has been filled</div><a href='/apply'>Apply now</a>"), "open");
status(page("<a href='/apply'>Apply now</a>", schema("2026-10-21")), "closed");
status(page("<a href='/apply'>Apply now</a>", schema("2026-10-22")), "open");
status(page("<a href='/apply'>Apply now</a>", schema("2026-11-01")), "open");
status(page("<a href='/apply'>Apply now</a>", schema("2026-10-21", "Marketing Manager")), "open");
const longText = status(page(`<p>${"Job details. ".repeat(3000)}</p><p>No longer receiving applications</p>`), "closed");
assert.ok(longText.pageText.length > 24_000, "Analyze the complete bounded download, beyond the old scanner text preview");
assert.ok(!analyze(page("<input type='hidden' value='secret-token'><p>Requirements</p>")).pageText.includes("secret-token"));

function request(body, origin = "https://workspace.example") {
  const value = new Request("https://workspace.example/api/scrape", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
  });
  value.nextUrl = new URL(value.url);
  return value;
}

async function run() {
  let downloads = 0;
  fetcher.fetchPublicHtml = async (target) => {
    downloads++;
    const parsed = fetcher.validateTargetUrl(target);
    return { html: page("<a href='/apply'>Apply now</a>"), url: parsed.href, status: 200 };
  };
  let response = await route.POST(request({ url, title, mode: "availability" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "open");
  assert.match(response.headers.get("cache-control"), /no-store/);
  response = await route.POST(request({ url }));
  assert.ok("forms" in await response.json(), "Preserve the original scanner contract");
  const beforeDenied = downloads;
  authenticated = false;
  assert.equal((await route.POST(request({ url, mode: "availability" }))).status, 401);
  authenticated = true;
  assert.equal((await route.POST(request({ url, mode: "availability" }, "https://foreign.example"))).status, 403);
  assert.equal(downloads, beforeDenied, "Never download before access checks");
  assert.equal((await route.POST(request({ url: "http://127.0.0.1", mode: "availability" }))).status, 400);
  assert.equal((await route.POST(request({ title, mode: "availability" }))).status, 400);
  const oversized = request({ url, title: "x".repeat(9000), mode: "availability" });
  assert.equal((await route.POST(oversized)).status, 413);

  for (const code of [401, 403, 429, 404, 410, 500, 503]) {
    const blocked = [401, 403, 429].includes(code);
    fetcher.fetchPublicHtml = async () => { throw new fetcher.ScrapeError(`HTTP ${code}`, 502, blocked ? "WEBSITE_BLOCKED" : "UPSTREAM_ERROR", code); };
    const result = await checkJobAvailability(url, title);
    assert.equal(result.status, blocked ? "blocked" : [404, 410].includes(code) ? "closed" : "unknown");
    assert.equal(result.httpStatus, code);
    assert.notEqual(result.status, "open");
    checks++;
  }
  fetcher.fetchPublicHtml = async () => { throw new fetcher.ScrapeError("Timed out", 504, "SCAN_TIMEOUT"); };
  assert.equal((await checkJobAvailability(url, title)).status, "unknown");

  // Exercise actual fetch error metadata without network access.
  for (const httpStatus of [403, 404, 410, 503]) {
    const network = createLoader({
      "node:dns/promises": { lookup: async () => [{ address: "93.184.216.34", family: 4 }] },
      "node:https": { request: (_url, _options, callback) => {
        const req = new EventEmitter();
        req.end = () => queueMicrotask(() => {
          const response = new PassThrough();
          response.statusCode = httpStatus;
          response.headers = {};
          callback(response);
        });
        return req;
      } },
    });
    const actualFetcher = network("lib/cv/scraper/fetch.ts");
    await assert.rejects(actualFetcher.fetchPublicHtml(url), (error) => error.upstreamStatus === httpStatus);
    checks++;
  }
  console.log(`Availability checks passed: ${checks} HTML/HTTP cases, full text, keyword evidence, authentication, same-origin requests, input limits, and legacy scanner compatibility. Fixture network mocked; no AI.`);
  if (process.argv.includes("--live")) {
    const liveLoad = createLoader();
    const { createDefaultJobs } = liveLoad("app/jobs/java-react-jobs-data.ts");
    const liveCheck = liveLoad("lib/cv/job-availability/check.ts").checkJobAvailability;
    for (const id of ["J0012", "J0041"]) {
      const job = createDefaultJobs().find((candidate) => candidate.id === id);
      assert.ok(job);
      const result = await liveCheck(job.url, job.title);
      console.log(JSON.stringify({ id, result: result.status, httpStatus: result.httpStatus, characters: result.pageText.length, reason: result.reason, evidence: result.evidence }));
    }
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
