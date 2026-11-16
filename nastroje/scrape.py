"""Stáhne výpis produktů jedné kategorie demos-trade.cz jako JSON: scrape.py <kategorie> [max_stran] [query]"""
import re, sys, json, html, time, urllib.request
BASE='https://www.demos-trade.cz/'
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    return urllib.request.urlopen(req,timeout=60).read().decode('utf-8','replace')
def txt(s): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s))).strip()
def parse(page):
    out=[]
    for m in re.finditer(r'<tr\s+class="list-products-line__item js-online-pricing js-list-item"(.*?)</tr>',page,re.S):
        r=m.group(1)
        name=re.search(r'cell--title.*?<a href="([^"]+)">(.*?)</a>',r,re.S)
        code=re.search(r'class="in-code">(.*?)</a>',r,re.S)
        av=re.search(r'js-warehouse-availability-name">(.*?)<div',r,re.S)
        pr=re.search(r'price__item--main">(.*?)</div>',r,re.S)
        if not name: continue
        p=txt(pr.group(1)) if pr else ''
        out.append({'nazev':txt(name.group(2)),'url':name.group(1),'kod':txt(code.group(1)) if code else '',
                    'dostupnost':txt(av.group(1)) if av else '','cena':p})
    return out
cat=sys.argv[1]; maxp=int(sys.argv[2]) if len(sys.argv)>2 else 50
res={}; 
for p in range(1,maxp+1):
    items=parse(get(f"{BASE}{cat}/?public=0&page={p}"+(sys.argv[3] if len(sys.argv)>3 else "")))
    new=[i for i in items if i['kod'] not in res]
    for i in items: res[i['kod']]=i
    if not new: break
    time.sleep(0.5)
json.dump(list(res.values()),sys.stdout,ensure_ascii=False,indent=0)
