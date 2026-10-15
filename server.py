"""Serveur local et connecteur de cotations (extraction HTML à vérifier sur le PC)."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json, os, re, unicodedata

ROOT=Path(__file__).resolve().parent
BASE='https://www.gold.fr'

class HTMLText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.rows=[]; self.row=None; self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr': self.row=[]
        if tag in ('td','th') and self.row is not None:self.cell=[]
    def handle_data(self,data):
        self.parts.append(data)
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cell is not None and self.row is not None:
            self.row.append(' '.join(' '.join(self.cell).split()));self.cell=None
        if tag=='tr' and self.row is not None:
            if self.row:self.rows.append(self.row)
            self.row=None

def fetch(path):
    req=Request(BASE+path,headers={'User-Agent':'Mozilla/5.0 (compatible; PersonalGoldDashboard/1.0)','Accept-Language':'fr-FR,fr;q=0.9'})
    with urlopen(req,timeout=16) as r:
        return r.read().decode('utf-8',errors='replace')

def normalize(s):
    return ''.join(c for c in unicodedata.normalize('NFKD',s.lower()) if not unicodedata.combining(c)).replace('’',"'")

def euro(s):
    m=re.search(r'(?<!\d)(\d[\d\s\u00a0.,]*?)\s*€',s)
    if not m:return None
    t=m.group(1).replace('\u00a0','').replace(' ','')
    if ',' in t and '.' in t:t=t.replace('.','').replace(',','.')
    elif ',' in t:t=t.replace(',','.')
    elif '.' in t and len(t.rsplit('.',1)[-1])==3:t=t.replace('.','')
    try:return float(t)
    except ValueError:return None

PRODUCTS=[
 ('cpor',r'lingot\s*(?:or\s*)?1\s*k(?:g|ilo)'),
 ('bar500',r'lingotin\s*500\s*g'),('bar250',r'lingotin\s*250\s*g'),
 ('bar100',r'lingotin\s*100\s*g'),('bar50',r'lingotin\s*50\s*g'),
 ('bar20',r'lingotin\s*20\s*g'),('bar10',r'lingotin\s*10\s*g'),
 ('bar5',r'lingotin\s*5\s*g'),('bar2_5',r'lingotin\s*2[,.]5\s*g'),
 ('bar1',r'lingotin\s*1\s*g'),
 ('coq',r'(?:20\s*f(?:rancs?)?\s*(?:napoleon|coq)|napoleon\s*20\s*frs?|20\s*f\s*coq)'),
 ('suisse',r'(?:20\s*f\s*(?:suisse|croix)|croix\s*suisse\s*20\s*frs?|vreneli)'),
 ('pesos',r'50\s*pesos'),('krugerrand',r'krugerrand'),
 ('george',r'(?:souverain.*george\s*v|george\s*v.*souverain)'),
 ('elisabeth',r'(?:souverain.*(?:elisabeth|elizabeth)\s*ii|(?:elisabeth|elizabeth)\s*ii.*souverain|(?:elisabeth|elizabeth)\s*ii)'),
 ('demi_napoleon',r'(?:demi[ -]?napoleon|10\s*(?:f|francs?)\s*(?:napoleon|or))'),
 ('demi_souverain',r'(?:demi[ -]?souverain|half\s*sovereign)'),
 ('florins',r'10\s*florins?'),('tunisie',r'20\s*(?:f|francs?)\s*tunisie'),
 ('union_latine',r'union\s*latine'),('reichsmark',r'(?:20\s*reichsmarks?|20\s*marks?\s*or)'),
 ('us20',r'(?:20\s*(?:dollars?|\$)\s*(?:us|or|americain)|double\s*eagle)'),
 ('us10',r'(?:10\s*(?:dollars?|\$)\s*(?:us|or|americain)|half\s*eagle)'),
 ('us5',r'(?:5\s*(?:dollars?|\$)\s*(?:us|or|americain)|quarter\s*eagle)')]

def extract_global(html):
    p=HTMLText();p.feed(html);out={}
    # Le site publie ses cotations aussi dans des blocs HTML, pas seulement des tableaux.
    # Chercher d'abord les libellés de la première liste « pièces cotées ».
    for cells in p.rows:
        if len(cells)<2:continue
        label=normalize(cells[0]);price=euro(cells[1])
        if price is None:continue
        for key,pattern in PRODUCTS:
            if key not in out and re.search(pattern,label):out[key]=price
    text=normalize(' '.join(' '.join(p.parts).split()))
    for key,pattern in PRODUCTS:
        if key in out:continue
        # Délimitation : « Cours : » ou valeur immédiatement après le libellé.
        match=re.search(pattern+r'(?:\s*\([^)]{1,60}\))?\s*(?:cours\s*:\s*)?((?:\d[\d \u00a0.,]*?)\s*€)',text,re.I)
        if match:
            value=euro(match.group(1))
            if value is not None:out[key]=value
    return out

def extract_instant(html):
    p=HTMLText();p.feed(html)
    text=' '.join(' '.join(p.parts).split())
    # Valeur intrinsèque et cours boursable sont deux chiffres différents.
    match=re.search(r'Valeur\s+intrins[eè]que\s*([^€]{1,90}€)',text,re.I)
    return euro(match.group(1)) if match else None

def live_prices():
    prices={};warnings=[]
    try:
        x=extract_instant(fetch('/lingot-d-or-1-kg/'))
        if x is None: warnings.append('Cours instantané non trouvé')
        else:prices['instant']=x
    except Exception as e:warnings.append('Page instantanée inaccessible : '+str(e)[:100])
    try:
        values=extract_global(fetch('/cours-or-prix-de-l-or/'))
        prices.update(values)
        if 'cpor' not in values:warnings.append('Cours CPoR du lingot non trouvé')
    except Exception as e:warnings.append('Page CPoR inaccessible : '+str(e)[:100])
    if not prices:raise ValueError('Aucun cours extrait. '+ ' ; '.join(warnings))
    return {'prices':prices,'updatedAt':datetime.now(timezone.utc).isoformat(),'warnings':warnings,'origin':'Pages publiques de cotation'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        if self.path.split('?')[0]!='/api/prices':return super().do_GET()
        try:
            f=ROOT/'cotations.json'
            data=json.loads(f.read_text(encoding='utf-8')) if f.exists() else live_prices()
            status=200
        except Exception as e:
            data={'error':str(e)};status=503
        payload=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(payload)

if __name__=='__main__':
    port=int(os.environ.get('PORT','8080'))
    print('Ouvrez http://localhost:'+str(port)+' dans votre navigateur.')
    ThreadingHTTPServer(('0.0.0.0',port),Handler).serve_forever()
