"""Cours Bid Kitco reçu directement en EUR/kg, sans conversion locale."""
import gzip,json,math,re,time
from datetime import datetime,timezone,timedelta
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError
from urllib.request import Request,urlopen
from urllib.parse import urlencode
URL='https://api.kitco.com/adaptor-mobile/v1/precious'
def parse(payload,retrieved_at=None):
 value=payload['PreciousMetals']['PM']
 if not isinstance(value,dict) or value.get('Symbol')!='AU' or value.get('Currency')!='EUR' or value.get('Unit')!='KILO':raise ValueError('Cours Kitco : métal, devise ou unité inattendu')
 bid=value.get('Bid')
 if isinstance(bid,bool) or not isinstance(bid,(int,float)) or not math.isfinite(bid) or bid<=0:raise ValueError('Cours Kitco invalide')
 raw_stamp=value.get('Timestamp')
 if not isinstance(raw_stamp,str) or not re.fullmatch(r'[A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2}',raw_stamp):raise ValueError('Horodatage Kitco non reconnu')
 months={name:i+1 for i,name in enumerate(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])}
 match=re.fullmatch(r'([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) (\d{2}):(\d{2})',raw_stamp)
 month,day,year,hour,minute=match.groups()
 local=datetime(int(year),months[month],int(day),int(hour),int(minute))
 try:ny=ZoneInfo('America/New_York')
 except ZoneInfoNotFoundError:
  def sunday(month,index):
   first=datetime(local.year,month,1,2)
   return first+timedelta(days=(6-first.weekday())%7+7*(index-1))
  ny=timezone(timedelta(hours=-4 if sunday(3,2)<=local<sunday(11,1) else -5))
 at=local.replace(tzinfo=ny).astimezone(timezone.utc)
 now=datetime.fromisoformat(retrieved_at) if retrieved_at else datetime.now(timezone.utc)
 if now.tzinfo is None:raise ValueError('Heure de récupération sans fuseau')
 age=(now-at).total_seconds()
 if not -30<=age<=180:raise ValueError('Cours Kitco non récent')
 return dict(price=bid,prices={'instant':bid},unit='EUR/kg',currency='EUR',metal='Or',source='Kitco',basis='Bid',sourceTimestamp=raw_stamp,sourceTimeZone='America/New_York',quotedAt=at.isoformat(),retrievedAt=now.isoformat(),ageSeconds=round(age,1))

def fetch_quote():
 params=dict(symbol='AU',currency='EUR',unit='KILO',type='json',ver='2.0',noCache=int(time.time()*1000))
 req=Request(URL+'?'+urlencode(params),headers={'User-Agent':'Mozilla/5.0','Referer':'https://widgets.kitco.com/','Cache-Control':'no-cache','Accept':'application/json','Accept-Encoding':'identity'})
 with urlopen(req,timeout=20) as response:raw=response.read(1_000_001)
 if len(raw)>1_000_000:raise ValueError('Réponse Kitco trop volumineuse')
 if raw.startswith(b'\x1f\x8b'):
  raw=gzip.decompress(raw)
  if len(raw)>1_000_000:raise ValueError('Réponse Kitco trop volumineuse')
 return parse(json.loads(raw))
