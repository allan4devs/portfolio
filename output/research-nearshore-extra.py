import concurrent.futures, json, re, urllib.request, urllib.parse, sys
from pathlib import Path
from html.parser import HTMLParser
sys.stdout.reconfigure(encoding='utf-8')
class Page(HTMLParser):
 def __init__(self): super().__init__(); self.text=[]; self.links=[]; self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'): self.skip+=1
  if tag=='a':
   href=dict(attrs).get('href','')
   if href: self.links.append(href)
 def handle_endtag(self,tag):
  if tag in ('script','style'): self.skip=max(0,self.skip-1)
 def handle_data(self,data):
  if not self.skip: self.text.append(data)
def check(c):
 try:
  req=urllib.request.Request(c['website'],headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=18) as r: html=r.read(2500000).decode('utf-8',errors='replace'); final=r.url
  page=Page(); page.feed(html); text=re.sub(r'\s+',' ',' '.join(page.text))
  hit=re.search(r'.{0,110}\bnearshor(?:e|ing)\b.{0,180}',text,re.I)
  if not hit:
   nearlink=next((urllib.parse.urljoin(final,h) for h in page.links if 'nearshor' in h.lower() and 'blog' not in h.lower()),None)
   if nearlink:
    with urllib.request.urlopen(urllib.request.Request(nearlink,headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as r: detail=r.read(2000000).decode('utf-8',errors='replace'); detailurl=r.url
    sub=Page(); sub.feed(detail)
    detailtext=re.sub(r'\s+',' ',' '.join(sub.text))
    hit=re.search(r'.{0,110}\bnearshor(?:e|ing)\b.{0,180}',detailtext,re.I)
    if hit: final=detailurl
  careers=next((urllib.parse.urljoin(final,h) for h in page.links if re.search(r'(?:careers?|join-us|join-our-team|jobs)(?:/|$|\?|#)',h,re.I) and not re.search(r'blog|article|insight|linkedin',h,re.I)),None)
  return {'key':c['key'],'name':c['name'],'website':c['website'],'source':final,'evidence':hit.group(0) if hit else None,'careersUrl':careers,'checkedOn':'2026-10-29'}
 except Exception as e: return {'key':c['key'],'name':c['name'],'error':str(e)}

items=[('Jobsity','jobsity.com'),('BEON.tech','beon.tech'),('Ideaware','ideaware.co'),('HatchWorks AI','hatchworks.com'),('10Pearls','10pearls.com'),('Softtek','softtek.com'),('Vates','vates.com'),('Qubika','qubika.com'),('Unosquare','unosquare.com'),('Cheesecake Labs','cheesecakelabs.com'),('DNAMIC','dnamic.ai'),('Bixlabs','bixlabs.com'),('Uruit','uruit.com'),('December Labs','decemberlabs.com'),('UruIT','uruit.com')]
selected=[{'key':domain,'name':name,'website':'https://'+domain+'/'} for name,domain in items]
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool: results=list(pool.map(check,selected))
Path('output/nearshore-additional-audit.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
for r in results: print(('OK ' if r.get('evidence') else 'REVIEW ')+r['name']+' '+str(r.get('error','')))
