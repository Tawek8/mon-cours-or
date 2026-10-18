(()=>{
 'use strict';
 const main=document.querySelector('main'),hero=main.querySelector('.hero'),estimate=document.getElementById('estimation-client');
 const marker=document.createComment('Emplacement mobile du prix 18K');hero.before(marker);
 const group=document.createElement('div');group.id='pc-quick-prices';estimate.after(group);
 const panel=document.createElement('section');panel.className='quick-coin-card';
 panel.innerHTML='<div class="eyebrow">PIÈCES D’OR</div><label class="quick-coin-label" for="quick-coin-select">Prix d’achat de la pièce</label><select id="quick-coin-select"></select><label class="quick-fees-label" for="quick-coin-fees">FC (%)<input id="quick-coin-fees" type="text" inputmode="decimal" value="8" aria-describedby="quick-coin-detail"></label><div class="quick-coin-caption">Prix net client / pièce</div><div id="quick-coin-net" class="price gold" aria-live="polite">—</div><div id="quick-coin-detail" class="small" aria-live="polite"></div>';
 group.append(panel);
 const select=panel.querySelector('select'),items=[['coq','Napoléon 20 F Coq'],['suisse','Croix Suisse 20 F'],['pesos','50 Pesos'],['george','Souverain George V'],['elisabeth','Elisabeth II'],['krugerrand','Krugerrand']];
 for(const [value,label] of items){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value='coq';
 const fees=document.getElementById('quick-coin-fees');
 function update(){
  const quote=data[select.value];const good=Number.isFinite(quote)&&quote>0;
  const raw=fees.value.trim(),rate=parseNum(raw),valid=raw!==''&&Number.isFinite(rate)&&rate<=100;
  if(valid)fees.removeAttribute('aria-invalid');else fees.setAttribute('aria-invalid','true');
  const gross=good&&valid?quote*(1-rate/100):null,comparison=gross!==null?GoldFiscal.compare(gross,'',''):null;
  document.getElementById('quick-coin-net').textContent=!good?'Indisponible':!valid?'—':eur(gross-comparison.tax);
  document.getElementById('quick-coin-detail').textContent=!valid?'Saisir un FC valide, inférieur ou égal à 100 %.':!good?'Cours CPoR indisponible pour cette pièce.':'Boursable · CPoR : '+eur(quote)+' · FC : '+rate.toLocaleString('fr-FR')+' % · TMP : 11,5 % ('+eur(comparison.tax)+')';
 }
 const pc=window.matchMedia('(min-width: 900px)');
 function place(){if(pc.matches)group.insertBefore(hero,panel);else marker.after(hero)}
 fees.addEventListener('input',update);fees.addEventListener('focus',()=>fees.select());
 window.addEventListener('client-reset',()=>{fees.value='8';update()});
 pc.addEventListener('change',place);select.addEventListener('change',update);window.addEventListener('prices-updated',update);place();update();
})();
