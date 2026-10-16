(()=>{
 'use strict';
 let saved=null;
 function validate(p){if(!p||!Number.isFinite(p.price)||p.price<=0||p.side!=='achat'||p.unit!=='EUR/kg'||!/^\d{4}-\d{2}-\d{2}$/.test(p.sourceDate))throw Error('Cours C3E incorrect');return p}
 function draw(){window.dispatchEvent(new Event('prices-updated'))}
 try{saved=validate(JSON.parse(localStorage.getItem('c3e-prices')||'null'));draw(saved)}catch{}
 window.refreshC3e=async()=>{
  try{const response=await fetch('/api/c3e',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const p=validate(await response.json());saved=p;localStorage.setItem('c3e-prices',JSON.stringify(p));draw(p)}
  catch(e){const status=document.getElementById('status');if(status)status.textContent+=' · Cours bijoux argent indisponible'+(saved?' : dernier cours enregistré du '+saved.sourceDate.split('-').reverse().join('/'):'');}
 };
 window.refreshC3e();
})();
