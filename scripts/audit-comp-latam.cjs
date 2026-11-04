/** Recheck every Comp job URL and retain evidence for LATAM eligibility review. */
const fs = require('node:fs');
const cheerio = require('cheerio');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const companies = JSON.parse(fs.readFileSync(path.join(root, 'output/comp-latam-input.json'), 'utf8'));
const out = path.join(root, 'output/comp-latam-source-checks.json');
const cached = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
const results = new Map(cached.map(row => [row.url, row]));
const urls = [...new Set(companies.flatMap(c => c.jobs.length ? c.jobs.map(j => j.url).filter(Boolean) : [c.careersUrl || c.nearshore?.careersUrl || c.website].filter(Boolean)))];
const region = /\b(?:LATAM|Latin America|Latin American|Costa Rica|Brazil|Brasil|Mexico|México|Argentina|Colombia|Uruguay|Chile|Peru|Perú|Ecuador|Bolivia|El Salvador|Guatemala|Honduras|Panama|Panamá|Paraguay|Nicaragua|Dominican Republic)\b/ig;
let index = 0, completed = 0;
function persist() { const temp = out + '.tmp'; fs.writeFileSync(temp, JSON.stringify([...results.values()], null, 2) + '\n'); fs.renameSync(temp, out); }
async function worker() {
  while (index < urls.length) {
    const url = urls[index++];
    if (results.has(url)) continue;
    const row = { url, checkedAt: new Date().toISOString() };
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(15000), headers: {'User-Agent': 'Mozilla/5.0 (compatible; CompHiringAudit/1.0)'}});
      row.status = response.status; row.finalUrl = response.url;
      const html = await response.text();
      const $ = cheerio.load(html);
      row.title = $('h1').first().text().trim() || $('title').text().trim();
      row.jobPostings = [];
      function visit(value) {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) return value.forEach(visit);
        if ([value['@type']].flat().includes('JobPosting')) row.jobPostings.push({title:value.title, url:value.url, jobLocation:value.jobLocation, jobLocationType:value.jobLocationType, applicantLocationRequirements:value.applicantLocationRequirements, validThrough:value.validThrough});
        if (value['@graph']) visit(value['@graph']);
      }
      $('script[type="application/ld+json"]').each((_, el) => { try { visit(JSON.parse($(el).text())); } catch {} });
      $('script,style,nav,footer,header,noscript').remove();
      const text = ($('main').length ? $('main').text() : $('body').text()).replace(/\s+/g, ' ').trim();
      row.characters = text.length;
      row.regionExcerpts = [...text.matchAll(region)].slice(0, 6).map(m => text.slice(Math.max(0,m.index-90),m.index+180));
      row.closedSignal = /(?:job|position|posting|vacancy) (?:is |has been )?(?:no longer available|closed|filled|removed)|no longer accepting applications/i.test(text);
      row.blockedSignal = /just a moment|access denied|verify you are human|security verification/i.test(row.title);
      row.text = text.slice(0, 18000);
    } catch (error) { row.error = error.message; }
    results.set(url,row); completed++;
    if (completed % 25 === 0) { persist(); console.log(JSON.stringify({checked:results.size,total:urls.length})); }
  }
}
Promise.all(Array.from({length:16},worker)).then(() => {persist();console.log(JSON.stringify({done:true,checked:results.size,total:urls.length}));}).catch(error=>{persist();console.error(error);process.exitCode=1;});
