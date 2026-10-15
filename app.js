const bars=[['bar500','Lingotin 500 g'],['bar250','Lingotin 250 g'],['bar100','Lingotin 100 g'],['bar50','Lingotin 50 g'],['bar20','Lingotin 20 g'],['bar10','Lingotin 10 g'],['bar5','Lingotin 5 g']];
const coins=[['coq','Napoléon 20 F Coq'],['suisse','Croix Suisse 20 F'],['pesos','50 Pesos'],['krugerrand','Krugerrand'],['george','Souverain George V'],['elisabeth','Souverain Elisabeth II']];
const $=id=>document.getElementById(id),eur=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n):'—';
const parseNum=v=>Number(String(v).replace(/\s/g,'').replace(',','.'));let data={};try{data=JSON.parse(localStorage.getItem('or-prices')||'{}')}catch{};
const savedDiscount=localStorage.getItem('or-discount');
if(savedDiscount!==null){$('mult').value=savedDiscount}else{
  const oldMultiplier=localStorage.getItem('or-mult');
  if(oldMultiplier!==null){const old=parseNum(oldMultiplier);if(Number.isFinite(old)&&old>=0&&old<=1){$('mult').value=String(Math.round((1-old)*10000)/100).replace('.',',');localStorage.setItem('or-discount',$('mult').value)}}
}
function draw(){let discount=parseNum($('mult').value);const reference=[data.instant,data.cpor].filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0);const lowest=reference.length?Math.min(...reference):null;$('instant').textContent=eur(data.instant);$('cpor').textContent=eur(data.cpor);$('price18').textContent=Number.isFinite(discount)&&discount>=0&&discount<=100&&lowest!==null?eur(lowest/1000*.75*(1-discount/100))+' /g':'— €/g';for(const [id,label] of [...bars,...coins]){const el=$(id);if(el)el.querySelector('.value').textContent=eur(data[id]);}if(typeof window.drawBuyPrice==='function')window.drawBuyPrice();if(data.updatedAt){const d=new Date(data.updatedAt);$('last-updated').textContent=Number.isNaN(d.getTime())?'Dernière actualisation : —':'Dernière actualisation : '+d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}}
function build(target,items){$(target).innerHTML='';for(const [id,label] of items){let el=document.createElement('div');el.className='row';el.id=id;let n=document.createElement('span');n.className='name';n.textContent=label;let v=document.createElement('span');v.className='value';v.textContent='—';el.append(n,v);$(target).append(el)}}build('cotations',[...bars,...coins]);draw();
$('mult').addEventListener('input',()=>{localStorage.setItem('or-discount',$('mult').value);draw()});
function validate(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Format JSON incorrect');const result={};for(const [key,value] of Object.entries(obj)){if(['updatedAt','origin'].includes(key))continue;if(!['instant','cpor',...bars.map(x=>x[0]),...coins.map(x=>x[0])].includes(key))continue;if(value===null||value==='')continue;const n=typeof value==='number'?value:parseNum(value);if(!Number.isFinite(n)||n<=0)throw Error('Cours invalide : '+key);result[key]=n;}return result;}
$('manual').onclick=()=>{let editor=$('editor');editor.hidden=!editor.hidden;$('json').value=JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k])=>k!=='updatedAt'&&k!=='origin')),null,2);if(!editor.hidden)editor.scrollIntoView({behavior:'smooth'})};
$('save').onclick=()=>{try{let values=validate(JSON.parse($('json').value));data={...data,...values,updatedAt:new Date().toISOString(),origin:'Saisie manuelle'};localStorage.setItem('or-prices',JSON.stringify(data));$('error').textContent='';$('editor').hidden=true;draw()}catch(e){$('error').textContent=e.message}};
async function refreshPrices(){const b=$('refresh');b.disabled=true;b.textContent='Actualisation…';$('status').textContent='Connexion à la source des cours…';try{const r=await fetch('/api/prices',{cache:'no-store'});if(!r.ok)throw Error('Service indisponible (HTTP '+r.status+')');const payload=await r.json();const values=validate(payload.prices||{});if(!Object.keys(values).length)throw Error('Aucune cotation vérifiable trouvée');data={...data,...values,updatedAt:payload.updatedAt||new Date().toISOString(),origin:'Mise à jour'};localStorage.setItem('or-prices',JSON.stringify(data));draw();if(payload.warnings?.length)$('status').textContent+=' · Certaines cotations sont indisponibles : '+payload.warnings.join(', ')}catch(e){$('status').textContent='Mise à jour impossible : '+e.message+'. Les derniers cours enregistrés restent affichés.'}finally{b.disabled=false;b.textContent='↻ Actualiser'}}
$('refresh').onclick=refreshPrices;
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Calculateur de prix d'achat : décote libre, taxe fixe de 11,5 %.
const buyItems=[['cpor','Lingot 1 kg'],...bars,...coins];
const buySelect=$('buy-product');
for(const [id,label] of buyItems){const option=document.createElement('option');option.value=id;option.textContent=label;buySelect.append(option)}
const savedBuyProduct=localStorage.getItem('or-buy-product');
if(buyItems.some(([id])=>id===savedBuyProduct))buySelect.value=savedBuyProduct;else buySelect.value='coq';
const savedBuyDiscount=localStorage.getItem('or-buy-discount');if(savedBuyDiscount!==null)$('buy-discount').value=savedBuyDiscount;
function drawBuy(){const price=data[buySelect.value],raw=$('buy-discount').value,discount=parseNum(raw);$('buy-reference').textContent=eur(price);if(typeof price!=='number'||!Number.isFinite(price)||price<=0||raw.trim()===''||!Number.isFinite(discount)||discount<0||discount>100){$('buy-final').textContent='—';$('buy-tax').textContent='dont — de taxes';return}const discounted=price*(1-discount/100);const tax=discounted*0.115;$('buy-final').textContent=eur(discounted-tax);$('buy-tax').textContent='dont '+eur(tax)+' de taxes'}
window.drawBuyPrice=drawBuy;
buySelect.addEventListener('change',()=>{localStorage.setItem('or-buy-product',buySelect.value);drawBuy()});
$('buy-discount').addEventListener('input',()=>{localStorage.setItem('or-buy-discount',$('buy-discount').value);drawBuy()});
drawBuy();
