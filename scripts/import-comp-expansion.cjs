const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const yaml = require("js-yaml");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + "\n");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { buildCompanyCatalog, companyDomain, normalizeCompanyName, companySignals, TARGET_COMPANIES } = require("../lib/comp/catalog.ts");
const basePath = "lib/comp/data/";
const base = read(basePath + "companies.json");
const nearshore = read(basePath + "nearshore.json");
const sourcePath = path.join(root, "output/remoteintech-source/src/companies");

if (process.argv.includes("--prepare")) {
  const profiles = fs.readdirSync(sourcePath).filter(file => file.endsWith(".md")).map(file => {
    const raw = fs.readFileSync(path.join(sourcePath, file), "utf8");
    const meta = yaml.load(raw.split("---")[1]);
    const body = raw.slice(raw.indexOf("---", 3) + 3);
    const section = title => body.split(`## ${title}`)[1]?.split(/\n## /)[0]?.trim() || "";
    return { name: meta.title, slug: meta.slug, website: meta.website, careersUrl: meta.careers_url || null,
      technologies: meta.technologies || [], region: meta.region, remotePolicy: meta.remote_policy,
      profileUpdated: meta.updatedAt ? new Date(meta.updatedAt).toISOString().slice(0, 10) : null,
      techText: section("Company technologies"), regionText: section("Region"), applyText: section("How to apply"),
      source: `https://github.com/remoteintech/remote-jobs/blob/fa2253f1ed02cc4d8f59ab3ccc831b008cdd7189/src/companies/${file}`,
    };
  });
  const manualFile = path.join(root, "output/comp-official-candidates.json");
  const manual = fs.existsSync(manualFile) ? read("output/comp-official-candidates.json") : [];
  write("output/comp-expansion-candidates.json", [...profiles, ...manual]);
  console.log(`Prepared ${profiles.length} Remote In Tech profiles and ${manual.length} official employer candidates.`);
  process.exit(0);
}

const profiles = read("output/comp-expansion-candidates.json");
const profilesBySlug = new Map(profiles.map(profile => [profile.slug, profile]));
const checks = new Map(read("output/comp-expansion-checks.json").map(row => [row.slug, row]));
const roleChecks = read("output/comp-role-checks.json");
const rolesBySlug = new Map(roleChecks.filter(row => row.slug).map(row => [row.slug, row]));
const regions = { worldwide: "Worldwide (directory-reported)", americas: "Americas (directory-reported)", europe: "Europe (directory-reported)", "americas-europe": "Americas & Europe (directory-reported)", "asia-pacific": "Asia Pacific (directory-reported)", other: "Check company eligibility" };
const policies = { "fully-remote": "Fully remote (directory-reported)", "remote-first": "Remote first (directory-reported)", hybrid: "Hybrid (directory-reported)", "remote-friendly": "Remote friendly (directory-reported)" };
const excluded = new Set(["invision", "invisionapp", "triplebyte", "fast", "kite", "pivotal", "thegrid", "glitch", "algorithmia", "guidesmiths", "adeva", "server-density", "serverdensity", "homeflic-wegrow", "homeflicwegrow", "idonethis", "privacycloud"]);
const unique = values => [...new Set(values)];

const candidates = profiles.flatMap(profile => {
  const check = checks.get(profile.slug);
  const roleCheck = rolesBySlug.get(profile.slug);
  const boardReachable = roleCheck?.status === 200 && roleCheck.totalBoardJobs > 0;
  if ((!check?.reachable && !boardReachable) || check?.parked || excluded.has(profile.slug) || !companyDomain(profile.website)) return [];
  const jobs = (roleCheck?.jobs || []).map(job => ({ ...job, workMode: job.workMode || "Check posting" }));
  const technologies = unique([...check.technologies, ...jobs.flatMap(job => job.technologies)]);
  if (!technologies.length) return [];
  const roles = unique([...check.roles, ...jobs.flatMap(job => job.roles)]);
  const levels = unique([...check.levels, ...jobs.flatMap(job => job.levels)]);
  const careersStatus = boardReachable ? "Employer feed reachable" : check.careersStatus === 200 ? "Page reachable" : [403, 429].includes(check.careersStatus)
    ? "Automated check restricted" : check.careersStatus === "not-found" ? "Link not found" : "Link needs review";
  const official = check.requests.find(request => request.status === 200 && request.characters > 150);
  const boardUrl = roleCheck ? `https://${roleCheck.host}/${roleCheck.board}` : undefined;
  const careersUrl = boardReachable ? boardUrl : check.careersStatus === 200 || [403, 429].includes(check.careersStatus) ? check.careersUrl : undefined;
  return [{
    key: companyDomain(profile.website), name: profile.name, names: [profile.name], website: profile.website,
    ...(careersUrl ? { careersUrl } : {}), tracks: technologies, locations: [regions[profile.region] || "Check company eligibility"],
    records: jobs.length, model: "unknown", jobs: jobs.slice(0, 12),
    discovery: { source: profile.sourceName && boardReachable ? boardUrl : profile.source, sourceName: profile.sourceName || "Remote In Tech", checkedOn: "2026-10-29",
      ...(profile.profileUpdated ? { profileUpdated: profile.profileUpdated } : {}),
      region: regions[profile.region] || "Check company eligibility", remotePolicy: policies[profile.remotePolicy] || "Check company policy",
      careersStatus, officialSource: boardReachable ? roleCheck.api : official.finalUrl || official.url, technologies, roles, levels,
    },
  }];
});

const score = company => {
  const signals = companySignals(company);
  return signals.technologies.filter(tech => ["Java", "React", "Python", "Node.js"].includes(tech)).length * 12
    + (signals.levels.includes("Mid-level") ? 30 : 0) + (company.jobs.length ? 20 : 0)
    + (company.discovery.careersStatus === "Page reachable" ? 5 : 0)
    + (/worldwide|americas/i.test(company.discovery.region) ? 5 : 0) + signals.roles.length * 2;
};
candidates.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
const selected = [];
const eligibleCompanyPool = buildCompanyCatalog(base, nearshore, candidates).length;
let catalog = buildCompanyCatalog(base, nearshore);
for (const candidate of candidates) {
  const exists = catalog.some(company => companyDomain(company.website) === companyDomain(candidate.website)
    || company.names.some(name => normalizeCompanyName(name) === normalizeCompanyName(candidate.name)));
  if (catalog.length >= TARGET_COMPANIES && !exists) continue;
  selected.push(candidate);
  catalog = buildCompanyCatalog(base, nearshore, selected);
}
assert.ok(catalog.length >= TARGET_COMPANIES, `Only ${catalog.length} companies pass the checks; gather more sources before publishing.`);
assert.equal(new Set(catalog.map(company => company.key)).size, catalog.length);
write(basePath + "expanded-companies.json", selected);

const employerRoles = roleChecks.filter(row => row.jobs.length).flatMap(row => {
  const profile = profilesBySlug.get(row.slug);
  const domain = profile ? companyDomain(profile.website) : row.key;
  const company = catalog.find(item => item.key === domain || companyDomain(item.website) === domain);
  if (!company) return [];
  return [{ key: company.key, source: row.api, checkedOn: "2026-10-29", jobs: row.jobs.slice(0, 24).map(job => ({ ...job, workMode: job.workMode || "Check posting" })) }];
});
write(basePath + "employer-roles.json", employerRoles);
for (const evidence of employerRoles) {
  const company = catalog.find(item => item.key === evidence.key);
  const jobs = new Map(company.jobs.map(job => [job.url || job.id, job]));
  evidence.jobs.forEach(job => jobs.set(job.url || job.id, job));
  company.jobs = [...jobs.values()];
}
const summary = {
  target: TARGET_COMPANIES, checkedOn: "2026-10-29", totalCompanies: catalog.length,
  startingCompanies: buildCompanyCatalog(base, nearshore).length, importedProfiles: selected.length,
  addedCompanies: catalog.length - buildCompanyCatalog(base, nearshore).length,
  candidatesReviewed: profiles.length, candidatesWithReachablePages: [...checks.values()].filter(check => check.reachable).length,
  eligibleCompanyPool,
  nearshore: catalog.filter(company => company.nearshore).length,
  withCareersLinks: catalog.filter(company => company.careersUrl || company.nearshore?.careersUrl).length,
  withTargetTechnology: catalog.filter(company => companySignals(company).technologies.some(tech => ["Java", "React", "Python", "Node.js"].includes(tech))).length,
  technologies: Object.fromEntries(["Java", "React", "Python", "Node.js", "JavaScript", "TypeScript"].map(tech => [tech, catalog.filter(company => companySignals(company).technologies.includes(tech)).length])),
  roles: Object.fromEntries(["Full stack", "Backend", "Frontend"].map(role => [role, catalog.filter(company => companySignals(company).roles.includes(role)).length])),
  levels: Object.fromEntries(["Mid-level", "Junior", "Senior"].map(level => [level, catalog.filter(company => companySignals(company).levels.includes(level)).length])),
  employerBoardsWithRoleEvidence: employerRoles.length,
  source: "https://github.com/remoteintech/remote-jobs", sourceCommit: "fa2253f1ed02cc4d8f59ab3ccc831b008cdd7189",
  limitations: "Company and career links were checked, not every vacancy or country eligibility. Directory technology and geography may be historical. Seniority signals are not guarantees of a current matching opening.",
};
write(basePath + "catalog-summary.json", summary);
write("output/comp-expansion-import-audit.json", { ...summary, selected: selected.map(company => ({ key: company.key, name: company.name, source: company.discovery.source, officialSource: company.discovery.officialSource, score: score(company) })) });
console.log(JSON.stringify(summary, null, 2));
