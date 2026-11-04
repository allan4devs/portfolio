const fs=require('node:fs');
const urls=[...new Set(JSON.parse(fs.readFileSync('output/comp-role-checks.json')).map(r=>r.api).filter(Boolean))];
const output='output/comp-latam-live-boards.json';
let previous=[];try{previous=JSON.parse(fs.readFileSync(output))}catch{}
const results=new Map(previous.map(r=>[r.url,r]));
for(const row of results.values())for(const job of row.jobs||[]){delete job.description;delete job.lists}
let index=0;
function persist(){const temp=output+'.tmp';fs.writeFileSync(temp,JSON.stringify([...results.values()],null,2));fs.renameSync(temp,output)}
async function worker(){while(index<urls.length){const url=urls[index++];if(results.has(url))continue;const row={url,checkedAt:new Date().toISOString()};try{const response=await fetch(url,{signal:AbortSignal.timeout(18000)});row.status=response.status;if(response.ok){const data=await response.json();row.jobs=(Array.isArray(data)?data:data.jobs||[]).filter(j=>j.isListed!==false).map(j=>({id:String(j.id),title:j.title||j.text,url:j.absolute_url||j.hostedUrl||j.jobUrl,location:j.location,categories:j.categories,secondaryLocations:j.secondaryLocations,isRemote:j.isRemote,workplaceType:j.workplaceType}));}}catch(e){row.error=e.message}results.set(url,row);if(results.size%20===0){persist();console.log(`${results.size}/${urls.length} boards`)}}}
Promise.all(Array.from({length:8},worker)).then(()=>{persist();console.log(`Done: ${results.size} boards`)}).catch(e=>{console.error(e);process.exitCode=1});
