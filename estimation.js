(()=>{
'use strict';
const coins=[['coq','Napoléon 20 F Coq',5.806],['suisse','Croix Suisse 20 F',5.806],['pesos','50 Pesos',37.5],['krugerrand','Krugerrand',31.1035],['george','Souverain George V',7.322],['elisabeth','Souverain Elisabeth II',7.322],['demi_napoleon','Demi Napoléon 10 F',2.903],['demi_souverain','Demi Souverain',3.661],['florins','10 Florins',6.048],['tunisie','20 Francs Tunisie',5.806],['union_latine','Union Latine',5.806],['reichsmark','20 Reichsmarks',7.168],['us20','20 Dollars US',30.093],['us10','10 Dollars US',15.046],['us5','5 Dollars US',7.523]];
const bars=[['cpor','Lingot 1 kg',1000],['bar500','Lingotin 500 g',500],['bar250','Lingotin 250 g',250],['bar100','Lingotin 100 g',100],['bar50','Lingotin 50 g',50],['bar20','Lingotin 20 g',20],['bar10','Lingotin 10 g',10],['bar5','Lingotin 5 g',5]];
const all=[...coins,...bars];let seq=0;const lines=[];
const root=document.createElement('section');root.id='estimation-client';root.innerHTML='<div class="est-head"><h2>Estimation client</h2></div><div id="est-rows"></div><div class="est-add-wrap"><button type="button" id="est-add">＋ Ajouter une ligne</button></div><div class="est-summary"><div class="est-totals"><span>Propositions : <b id="est-gross">—</b></span><span>Net à verser au client : <strong id="est-net">—</strong></span></div><details id="est-tax-details"><summary>Détails des taxes et frais</summary><div id="est-breakdown"></div></details></div><p class="est-note">Les cours sont indicatifs. Les calculs sont actualisés à partir des dernières cotations disponibles.</p>';
const cpor=document.getElementById('cpor-section');cpor.parentNode.insertBefore(root,cpor.nextSibling);
const $=id=>document.getElementById(id), fmt=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—', num=v=>{let n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0};
const opt=(value,label)=>`<option value="${value}">${label}</option>`;
const catalog=opt('bijou','Bijoux en or')+all.map(p=>opt(p[0],p[1])).join('');
function data(){try{return JSON.parse(localStorage.getItem('or-prices')||'{}')}catch{return {}}}
function spot(){const d=data();let x=null;try{x=JSON.parse(localStorage.getItem('or-spot-last')||'null')?.price}catch{}return (Number.isFinite(x)&&x>0?x:(d.instant>0?d.instant:(d.cpor>0?d.cpor:null)))}
function reference(l){const s=spot();if(l.product==='bijou')return s? s/1000*({9:.375,14:.585,18:.75,22:.9}[l.titre]):null;const p=all.find(x=>x[0]===l.product);if(l.mode==='fonte')return s? s/1000*p[2]:null;return data()[l.product]>0?data()[l.product]:null}
function defaultGtax(l){const s=spot(),kg=data().cpor;const purity=({9:.375,14:.585,18:.75,22:.9})[l.titre],discount=({9:.31,14:.27,18:.25,22:.25})[l.titre];if(!(s>0&&kg>0))return null;return 100*(1-Math.min(kg,s)*purity*(1-discount)/(s*purity));}
function effectiveGtax(l){return l.gtax===null?defaultGtax(l):num(l.gtax)}
function suggested(l){if(l.product==='bijou' && l.gtax===null){const s=spot(),kg=data().cpor,purity=({9:.375,14:.585,18:.75,22:.9})[l.titre],discount=({9:.31,14:.27,18:.25,22:.25})[l.titre];return s>0&&kg>0?Math.min(kg,s)*purity*(1-discount)/1000:null;}const r=reference(l);const reduction=l.product==='bijou'?effectiveGtax(l):num(l.fees);return r===null||reduction===null?null:Math.max(0,r*(1-reduction/100))}
function price(l){return l.manual===null?suggested(l):num(l.manual)}
function calc(l){const unit=price(l);if(unit===null)return null;const jewelry=l.product==='bijou';const gross=unit*num(jewelry?l.weight:l.qty);const fees=0;let tax=0,explain='',details='';if(jewelry){tax=gross>5000?gross*.065:0;explain=gross>5000?'Bijou : taxe 6,5 %':'Bijou : exonéré (≤ 5 000 €)';details=`Montant du bijou : ${fmt(gross)}`;}else if(l.fiscal==='TMP'){tax=gross*.115;explain='TMP : 11,5 %';details=`Base taxable : ${fmt(gross)}`;}else{const cost=num(l.cost)*num(l.qty);const date=l.date?new Date(l.date+'T00:00:00'):null;const now=new Date();let years=date&&!Number.isNaN(date.getTime())?now.getFullYear()-date.getFullYear()-(now.getMonth()<date.getMonth()||(now.getMonth()===date.getMonth()&&now.getDate()<date.getDate())?1:0):0;years=Math.max(0,years);const abate=date?Math.min(1,Math.max(0,years-2)*.05):0;const gain=Math.max(0,gross-cost);tax=gain*(1-abate)*.362;explain='TPV : 36,2 % de la plus-value après abattement';details=`Acquisition : ${fmt(cost)} · Plus-value : ${fmt(gain)} · Détention : ${years} an(s) · Abattement : ${(abate*100).toLocaleString('fr-FR')} %`;if(!l.date||!l.cost)details+=' · Saisir prix et date d’acquisition pour une estimation TPV complète';}return {gross,fees,tax,net:gross-fees-tax,explain,details};}
function newLine(){return {id:++seq,product:'bijou',titre:'18',weight:'',gtax:null,mode:'cpor',qty:'1',fees:'8',fiscal:'TMP',cost:'',date:'',manual:null}}
function input(field,value,label){return `<label>${label}<input data-field="${field}" type="text" inputmode="decimal" value="${String(value??'').replace(/"/g,'&quot;')}"></label>`}
function render(){const rows=$('est-rows');rows.replaceChildren();for(const [i,l] of lines.entries()){
const jewelry=l.product==='bijou',r=reference(l),p=price(l),c=calc(l);const el=document.createElement('div');el.className='est-row';el.dataset.id=l.id;
el.innerHTML=`<div class="est-rowtop"><span class="est-num">${i+1}.</span><select data-field="product" aria-label="Produit">${catalog}</select><button type="button" data-action="remove" class="est-remove" title="Supprimer la ligne">×</button></div>`+(jewelry?`<div class="est-fields est-four"><label>Titrage<select data-field="titre">${opt('9','9K · 375‰')+opt('14','14K · 585‰')+opt('18','18K · 750‰')+opt('22','22K · 900‰')}</select></label>${input('weight',l.weight,'Poids total (g)')}${input('manual',l.manual===null?(p===null?'':p.toFixed(2)):l.manual,'Prix proposé €/g')}${input('gtax',effectiveGtax(l)===null?'':(l.gtax===null?effectiveGtax(l).toFixed(2):String(l.gtax)),'GtaX %')}</div>`:`<div class="est-mode"><span>Valorisation</span><div><button type="button" data-action="cpor" class="${l.mode==='cpor'?'chosen':''}">Boursable</button><button type="button" data-action="fonte" class="${l.mode==='fonte'?'chosen':''}">Fonte</button></div></div><div class="est-fields est-four">${input('qty',l.qty,'Quantité')}${input('manual',l.manual===null?(p===null?'':p.toFixed(2)):l.manual,'Prix proposé / unité (€)')}${input('fees',l.fees,'FC %')}<label>Fiscalité<select data-field="fiscal">${opt('TMP','TMP')+opt('TPV','TPV')}</select></label></div>${l.fiscal==='TPV'?`<div class="est-fields est-two">${input('cost',l.cost,'Prix d’achat / unité (€)')}<label>Date d’acquisition<input data-field="date" type="date" value="${l.date}"></label></div>`:''}`)+`<div class="est-rowbottom"><span>Taxe : ${c?fmt(c.tax):'Cours indisponible'}</span><b>Net client : ${c?fmt(c.net):'—'}</b></div>`;
rows.append(el);el.querySelector('[data-field="product"]').value=l.product;if(jewelry)el.querySelector('[data-field="titre"]').value=l.titre;else el.querySelector('[data-field="fiscal"]').value=l.fiscal;
}
summary();}
function summary(){let gross=0,net=0,fees=0,tax=0,missing=0;const detail=[];for(const [i,l] of lines.entries()){const c=calc(l);if(!c){missing++;continue;}gross+=c.gross;net+=c.net;fees+=c.fees;tax+=c.tax;const name=l.product==='bijou'?`Bijoux ${l.titre}K · ${l.weight} g`:(all.find(p=>p[0]===l.product)?.[1]||l.product)+` · ${l.qty} unité(s)`;detail.push(`<div class="est-tax-item"><div><b>${i+1}. ${name}</b><strong>${fmt(c.tax)}</strong></div><small>${c.explain}</small><small>${c.details}</small></div>`)}$('est-gross').textContent=fmt(gross);$('est-net').textContent=missing?'— (cours manquant)':fmt(net);$('est-breakdown').innerHTML=detail.join('')+`<div class="est-tax-total"><b>Total taxes</b><b>${fmt(tax)}</b></div>`+(missing?`<small>${missing} ligne(s) sans cotation disponible : non comprises dans le total.</small>`:'');}
$('est-add').addEventListener('click',()=>{lines.push(newLine());render()});$('est-rows').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=Number(b.closest('.est-row').dataset.id),i=lines.findIndex(l=>l.id===id);if(i<0)return;if(b.dataset.action==='remove')lines.splice(i,1);else {lines[i].mode=b.dataset.action;lines[i].fees=lines[i].mode==='fonte'?'12':'8';lines[i].manual=null;}render()});
$('est-rows').addEventListener('change',e=>{const f=e.target.dataset.field;if(!f)return;const l=lines.find(x=>x.id===Number(e.target.closest('.est-row').dataset.id));if(!l)return;const v=e.target.value;if(f==='product'){l.product=v;l.manual=null;if(v==='bijou'){l.gtax=null}else{l.mode='cpor';l.fees='8'}}else if(f==='titre'){l.titre=v;l.manual=null;l.gtax=null}else if(f==='fiscal')l.fiscal=v;else if(f==='gtax'){l.gtax=v;l.manual=null}else if(f==='fees'){l.fees=v;l.manual=null}else if(f==='manual'){l.manual=v;if(l.product==='bijou'&&reference(l)>0)l.gtax=(100*(1-num(v)/reference(l))).toFixed(2)}else l[f]=v;render()});
// Actualiser les prix proposés à chaque retour de données sans interférer avec l'application d'origine.
const observer=new MutationObserver(()=>{if(!root.hidden)render()});const updated=$('last-updated');if(updated)observer.observe(updated,{childList:true,characterData:true,subtree:true});
// Sur PC seulement, afficher le bouton Actualiser en haut à droite du titre.
// On déplace le bouton d'origine pour conserver son gestionnaire de clic.
const refreshButton=document.getElementById('refresh');
const toolbar=refreshButton?.parentElement;
const heading=document.querySelector('main > .heading');
const pcLayout=window.matchMedia('(min-width: 900px)');
function placeRefresh(){
  if(!refreshButton||!toolbar||!heading)return;
  if(pcLayout.matches){
    heading.appendChild(refreshButton);
    refreshButton.classList.add('pc-top-refresh');
  }else{
    toolbar.insertBefore(refreshButton,toolbar.firstChild);
    refreshButton.classList.remove('pc-top-refresh');
  }
}
pcLayout.addEventListener('change',placeRefresh);
placeRefresh();
lines.push(newLine());render();
})();
