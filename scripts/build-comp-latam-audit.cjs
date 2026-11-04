/** Build a conservative, reproducible eligibility audit from live source checks. */
const fs=require('node:fs');
const companies=JSON.parse(fs.readFileSync('output/comp-latam-input.json'));
const sources=JSON.parse(fs.readFileSync('output/comp-latam-source-checks.json'));
const boards=JSON.parse(fs.readFileSync('output/comp-latam-live-boards.json'));
const pages=new Map(sources.map(s=>[s.url,s]));
const normalize=url=>{try{const u=new URL(url);return(u.hostname+u.pathname).replace(/\/$/,'').toLowerCase()}catch{return url}};
const liveUrls=new Map(),liveIds=new Map();
for(const board of boards)for(const job of board.jobs||[]){const item={...job,source:board.url,checkedAt:board.checkedAt};if(job.url)liveUrls.set(normalize(job.url),item);liveIds.set(job.id,item)}
const latam=/\b(?:LATAM|Latin America(?:n)?|Costa Rica|Brazil|Brasil|Mexico|México|Argentina|Colombia|Uruguay|Chile|Peru|Perú|Ecuador|Bolivia|El Salvador|Guatemala|Honduras|Panama|Panamá|Paraguay|Nicaragua|Dominican Republic|Puerto Rico)\b/i;
const worldwide=/\b(?:worldwide|anywhere in the world|global remote|remote[ -]global)\b/i;
const closed=/job (?:is )?not found|page not found|404|position (?:is )?closed/i;
const audit=[];
for(const company of companies){
 for(const job of company.jobs){
  const page=pages.get(job.url);
  const live=liveUrls.get(normalize(job.url))||liveIds.get(job.id.replace(/^ats-/,''));
  let status='eligibility_unverified',location='',evidenceSource='',checkedAt=page?.checkedAt,reason='No current structured location or applicant requirements verified.';
  if(live){location=typeof live.location==='object'?live.location?.name||'':live.location||live.categories?.location||'';location+=[...(live.secondaryLocations||[])].map(l=>typeof l==='string'?l:l.location||l.name||'').filter(Boolean).map(l=>' | '+l).join('');evidenceSource=live.source;checkedAt=live.checkedAt;reason='Posting found in live employer ATS feed.';status=latam.test(location)?'latam_location_verified':worldwide.test(location)?'worldwide_location_verified':location?'other_location_review':'eligibility_unverified';}
  else if(page?.status>=200&&page.status<300&&!page.blockedSignal&&!closed.test(page.title||'')){
   const posting=(page.jobPostings||[]).find(p=>normalize(p.url)===normalize(job.url)||p.title?.toLowerCase()===job.title.toLowerCase());
   if(posting){location=JSON.stringify({jobLocation:posting.jobLocation,applicantLocationRequirements:posting.applicantLocationRequirements});evidenceSource=page.finalUrl;status=latam.test(location)?'latam_location_verified':worldwide.test(location)?'worldwide_location_verified':location!=='{}'?'other_location_review':'eligibility_unverified';reason='Matching JobPosting structured data on live page; application availability needs review.';if(posting.validThrough&&new Date(posting.validThrough)<new Date()){status='expired';reason='Structured posting validThrough is in the past.'}}
   else if(page.closedSignal){status='possibly_closed';reason='Page contains a closure notice; verify it refers to this vacancy.'}
  }else if(page?.status===404||page?.status===410){status='unavailable';reason=`Source returned HTTP ${page.status}.`}
  else if(page?.error||page?.blockedSignal||page?.status>=400){status='source_inaccessible';reason=page?.error||`Source blocked or HTTP ${page?.status}.`}
  audit.push({companyKey:company.key,company:company.name,jobId:job.id,title:job.title,url:job.url,status,verifiedLocation:location,evidenceSource,checkedAt,reason,savedLocation:job.location||'',regionExcerpts:page?.regionExcerpts||[]});
 }
}
const counts=rows=>rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
const companyAudit=companies.map(c=>{const jobs=audit.filter(j=>j.companyKey===c.key);const url=c.careersUrl||c.nearshore?.careersUrl||c.website;const source=pages.get(url);return{companyKey:c.key,company:c.name,status:jobs.some(j=>j.status==='latam_location_verified')?'latam_opening_evidence':jobs.some(j=>j.status==='worldwide_location_verified')?'worldwide_opening_evidence':jobs.length?'review_required':'no_saved_jobs',jobsAudited:jobs.length,jobStatuses:counts(jobs),careersUrl:url,careersSourceStatus:source?.status,careersSourceError:source?.error,possibleRegionExcerpts:source?.regionExcerpts||[]}});
const summary={generatedAt:new Date().toISOString(),companies:companyAudit.length,jobs:audit.length,uniqueSources:sources.length,liveBoards:boards.length,jobStatuses:counts(audit),companyStatuses:counts(companyAudit),limitations:['LATAM location confirms advertised job location, not remote work from every LATAM country.','Other locations and inaccessible sources do not prove a company excludes LATAM.','Page region mentions are review leads only; they do not prove applicant eligibility.','No-saved-jobs companies have careers-source checks but no vacancy eligibility conclusion.']};
fs.writeFileSync('output/comp-latam-audit.json',JSON.stringify({summary,companies:companyAudit,jobs:audit},null,2)+'\n');
const columns=['company','companyKey','jobId','title','status','verifiedLocation','savedLocation','url','evidenceSource','checkedAt','reason'];
const csv=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
fs.writeFileSync('output/comp-latam-jobs.csv',[columns.join(','),...audit.map(j=>columns.map(k=>csv(j[k])).join(','))].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
