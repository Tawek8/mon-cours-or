const bars=[['bar500','Lingotin 500 g'],['bar250','Lingotin 250 g'],['bar100','Lingotin 100 g'],['bar50','Lingotin 50 g'],['bar20','Lingotin 20 g'],['bar10','Lingotin 10 g'],['bar5','Lingotin 5 g']];
const coins=[['coq','Napoléon 20 F Coq'],['suisse','Croix Suisse 20 F'],['pesos','50 Pesos'],['krugerrand','Krugerrand'],['george','Souverain George V'],['elisabeth','Souverain Elisabeth II']];
const $=id=>document.getElementById(id),eur=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n):'—';
const parseNum=v=>Number(String(v).replace(/\s/g,'').replace(',','.'));let data={};try{data=JSON.parse(localStorage.getItem('or-prices')||'{}')}catch{};
const savedDiscount=localStorage.getItem('or-discount');
if(savedDiscount!==null){$('mult').value=savedDiscount}else{
  const oldMultiplier=localStorage.getItem('or-mult');
  if(oldMultiplier!==null){const old=parseNum(oldMultiplier);if(Number.isFinite(old)&&old>=0&&old<=1){$('mult').value=String(Math.round((1-old)*10000)/100).replace('.',',');localStorage.setItem('or-discount',$('mult').value)}}
}
function draw(){let discount=parseNum($('mult').value);const reference=[data.instant,data.cpor].filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0);const lowest=reference.length?Math.min(...reference):null;$('instant').textContent=eur(data.instant);$('cpor').textContent=eur(data.cpor);$('price18').textContent=Number.isFinite(discount)&&discount>=0&&discount<=100&&lowest!==null?eur(lowest/1000*.75*(1-discount/100))+' /g':'— €/g';for(const [id,label] of [...bars,...coins]){const el=$(id);if(el)el.querySelector('.value').textContent=eur(data[id]);}if(data.updatedAt)$('status').textContent='Dernière cotation enregistrée : '+new Date(data.updatedAt).toLocaleString('fr-FR');}
function build(target,items){$(target).innerHTML='';for(const [id,label] of items){let el=document.createElement('div');el.className='row';el.id=id;let n=document.createElement('span');n.className='name';n.textContent=label;let v=document.createElement('span');v.className='value';v.textContent='—';el.append(n,v);$(target).append(el)}}build('cotations',[...bars,...coins]);draw();
$('mult').addEventListener('input',()=>{localStorage.setItem('or-discount',$('mult').value);draw()});
function validate(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Format JSON incorrect');const result={};for(const [key,value] of Object.entries(obj)){if(['updatedAt','origin'].includes(key))continue;if(!['instant','cpor',...bars.map(x=>x[0]),...coins.map(x=>x[0])].includes(key))continue;if(value===null||value==='')continue;const n=typeof value==='number'?value:parseNum(value);if(!Number.isFinite(n)||n<=0)throw Error('Cours invalide : '+key);result[key]=n;}return result;}
$('manual').onclick=()=>{let editor=$('editor');editor.hidden=!editor.hidden;$('json').value=JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k])=>k!=='updatedAt'&&k!=='origin')),null,2);if(!editor.hidden)editor.scrollIntoView({behavior:'smooth'})};
$('save').onclick=()=>{try{let values=validate(JSON.parse($('json').value));data={...data,...values,updatedAt:new Date().toISOString(),origin:'Saisie manuelle'};localStorage.setItem('or-prices',JSON.stringify(data));$('error').textContent='';$('editor').hidden=true;draw()}catch(e){$('error').textContent=e.message}};
async function refreshPrices(){const b=$('refresh');b.disabled=true;b.textContent='Actualisation…';$('status').textContent='Connexion à la source des cours…';try{const r=await fetch('/api/prices',{cache:'no-store'});if(!r.ok)throw Error('Service indisponible (HTTP '+r.status+')');const payload=await r.json();const values=validate(payload.prices||{});if(!Object.keys(values).length)throw Error('Aucune cotation vérifiable trouvée');data={...data,...values,updatedAt:payload.updatedAt||new Date().toISOString(),origin:'Mise à jour'};localStorage.setItem('or-prices',JSON.stringify(data));draw();if(payload.warnings?.length)$('status').textContent+=' · Certaines cotations sont indisponibles : '+payload.warnings.join(', ')}catch(e){$('status').textContent='Mise à jour impossible : '+e.message+'. Les derniers cours enregistrés restent affichés.'}finally{b.disabled=false;b.textContent='↻ Actualiser'}}
$('refresh').onclick=refreshPrices;
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Tirer vers le bas pour actualiser, uniquement lorsque la page est en haut.
(()=>{
 const indicator=$('pull-indicator');let startY=null, distance=0, pulling=false, busy=false;
 document.addEventListener('touchstart',e=>{
   if(e.touches.length!==1||window.scrollY>3||busy||e.target.closest('input,textarea,button'))return;
   startY=e.touches[0].clientY;distance=0;pulling=true;
 },{passive:true});
 document.addEventListener('touchmove',e=>{
   if(!pulling||startY===null)return;
   distance=Math.max(0,e.touches[0].clientY-startY);
   if(window.scrollY>3||distance<15){indicator.classList.remove('visible');return;}
   indicator.textContent=distance>90?'↑ Relâcher pour actualiser':'↓ Tirer pour actualiser';
   indicator.classList.add('visible');
 },{passive:true});
 document.addEventListener('touchend',async()=>{
   if(!pulling)return;pulling=false;startY=null;
   const shouldRefresh=distance>90&&window.scrollY<4;
   if(shouldRefresh){busy=true;indicator.textContent='↻ Actualisation…';try{await refreshPrices()}finally{busy=false;indicator.classList.remove('visible')}}
   else indicator.classList.remove('visible');
   distance=0;
 },{passive:true});
 document.addEventListener('touchcancel',()=>{pulling=false;startY=null;distance=0;indicator.classList.remove('visible')},{passive:true});
})();
