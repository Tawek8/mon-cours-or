(()=>{
 'use strict';
 const keys={gold:'or-prices',silver:'silver-prices',c3e:'c3e-prices'},labels={gold:'Or · Gold.fr / CPoR',silver:'Argent boursable · Gold.fr',c3e:'Argent Non Boursable / bijoux · C3E'};
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
 const previous=read('rate-freshness')||{},state={};
 function validTime(value,now=Date.now()){const n=Date.parse(value);return Number.isFinite(n)&&n<=now+300000?n:null}
 for(const [id,key] of Object.entries(keys)){const saved=read(key);state[id]={...previous[id],at:saved?.updatedAt||null,sourceDate:saved?.sourceDate||null,manual:id==='gold'&&saved?.origin==='Saisie manuelle',pending:false}}
 function persist(){try{localStorage.setItem('rate-freshness',JSON.stringify(state))}catch{}}
 function describe(id,s,now=Date.now()){
  const at=validTime(s.at,now),parts=[];let warn=false;
  if(s.pending)parts.push('actualisation en cours');
  if(s.failed){parts.push('échec de la dernière actualisation · cours enregistré conservé si disponible');warn=true}
  if(s.partial){parts.push('récupération partielle');warn=true}
  if(s.manual){parts.push('contient une saisie manuelle');warn=true}
  if(at===null){parts.push('date de récupération inconnue');warn=true}
  else{parts.push((s.manual?'Enregistrement':'Récupéré')+' le '+new Date(at).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}));if(now-at>30*60000){parts.push('il y a plus de 30 min');warn=true}}
  if(id==='c3e'&&/^\d{4}-\d{2}-\d{2}$/.test(s.sourceDate||''))parts.push('date du cours C3E : '+s.sourceDate.split('-').reverse().join('/'));
  return {text:parts.join(' · '),warn};
 }
 function render(){
  const root=document.getElementById('estimation-client');if(!root)return;
  let box=document.getElementById('rate-freshness');
  if(!box){box=document.createElement('details');box.id='rate-freshness';box.className='rate-freshness';const heading=document.createElement('summary');heading.setAttribute('aria-live','polite');box.append(heading,document.createElement('div'));root.querySelector('.est-head').after(box)}
  const used=window.GoldEstimate?.snapshot().map(r=>r.source)||[],ids=used.length?[...new Set(used)]:Object.keys(keys);let warnings=0;
  const content=box.querySelector('div');content.replaceChildren();
  for(const id of ids){const d=describe(id,state[id]);if(d.warn)warnings++;const row=document.createElement('p');row.textContent=labels[id]+' — '+d.text;row.className=d.warn?'rate-warning':'';content.append(row)}
  box.querySelector('summary').textContent=warnings?'Cours : fraîcheur à vérifier ('+warnings+' source'+(warnings>1?'s':'')+')':'Cours : récupérations récentes';box.classList.toggle('rate-warning',warnings>0);
  const note=document.createElement('p');note.className='rate-explanation';note.textContent='Heures de récupération, pas de cotation. Le seuil de 30 min est un rappel ; les marchés et le C3E ne publient pas en continu.';content.append(note);
 }
 window.GoldFreshness={
  start:id=>{state[id].pending=true;render()},
  success:(id,p)=>{state[id]={at:p.updatedAt||null,sourceDate:p.sourceDate||null,manual:id==='gold'&&p.origin==='Saisie manuelle',partial:!!p.warnings?.length,failed:false,pending:false};persist();render()},
  fail:id=>{state[id].failed=true;state[id].pending=false;persist();render()},render,describe
 };
 window.addEventListener('prices-updated',render);window.addEventListener('estimate-changed',render);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render()});
 setInterval(render,60000);
})();
