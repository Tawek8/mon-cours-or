const bars=[['cpor','Lingot 1 kg'],['bar500','Lingotin 500 g'],['bar250','Lingotin 250 g'],['bar100','Lingotin 100 g'],['bar50','Lingotin 50 g'],['bar20','Lingotin 20 g'],['bar10','Lingotin 10 g'],['bar5','Lingotin 5 g']];
const coins=[['coq','Napoléon 20 F Coq'],['suisse','Croix Suisse 20 F'],['pesos','50 Pesos'],['krugerrand','Krugerrand'],['george','Souverain George V'],['elisabeth','Souverain Elisabeth II'],['demi_napoleon','Demi Napoléon 10 F'],['demi_souverain','Demi Souverain'],['florins','10 Florins'],['tunisie','20 Francs Tunisie'],['union_latine','Union Latine'],['reichsmark','20 Reichsmarks'],['us20','20 Dollars US'],['us10','10 Dollars US'],['us5','5 Dollars US']];
const $=id=>document.getElementById(id),eur=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n):'—';
const parseNum=v=>Number(String(v).replace(/\s/g,'').replace(',','.'));
let data={};try{data=JSON.parse(localStorage.getItem('or-prices')||'{}')}catch{}
const savedDiscount=localStorage.getItem('or-discount');
if(savedDiscount!==null)$('mult').value=savedDiscount;
else{const old=localStorage.getItem('or-mult');if(old!==null){const n=parseNum(old);if(Number.isFinite(n)&&n>=0&&n<=1)$('mult').value=String(Math.round((1-n)*10000)/100).replace('.',',')}}
let activeTab='bars',selected=null;
const savedBuyDiscount=localStorage.getItem('or-buy-discount');if(savedBuyDiscount!==null)$('buy-discount').value=savedBuyDiscount;
function renderQuotes(){const list=(activeTab==='bars'?bars:coins);const root=$('cotations');root.replaceChildren();if(!list.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Aucun produit trouvé';root.append(empty)}for(const [id,name] of list){const price=data[id];const available=typeof price==='number'&&Number.isFinite(price)&&price>0;const button=document.createElement('button');button.type='button';button.className='quote';button.disabled=!available;const title=document.createElement('span');title.className='name';title.textContent=name;const value=document.createElement('span');value.className='value';value.textContent=available?eur(price):'Indisponible';button.append(title,value);if(available){const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='›';button.append(arrow);button.addEventListener('click',()=>openBuy(id,name))}root.append(button)}}
function drawBuy(){if(!selected)return;const price=data[selected.id];$('buy-reference').textContent=eur(price);const raw=$('buy-discount').value,discount=parseNum(raw);if(typeof price!=='number'||!Number.isFinite(price)||price<=0||raw.trim()===''||!Number.isFinite(discount)||discount<0||discount>100){$('buy-final').textContent='—';$('buy-tax').textContent='dont — de taxes';drawTax(null);return}const discounted=price*(1-discount/100),tax=discounted*.115;$('buy-final').textContent=eur(discounted-tax);$('buy-tax').textContent='dont '+eur(tax)+' de taxes';drawTax(discounted)}
function drawTax(gross){
  const panel=$('tax-compare'),hint=$('tax-hint');
  const costRaw=$('tax-cost').value,dateRaw=$('tax-date').value;
  const cost=parseNum(costRaw),rate=36.2;
  const date=dateRaw?new Date(dateRaw+'T12:00:00'):null;
  const today=new Date();today.setHours(12,0,0,0);
  if(gross===null||!Number.isFinite(gross)||costRaw.trim()===''||!Number.isFinite(cost)||cost<0||!date||Number.isNaN(date.getTime())||date>today){
    panel.hidden=true;hint.textContent='Renseigne un prix d’acquisition et une date passée pour comparer.';return;
  }
  let years=today.getFullYear()-date.getFullYear();
  if(today.getMonth()<date.getMonth()||(today.getMonth()===date.getMonth()&&today.getDate()<date.getDate()))years--;
  const allowance=Math.min(100,Math.max(0,years-2)*5)/100;
  const gain=Math.max(0,gross-cost),pvTax=gain*(1-allowance)*(rate/100),tmpTax=gross*.115;
  const tmpNet=gross-tmpTax,pvNet=gross-pvTax;
  $('tax-tmp-net').textContent=eur(tmpNet);
  $('tax-pv-net').textContent=eur(pvNet);
  $('tax-pv-amount').textContent=eur(pvTax);
  $('tax-best').textContent=Math.abs(pvNet-tmpNet)<.005?'Résultat équivalent pour les deux régimes':(pvNet>tmpNet?'Plus-value potentiellement plus avantageuse de ':'Taxe forfaitaire potentiellement plus avantageuse de ')+eur(Math.abs(pvNet-tmpNet));
  $('tax-years').textContent=years+' année(s) complète(s) de détention · abattement de '+Math.round(allowance*100)+' % sur la plus-value.';
  panel.hidden=false;hint.textContent='Comparaison indicative sur le prix de rachat après décote, avant taxe.';
}
for(const id of ['tax-cost','tax-date'])$(id).addEventListener('input',drawBuy);
$('tax-toggle').addEventListener('toggle',()=>{if($('tax-toggle').open)drawBuy()});
function openBuy(id,name){selected={id,name};$('buy-name').textContent=name;$('tax-toggle').open=false;$('tax-cost').value='';$('tax-date').value='';$('cpor-section').hidden=true;document.querySelector('section:not(#cpor-section):not(#buy-page)').hidden=true;document.querySelector('.hero').hidden=true;$('buy-page').hidden=false;$('refresh').closest('.toolbar').hidden=true;$('status').hidden=true;$('editor').hidden=true;drawBuy();history.pushState({buy:id},'', '#achat-'+encodeURIComponent(id));$('buy-page').scrollIntoView({block:'start',behavior:'instant'})}
function closeBuy(updateHistory=true){selected=null;$('buy-page').hidden=true;$('cpor-section').hidden=false;document.querySelector('section:not(#cpor-section):not(#buy-page)').hidden=false;document.querySelector('.hero').hidden=false;$('refresh').closest('.toolbar').hidden=false;$('status').hidden=false;if(updateHistory&&location.hash.startsWith('#achat-'))history.replaceState(null,'',location.pathname+location.search);$('cpor-section').scrollIntoView({block:'start',behavior:'instant'})}
$('back').addEventListener('click',()=>closeBuy());window.addEventListener('popstate',()=>{if(selected)closeBuy(false)});
for(const type of ['bars','coins'])$('tab-'+type).addEventListener('click',()=>{activeTab=type;for(const t of ['bars','coins']){$('tab-'+t).classList.toggle('active',t===type);$('tab-'+t).setAttribute('aria-selected',String(t===type))}$('cotations').scrollTop=0;renderQuotes()});
$('buy-discount').addEventListener('input',()=>{localStorage.setItem('or-buy-discount',$('buy-discount').value);drawBuy()});
function draw(){const raw=$('mult').value,discount=parseNum(raw);const instant=Number.isFinite(data.instant)&&data.instant>0?data.instant:null,cpor=Number.isFinite(data.cpor)&&data.cpor>0?data.cpor:null;const lowest=instant!==null&&cpor!==null?Math.min(instant,cpor):null;$('instant').textContent=eur(data.instant);$('price18').textContent=raw.trim()!==''&&Number.isFinite(discount)&&discount>=0&&discount<=100&&lowest!==null?eur(lowest/1000*.75*(1-discount/100))+' /g':'— €/g';renderQuotes();drawBuy();if(data.updatedAt){const d=new Date(data.updatedAt);$('last-updated').textContent=Number.isNaN(d.getTime())?'Dernière actualisation : —':'Dernière actualisation : '+d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}}
$('mult').addEventListener('input',()=>{localStorage.setItem('or-discount',$('mult').value);draw()});
const allowed=new Set(['instant',...bars.map(p=>p[0]),...coins.map(p=>p[0])]);
function validate(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Format JSON incorrect');const result={};for(const [key,value] of Object.entries(obj)){if(!allowed.has(key)||value===null||value==='')continue;const n=typeof value==='number'?value:parseNum(value);if(!Number.isFinite(n)||n<=0)throw Error('Cours invalide : '+key);result[key]=n}return result}
$('manual').onclick=()=>{const editor=$('editor');editor.hidden=!editor.hidden;$('json').value=JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k])=>allowed.has(k))),null,2);if(!editor.hidden)editor.scrollIntoView({behavior:'smooth'})};
$('save').onclick=()=>{try{const values=validate(JSON.parse($('json').value));data={...data,...values,updatedAt:new Date().toISOString(),origin:'Saisie manuelle'};localStorage.setItem('or-prices',JSON.stringify(data));$('error').textContent='';$('editor').hidden=true;draw()}catch(e){$('error').textContent=e.message}};
async function refreshPrices(){const b=$('refresh');b.disabled=true;b.textContent='Actualisation…';$('status').textContent='Connexion à la source des cours…';try{const r=await fetch('/api/prices',{cache:'no-store'});if(!r.ok)throw Error('Service indisponible (HTTP '+r.status+')');const payload=await r.json();const values=validate(payload.prices||{});if(!Object.keys(values).length)throw Error('Aucune cotation vérifiable trouvée');const oldKeys=new Set(Object.keys(data));for(const key of allowed)if(!(key in values))delete data[key];data={...data,...values,updatedAt:payload.updatedAt||new Date().toISOString(),origin:'Mise à jour'};localStorage.setItem('or-prices',JSON.stringify(data));draw();$('status').textContent=payload.warnings?.length?'Actualisé · Certaines cotations sont indisponibles : '+payload.warnings.join(', '):'Cours actualisés.'}catch(e){$('status').textContent='Mise à jour impossible : '+e.message+'. Les derniers cours enregistrés restent affichés.'}finally{b.disabled=false;b.textContent='↻ Actualiser'}}
$('refresh').onclick=refreshPrices;if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});draw();


// Actualisation discrète en tirant vers le bas depuis le haut de la page.
// Aucun bandeau ou message supplémentaire n'est affiché.
let pullStartY=null, pullDistance=0;
const atPageTop=()=>window.scrollY<=2 && document.documentElement.scrollTop<=2;
document.addEventListener('touchstart',event=>{
  pullStartY=null;pullDistance=0;
  if(event.touches.length!==1||!atPageTop()||event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
  pullStartY=event.touches[0].clientY;
},{passive:true});
document.addEventListener('touchmove',event=>{
  if(pullStartY===null||event.touches.length!==1)return;
  if(!atPageTop()){pullStartY=null;pullDistance=0;return;}
  pullDistance=Math.max(0,event.touches[0].clientY-pullStartY);
},{passive:true});
document.addEventListener('touchend',()=>{
  const shouldRefresh=pullStartY!==null&&pullDistance>=75&&atPageTop();
  pullStartY=null;pullDistance=0;
  if(shouldRefresh&&!$('refresh').disabled)refreshPrices();
},{passive:true});
document.addEventListener('touchcancel',()=>{pullStartY=null;pullDistance=0;},{passive:true});
