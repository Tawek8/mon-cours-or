try {
  const old = JSON.parse(localStorage.getItem('or-prices') || 'null');
  // Valeur intrinsèque acceptée : Kitco, ou BullionVault en secours.
  if (old && !['Kitco', 'BullionVault'].includes(old.intrinsicSource)) {
    delete old.instant;
    localStorage.setItem('or-prices', JSON.stringify(old));
  }
  const spot = JSON.parse(localStorage.getItem('or-spot-last') || 'null');
  if (!['Kitco', 'BullionVault'].includes(spot?.source)) localStorage.removeItem('or-spot-last');
} catch {}
const bars = [
  ['cpor', 'Lingot 1 kg'],
  ['bar500', 'Lingotin 500 g'],
  ['bar250', 'Lingotin 250 g'],
  ['bar100', 'Lingotin 100 g'],
  ['bar50', 'Lingotin 50 g'],
  ['bar20', 'Lingotin 20 g'],
  ['once', 'Lingotin 1 once'],
  ['bar10', 'Lingotin 10 g'],
  ['bar5', 'Lingotin 5 g'],
];
const coins = [
  ['coq', 'Napoléon 20 F Coq'],
  ['suisse', 'Croix Suisse 20 F'],
  ['pesos', '50 Pesos'],
  ['krugerrand', 'Krugerrand'],
  ['george', 'Souverain George V'],
  ['elisabeth', 'Souverain Elisabeth II'],
  ['demi_napoleon', 'Demi Napoléon 10 F'],
  ['demi_souverain', 'Demi Souverain'],
  ['florins', '10 Florins'],
  ['tunisie', '20 Francs Tunisie'],
  ['union_latine', 'Union Latine'],
  ['reichsmark', '20 Reichsmarks'],
  ['us20', '20 Dollars US'],
  ['us10', '10 Dollars US'],
  ['us5', '5 Dollars US'],
];
const $ = id => document.getElementById(id),
  eur = n =>
    typeof n === 'number' && Number.isFinite(n)
      ? new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n)
      : '—';
const parseNum = v => Number(String(v).replace(/\s/g, '').replace(',', '.'));
let data = {};
try {
  data = JSON.parse(localStorage.getItem('or-prices') || '{}');
} catch {}
const savedDiscount = localStorage.getItem('or-discount');
if (savedDiscount !== null) $('mult').value = savedDiscount;
else {
  const old = localStorage.getItem('or-mult');
  if (old !== null) {
    const n = parseNum(old);
    if (Number.isFinite(n) && n >= 0 && n <= 1)
      $('mult').value = String(Math.round((1 - n) * 10000) / 100).replace('.', ',');
  }
}
let activeTab = 'coins',
  selected = null;
let spotValue = null,
  spotPoints = [],
  spotPeriod = 1;
const savedBuyDiscount = localStorage.getItem('or-buy-discount');
if (savedBuyDiscount !== null) $('buy-discount').value = savedBuyDiscount;
function renderQuotes() {
  const list = activeTab === 'bars' ? bars : coins;
  const root = $('cotations');
  root.replaceChildren();
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Aucun produit trouvé';
    root.append(empty);
  }
  for (const [id, name] of list) {
    const price = data[id];
    const available = typeof price === 'number' && Number.isFinite(price) && price > 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quote';
    button.disabled = !available;
    // Illustration du produit (mêmes images que GoldApp).
    const img = document.createElement('img');
    img.className = 'quote-img' + (activeTab === 'bars' ? ' bar' : '');
    img.src = 'img/cpor/' + id + '.webp';
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    button.append(img);
    const title = document.createElement('span');
    title.className = 'name';
    title.textContent = name;
    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = available ? eur(price) : 'Indisponible';
    button.append(title, value);
    if (available) {
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      button.append(arrow);
      button.addEventListener('click', () => openBuy(id, name));
    }
    root.append(button);
  }
}
function drawBuy() {
  if (!selected) return;
  const price = data[selected.id];
  $('buy-reference').textContent = eur(price);
  const raw = $('buy-discount').value,
    discount = parseNum(raw);
  if (
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    raw.trim() === '' ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  ) {
    $('buy-final').textContent = '—';
    $('buy-tax').textContent = 'dont — de taxes';
    drawFees(null, null);
    drawTax(null);
    return;
  }
  const discounted = price * (1 - discount / 100),
    tax = discounted * 0.115;
  $('buy-final').textContent = eur(discounted - tax);
  $('buy-tax').textContent = 'dont ' + eur(tax) + ' de taxes';
  drawFees(price, discount);
  const comparison = drawTax(discounted);
  if (comparison?.complete) {
    $('buy-final').textContent = eur(discounted - comparison.tax);
    $('buy-tax').textContent = comparison.regime + ' · ' + eur(comparison.tax) + ' de taxes';
  }
}
function drawFees(price, discount) {
  const goldtrade = $('fees-goldtrade'),
    agency = $('fees-agency'),
    agencyLabel = $('fees-agency-label'),
    note = $('fees-note');
  if (price === null || discount === null) {
    goldtrade.textContent = '—';
    agency.textContent = '—';
    agencyLabel.textContent = 'Agence';
    note.hidden = true;
    return;
  }
  const goldtradeRate = Math.min(1.5, discount),
    agencyRate = Math.max(0, discount - 1.5);
  goldtrade.textContent = eur((price * goldtradeRate) / 100);
  agency.textContent = eur((price * agencyRate) / 100);
  agencyLabel.textContent =
    'Agence (' + String(Math.round(agencyRate * 100) / 100).replace('.', ',') + ' %)';
  $('fees-goldtrade-label').textContent =
    'GoldTrade (' + String(goldtradeRate).replace('.', ',') + ' %)';
  note.hidden = discount >= 1.5;
  note.textContent =
    discount < 1.5
      ? 'Frais inférieurs à 1,5 % : la part GoldTrade est plafonnée au total des frais.'
      : '';
}
let taxDateCommitted = '',
  taxDatePending = false;
function drawTax(gross) {
  const panel = $('tax-compare'),
    hint = $('tax-hint');
  const c = GoldFiscal.compare(gross, $('tax-cost').value, taxDatePending ? '' : taxDateCommitted);
  if (!c || !c.complete) {
    panel.hidden = true;
    hint.textContent = 'Renseigne un prix d’acquisition et valide une date passée pour comparer.';
    return c;
  }
  $('tax-tmp-net').textContent = eur(gross - c.tmp);
  $('tax-pv-net').textContent = eur(gross - c.pv);
  $('tax-pv-amount').textContent = eur(c.pv);
  $('tax-best').textContent =
    Math.abs(c.pv - c.tmp) < 0.005
      ? 'Résultat équivalent pour les deux régimes'
      : c.regime + ' plus avantageuse de ' + eur(Math.abs(c.pv - c.tmp));
  $('tax-years').textContent =
    c.years +
    ' année(s) complète(s) de détention · abattement de ' +
    Math.round(c.allowance * 100) +
    ' % sur la plus-value.';
  panel.hidden = false;
  hint.textContent = 'Le résultat principal utilise le régime le plus avantageux.';
  return c;
}
$('tax-cost').addEventListener('input', drawBuy);
$('tax-date').addEventListener('input', () => {
  taxDatePending = true;
  $('tax-date-status').textContent = 'Date à terminer';
  drawBuy();
});
function commitTaxDate() {
  const field = $('tax-date');
  taxDateCommitted = field.value;
  taxDatePending = false;
  $('tax-date-status').textContent =
    field.value && !GoldFiscal.date(field.value)
      ? 'Saisir une date complète, valide et non future'
      : '';
  drawBuy();
}
$('tax-date').addEventListener('change', commitTaxDate);
$('tax-date').addEventListener('blur', commitTaxDate);
$('tax-toggle').addEventListener('toggle', () => {
  if ($('tax-toggle').open) drawBuy();
});
function openBuy(id, name) {
  selected = { id, name };
  $('buy-name').textContent = name;
  let picture = document.querySelector('.buy-heading .buy-img');
  if (!picture) {
    picture = document.createElement('img');
    picture.className = 'buy-img';
    picture.alt = '';
    picture.onerror = () => (picture.hidden = true);
    $('buy-name').before(picture);
  }
  picture.hidden = false;
  picture.src = 'img/cpor/' + id + '.webp';
  $('tax-toggle').open = false;
  $('fees-toggle').open = false;
  $('tax-cost').value = '';
  $('tax-date').value = '';
  taxDateCommitted = '';
  taxDatePending = false;
  $('tax-date-status').textContent = '';
  $('cpor-section').hidden = true;
  document.querySelector('section:not(#cpor-section):not(#buy-page)').hidden = true;
  document.querySelector('.hero').hidden = true;
  $('buy-page').hidden = false;
  document.querySelector('.toolbar').hidden = true;
  $('status').hidden = true;
  $('editor').hidden = true;
  drawBuy();
  history.pushState({ buy: id }, '', '#achat-' + encodeURIComponent(id));
  $('buy-page').scrollIntoView({ block: 'start', behavior: 'instant' });
}
function closeBuy(updateHistory = true) {
  selected = null;
  $('buy-page').hidden = true;
  $('cpor-section').hidden = false;
  document.querySelector('section:not(#cpor-section):not(#buy-page)').hidden = false;
  document.querySelector('.hero').hidden = false;
  document.querySelector('.toolbar').hidden = false;
  $('status').hidden = false;
  if (updateHistory && location.hash.startsWith('#achat-'))
    history.replaceState(null, '', location.pathname + location.search);
  $('cpor-section').scrollIntoView({ block: 'start', behavior: 'instant' });
}
$('back').addEventListener('click', () => closeBuy());
window.addEventListener('popstate', () => {
  if (selected) closeBuy(false);
});
for (const type of ['bars', 'coins'])
  $('tab-' + type).addEventListener('click', () => {
    activeTab = type;
    for (const t of ['bars', 'coins']) {
      $('tab-' + t).classList.toggle('active', t === type);
      $('tab-' + t).setAttribute('aria-selected', String(t === type));
    }
    $('cotations').scrollTop = 0;
    renderQuotes();
  });
$('buy-discount').addEventListener('input', () => {
  localStorage.setItem('or-buy-discount', $('buy-discount').value);
  drawBuy();
});
function draw() {
  const raw = $('mult').value,
    discount = parseNum(raw);
  const instant =
      Number.isFinite(spotValue) && spotValue > 0
        ? spotValue
        : Number.isFinite(data.instant) && data.instant > 0
          ? data.instant
          : null,
    cpor = Number.isFinite(data.cpor) && data.cpor > 0 ? data.cpor : null;
  const intrinsic = Number.isFinite(data.instant) && data.instant > 0 ? data.instant : null;
  const lowest = intrinsic !== null && cpor !== null ? Math.min(intrinsic, cpor) : null;
  $('instant').textContent = eur(instant);
  $('price18').textContent =
    raw.trim() !== '' &&
    Number.isFinite(discount) &&
    discount >= 0 &&
    discount <= 100 &&
    lowest !== null
      ? eur((lowest / 1000) * 0.75 * (1 - discount / 100)) + ' /g'
      : '— €/g';
  renderQuotes();
  drawBuy();
  window.dispatchEvent(new Event('prices-updated'));
  let quote = null;
  try {
    quote = JSON.parse(localStorage.getItem('or-spot-last') || 'null');
  } catch {}
  const at = new Date(quote?.updatedAt || '');
  $('last-updated').textContent =
    ['Kitco', 'BullionVault'].includes(quote?.source) &&
    Number.isFinite(quote.price) &&
    quote.price > 0 &&
    Number.isFinite(at.getTime())
      ? (quote.source === 'Kitco' ? 'Kitco : ' : 'BullionVault (secours Kitco) : ') +
        eur(quote.price) +
        '/kg\nDernière actualisation : ' +
        at.toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })
      : 'Kitco : en attente d’actualisation';
}
$('mult').addEventListener('input', () => {
  localStorage.setItem('or-discount', $('mult').value);
  draw();
});
const allowed = new Set(['instant', ...bars.map(p => p[0]), ...coins.map(p => p[0])]);
function validate(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('Format JSON incorrect');
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!allowed.has(key) || value === null || value === '') continue;
    const n = typeof value === 'number' ? value : parseNum(value);
    if (!Number.isFinite(n) || n <= 0) throw Error('Cours invalide : ' + key);
    result[key] = n;
  }
  return result;
}
$('manual').onclick = () => {
  const editor = $('editor');
  editor.hidden = !editor.hidden;
  $('json').value = JSON.stringify(
    Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k))),
    null,
    2
  );
  if (!editor.hidden) editor.scrollIntoView({ behavior: 'smooth' });
};
$('save').onclick = () => {
  try {
    const values = validate(JSON.parse($('json').value));
    data = { ...data, ...values, updatedAt: new Date().toISOString(), origin: 'Saisie manuelle' };
    window.GoldFreshness?.success('gold', data);
    localStorage.setItem('or-prices', JSON.stringify(data));
    $('error').textContent = '';
    $('editor').hidden = true;
    draw();
  } catch (e) {
    $('error').textContent = e.message;
  }
};
async function refreshPrices() {
  window.GoldFreshness?.start('gold');
  const b = $('refresh');
  $('status').textContent = 'Connexion à la source des cours…';
  try {
    const r = await fetch('/api/prices', { cache: 'no-store' });
    if (!r.ok) throw Error('Service indisponible (HTTP ' + r.status + ')');
    const payload = await r.json();
    const values = validate(payload.prices || {});
    if (!Object.keys(values).length) throw Error('Aucune cotation vérifiable trouvée');
    const oldKeys = new Set(Object.keys(data));
    for (const key of allowed) if (!(key in values)) delete data[key];
    data = {
      ...data,
      ...values,
      updatedAt: payload.updatedAt || new Date().toISOString(),
      origin: 'Mise à jour',
      intrinsicSource: payload.instantSource || 'Kitco',
    };
    window.GoldFreshness?.success('gold', { ...data, warnings: payload.warnings });
    localStorage.setItem('or-prices', JSON.stringify(data));
    draw();
    $('status').textContent = payload.warnings?.length
      ? 'Actualisé · Certaines cotations sont indisponibles : ' + payload.warnings.join(', ')
      : 'Cours actualisés.';
  } catch (e) {
    window.GoldFreshness?.fail('gold');
    $('status').textContent =
      'Mise à jour impossible : ' +
      e.message +
      '. Les derniers cours enregistrés restent affichés.';
  } finally {
  }
}
$('refresh').onclick = refreshAll;

// Actualisation discrète en tirant vers le bas depuis le haut de la page.
// Aucun bandeau ou message supplémentaire n'est affiché.
let pullStartY = null,
  pullDistance = 0;
const atPageTop = () => window.scrollY <= 2 && document.documentElement.scrollTop <= 2;
document.addEventListener(
  'touchstart',
  event => {
    pullStartY = null;
    pullDistance = 0;
    if (
      event.touches.length !== 1 ||
      !atPageTop() ||
      event.target.closest('input,textarea,select,button,[contenteditable="true"]')
    )
      return;
    pullStartY = event.touches[0].clientY;
  },
  { passive: true }
);
document.addEventListener(
  'touchmove',
  event => {
    if (pullStartY === null || event.touches.length !== 1) return;
    if (!atPageTop()) {
      pullStartY = null;
      pullDistance = 0;
      return;
    }
    pullDistance = Math.max(0, event.touches[0].clientY - pullStartY);
  },
  { passive: true }
);
document.addEventListener(
  'touchend',
  () => {
    const shouldRefresh = pullStartY !== null && pullDistance >= 75 && atPageTop();
    pullStartY = null;
    pullDistance = 0;
    if (shouldRefresh && !$('refresh').disabled) refreshAll();
  },
  { passive: true }
);
document.addEventListener(
  'touchcancel',
  () => {
    pullStartY = null;
    pullDistance = 0;
  },
  { passive: true }
);

// Graphique SVG natif, sans bibliothèque ni valeurs fictives.
function renderSpotChart() {
  window.GoldSpotChart.render(spotPoints, spotPeriod);
}

async function loadSpot() {
  try {
    const r = await fetch('/api/spot', { cache: 'no-store' });
    if (!r.ok) throw Error('Source spot indisponible');
    const p = await r.json();
    if (!Number.isFinite(p.price) || p.price <= 0) throw Error('Cours incorrect');
    spotValue = p.price;
    localStorage.setItem('or-spot-last', JSON.stringify(p));
    $('spot-meta').textContent =
      'Spot indicatif · ' +
      (p.updatedAt ? new Date(p.updatedAt).toLocaleString('fr-FR') + ' · ' : '') +
      (p.source === 'Kitco'
        ? p.marketClosed
          ? 'Marché fermé · cours de clôture Kitco · Bid · €/kg'
          : 'Source : Kitco · Bid · €/kg'
        : (p.marketClosed ? 'Marché fermé · cours de clôture · ' : '') +
          'Source : BullionVault · secours, Kitco indisponible · €/kg');
    draw();
  } catch (e) {
    spotValue = null;
    $('spot-meta').textContent =
      'Cours Kitco et BullionVault indisponibles : dernière référence conservée, si disponible.';
    draw();
  }
}
let historyBusy = false;
async function loadSpotHistory() {
  const requested = spotPeriod;
  try {
    const r = await fetch('/api/spot-history?period=' + requested, { cache: 'no-store' });
    if (!r.ok) throw Error('Historique BullionVault indisponible');
    const p = await r.json();
    if (
      p.source !== 'BullionVault' ||
      p.unit !== 'EUR/kg' ||
      String(p.period) !== String(requested) ||
      !Array.isArray(p.points)
    )
      throw Error('Source historique inattendue');
    if (requested !== spotPeriod) return;
    spotPoints = p.points;
    localStorage.setItem(
      'or-bv-history-' + requested,
      JSON.stringify({ points: spotPoints, updatedAt: p.updatedAt })
    );
    renderSpotChart();
  } catch (e) {
    if (requested !== spotPeriod) return;
    try {
      spotPoints =
        JSON.parse(localStorage.getItem('or-bv-history-' + requested) || 'null')?.points || [];
    } catch {
      spotPoints = [];
    }
    renderSpotChart();
    $('chart-note').textContent = spotPoints.length
      ? 'Dernier historique BullionVault enregistré'
      : 'Graphique BullionVault indisponible. Réessayez avec Actualiser.';
  }
}

document.querySelectorAll('[data-period]').forEach(b =>
  b.addEventListener('click', () => {
    spotPeriod = Number(b.dataset.period);
    loadSpotHistory();
  })
);
// Actualise toutes les sources avec une roulette visible jusqu'à la fin.
async function refreshAll() {
  const b = $('refresh');
  if (b.disabled) return;
  b.disabled = true;
  $('refresh-spinner').hidden = false;
  try {
    await Promise.allSettled([
      refreshPrices(),
      loadSpot(),
      loadSpotHistory(),
      window.refreshSilver?.(),
      window.refreshC3e?.(),
    ]);
  } finally {
    b.disabled = false;
    $('refresh-spinner').hidden = true;
  }
}
draw();
refreshPrices();
loadSpot();
loadSpotHistory();
window.addEventListener('client-reset', () => {
  taxDateCommitted = '';
  taxDatePending = false;
  $('tax-date-status').textContent = '';
  drawBuy();
});

setInterval(() => {
  if (
    !document.hidden &&
    $('spot-chart-details').open &&
    document.body.dataset.mobileTab !== 'estimation' &&
    !historyBusy
  ) {
    historyBusy = true;
    loadSpotHistory().finally(() => (historyBusy = false));
  }
}, 30000);
