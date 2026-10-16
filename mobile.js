(()=>{
 'use strict';
 const main=document.querySelector('main'),heading=main.querySelector('.heading');
 const nav=document.createElement('nav');nav.className='mobile-tabs';nav.setAttribute('aria-label','Navigation');
 nav.innerHTML='<button type="button" data-mobile-tab="cours" aria-pressed="true">Cours</button><button type="button" data-mobile-tab="estimation" aria-pressed="false">Estimation</button>';
 heading.after(nav);document.body.dataset.mobileTab='cours';
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-tab]');if(!b)return;if(typeof selected!=='undefined'&&selected)closeBuy();document.body.dataset.mobileTab=b.dataset.mobileTab;nav.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 const hero=main.querySelector('.hero'),info=document.createElement('div');info.className='price18-info';info.innerHTML='<div class="row"><span>GtaX</span><b id="price18-gtax">—</b></div><details><summary>Référence et base de calcul</summary><div class="row"><span>Intrinsèque · 750‰</span><b id="price18-reference">—</b></div><div class="row"><span>Base de calcul · 1 kg</span><b id="price18-base">—</b></div></details>';hero.append(info);
 const silver=document.getElementById('silver-section');if(silver)main.insertBefore(hero,silver);
 function update18(){const intrinsic=Number.isFinite(data.instant)&&data.instant>0?data.instant:null,cpor=Number.isFinite(data.cpor)&&data.cpor>0?data.cpor:null,base=intrinsic!==null&&cpor!==null?Math.min(intrinsic,cpor):null,raw=document.getElementById('mult').value,discount=parseNum(raw),r=intrinsic===null?null:intrinsic*.75/1000,p=base===null?null:base*.75/1000*(1-discount/100);document.getElementById('price18-reference').textContent=eur(r)+' /g';document.getElementById('price18-base').textContent=eur(base);document.getElementById('price18-gtax').textContent=r>0&&p!==null&&raw.trim()!==''&&discount>=0&&discount<=100?(100*(1-p/r)).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %':'—'}
 window.addEventListener('prices-updated',update18);update18();
})();
