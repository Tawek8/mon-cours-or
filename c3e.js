(()=>{
 'use strict';
 const box=document.createElement('div');box.className='c3e-source';
 box.innerHTML='<span>Argent C3E · achat : <b id="c3e-value">—</b></span><span id="c3e-status" aria-live="polite">Chargement…</span>';
 document.querySelector('#estimation-client .est-head').after(box);
 const value=box.querySelector('#c3e-value'),status=box.querySelector('#c3e-status');let saved=null;
 function validate(p){if(!p||!Number.isFinite(p.price)||p.price<=0||p.side!=='achat'||p.unit!=='EUR/kg'||!/^\d{4}-\d{2}-\d{2}$/.test(p.sourceDate))throw Error('Cours C3E incorrect');return p}
 function draw(p){value.textContent=p.price.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})+' /kg';window.dispatchEvent(new Event('prices-updated'))}
 try{saved=validate(JSON.parse(localStorage.getItem('c3e-prices')||'null'));draw(saved)}catch{}
 window.refreshC3e=async()=>{
  try{const response=await fetch('/api/c3e',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const p=validate(await response.json());saved=p;localStorage.setItem('c3e-prices',JSON.stringify(p));draw(p);status.textContent='Cookson-Clal · Cours du '+p.sourceDate.split('-').reverse().join('/')}
  catch(e){status.textContent='C3E indisponible : '+e.message+(saved?' · Dernier cours enregistré du '+saved.sourceDate.split('-').reverse().join('/'):'');}
 };
 window.refreshC3e();
})();
