(()=>{
 'use strict';
 const main=document.querySelector('main'),heading=main.querySelector('.heading');
 const nav=document.createElement('nav');nav.className='mobile-tabs';nav.setAttribute('aria-label','Navigation');
 nav.innerHTML='<button type="button" data-mobile-tab="cours" aria-pressed="true">Cours</button><button type="button" data-mobile-tab="estimation" aria-pressed="false">Estimation</button>';
 heading.after(nav);document.body.dataset.mobileTab='cours';
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-tab]');if(!b)return;if(typeof selected!=='undefined'&&selected)closeBuy();document.body.dataset.mobileTab=b.dataset.mobileTab;nav.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 const hero=main.querySelector('.hero'),info=document.createElement('div');info.className='price18-info';
 info.innerHTML='<div class="price18-fields"><label>Prix proposé €/g<input id="price18-proposed" type="text" inputmode="decimal" placeholder="—"></label><label>GtaX (%)<input id="price18-gtax" type="text" inputmode="decimal" placeholder="—"></label></div><details><summary>Référence et base de calcul</summary><div class="row"><span>Intrinsèque · 750‰</span><b id="price18-reference">—</b></div><div class="row"><span>Base de calcul · 1 kg</span><b id="price18-base">—</b></div></details>';
 hero.append(info);const discountControls=hero.querySelector('.inputs');info.querySelector('details').append(discountControls);
 const silver=document.getElementById('silver-section');if(silver)main.insertBefore(hero,silver);
 const proposed=document.getElementById('price18-proposed'),gtax=document.getElementById('price18-gtax'),discountInput=document.getElementById('mult');
 let override={mode:'default',value:''};
 function quote18(intrinsic,cpor,discount,mode,value){
  const ref=Number.isFinite(intrinsic)&&intrinsic>0?intrinsic*.75/1000:null;
  const base=ref!==null&&Number.isFinite(cpor)&&cpor>0?Math.min(intrinsic,cpor):null;
  const raw=String(value),v=raw.trim()===''?NaN:parseNum(raw);
  let price=null;
  if(mode==='price')price=Number.isFinite(v)&&v>=0?v:null;
  else if(mode==='gtax')price=ref!==null&&Number.isFinite(v)&&v>=0&&v<=100?ref*(1-v/100):null;
  else{const d=String(discount).trim()===''?NaN:parseNum(discount);price=base!==null&&Number.isFinite(d)&&d>=0&&d<=100?base*.75/1000*(1-d/100):null}
  return {ref,base,price,gtax:ref!==null&&price!==null?100*(1-price/ref):null};
 }
 function update18(){
  const result=quote18(data.instant,data.cpor,discountInput.value,override.mode,override.value);
  document.getElementById('price18-reference').textContent=eur(result.ref)+' /g';document.getElementById('price18-base').textContent=eur(result.base);
  document.getElementById('price18').textContent=result.price===null?'— €/g':eur(result.price)+' /g';
  if(document.activeElement!==proposed)proposed.value=result.price===null?'':result.price.toFixed(2);
  if(document.activeElement!==gtax)gtax.value=result.gtax===null?'':result.gtax.toFixed(2);
 }
 proposed.addEventListener('input',()=>{override={mode:'price',value:proposed.value};update18()});
 gtax.addEventListener('input',()=>{override={mode:'gtax',value:gtax.value};update18()});
 for(const field of [proposed,gtax])field.addEventListener('blur',update18);
 discountInput.addEventListener('input',()=>{override={mode:'default',value:''};update18()});
 window.addEventListener('prices-updated',update18);
 window.addEventListener('client-reset',()=>{
  override={mode:'default',value:''};discountInput.value='25';localStorage.removeItem('or-discount');
  for(const id of ['tax-cost','tax-date'])document.getElementById(id).value='';
  document.getElementById('buy-discount').value='8';localStorage.removeItem('or-buy-discount');
  draw();update18();
 });
 update18();
})();
