const fs = require('node:fs');
const assert = require('node:assert/strict');
const input = require('../output/comp-latam-input.json');
const audit = require('../output/comp-latam-audit.json');
const sources = require('../output/comp-latam-source-checks.json');
const sourceUrls = new Set(sources.map(s=>s.url));
assert.equal(input.length, 1000);
assert.equal(audit.companies.length, input.length);
assert.equal(audit.jobs.length, input.reduce((n,c)=>n+c.jobs.length,0));
for(const company of input){
 const rows=audit.jobs.filter(j=>j.companyKey===company.key);
 assert.equal(rows.length,company.jobs.length,company.name);
 for(const job of company.jobs)if(job.url)assert.ok(sourceUrls.has(job.url),`Unchecked job source: ${job.url}`);
 if(!company.jobs.length){const url=company.careersUrl||company.nearshore?.careersUrl||company.website;if(url)assert.ok(sourceUrls.has(url),`Unchecked company source: ${company.name}`)}
}
for(const job of audit.jobs.filter(j=>/^(latam|worldwide)_location_verified$/.test(j.status))){assert.ok(job.evidenceSource);assert.ok(job.verifiedLocation);assert.ok(job.checkedAt)}
console.log(`PASS: all ${audit.companies.length} companies and ${audit.jobs.length} jobs audited; every available source URL checked.`);
