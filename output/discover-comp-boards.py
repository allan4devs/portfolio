import concurrent.futures,json,re,urllib.request,urllib.parse
from pathlib import Path
manual=json.loads(Path('output/comp-official-candidates.json').read_text(encoding='utf-8'))
def check(p):
 links=[]
 for url in [p['website'],urllib.parse.urljoin(p['website'],'careers')]:
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=9) as r:raw=r.read(2000000).decode('utf-8',errors='replace')
   for host,board in re.findall(r'(boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com)/([a-zA-Z0-9_.-]+)',raw):
    if board not in ['embed','jobs','robots.txt','api','share']:links.append({'slug':p['slug'],'name':p['name'],'host':host,'board':board,'discoveredOn':url})
   if links:break
  except Exception:pass
 return links
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:results=[r for rows in pool.map(check,manual) for r in rows]
Path('output/comp-discovered-official-boards.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
boards=json.loads(Path('output/comp-ats-boards.json').read_text(encoding='utf-8'))
added=[]
for b in results:
 if not any(r['host']==b['host'] and r['board']==b['board'] for r in boards):boards.append(b);added.append(b)
Path('output/comp-ats-boards.json').write_text(json.dumps(boards,indent=2)+'\n',encoding='utf-8')
print('New employer-linked ATS boards:',len(added))
for b in added:print(b['name'],b['host'],b['board'])
