const fs=require('node:fs');
const cheerio=require('cheerio');
const jobs=require('../output/latam-existing-jobs.json');
const research=require('../app/(page_routes)/cv/data/latam-company-research.json');
const reviewed=new Set(research.map(r=>r.company.toLowerCase()));
const urls=[...new Set(jobs.filter(j=>!reviewed.has(j.company.toLowerCase())&&!/linkedin\.com|echojobs\.io|remotenex\.us|cord\.com/.test(j.url)).map(j=>j.url))];
const output='output/latam-source-rechecks.json';
const cached=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):[];
const results=new Map(cached.map(r=>[r.url,r]));
const region=/\b(?:LATAM|Latin America|Costa Rica|Brazil|Brasil|Mexico|Argentina|Colombia|Uruguay|Chile|Peru|Ecuador|Bolivia|El Salvador|Guatemala|Honduras|Panama|Paraguay)\b/ig;
const stack=/\b(?:Java(?!Script)|React(?:\.js|JS| Native)?)\b/ig;
const excerpts=(text,re)=>{const matches=[...text.matchAll(re)].slice(0,12);return matches.map(m=>text.slice(Math.max(0,m.index-100),m.index+190));};
let index=0;
async function worker(){while(index<urls.length){const url=urls[index++];if(results.has(url))continue;const related=jobs.filter(j=>j.url===url);let row={url,companies:[...new Set(related.map(j=>j.company))],checkedOn:'2026-10-28'};try{const response=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{'User-Agent':'Mozilla/5.0 (compatible; EmployerResearch/1.0)'}});const html=await response.text();const $=cheerio.load(html);row.status=response.status;row.finalUrl=response.url;row.title=$('h1').first().text().trim()||$('title').text().trim();const structured=$('script[type="application/ld+json"]').map((_,e)=>$(e).text()).get().join(' ');$('script,style,nav,footer,header,noscript').remove();const text=($('main').length?$('main').text():$('body').text()).replace(/\s+/g,' ').trim();row.characters=text.length;row.regionExcerpts=excerpts(text,region);row.stackExcerpts=excerpts(text,stack);row.structured=structured.slice(0,12000);row.possibleEvidence=response.ok&&row.regionExcerpts.length>0&&row.stackExcerpts.length>0&&!/not found|access denied|just a moment/i.test(row.title);row.text=text.slice(0,120000);}catch(error){row.error=error.message;}results.set(url,row);fs.writeFileSync(output,JSON.stringify([...results.values()],null,2)+'\n');if(results.size%20===0)console.log(JSON.stringify({checked:results.size,total:urls.length,possible:[...results.values()].filter(r=>r.possibleEvidence).length}));}}
Promise.all(Array.from({length:8},worker)).then(()=>console.log(JSON.stringify({done:true,checked:results.size,total:urls.length,possible:[...results.values()].filter(r=>r.possibleEvidence).length}))).catch(error=>{console.error(error);process.exitCode=1;});
