(()=>{
 'use strict';
 const main=document.querySelector('main'),heading=main.querySelector('.heading');
 const nav=document.createElement('nav');nav.className='mobile-tabs';nav.setAttribute('aria-label','Navigation');
 nav.innerHTML='<button type="button" data-mobile-tab="cours" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16M7 14l4-5 4 3 5-7"/></svg>Cours</button><button type="button" data-mobile-tab="estimation" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h1M16 11h.1M8 15h1M12 15h1M16 15h.1M8 18h1M12 18h1M16 18h.1"/></svg>Rachat</button>';
 heading.after(nav);document.body.dataset.mobileTab='cours';
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-tab]');if(!b)return;if(typeof selected!=='undefined'&&selected)closeBuy();document.body.dataset.mobileTab=b.dataset.mobileTab;nav.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 const hero=main.querySelector('.hero'),info=document.createElement('div');info.className='price18-info';
 const jewelryHeading=document.createElement('div');jewelryHeading.className='gold-quick-heading';
 const jewelryTitle=hero.querySelector('.eyebrow');jewelryTitle.textContent='ACHAT BIJOUX';jewelryTitle.before(jewelryHeading);jewelryHeading.append(jewelryTitle);
 const karats=document.createElement('select');karats.id='price18-titre';karats.setAttribute('aria-label','Titrage des bijoux');
 for(const [value,label] of [['9','9K · 375‰'],['14','14K · 585‰'],['18','18K · 750‰'],['22','22K · 900‰']]){const option=document.createElement('option');option.value=value;option.textContent=label;karats.append(option)}karats.value='18';jewelryHeading.append(karats);
 const goldSettings={9:{purity:.375,discount:'31',label:'375‰'},14:{purity:.585,discount:'27',label:'585‰'},18:{purity:.75,discount:'25',label:'750‰'},22:{purity:.9,discount:'25',label:'900‰'}};
 info.innerHTML='<div class="price18-fields"><label>Prix proposé €/g<input id="price18-proposed" type="text" inputmode="decimal" placeholder="—"></label><label>GtaX (%)<input id="price18-gtax" type="text" inputmode="decimal" placeholder="—"></label></div><details><summary>Référence et base de calcul</summary><div class="row"><span id="price18-reference-label">Intrinsèque · 750‰</span><b id="price18-reference">—</b></div><div class="row"><span>Base de calcul · 1 kg</span><b id="price18-base">—</b></div></details>';
 hero.append(info);const discountControls=hero.querySelector('.inputs');info.querySelector('details').append(discountControls);
 const silver=document.getElementById('silver-section');if(silver)main.insertBefore(hero,silver);
 const proposed=document.getElementById('price18-proposed'),gtax=document.getElementById('price18-gtax'),discountInput=document.getElementById('mult');
 let override={mode:'default',value:''};
 let saved18Discount=localStorage.getItem('or-discount');
 function quote18(intrinsic,cpor,discount,mode,value,purity=.75){
  const ref=Number.isFinite(intrinsic)&&intrinsic>0?intrinsic*purity/1000:null;
  const base=ref!==null&&Number.isFinite(cpor)&&cpor>0?Math.min(intrinsic,cpor):null;
  const raw=String(value),v=raw.trim()===''?NaN:parseNum(raw);
  let price=null;
  if(mode==='price')price=Number.isFinite(v)&&v>=0?v:null;
  else if(mode==='gtax')price=ref!==null&&Number.isFinite(v)&&v>=0&&v<=100?ref*(1-v/100):null;
  else{const d=String(discount).trim()===''?NaN:parseNum(discount);price=base!==null&&Number.isFinite(d)&&d>=0&&d<=100?base*purity/1000*(1-d/100):null}
  return {ref,base,price,gtax:ref!==null&&price!==null?100*(1-price/ref):null};
 }
 function update18(){
  const setting=goldSettings[karats.value];const result=quote18(data.instant,data.cpor,discountInput.value,override.mode,override.value,setting.purity);
  document.getElementById('price18-reference-label').textContent='Intrinsèque · '+setting.label;
  document.getElementById('price18-reference').textContent=eur(result.ref)+' /g';document.getElementById('price18-base').textContent=eur(result.base);
  document.getElementById('price18').textContent=result.price===null?'— €/g':eur(result.price)+' /g';
  if(document.activeElement!==proposed)proposed.value=result.price===null?'':result.price.toFixed(2);
  if(document.activeElement!==gtax)gtax.value=result.gtax===null?'':result.gtax.toFixed(2);
 }
 karats.addEventListener('change',()=>{override={mode:'default',value:''};discountInput.value=goldSettings[karats.value].discount;update18()});
 proposed.addEventListener('input',()=>{override={mode:'price',value:proposed.value};update18()});
 gtax.addEventListener('input',()=>{override={mode:'gtax',value:gtax.value};update18()});
 for(const field of [proposed,gtax])field.addEventListener('blur',update18);
 discountInput.addEventListener('input',()=>{if(karats.value==='18')saved18Discount=discountInput.value;else if(saved18Discount===null)localStorage.removeItem('or-discount');else localStorage.setItem('or-discount',saved18Discount);override={mode:'default',value:''};update18()});
 window.addEventListener('prices-updated',update18);
 window.addEventListener('client-reset',()=>{
  karats.value='18';saved18Discount=null;override={mode:'default',value:''};discountInput.value='25';localStorage.removeItem('or-discount');
  for(const id of ['tax-cost','tax-date'])document.getElementById(id).value='';
  document.getElementById('buy-discount').value='8';localStorage.removeItem('or-buy-discount');
  draw();update18();
 });
 update18();
})();
