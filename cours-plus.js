// Onglet Cours : recherche, favoris (appui long), prix qui clignotent quand ils changent,
// bandeau « cours périmés » et écran d’ouverture.
(() => {
  'use strict';
  const $ = id => document.getElementById(id),
    lists = ['cpor-coins', 'cpor-bars', 'silver-quotes'],
    cards = () => lists.flatMap(id => [...($(id)?.querySelectorAll('.quote[data-key]') || [])]),
    normalize = text =>
      String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ');

  // ---- Recherche ----
  const search = $('quote-search');
  function filter() {
    const words = normalize(search.value).trim().split(' ').filter(Boolean),
      active = words.length > 0;
    let shown = 0;
    for (const card of cards()) {
      const name = normalize(card.querySelector('.name')?.textContent || '');
      card.hidden = active && !words.every(w => name.includes(w));
      if (!card.hidden) shown++;
    }
    // Titres et cadres vides masqués pendant une recherche.
    for (const heading of document.querySelectorAll('#cpor-section .list-heading')) {
      const list = heading.nextElementSibling;
      heading.hidden = active && !list.querySelector('.quote:not([hidden])');
    }
    for (const id of ['cpor-section', 'silver-section']) {
      const section = $(id);
      if (section) section.hidden = active && !section.querySelector('.quote:not([hidden])');
    }
    $('spot-section').hidden = active;
    $('favorites-section').hidden = active || !favorites.length;
    $('search-empty').hidden = !active || shown > 0;
  }
  search.addEventListener('input', filter);
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') search.blur();
  });

  // ---- Favoris ----
  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem('goldapp-favoris') || '[]').filter(
      k => typeof k === 'string'
    );
  } catch {}
  function saveFavorites() {
    try {
      localStorage.setItem('goldapp-favoris', JSON.stringify(favorites));
    } catch {}
  }
  function renderFavorites() {
    const root = $('favorites');
    root.replaceChildren();
    const all = cards();
    for (const card of all) card.classList.toggle('is-fav', favorites.includes(card.dataset.key));
    for (const key of favorites) {
      const original = all.find(c => c.dataset.key === key);
      if (!original) continue;
      const copy = original.cloneNode(true);
      copy.hidden = false;
      copy.dataset.favCopy = '1';
      // Le favori ouvre le même calcul que la carte d’origine.
      if (original.tagName === 'BUTTON') copy.addEventListener('click', () => original.click());
      root.append(copy);
    }
    $('favorites-section').hidden = !root.children.length || !!search.value.trim();
  }
  let toastTimer = null;
  function toast(text) {
    let box = $('toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast';
      box.className = 'toast';
      box.setAttribute('role', 'status');
      document.body.append(box);
    }
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 1800);
  }
  function toggleFavorite(card) {
    const key = card.dataset.key,
      name = card.querySelector('.name')?.textContent || 'Produit';
    if (favorites.includes(key)) {
      favorites = favorites.filter(k => k !== key);
      toast('« ' + name + ' » retiré des favoris');
    } else {
      favorites.push(key);
      toast('★ « ' + name + ' » épinglé en favori');
    }
    saveFavorites();
    renderFavorites();
  }
  // Appui long (0,5 s) sur une carte : épingler ou retirer. Le clic qui suit est ignoré.
  let pressTimer = null,
    pressStart = null,
    swallowClick = false;
  const view = $('view-cours');
  view.addEventListener('pointerdown', e => {
    const card = e.target.closest('.quote[data-key]');
    if (!card) return;
    pressStart = { x: e.clientX, y: e.clientY };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      swallowClick = true;
      toggleFavorite(card);
    }, 500);
  });
  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };
  view.addEventListener('pointermove', e => {
    if (pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10)
      cancelPress();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) view.addEventListener(type, cancelPress);
  view.addEventListener(
    'click',
    e => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true
  );
  view.addEventListener('contextmenu', e => {
    if (e.target.closest('.quote[data-key]')) e.preventDefault();
  });

  // ---- Prix qui clignotent quand ils changent ----
  const previous = new Map();
  function flash() {
    for (const card of cards()) {
      const price = Number(card.dataset.price),
        before = previous.get(card.dataset.key);
      if (!Number.isFinite(price)) continue;
      if (Number.isFinite(before) && Math.abs(price - before) > 0.004) {
        card.classList.remove('flash-up', 'flash-down');
        void card.offsetWidth;
        card.classList.add(price > before ? 'flash-up' : 'flash-down');
      }
      previous.set(card.dataset.key, price);
    }
  }
  let spotBefore = null;
  function flashSpot() {
    const node = $('instant'),
      value = Number(node.textContent.replace(/[^\d,]/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    if (spotBefore !== null && Math.abs(value - spotBefore) > 0.004) {
      node.classList.remove('flash-up', 'flash-down');
      void node.offsetWidth;
      node.classList.add(value > spotBefore ? 'flash-up' : 'flash-down');
    }
    spotBefore = value;
  }

  // ---- Bandeau « cours périmés » (plus de 30 min) ----
  function checkStale() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('or-prices') || 'null');
    } catch {}
    const at = Date.parse(saved?.updatedAt || ''),
      banner = $('stale-banner');
    if (!Number.isFinite(at) || $('refresh').disabled) {
      banner.hidden = true;
      return;
    }
    const minutes = Math.floor((Date.now() - at) / 60000);
    banner.hidden = minutes < 30;
    if (minutes >= 30)
      $('stale-text').textContent =
        '⚠ Cours de l’or vieux de ' +
        (minutes >= 120 ? Math.floor(minutes / 60) + ' h' : minutes + ' min') +
        ' : actualise avant d’annoncer un prix.';
  }
  $('stale-refresh').addEventListener('click', () => $('refresh').click());
  new MutationObserver(checkStale).observe($('refresh'), { attributes: true });
  setInterval(checkStale, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkStale();
  });

  window.addEventListener('quotes-rendered', () => {
    flash();
    renderFavorites();
    filter();
    checkStale();
  });
  window.addEventListener('prices-updated', flashSpot);
  // Premier passage : les listes ont pu être dessinées avant le chargement de ce fichier.
  flash();
  flashSpot();
  renderFavorites();
  filter();
  checkStale();

  // ---- Écran d’ouverture ----
  const splash = $('splash');
  const hideSplash = () => {
    splash.classList.add('gone');
    setTimeout(() => splash.remove(), 450);
  };
  if (document.readyState === 'complete') setTimeout(hideSplash, 350);
  else window.addEventListener('load', () => setTimeout(hideSplash, 350));
  setTimeout(hideSplash, 2500);
})();
