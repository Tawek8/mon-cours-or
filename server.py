"""Serveur local et connecteur de cotations (extraction HTML Gold.fr)."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json, os, re, unicodedata, time
from urllib.parse import urlparse
from datetime import timedelta

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
 ('florins',r'10\s*florins?'),('tunisie',r'20\s*(?:frs?|francs?)\s*tunisie'),
 ('union_latine',r'union\s*latine'),('reichsmark',r'(?:reichsmarks?|20\s*marks?\s*or)'),
 ('us20',r'(?:20\s*(?:dollars?|\$)\s*(?:us|or|americain)|double\s*eagle)'),
 ('us10',r'(?:10\s*(?:dollars?|\$)\s*(?:us|or|americain))'),
 ('us5',r'(?:5\s*(?:dollars?|\$)\s*(?:us|or|americain))')]

def extract_global(html):
    # Limite observée dans le HTML Gold.fr : ne jamais reprendre un prix non coté.
    html=html.split('<div id="pieces-non-cotees"',1)[0]
    p=HTMLText();p.feed(html);out={}
    # Le site publie ses cotations aussi dans des blocs HTML, pas seulement des tableaux.
    # Chercher d'abord les libellés de la première liste « pièces cotées ».
    for cells in p.rows:
        if len(cells)<2:continue
        # Les tableaux actuels contiennent image, nom, prix, variation, actions.
        label=normalize(cells[1] if len(cells)>=3 and not cells[0] else cells[0])
        price=euro(cells[2] if len(cells)>=3 and not cells[0] else cells[1])
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
    match=re.search(r'Valeur\s+intrins[eè]que\s*(\d[\d\s.,]*€)',text,re.I)
    return euro(match.group(1)) if match else None

def live_prices():
    prices={};warnings=[]
    try:
        x=spot_live()['price']
        if x is None or x <= 0: warnings.append('Cours BullionVault non trouvé')
        else:prices['instant']=x
    except Exception as e:warnings.append('Cours BullionVault inaccessible : '+str(e)[:100])
    try:
        values=extract_global(fetch('/cours-or-prix-de-l-or/'))
        prices.update(values)
        if 'cpor' not in values:warnings.append('Cours CPoR du lingot non trouvé')
    except Exception as e:warnings.append('Page CPoR inaccessible : '+str(e)[:100])
    if not prices:raise ValueError('Aucun cours extrait. '+ ' ; '.join(warnings))
    return {'prices':prices,'updatedAt':datetime.now(timezone.utc).isoformat(),'warnings':warnings,'origin':'Pages publiques de cotation'}

# Spot public: goldprice.dev (USD/oz), conversion EUR via taux FX Frankfurter.
# Historique: clôtures quotidiennes publiques sur un an, converties au taux de chaque jour.
SPOT_URL='https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT'
HISTORY_URL='https://api.goldprice.dev/v1/public/xau-history'
FX_URL='https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'
FX_HISTORY_URL='https://api.frankfurter.dev/v1/2025-01-01..?base=USD&symbols=EUR'
OUNCE_GRAMS=31.1034768
_cache={}
def json_url(url):
    req=Request(url,headers={'User-Agent':'MonCoursOr/1.0','Accept':'application/json'})
    with urlopen(req,timeout=12) as resp:return json.load(resp)
def cached(key,seconds,loader):
    item=_cache.get(key)
    if item and time.time()-item[0]<seconds:return item[1]
    value=loader();_cache[key]=(time.time(),value);return value
def spot_live():
    def load():
        from bullionvault import fetch_quote
        quote=fetch_quote()
        return dict(price=quote['price'],updatedAt=quote['quotedAt'],retrievedAt=quote['retrievedAt'],source='BullionVault',unit='EUR/kg',currency='EUR')
    return cached('spot-bullionvault',10,load)

def history_live():
    def load():
        raw=json_url(HISTORY_URL)
        # Plusieurs formes JSON possibles: pas de fabrication de données en cas de changement.
        series=raw if isinstance(raw,list) else next((raw[k] for k in ('series','prices','history','data','points') if isinstance(raw.get(k),list)),[])
        parsed=[]
        for item in series:
            if not isinstance(item,dict):continue
            dt=str(next((item[k] for k in ('date','day','timestamp','time','bar_start') if item.get(k)),''))[:10]
            v=next((item[k] for k in ('close','price','value','usd_per_oz') if item.get(k) is not None),None)
            try:
                usd=float(v)
                if re.fullmatch(r'\d{4}-\d{2}-\d{2}',dt) and 100<usd<50000:parsed.append((dt,usd))
            except (TypeError,ValueError):pass
        if not parsed:raise ValueError('Historique public indisponible ou format inconnu')
        first=min(dt for dt,_ in parsed)
        fx_data=json_url('https://api.frankfurter.dev/v1/'+first+'..?base=USD&symbols=EUR')
        rates=fx_data.get('rates',{})
        dates=sorted((d,float(r['EUR'])) for d,r in rates.items() if isinstance(r,dict) and r.get('EUR'))
        if not dates:raise ValueError('Historique des changes indisponible')
        out=[];idx=0
        for dt,usd in sorted(set(parsed)):
            while idx+1<len(dates) and dates[idx+1][0]<=dt:idx+=1
            if dates[idx][0]>dt:continue
            rate=dates[idx][1]
            if .3<rate<2:out.append({'date':dt,'price':round(usd*rate*1000/OUNCE_GRAMS,2)})
        if len(out)<2:raise ValueError('Historique insuffisant')
        return {'points':out,'source':'goldprice.dev + Frankfurter','frequency':'Clôtures quotidiennes (pas de données intrajournalières)'}
    return cached('history',3600,load)

def extract_c3e(html):
    parser=HTMLText();parser.feed(html)
    text=' '.join(' '.join(parser.parts).split())
    # Lecture des seules cellules de la ligne C3E, dans le tableau achat/vente.
    rows=[cells for cells in parser.rows if any(normalize(c)=='argent c3e' for c in cells)]
    if len(rows)!=1:raise ValueError('Ligne Argent C3E absente ou ambiguë')
    row=rows[0];idx=next(i for i,c in enumerate(row) if normalize(c)=='argent c3e')
    amounts=[c for c in row[idx+1:] if c.strip()]
    if len(amounts)!=2 or not all(re.fullmatch(r'[\d\s.,]+\s*€/\s*kg',c) for c in amounts):
        raise ValueError('Colonnes C3E achat/vente non reconnues')
    # Le prix achat doit rester associé à l'en-tête achat précédant vente.
    normalized=normalize(text)
    block=normalized.split('metaux industriels',1)[-1].split('argent c3e',1)[0]
    if not re.search(r'achat\s+vente',block):raise ValueError('En-tête achat/vente C3E non reconnu')
    dates=re.findall(r'(?:le|du)\s+(\d{2}/\d{2}/\d{4})',block)
    if not dates:raise ValueError('Date du cours C3E non trouvée')
    source_date=datetime.strptime(dates[-1],'%d/%m/%Y').date().isoformat()
    value=euro(amounts[0])
    if value is None or value<=0:raise ValueError('Prix achat C3E invalide')
    return {'price':value,'sourceDate':source_date,'unit':'EUR/kg','side':'achat',
            'source':'https://www.cookson-clal.com/cours/'}

def c3e_live():
    req=Request('https://www.cookson-clal.com/cours/',headers={'User-Agent':'Mozilla/5.0','Accept-Language':'fr-FR'})
    with urlopen(req,timeout=16) as response:html=response.read().decode('utf-8',errors='replace')
    return {**extract_c3e(html),'updatedAt':datetime.now(timezone.utc).isoformat()}

SILVER_LABELS=[
 'Lingot Argent 1Kg','Maple Leaf 1 Oz','Vienna Philharmonic 1 Oz',
 'Kangourou 1 Oz','Britannia 1 Oz','American Eagle 1 Oz','Krugerrand Argent 1 Oz',
 'China Panda 30g 2025-26','Kookaburra 1 Oz','Koala 1 Oz',
 'Kookaburra 1Kg (2008-2018)','Koala Argent 1Kg 2025-2026',
 '20 Francs Turin en Argent','50 Francs Hercule','5 Francs Semeuse en Argent',
 '10 Francs Hercule','10 Francs Turin','5 Francs Hercule en Argent (Ecu)',
 '100 Francs en Argent']

def extract_silver(html):
    parser=HTMLText();parser.feed(html)
    products=[]
    # Lecture exclusive de la cellule qui suit le nom du produit.
    # Aucun recours au tableau international ni aux variations/primes.
    for label in SILVER_LABELS:
        matches=[]
        for cells in parser.rows:
            for i,cell in enumerate(cells[:-1]):
                if normalize(cell)==normalize(label):matches.append(cells[i+1])
        price=None;status='unavailable'
        if len(matches)==1:
            if 'suspendue' in normalize(matches[0]):status='suspended'
            else:
                price=euro(matches[0])
                if price is not None and price>0:status='available'
                else:price=None
        products.append({'name':label,'price':price,'status':status})
    if not any(p['status'] in ('available','suspended') for p in products):
        raise ValueError('Tableau des cours argent non reconnu')
    return products

def silver_live():
    return {'products':extract_silver(fetch('/cours-argent-prix-de-l-argent/')),
            'updatedAt':datetime.now(timezone.utc).isoformat(),
            'source':BASE+'/cours-argent-prix-de-l-argent/'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        # Revalider les fichiers de l’application pour les sessions Safari/PWA longues.
        if not self.path.split('?')[0].startswith('/api/'):
            self.send_header('Cache-Control','no-cache, must-revalidate')
        super().end_headers()
    def do_GET(self):
        route=self.path.split('?')[0]
        if route=='/api/c3e':
            try:data=c3e_live();status=200
            except Exception as e:data={'error':str(e)};status=503
            payload=json.dumps(data,ensure_ascii=False).encode('utf-8')
            self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(payload);return
        if route=='/api/silver':
            try:data=silver_live();status=200
            except Exception as e:data={'error':str(e)};status=503
            payload=json.dumps(data,ensure_ascii=False).encode('utf-8')
            self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(payload);return
        if route in ('/api/spot','/api/spot-history'):
            try:
                data=spot_live() if route=='/api/spot' else history_live();status=200
            except Exception as e:data={'error':str(e)};status=503
            payload=json.dumps(data,ensure_ascii=False).encode('utf-8')
            self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(payload);return
        if route!='/api/prices':return super().do_GET()
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
