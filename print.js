(()=>{
'use strict';
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—';
const dialog=document.createElement('dialog');dialog.id='client-print-dialog';
dialog.innerHTML='<form><h2>Imprimer l’estimation</h2><label>Nom et prénom<input name="client" autocomplete="off"></label><label>Téléphone<input name="phone" type="tel" autocomplete="off"></label><label>Adresse e-mail<input name="email" type="email" autocomplete="off"></label><label class="print-check"><input name="internal" type="checkbox">Imprimer les pourcentages FC / GtaX</label><p id="print-error" role="alert"></p><div class="print-actions"><button type="button" id="print-cancel" class="secondary">Annuler</button><button type="submit">Imprimer</button></div></form>';
document.body.append(dialog);
const sheet=document.createElement('article');sheet.id='client-print-sheet';document.body.append(sheet);
const form=dialog.querySelector('form');
function element(tag,text,parent,className){const el=document.createElement(tag);if(text!==null)el.textContent=text;if(className)el.className=className;parent.append(el);return el}
function build(rows,now=new Date()){
 sheet.replaceChildren();sheet.className=(form.elements.internal.checked?'with-internals ':'')+(rows.length<=4?'print-short':rows.length<=7?'print-medium':'print-compact');sheet.dataset.lineCount=rows.length;
 const header=element('header',null,sheet),brand=element('div',null,header),logo=element('img',null,brand);logo.src='logo-cndo.png';logo.alt='Comptoir National de l’Or';
 const dateFmt=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
 element('p','Établie le '+dateFmt.format(now)+' (Paris)',header);
 element('h1','Estimation de rachat',sheet);
 const customer=element('section',null,sheet,'print-customer');element('strong',form.elements.client.value.trim()||'Client',customer);element('p',[form.elements.phone.value.trim(),form.elements.email.value.trim()].filter(Boolean).join(' · '),customer);
 const table=element('table',null,sheet),thead=element('thead',null,table),head=element('tr',null,thead);for(const title of ['Désignation','Qté / poids','P.U. avant taxes','Total avant taxes','Taxe','Net client'])element('th',title,head);
 const tbody=element('tbody',null,table);let gross=0,net=0,tax=0;const groups=new Map();
 for(const row of rows){const c=row.result;gross+=c.gross;net+=c.net;tax+=c.tax;const groupLabel=c.taxLabel,rate=c.taxRate;let group=groups.get(groupLabel);if(!group){group={label:groupLabel,rate,base:0,tax:0};groups.set(groupLabel,group)}group.base+=c.taxBase;group.tax+=c.tax;
 const tr=element('tr',null,tbody),name=element('td',null,tr);element('strong',row.name,name);element('small',[row.titre,row.mode].filter(Boolean).join(' · '),name);if(form.elements.internal.checked)element('small',row.percentage+' : '+(Number.isFinite(row.percent)?row.percent.toFixed(2).replace('.',',')+' %':'—'),name);element('td',row.quantity,tr);element('td',money(c.gross/row.count),tr);element('td',money(c.gross),tr);const taxCell=element('td',null,tr);element('small',groupLabel+(rate?' '+(rate*100).toLocaleString('fr-FR')+' %':''),taxCell);element('span',c.tax?'-'+money(c.tax):money(0),taxCell);element('td',money(c.net),tr)}
 const recap=element('div',null,sheet,'print-recap'),taxBox=element('section',null,recap,'print-tax-summary');element('h2','Récapitulatif des taxes',taxBox);const taxTable=element('table',null,taxBox),taxHead=element('tr',null,element('thead',null,taxTable));for(const title of ['Taxe','Taux','Base','Montant'])element('th',title,taxHead);const taxBody=element('tbody',null,taxTable);for(const group of groups.values()){const tr=element('tr',null,taxBody);for(const text of [group.label,(group.rate*100).toLocaleString('fr-FR')+' %',money(group.base),group.tax?'-'+money(group.tax):money(0)])element('td',text,tr)}if(groups.has('TPV'))element('small','Base TPV : plus-value imposable après abattement de détention.',taxBox);
 const totals=element('section',null,recap,'print-totals');for(const [label,value] of [['Total avant taxes',gross],['Total des taxes',tax?-tax:0],['Net à verser au client',net]]){const p=element('p',null,totals);element('span',label,p);element('strong',money(value),p)}
 const footer=element('footer',null,sheet);element('p','Les cours de l’or évoluant, cette estimation est valable uniquement pendant 2 heures à compter de son établissement.',footer);element('p','Valable jusqu’au '+dateFmt.format(new Date(now.getTime()+7200000))+' (heure de Paris).',footer);
}
document.getElementById('est-print').addEventListener('click',()=>{form.elements.internal.checked=false;document.getElementById('print-error').textContent='';dialog.showModal()});
document.getElementById('print-cancel').onclick=()=>dialog.close();
form.addEventListener('submit',async e=>{
 e.preventDefault();const rows=window.GoldEstimate.snapshot();
 if(!rows.length||rows.some(r=>!r.result)){document.getElementById('print-error').textContent='Complète toutes les lignes avant d’imprimer.';return}
 build(rows);const image=sheet.querySelector('img');
 try{await image.decode()}catch{document.getElementById('print-error').textContent='Le logo n’a pas pu être chargé. Réessaie après actualisation.';return}
 dialog.close();window.print();
});
document.getElementById('est-reset').addEventListener('click',()=>{form.reset();sheet.replaceChildren()});
// Conserver le document : certains navigateurs signalent afterprint avant la fin de la capture.
})();
