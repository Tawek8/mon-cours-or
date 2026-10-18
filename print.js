(()=>{
'use strict';
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—';
const dialog=document.createElement('dialog');dialog.id='client-print-dialog';
dialog.innerHTML='<form><h2>Imprimer l’estimation</h2><label>Nom et prénom<input name="client" autocomplete="off"></label><label>Téléphone<input name="phone" type="tel" autocomplete="off"></label><label>Adresse e-mail<input name="email" type="email" autocomplete="off"></label><label class="print-check"><input name="internal" type="checkbox">Imprimer FC / GtaX et FC Net</label><p id="print-error" role="alert"></p><div class="print-actions"><button type="button" id="print-cancel" class="secondary">Annuler</button><button type="submit">Imprimer</button></div></form>';
document.body.append(dialog);
const sheet=document.createElement('article');sheet.id='client-print-sheet';document.body.append(sheet);
const form=dialog.querySelector('form');
function element(tag,text,parent,className){const el=document.createElement(tag);if(text!==null)el.textContent=text;if(className)el.className=className;parent.append(el);return el}
function build(rows,now=new Date()){
 sheet.replaceChildren();sheet.className=form.elements.internal.checked?'with-internals':'';
 const header=element('header',null,sheet),brand=element('div',null,header),logo=element('img',null,brand);logo.src='logo-cndo.png';logo.alt='Comptoir National de l’Or';
 element('h1','Estimation de rachat',brand);
 const dateFmt=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
 element('p','Établie le '+dateFmt.format(now)+' (Paris)',header);
 const customer=element('section',null,sheet,'print-customer');element('strong',form.elements.client.value.trim()||'Client',customer);element('p',[form.elements.phone.value.trim(),form.elements.email.value.trim()].filter(Boolean).join(' · '),customer);
 const table=element('table',null,sheet),thead=element('thead',null,table),head=element('tr',null,thead);for(const title of ['Désignation','Qté / poids','Prix net unitaire','Total net'])element('th',title,head);
 const tbody=element('tbody',null,table);let gross=0,net=0,tax=0;
 for(const row of rows){const c=row.result;gross+=c.gross;net+=c.net;tax+=c.tax;const tr=element('tr',null,tbody),name=element('td',null,tr);element('strong',row.name,name);element('small',[row.titre,row.mode,c.regime].filter(Boolean).join(' · '),name);if(form.elements.internal.checked)element('small',row.percentage+' : '+(Number.isFinite(row.percent)?row.percent.toFixed(2).replace('.',',')+' %':'—')+(row.fcNet===null?'':' · FC Net : '+money(row.fcNet)),name);element('td',row.quantity,tr);element('td',money(row.unit),tr);element('td',money(c.net),tr)}
 const totals=element('section',null,sheet,'print-totals');for(const [label,value] of [['Proposition avant taxes',gross],['Taxes déduites',tax],['Net à verser au client',net]]){const p=element('p',null,totals);element('span',label,p);element('strong',money(value),p)}
 const footer=element('footer',null,sheet);element('p','Les cours de l’or évoluant, cette estimation est valable uniquement pendant 2 heures à compter de son établissement.',footer);element('p','Valable jusqu’au '+dateFmt.format(new Date(now.getTime()+7200000))+' (heure de Paris).',footer);
}
document.getElementById('est-print').addEventListener('click',()=>{form.elements.internal.checked=false;document.getElementById('print-error').textContent='';dialog.showModal()});
document.getElementById('print-cancel').onclick=()=>dialog.close();
form.addEventListener('submit',async e=>{e.preventDefault();const rows=window.GoldEstimate.snapshot();if(!rows.length||rows.some(r=>!r.result)){document.getElementById('print-error').textContent='Complète toutes les lignes avant d’imprimer.';return}build(rows);const image=sheet.querySelector('img');try{await image.decode()}catch{document.getElementById('print-error').textContent='Le logo n’a pas pu être chargé. Réessaie après actualisation.';return}dialog.close();window.print()});
document.getElementById('est-reset').addEventListener('click',()=>{form.reset();sheet.replaceChildren()});
window.addEventListener('afterprint',()=>sheet.replaceChildren());
})();
