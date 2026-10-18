(()=>{
 'use strict';
 const main=document.querySelector('main'),hero=main.querySelector('.hero'),estimate=document.getElementById('estimation-client');
 const marker=document.createComment('Emplacement mobile du prix 18K');hero.before(marker);
 const group=document.createElement('div');group.id='pc-quick-prices';estimate.after(group);
 const panel=document.createElement('section');panel.className='quick-coin-card';
 panel.innerHTML='<div class="eyebrow">PIÈCES D’OR</div><label class="quick-coin-label" for="quick-coin-select">Prix d’achat de la pièce</label><select id="quick-coin-select"></select><div class="quick-coin-caption">Prix net client / pièce</div><div id="quick-coin-net" class="price gold" aria-live="polite">—</div><div id="quick-coin-detail" class="small"></div>';
 group.append(panel);
 const select=panel.querySelector('select'),items=[['coq','Napoléon 20 F Coq'],['suisse','Croix Suisse 20 F'],['pesos','50 Pesos'],['george','Souverain George V'],['elisabeth','Elisabeth II'],['krugerrand','Krugerrand']];
 for(const [value,label] of items){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value='coq';
 function update(){
  const quote=data[select.value];const good=Number.isFinite(quote)&&quote>0;
  const gross=good?quote*.92:null,comparison=good?GoldFiscal.compare(gross,'',''):null;
  document.getElementById('quick-coin-net').textContent=good?eur(gross-comparison.tax):'Indisponible';
  document.getElementById('quick-coin-detail').textContent=good?'Boursable · CPoR : '+eur(quote)+' · FC : 8 % · TMP : 11,5 % ('+eur(comparison.tax)+')':'Cours CPoR indisponible pour cette pièce.';
 }
 const pc=window.matchMedia('(min-width: 900px)');
 function place(){if(pc.matches)group.insertBefore(hero,panel);else marker.after(hero)}
 pc.addEventListener('change',place);select.addEventListener('change',update);window.addEventListener('prices-updated',update);place();update();
})();
