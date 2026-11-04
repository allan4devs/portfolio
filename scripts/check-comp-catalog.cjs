const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const base = "../lib/comp/";
const data = base + "data/";
const { companies } = require(base + "companies.ts");
const { companyDomain, normalizeCompanyName, companySignals, matchesCompanyFilters, buildCompanyCatalog } = require(base + "catalog.ts");
const imported = require(data + "expanded-companies.json");
const summary = require(data + "catalog-summary.json");
const nearshore = require(data + "nearshore.json");
const originals = require(data + "companies.json");
const checks = require("../output/comp-expansion-checks.json");
const roles = require("../output/comp-role-checks.json");

assert.equal(companies.length, 1000, "The full 1,000-company goal must be reached");
assert.equal(new Set(companies.map(company => company.key)).size, companies.length, "Duplicate company keys");
for (const company of companies) {
  assert.equal(new Set(company.jobs.map(job => job.id)).size, company.jobs.length, `${company.name}: duplicate job keys`);
}
const domains = companies.map(company => companyDomain(company.website)).filter(Boolean);
assert.equal(new Set(domains).size, domains.length, "Duplicate companies under rebranded domains");
const names = companies.map(company => normalizeCompanyName(company.name));
assert.equal(new Set(names).size, names.length, "Duplicate company names");
assert.equal(companies.filter(company => company.nearshore).length, nearshore.length, "Nearshore companies lost");
assert.ok(!companies.some(company => /company not provided/i.test(company.name)), "Unnamed recruiter record counted as an employer");

for (const original of originals) {
  if (/company not provided/i.test(original.name)) continue;
  assert.ok(companies.some(company => company.key === original.key || company.legacyKeys?.includes(original.key)), `Lost saved key: ${original.name}`);
}
for (const company of imported) {
  const source = company.discovery;
  assert.ok(source?.source && source.officialSource && source.checkedOn, `${company.name}: missing provenance`);
  assert.ok(source.technologies.length, `${company.name}: no technology evidence`);
  assert.ok(checks.some(check => check.requests?.some(request => request.status === 200
    && (request.finalUrl === source.officialSource || request.url === source.officialSource)))
    || roles.some(role => role.api === source.officialSource && role.status === 200 && role.totalBoardJobs > 0), `${company.name}: official source was not checked`);
}
const targetTechCount = companies.filter(company => companySignals(company).technologies.some(tech => ["Java", "React", "Python", "Node.js"].includes(tech))).length;
assert.ok(targetTechCount > companies.length * 0.75, "Catalog must primarily cover the requested stacks");
const defaults = { query: "", technology: "all", role: "all", level: "all", region: "all" };
for (const technology of ["Java", "React", "Python", "Node.js"]) {
  const matches = companies.filter(company => matchesCompanyFilters(company, { ...defaults, technology }));
  assert.ok(matches.length > 100, `${technology}: insufficient coverage`);
  assert.equal(matches.length, summary.technologies[technology]);
}
for (const role of ["Full stack", "Backend", "Frontend"]) {
  const matches = companies.filter(company => matchesCompanyFilters(company, { ...defaults, role }));
  assert.ok(matches.length > 50, `${role}: insufficient coverage`);
  assert.equal(matches.length, summary.roles[role]);
}
const midLevel = companies.filter(company => matchesCompanyFilters(company, { ...defaults, level: "Mid-level" }));
assert.ok(midLevel.length > 0, "Mid-level companies missing");
assert.equal(midLevel.length, summary.levels["Mid-level"]);
assert.equal(companies.length, summary.totalCompanies, "Summary does not match the runtime catalog");

const sample = { key: "sample.com", name: "Sample", names: ["Sample"], website: "https://sample.com", tracks: ["JavaScript"], locations: [], records: 0, model: "direct", jobs: [] };
assert.ok(!matchesCompanyFilters(sample, { ...defaults, technology: "Java" }), "JavaScript must not match Java");
assert.ok(!matchesCompanyFilters(sample, { ...defaults, level: "Mid-level" }), "Unknown seniority must not be called mid-level");
assert.ok(!matchesCompanyFilters(sample, { ...defaults, region: "global" }), "Unknown eligibility must not be called worldwide");
const merged = buildCompanyCatalog([sample, { ...sample, key: "sample-alias", name: "SAMPLE", names: ["SAMPLE"] }], []);
assert.equal(merged.length, 1);
assert.ok(merged[0].legacyKeys.includes("sample-alias"), "Merged company must retain preference aliases");
assert.equal(companyDomain("https://www.example.co.id/careers"), "example.co.id");
assert.equal(companyDomain("https://about.gitlab.com"), "gitlab.com");
assert.equal(companyDomain("https://clevertech.biz"), companyDomain("https://lumenalta.com"));

const result = { companies: companies.length, targetTechnologyCompanies: targetTechCount, nearshore: nearshore.length, midLevel: midLevel.length, importedProfiles: imported.length, passed: true };
fs.writeFileSync(path.resolve(__dirname, "../output/comp-catalog-check.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
