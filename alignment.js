/* Calcul d'alignement indépendant des prix proposés et des lignes client. */
(() => {
  'use strict';
  const hero = document.querySelector('.hero'),
    titre = document.getElementById('price18-titre');
  if (!hero || !titre) return;
  const wrap = document.createElement('div');
  wrap.className = 'jewelry-alignment';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'alignment-toggle';
  toggle.id = 'alignment-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'alignment-body');
  toggle.textContent = '▸ Alignement';
  const body = document.createElement('div');
  body.id = 'alignment-body';
  body.hidden = true;
  body.innerHTML =
    '<div class="price18-fields"><label>Poids (g)<input id="alignment-weight" type="text" inputmode="decimal" placeholder="—"></label><label>Prix total proposé (€)<input id="alignment-total" type="text" inputmode="decimal" placeholder="—"></label></div><div class="alignment-results" aria-live="polite"><div><span>Prix par gramme</span><b id="alignment-price">—</b></div><div><span>GtaX</span><b id="alignment-gtax">—</b></div><div><span>FC Net</span><b id="alignment-fcnet">—</b></div></div><p id="alignment-warning" class="alignment-warning" role="status" aria-live="polite" hidden></p>';
  wrap.append(toggle, body);
  hero.append(wrap);
  const weight = document.getElementById('alignment-weight'),
    total = document.getElementById('alignment-total'),
    warning = document.getElementById('alignment-warning');
  const purity = { 9: 0.375, 14: 0.585, 18: 0.75, 22: 0.9 };
  function amount(raw) {
    const v = raw.trim().replace(/\s/g, '').replace(',', '.');
    return v !== '' && /^\d*(\.\d*)?$/.test(v) ? Number(v) : NaN;
  }
  function update() {
    const w = amount(weight.value),
      t = amount(total.value),
      reference =
        Number.isFinite(data.instant) && data.instant > 0
          ? (data.instant * purity[titre.value]) / 1000
          : NaN;
    const valid =
      Number.isFinite(w) &&
      w > 0 &&
      Number.isFinite(t) &&
      t >= 0 &&
      Number.isFinite(reference) &&
      reference > 0;
    const g = valid ? 100 * (1 - t / (reference * w)) : NaN;
    document.getElementById('alignment-price').textContent = valid ? eur(t / w) + ' /g' : '—';
    document.getElementById('alignment-gtax').textContent = valid
      ? g.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'
      : '—';
    document.getElementById('alignment-fcnet').textContent = valid
      ? eur(Math.round((reference * w * 0.9101 - t + Number.EPSILON) * 100) / 100)
      : '—';
    const red = valid && g < 15 - 1e-9;
    warning.hidden = !valid || g > 18 + 1e-9;
    warning.classList.toggle('alignment-critical', red);
    warning.textContent =
      (red ? '⚠ FC inférieur à 15 %' : '⚠ FC entre 15 et 18 %') +
      ' · GtaX : ' +
      (valid
        ? g.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—') +
      ' %';
  }
  toggle.onclick = () => {
    body.hidden = !body.hidden;
    toggle.setAttribute('aria-expanded', String(!body.hidden));
    toggle.textContent = (body.hidden ? '▸' : '▾') + ' Alignement';
    update();
  };
  for (const input of [weight, total]) {
    input.addEventListener('input', update);
    input.addEventListener('focus', () => input.select());
  }
  titre.addEventListener('change', update);
  window.addEventListener('prices-updated', update);
  window.addEventListener('client-reset', () => {
    weight.value = '';
    total.value = '';
    body.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '▸ Alignement';
    update();
  });
  update();
})();
