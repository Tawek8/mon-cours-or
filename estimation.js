(()=>{
'use strict';
const coins=[['coq','Napoléon 20 F Coq',5.806],['suisse','Croix Suisse 20 F',5.806],['pesos','50 Pesos',37.5],['krugerrand','Krugerrand',31.1035],['george','Souverain George V',7.322],['elisabeth','Souverain Elisabeth II',7.322],['demi_napoleon','Demi Napoléon 10 F',2.903],['demi_souverain','Demi Souverain',3.661],['florins','10 Florins',6.048],['tunisie','20 Francs Tunisie',5.806],['union_latine','Union Latine',5.806],['reichsmark','20 Reichsmarks',7.168],['us20','20 Dollars US',30.093],['us10','10 Dollars US',15.046],['us5','5 Dollars US',7.523]];
const bars=[['cpor','Lingot 1 kg',1000],['bar500','Lingotin 500 g',500],['bar250','Lingotin 250 g',250],['bar100','Lingotin 100 g',100],['bar50','Lingotin 50 g',50],['bar20','Lingotin 20 g',20],['bar10','Lingotin 10 g',10],['bar5','Lingotin 5 g',5]];
// Troisième champ : grammes d'argent FIN, pas le poids brut.
const silverCoins=[
 ['ag_turin20','20 Francs Turin en Argent',13.6,34],
 ['ag_hercule50','50 Francs Hercule',27,34],
 ['ag_semeuse5','5 Francs Semeuse en Argent',10.02,34],
 ['ag_hercule10','10 Francs Hercule',22.5,34],
 ['ag_turin10','10 Francs Turin',6.8,34],
 ['ag_ecu5','5 Francs Hercule en Argent (Ecu)',22.5,34],
 ['ag_francs100','100 Francs en Argent',13.5,34],
 ['ag_maple','Maple Leaf 1 Oz',31.1034768,20],
 ['ag_philharmonic','Vienna Philharmonic 1 Oz',31.1034768,20],
 ['ag_kangaroo','Kangourou 1 Oz',31.1034768,20],
 ['ag_britannia','Britannia 1 Oz',31.1034768,20],
 ['ag_eagle','American Eagle 1 Oz',31.1034768,20],
 ['ag_krugerrand','Krugerrand Argent 1 Oz',31.1034768,20],
 ['ag_panda','China Panda 30g 2025-26',30,20],
 ['ag_kookaburra','Kookaburra 1 Oz',31.1034768,20],
 ['ag_koala','Koala 1 Oz',31.1034768,20],
 ['ag_kookaburra_kg','Kookaburra 1Kg (2008-2018)',1000,20],
 ['ag_koala_kg','Koala Argent 1Kg 2025-2026',1000,20]
];
const isDiverse=l=>l.product==='divers_or'||l.product==='divers_argent';
const silverCoin=l=>silverCoins.find(p=>p[0]===l.product);
function defaultFees(l){if(isDiverse(l))return l.product==='divers_argent'?'34':'12';const p=silverCoin(l);return String(p?p[3]:l.mode==='fonte'?12:8)}
const all=[...coins,...bars];let seq=0;const lines=[];let openLine=null;
const root=document.createElement('section');root.id='estimation-client';root.innerHTML='<div class="est-head"><h2>Estimation client</h2></div><div id="est-rows"></div><div class="est-add-wrap"><button type="button" id="est-add">＋ Ajouter une ligne</button></div><div class="est-summary"><div class="est-totals"><span>Propositions : <b id="est-gross">—</b></span><span class="est-net-block"><span>Net à verser au client : <strong id="est-net">—</strong></span><small id="est-fc-total" class="est-fc-net"></small></span></div><details id="est-tax-details"><summary>Détails des taxes et frais</summary><div id="est-breakdown"></div></details></div><p class="est-note">Les cours sont indicatifs. Les calculs sont actualisés à partir des dernières cotations disponibles.</p><div class="est-reset-wrap"><button type="button" id="est-reset" class="secondary">Réinitialiser</button><button type="button" id="est-print">Imprimer</button></div>';
const cpor=document.getElementById('cpor-section');cpor.parentNode.insertBefore(root,cpor.nextSibling);
const $=id=>document.getElementById(id), fmt=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—', num=v=>{let n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0};
const opt=(value,label)=>`<option value="${value}">${label}</option>`;
const searchable=[['bijou','Bijoux en or'],['bijou_argent','Bijoux en argent · 925‰'],['divers_or','Pièce Divers Or'],['divers_argent','Pièce Divers Argent'],...all.map(p=>[p[0],p[1]+' · Or']),...silverCoins.map(p=>[p[0],p[1]+' · Argent'])];
const normalizeSearch=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const catalog=searchable.map(p=>opt(p[0],p[1])).join('');
function attachSearch(el,l){
 const select=el.querySelector('[data-field="product"]');select.hidden=true;
 const wrap=document.createElement('div');wrap.className='product-search';
 const input=document.createElement('input');input.type='search';input.placeholder='Rechercher un produit…';input.autocomplete='off';input.setAttribute('aria-label','Rechercher un produit');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
 const list=document.createElement('div');list.id='product-options-'+l.id;list.className='product-options';list.setAttribute('role','listbox');list.hidden=true;input.setAttribute('aria-controls',list.id);
 const selectedName=()=>searchable.find(p=>p[0]===l.product)?.[1]||'';input.value=selectedName();let matches=[],active=-1;
 function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.value=selectedName()}
 function choose(p){select.value=p[0];select.dispatchEvent(new Event('change',{bubbles:true}))}
 function mark(){const buttons=list.querySelectorAll('[role="option"]');buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));if(buttons[active]){input.setAttribute('aria-activedescendant',buttons[active].id);buttons[active].scrollIntoView({block:'nearest'})}}
 function show(term){const words=normalizeSearch(term).trim().split(/\s+/).filter(Boolean);matches=searchable.filter(p=>words.every(w=>normalizeSearch(p[1]).includes(w)));active=-1;list.replaceChildren();
  for(const [i,p] of matches.entries()){const b=document.createElement('button');b.type='button';b.id=list.id+'-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.tabIndex=-1;b.textContent=p[1];b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=()=>choose(p);list.append(b)}
  if(!matches.length){const empty=document.createElement('div');empty.className='product-empty';empty.textContent='Aucun produit trouvé';list.append(empty)}list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.onfocus=()=>{input.select();show('')};input.oninput=()=>show(input.value);
 input.onkeydown=e=>{if(e.key==='Escape'){close();e.preventDefault()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)show(input.value);if(matches.length){active=(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;mark()}}else if(e.key==='Enter'){e.preventDefault();if(!list.hidden&&matches.length&&(active>=0||matches.length===1))choose(matches[active>=0?active:0])}};
 wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close()});wrap.append(input,list);select.after(wrap);
}
function data(){try{return JSON.parse(localStorage.getItem('or-prices')||'{}')}catch{return {}}}
function intrinsic(){const v=data().instant;return Number.isFinite(v)&&v>0?v:null}
function isJewelry(l){return l.product==='bijou'||l.product==='bijou_argent'}
function c3e(){try{const v=JSON.parse(localStorage.getItem('c3e-prices')||'null')?.price;return Number.isFinite(v)&&v>0?v:null}catch{return null}}
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cents=v=>Math.round((v+Number.EPSILON)*100)/100;
function reference(l){if(isDiverse(l)){const weight=GoldFiscal.amount(l.coinWeight),purity=GoldFiscal.amount(l.purity),kg=l.product==='divers_argent'?c3e():intrinsic();return weight>0&&purity>0&&purity<=1000&&kg>0?kg*weight*(purity/1000)/1000:null}const ag=silverCoin(l);if(ag){if(l.mode==='fonte'){const c=c3e();return c===null?null:c*ag[2]/1000}try{const quote=JSON.parse(localStorage.getItem('silver-prices')||'{}').products?.find(p=>p.name===ag[1]);return quote?.status==='available'&&Number.isFinite(quote.price)&&quote.price>0?quote.price:null}catch{return null}}if(l.product==='bijou_argent'){const c=c3e();return c===null?null:c*.925/1000}const s=intrinsic();if(l.product==='bijou')return s? s/1000*({9:.375,14:.585,18:.75,22:.9}[l.titre]):null;const p=all.find(x=>x[0]===l.product);if(l.mode==='fonte')return s? s/1000*p[2]:null;return data()[l.product]>0?data()[l.product]:null}
function defaultGtax(l){if(l.product==='bijou_argent')return 57;const s=intrinsic(),kg=data().cpor;const purity=({9:.375,14:.585,18:.75,22:.9})[l.titre],discount=({9:.31,14:.27,18:.25,22:.25})[l.titre];if(!(s>0&&kg>0))return null;return 100*(1-Math.min(kg,s)*purity*(1-discount)/(s*purity));}
function effectiveGtax(l){if(l.gtax===null)return defaultGtax(l);const raw=String(l.gtax).trim(),v=Number(raw.replace(/\s/g,'').replace(',','.'));return raw!==''&&Number.isFinite(v)&&v<=100?v:null}
function enteredFees(value){const raw=String(value??'').trim();if(!raw)return null;const n=Number(raw.replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)&&n<=100?n:null}
function effectiveFees(l){if(l.manual===null)return enteredFees(l.fees);const r=reference(l),p=price(l);return r>0&&p!==null?100*(1-p/r):null}
function displayedFees(l){const fc=effectiveFees(l);return l.manual===null?l.fees:fc===null?'':fc.toFixed(2)}
function suggested(l){if(silverCoin(l)||l.product==='divers_argent'){const r=reference(l);const fc=enteredFees(l.fees);return r===null||fc===null||fc>100?null:cents(Math.max(0,r*(1-fc/100)))}if(l.product==='bijou_argent'){const r=reference(l);const g=effectiveGtax(l);return r===null||g===null?null:cents(Math.max(0,r*(1-g/100)))}if(l.product==='bijou' && l.gtax===null){const s=intrinsic(),kg=data().cpor,purity=({9:.375,14:.585,18:.75,22:.9})[l.titre],discount=({9:.31,14:.27,18:.25,22:.25})[l.titre];return s>0&&kg>0?Math.min(kg,s)*purity*(1-discount)/1000:null;}const r=reference(l);const reduction=l.product==='bijou'?effectiveGtax(l):enteredFees(l.fees);return r===null||reduction===null||reduction>100?null:Math.max(0,r*(1-reduction/100))}
function price(l){if(isDiverse(l)&&reference(l)===null)return null;if(l.netManual!=null)return grossFromNet(l);if(l.manual===null)return suggested(l);const v=GoldFiscal.amount(l.manual);return v===null?null:l.product==='bijou_argent'||silverCoin(l)?cents(v):v}
function grossFromNet(l){
 const net=GoldFiscal.amount(l.netManual);if(net===null)return null;
 const count=GoldFiscal.amount(isJewelry(l)?l.weight:l.qty)||1,total=net*count;
 if(isJewelry(l))return total<=5000?net:net/.935;
 const cost=GoldFiscal.amount(l.cost),comparison=l.fiscal==='TPV'?GoldFiscal.compare(0,cost===null?'':cost*count,l.datePending?'':l.date):null;
 let gross=total/.885;
 if(comparison?.complete){const k=.362*(1-comparison.allowance),pvGross=total<=comparison.cost?total:(total-k*comparison.cost)/(1-k);gross=Math.min(gross,pvGross)}
 return gross/count;
}
function netUnit(l){const count=GoldFiscal.amount(isJewelry(l)?l.weight:l.qty);if(l.netManual!=null)return GoldFiscal.amount(l.netManual);if(count>0){const c=calc(l);return c?c.net/count:null}const clone={...l,weight:'1',qty:'1'};const c=calc(clone);return c?c.net:null}
function fcNet(l,c=calc(l)){if(!c||l.product==='bijou_argent'||l.product==='divers_argent'||silverCoin(l))return null;const r=reference(l),count=GoldFiscal.amount(isJewelry(l)?l.weight:l.qty);const ratio=l.product==='bijou'?.9101:(isDiverse(l)||l.mode==='fonte')?.94:bars.some(p=>p[0]===l.product)?.988:.985;return r>0?cents(r*count*ratio-c.gross):null}
function lineRecap(l){return isJewelry(l)?(l.weight?l.weight+' g':'Poids à saisir'):l.qty+' unité(s)'+(isDiverse(l)?' · '+(l.coinWeight||'—')+' g / pièce · '+(l.purity||'—')+'‰':'')}
function netMarkup(l,c){const n=fcNet(l,c);return n===null?'':'<small class="est-fc-net">FC Net : '+fmt(n)+'</small>'}
function calc(l){
 const unit=price(l),jewelry=isJewelry(l),count=GoldFiscal.amount(jewelry?l.weight:l.qty);
 if(unit===null||!Number.isFinite(unit)||count===null||count<=0||(!jewelry&&!Number.isInteger(count)))return null;
 const gross=unit*count,fees=0;let tax=0,explain='',details='',regime=null,taxBase=gross,taxRate=0,taxLabel='Exonération';
 if(jewelry){tax=gross>5000?gross*.065:0;explain=gross>5000?'Bijou : taxe 6,5 %':'Bijou : exonéré (≤ 5 000 €)';details=`Montant du bijou : ${fmt(gross)}`;}
 else{
  const cost=GoldFiscal.amount(l.cost),comparison=l.fiscal==='TPV'?GoldFiscal.compare(gross,cost===null?'':cost*count,l.datePending?'':l.date):GoldFiscal.compare(gross,'','');
  tax=comparison.tax;regime=comparison.regime;taxLabel=regime;taxRate=regime==='TPV'?.362:.115;taxBase=regime==='TPV'?comparison.gain*(1-comparison.allowance):gross;explain=regime==='TPV'?'TPV retenue : plus avantageuse':'TMP retenue : 11,5 %';
  details=`Base taxable : ${fmt(gross)}`;
  if(l.fiscal==='TPV')details+=comparison.complete?` · TMP : ${fmt(comparison.tmp)} · TPV : ${fmt(comparison.pv)} · Acquisition : ${fmt(comparison.cost)} · Détention : ${comparison.years} an(s) · Abattement : ${Math.round(comparison.allowance*100)} %`:' · TMP appliquée en attendant un prix et une date d’acquisition valides et confirmés';
 }
 if(jewelry&&gross>5000){taxLabel='Bijoux';taxRate=.065}
 const roundedGross=cents(gross),roundedNet=cents(gross-tax);return {gross:roundedGross,fees,tax:cents(roundedGross-roundedNet),net:roundedNet,explain,details,regime,taxBase:cents(taxBase),taxRate,taxLabel};
}
function newLine(){return {id:++seq,product:'bijou',titre:'18',weight:'',gtax:null,mode:'cpor',qty:'1',fees:'8',fiscal:'TMP',cost:'',date:'',dateDraft:null,datePending:false,manual:null,netManual:null,coinWeight:'',purity:''}}
function input(field,value,label){return `<label>${label}<input data-field="${field}" type="text" inputmode="decimal" value="${escapeHTML(value)}"></label>`}
function render(){const rows=$('est-rows');rows.replaceChildren();for(const [i,l] of lines.entries()){
const jewelry=isJewelry(l),r=reference(l),p=price(l),c=calc(l);const gtax=r>0&&p!==null?(l.product==='bijou_argent'&&l.manual===null&&l.gtax===null?57:100*(1-p/r)):null;const el=document.createElement('div');el.className='est-row';el.dataset.id=l.id;
el.innerHTML=`<div class="est-rowtop"><span class="est-num">${i+1}.</span><select data-field="product" aria-label="Produit">${catalog}</select><button type="button" data-action="remove" class="est-remove" title="Supprimer la ligne">×</button></div>`+(jewelry?`<div class="est-fields est-four"><label>Titrage<select data-field="titre">${l.product==='bijou_argent'?opt('925','925‰'):opt('9','9K · 375‰')+opt('14','14K · 585‰')+opt('18','18K · 750‰')+opt('22','22K · 900‰')}</select></label>${input('weight',l.weight,'Poids total (g)')}${input('manual',netUnit(l)===null?'':netUnit(l).toFixed(2),'Prix net client €/g')}${input('gtax',gtax===null?'':gtax.toFixed(2),'GtaX %')}</div>`:`${isDiverse(l)?`<div class="est-mode"><span>Valorisation : Non Boursable</span></div><div class="est-fields est-two">${input('coinWeight',l.coinWeight,'Poids par pièce (g)')}${input('purity',l.purity,'Titrage (‰)')}</div>`:`<div class="est-mode"><span>Valorisation</span><div><button type="button" data-action="cpor" class="${l.mode==='cpor'?'chosen':''}">Boursable</button><button type="button" data-action="fonte" class="${l.mode==='fonte'?'chosen':''}">Non Boursable</button></div></div>`}<div class="est-fields est-four">${input('qty',l.qty,'Quantité')}${input('manual',netUnit(l)===null?'':netUnit(l).toFixed(2),'Prix net client / unité (€)')}${input('fees',displayedFees(l),'FC %')}<label>Fiscalité<select data-field="fiscal">${opt('TMP','TMP')+opt('TPV','Comparer TMP / TPV')}</select></label></div>${l.fiscal==='TPV'?`<div class="est-fields est-two">${input('cost',l.cost,'Prix d’achat / unité (€)')}<label>Date d’acquisition<input data-field="date" type="date" value="${escapeHTML(l.dateDraft??l.date)}"><small class="est-date-status" aria-live="polite">${l.date&&!GoldFiscal.date(l.date)?'Date invalide ou future':''}</small></label></div>`:''}`)+`<div class="est-reference">${(silverCoin(l)||l.product==='divers_argent')?(l.mode==='fonte'?'Référence Non Boursable C3E':'Référence cours Gold.fr'):l.product==='bijou_argent'?'Référence argent C3E achat · 925‰':jewelry||l.mode==='fonte'?'Référence intrinsèque Gold.fr':'Référence CPoR'} : ${fmt(r)}${jewelry?' /g':' / unité'}${!jewelry?' · GtaX : '+(gtax===null?'—':gtax.toFixed(2)+' %'):''}</div><div class="est-rowbottom"><span>${c?.regime?c.regime+' · ':''}Taxe : ${c?fmt(c.tax):'Données incomplètes'}</span><b>Net client : ${c?fmt(c.net):'—'}</b></div>${netMarkup(l,c)}`;
const body=document.createElement('div');body.className='est-line-body';while(el.firstChild)body.append(el.firstChild);
const detail=document.createElement('details');detail.className='est-line-details';detail.open=window.matchMedia('(min-width: 900px)').matches||openLine===l.id;
const title=document.createElement('summary');title.className='est-line-title';
const name=document.createElement('span');name.textContent=(i+1)+'. '+(searchable.find(p=>p[0]===l.product)?.[1]||l.product)+(l.product==='bijou'?' · '+l.titre+'K':'');
const recap=document.createElement('span');recap.className='est-line-recap';recap.textContent=lineRecap(l)+' · Net : '+(c?fmt(c.net):'—');title.append(name,recap);detail.append(title,body);el.append(detail);
detail.addEventListener('toggle',()=>{if(!detail.isConnected||window.matchMedia('(min-width: 900px)').matches)return;if(detail.open){openLine=l.id;rows.querySelectorAll('.est-line-details').forEach(d=>{if(d!==detail)d.open=false})}else if(openLine===l.id)openLine=null});
rows.append(el);el.querySelector('[data-field="product"]').value=l.product;attachSearch(el,l);if(jewelry)el.querySelector('[data-field="titre"]').value=l.product==='bijou_argent'?'925':l.titre;else el.querySelector('[data-field="fiscal"]').value=l.fiscal;
}
summary();}
function updateLine(l){
 const el=$('est-rows').querySelector('[data-id="'+l.id+'"]');if(!el)return;
 const r=reference(l),p=price(l),c=calc(l),j=isJewelry(l);
 const put=(f,value)=>{const field=el.querySelector('[data-field="'+f+'"]');if(field&&document.activeElement!==field)field.value=value};
 put('manual',netUnit(l)===null?'':netUnit(l).toFixed(2));if(!j)put('fees',displayedFees(l));
 const g=r>0&&p!==null?(l.product==='bijou_argent'&&l.manual===null&&l.gtax===null?57:100*(1-p/r)):null;put('gtax',g===null?'':g.toFixed(2));
 const bottom=el.querySelector('.est-rowbottom');bottom.querySelector('span').textContent=(c?.regime?c.regime+' · ':'')+'Taxe : '+(c?fmt(c.tax):'Données incomplètes');bottom.querySelector('b').textContent='Net client : '+(c?fmt(c.net):'—');
 el.querySelector('.est-line-recap').textContent=lineRecap(l)+' · Net : '+(c?fmt(c.net):'—');
 let fcNode=el.querySelector('.est-fc-net');const fcValue=fcNet(l,c);if(fcValue!==null){if(!fcNode){fcNode=document.createElement('small');fcNode.className='est-fc-net';bottom.after(fcNode)}fcNode.textContent='FC Net : '+fmt(fcValue)}else if(fcNode)fcNode.remove();
 const ref=el.querySelector('.est-reference'),label=(silverCoin(l)||l.product==='divers_argent')?(l.mode==='fonte'?'Référence Non Boursable C3E':'Référence cours Gold.fr'):l.product==='bijou_argent'?'Référence argent C3E achat · 925‰':j||l.mode==='fonte'?'Référence intrinsèque Gold.fr':'Référence CPoR';
 ref.textContent=label+' : '+fmt(r)+(j?' /g':' / unité')+(!j?' · GtaX : '+(g===null?'—':g.toFixed(2)+' %'):'');
}
function refreshEstimates(){lines.forEach(updateLine);summary()}
function summary(){let gross=0,net=0,fees=0,tax=0,missing=0,fcTotal=0,fcCount=0;const detail=[];for(const [i,l] of lines.entries()){const c=calc(l);if(!c){missing++;continue;}gross+=c.gross;net+=c.net;fees+=c.fees;tax+=c.tax;const fcn=fcNet(l,c);if(fcn!==null){fcTotal+=fcn;fcCount++}const name=l.product==='bijou_argent'?`Bijoux argent 925‰ · ${escapeHTML(l.weight)} g`:l.product==='bijou'?`Bijoux ${l.titre}K · ${escapeHTML(l.weight)} g`:(searchable.find(p=>p[0]===l.product)?.[1]||l.product)+` · ${escapeHTML(l.qty)} unité(s)`;detail.push(`<div class="est-tax-item"><div><b>${i+1}. ${name}</b><strong>${fmt(c.tax)}</strong></div><small>${c.explain}</small><small>${c.details}</small></div>`)}$('est-gross').textContent=lines.length?fmt(gross):'—';$('est-net').textContent=!lines.length?'—':missing?'— (données incomplètes)':fmt(net);$('est-fc-total').textContent=!lines.length?'':'Total FC Net : '+(missing?'— (données incomplètes)':fcCount?fmt(fcTotal)+(fcCount<lines.length?' (or uniquement)':''):'Non défini pour ces produits');$('est-breakdown').innerHTML=!lines.length?'':detail.join('')+`<div class="est-tax-total"><b>Total taxes</b><b>${fmt(tax)}</b></div>`+(missing?`<small>${missing} ligne(s) incomplète(s) : non comprise(s) dans le total.</small>`:'');}
$('est-reset').addEventListener('click',()=>{lines.length=0;openLine=null;$('est-tax-details').open=false;window.dispatchEvent(new Event('client-reset'));render()});
$('est-add').addEventListener('click',()=>{const line=newLine();lines.push(line);openLine=line.id;render()});$('est-rows').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=Number(b.closest('.est-row').dataset.id),i=lines.findIndex(l=>l.id===id);if(i<0)return;if(b.dataset.action==='remove'){lines.splice(i,1);if(openLine===id)openLine=lines[Math.min(i,lines.length-1)]?.id??null;}else {if(isDiverse(lines[i]))return;lines[i].mode=b.dataset.action;lines[i].fees=defaultFees(lines[i]);lines[i].manual=null;lines[i].netManual=null;}render()});
function onFieldChange(e){const f=e.target.dataset.field;if(!f)return;const l=lines.find(x=>x.id===Number(e.target.closest('.est-row').dataset.id));if(!l)return;const v=e.target.value;if(f==='date'){
 l.date=v;l.dateDraft=null;l.datePending=false;
 const valid=!v||GoldFiscal.date(v),status=e.target.parentElement.querySelector('.est-date-status');
 if(status)status.textContent=valid?'':'Saisir une date complète, valide et non future';
 if(valid)e.target.removeAttribute('aria-invalid');else e.target.setAttribute('aria-invalid','true');
 updateLine(l);summary();return;
}if(['product','titre','gtax','fees'].includes(f))l.netManual=null;if(f==='product'){l.product=v;l.manual=null;if(v==='bijou'||v==='bijou_argent'){l.gtax=null}else{l.mode=(silverCoin(l)||isDiverse(l))?'fonte':'cpor';l.fees=defaultFees(l)}}else if(f==='titre'){l.titre=v;l.manual=null;l.gtax=null}else if(f==='fiscal')l.fiscal=v;else if(f==='gtax'){l.gtax=v;l.manual=null}else if(f==='fees'){l.fees=v;l.manual=null}else if(f==='manual'){l.netManual=v;l.manual=v;const amount=GoldFiscal.amount(v);if(!isJewelry(l)){const fc=effectiveFees(l);if(fc!==null)l.fees=String(fc)}if(amount!==null&&isJewelry(l)&&reference(l)>0)l.gtax=String(100*(1-price(l)/reference(l)))}else l[f]=v;if(['product','titre','fiscal'].includes(f))render();else{updateLine(l);summary()}}
$('est-rows').addEventListener('change',onFieldChange);
$('est-rows').addEventListener('input',e=>{if(['manual','fees','gtax','weight','qty','cost','coinWeight','purity'].includes(e.target.dataset.field))onFieldChange(e)});
root.addEventListener('focusin',e=>{if(e.target.matches('input[inputmode="decimal"]'))e.target.select()});
window.GoldEstimate={snapshot:()=>lines.map(l=>({name:searchable.find(p=>p[0]===l.product)?.[1]||l.product,count:GoldFiscal.amount(isJewelry(l)?l.weight:l.qty),titre:isDiverse(l)?l.coinWeight+' g / pièce · '+l.purity+'‰':l.product==='bijou'?l.titre+'K':l.product==='bijou_argent'?'925‰':'',mode:isJewelry(l)?'':(isDiverse(l)||l.mode==='fonte')?'Non Boursable':'Boursable',quantity:isJewelry(l)?l.weight+' g':l.qty+' unité(s)',unit:netUnit(l),result:calc(l),percentage:isJewelry(l)?'GtaX':'FC',percent:isJewelry(l)?(reference(l)>0?100*(1-price(l)/reference(l)):null):effectiveFees(l),fcNet:fcNet(l)}))};
// Actualiser les prix proposés à chaque retour de données sans interférer avec l'application d'origine.
const observer=new MutationObserver(()=>{if(!root.hidden)refreshEstimates()});const updated=$('last-updated');if(updated)observer.observe(updated,{childList:true,characterData:true,subtree:true});
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
pcLayout.addEventListener('change',()=>{placeRefresh();render()});
placeRefresh();
window.addEventListener('prices-updated',refreshEstimates);
render();
})();

