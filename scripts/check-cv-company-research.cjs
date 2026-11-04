const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const base = "../app/(page_routes)/cv/";
const { createDefaultJobs } = require(base + "java-react-jobs-data.ts");
const { buildCompanyDirectory, companyModel, companyKey } = require(base + "company-directory.ts");
const research = require(base + "data/latam-company-research.json");
const companies = buildCompanyDirectory(createDefaultJobs());
const researched = companies.filter(company => company.research);
assert.equal(new Set(research.map(row => companyKey(row.company))).size, research.length, "Duplicate employer names");
assert.equal(researched.length, research.length, "Research entries lost or merged unexpectedly");
for (const row of research) {
  assert.ok(row.source.startsWith("https://"), row.company + ": missing source");
  assert.match(row.region, /Latin America|Brazil|Mexico|Argentina|Colombia|Costa Rica|Uruguay|El Salvador|Chile|Peru|Ecuador|Bolivia|Guatemala|Honduras|Panama|Paraguay|Nicaragua|Venezuela|Dominican Republic/, row.company + ": missing LATAM eligibility");
  assert.match(row.track, /Java|React/, row.company + ": missing preferred stack evidence");
  assert.ok(row.notes && row.workMode && row.role && row.checkedOn, row.company + ": incomplete evidence");
  const card = researched.find(company => company.research.company === row.company);
  assert.equal(companyModel(card), row.model, row.company + ": wrong business model");
  assert.ok(card.locations.includes(row.region), row.company + ": missing researched region");
}
const audit = { target: 400, checkedOn: "2026-10-28", totalDirectoryEntries: companies.length, researchedEmployers: researched.length, remainingResearch: Math.max(0, 400 - researched.length), outsourcing: researched.filter(company => companyModel(company) === "outsourcing").length, direct: researched.filter(company => companyModel(company) === "direct").length, complete: researched.length >= 400, limitation: "Employer sources were found during research; this check validates data integrity, not live vacancy availability or every country restriction.", remainingSavedCompanies: companies.filter(company => !company.research).map(company => ({ name: company.name, website: company.website, tracks: company.tracks, locations: company.locations })) };
fs.mkdirSync("output", { recursive: true });
fs.writeFileSync("output/latam-company-research-audit.json", JSON.stringify(audit, null, 2) + "\n");
console.log(JSON.stringify({ ...audit, remainingSavedCompanies: undefined }, null, 2));
if (process.argv.includes("--complete")) assert.ok(audit.complete, "400 researched companies have not been reached");
