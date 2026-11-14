// Onglet « Scan » : trouver le poids et le titre d’une pièce peu courante, comme le scanner
// de pièces d’Orbis. Photo de la face (et du revers) → « Demander à Claude » → pièces du
// catalogue Numista ; ou recherche guidée (mots, pays, année). La fiche vient toujours de
// Numista ; le prix d’achat indicatif suit le calcul de la ligne « Divers » des tarifs
// non boursables d’Orbis. Serveur : pieces_scan.py (/api/scan/…).
(() => {
  'use strict';
  const root = document.getElementById('coin-scan');
  if (!root) return;
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids.filter(k => k != null && k !== '' && k !== false));
    return e;
  };
  const eur = v => (v == null || !isFinite(v) ? '—' : v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }));
  // Deux chiffres après la virgule, coupés sans arrondir (13,9658 g → 13,96 g), comme Orbis.
  const nb = (v, digits = 2) =>
    v == null || !isFinite(v)
      ? '—'
      : (Math.floor(Number(v) * 10 ** digits + 1e-6) / 10 ** digits).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  // Tarifs non boursables d’Orbis : FC agence 6 % + CNDO 6 %, TMP 11,5 % ; argent : C3E − 34 %.
  const FC_GOLD = 0.12, FC_SILVER = 0.34, TMP = 0.115;
  const stored = (key, field) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null')?.[field];
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  };

  const photos = { face: null, revers: null }; // JPEG en base64 (réduites à 1600 px)
  let keys = null, results = null, coin = null, busy = false, message = '', bad = false;

  async function api(path, body) {
    const r = await fetch(path, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }
      : { cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(data.error || 'Erreur ' + r.status);
    return data;
  }

  // Photo du téléphone réduite et convertie en JPEG (Claude n’accepte pas plus de 5 Mo).
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)),
          c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(Error('Photo illisible.'));
      };
      img.src = url;
    });
  }

  function say(text, isBad) {
    message = text || '';
    bad = !!isBad;
    draw();
  }
  async function run(task) {
    if (busy) return;
    busy = true;
    say('');
    try {
      await task();
    } catch (e) {
      say(e.message || String(e), true);
    } finally {
      busy = false;
      draw();
    }
  }

  const identify = () =>
    run(async () => {
      say('Claude regarde la pièce… (jusqu’à une minute)');
      const sent = Object.entries(photos).filter(([, d]) => d).map(([side, data]) => ({ side, data }));
      const r = await api('/api/scan/identify', { photos: sent });
      coin = null;
      results = r.matches || [];
      const guesses = (r.candidates || []).map(c => c.label + (c.year ? ' (' + c.year + ')' : '')).join(' · ');
      say(!r.isCoin
        ? 'Claude ne voit pas de pièce sur la photo.' + (r.advice ? ' ' + r.advice : '')
        : (guesses ? 'Claude pense à : ' + guesses + '. ' : '') + (r.advice ? r.advice + ' ' : '') +
          (results.length ? 'Choisis la bonne pièce ci-dessous.' : 'Rien de trouvé dans Numista : essaie la recherche par mots.') +
          (r.warnings?.length ? ' ' + r.warnings.join(' ') : ''), !r.isCoin);
    });
  const search = form =>
    run(async () => {
      const q = new URLSearchParams({ q: form.q.value, country: form.country.value, year: form.year.value });
      results = (await api('/api/scan/search?' + q)).results || [];
      coin = null;
      say(results.length ? '' : 'Aucune pièce trouvée : essaie d’autres mots (ex. « 20 Francs », « Souverain »).');
    });
  const open = (id, year) =>
    run(async () => {
      coin = await api('/api/scan/coin?' + new URLSearchParams({ id, year: year || '' }));
      root.scrollIntoView({ behavior: 'smooth' });
    });

  function photoButton(side, label) {
    const input = el('input', { type: 'file', accept: 'image/*', hidden: true });
    input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        photos[side] = await shrink(file);
        draw();
      } catch (e) {
        say(e.message, true);
      }
    };
    const shot = photos[side];
    return el('label', { className: 'cs-shot' + (shot ? ' taken' : '') }, input,
      shot ? el('img', { src: 'data:image/jpeg;base64,' + shot, alt: label }) : el('span', { className: 'cs-cam', textContent: '📷' }),
      el('span', { textContent: shot ? label + ' · reprendre' : label }));
  }

  function card(r) {
    return el('button', { type: 'button', className: 'cs-hit', onclick: () => open(r.id, r.year) },
      r.obverse ? el('img', { src: r.obverse, alt: '', loading: 'lazy' }) : el('span', { className: 'cs-noimg', textContent: '◎' }),
      el('span', {},
        el('b', { textContent: r.title }),
        el('small', { textContent: [r.issuer, r.minYear && (r.minYear === r.maxYear ? r.minYear : r.minYear + '–' + (r.maxYear || ''))].filter(Boolean).join(' · ') })));
  }

  function sheet(c) {
    const fine = c.fine?.grams;
    // Prix d’achat indicatif : calcul de la ligne « Divers » des tarifs non boursables d’Orbis.
    let price = null, base = '';
    if (fine && c.metalCode === 'AU') {
      const kg = stored('or-prices', 'instant');
      if (kg) {
        price = (kg * fine) / 1000 * (1 - FC_GOLD) * (1 - TMP);
        base = 'cours de l’or ' + eur(kg) + '/kg, FC 12 %, TMP 11,5 %';
      }
    } else if (fine && c.metalCode === 'AG') {
      const kg = stored('c3e-prices', 'price');
      if (kg) {
        price = (kg * fine) / 1000 * (1 - FC_SILVER) * (1 - TMP);
        base = 'cotation argent C3E ' + eur(kg) + '/kg, − 34 %, TMP 11,5 %';
      }
    }
    const row = (label, value) => (value ? el('div', { className: 'cs-row' }, el('span', { textContent: label }), el('b', { textContent: value })) : null);
    const years = c.minYear ? (c.minYear === c.maxYear ? String(c.minYear) : c.minYear + ' – ' + (c.maxYear || '')) : '';
    return el('div', { className: 'cs-sheet' },
      el('div', { className: 'cs-faces' }, c.obverse ? el('img', { src: c.obverse, alt: 'Face' }) : null, c.reverse ? el('img', { src: c.reverse, alt: 'Revers' }) : null),
      el('h3', { textContent: c.title }),
      el('p', { className: 'small', textContent: [c.issuer, c.value, years].filter(Boolean).join(' · ') }),
      row('Métal', c.composition || c.metal),
      row('Titre', c.fineness ? nb(c.fineness, 0) + ' ‰' : ''),
      row('Poids', c.weight ? nb(c.weight) + ' g' : ''),
      row('Diamètre', c.size ? nb(c.size, 1) + ' mm' : ''),
      row('Épaisseur', c.thickness ? nb(c.thickness, 1) + ' mm' : ''),
      row(c.metalCode === 'AG' ? 'Argent fin' : c.metalCode === 'AU' ? 'Or fin' : 'Métal fin', fine ? nb(fine) + ' g' : ''),
      price != null
        ? el('div', { className: 'cs-price' }, el('span', { textContent: 'Prix d’achat indicatif' }), el('b', { textContent: eur(price) }),
            el('small', { textContent: 'Net client, ' + base + '. À reporter dans une ligne « Pièce Divers » du Rachat pour le calcul exact.' }))
        : el('p', { className: 'small', textContent: c.metalCode ? 'Cours du jour pas encore chargé : ouvre l’onglet Cours puis reviens.' : 'Pas une pièce en métal précieux d’après le catalogue.' }),
      c.year && c.issues?.length
        ? el('p', { className: 'small', textContent: 'Tirage ' + c.year + ' : ' + (c.issues.filter(i => i.year === c.year).map(i => (i.mint ? i.mint + ' ' : '') + (i.mintage ? i.mintage.toLocaleString('fr-FR') + ' ex.' : '?')).join(', ') || 'année absente du catalogue') })
        : null,
      el('p', { className: 'small cs-warn', textContent: '⚖️ À vérifier à la balance et au pied à coulisse : la fiche ne prouve ni l’authenticité ni le titre.' }),
      c.url ? el('a', { href: c.url, target: '_blank', rel: 'noopener', textContent: 'Voir sur Numista' }) : null,
      el('button', { type: 'button', className: 'secondary', textContent: '← Retour à la liste', onclick: () => { coin = null; draw(); } }));
  }

  function draw() {
    const missing = keys && (!keys.numista || !keys.claude)
      ? el('p', { className: 'small cs-bad', textContent: 'À ajouter dans les réglages de Render (Environment) : ' +
          [!keys.claude && 'ANTHROPIC_API_KEY (pour demander à Claude)', !keys.numista && 'NUMISTA_API_KEY (catalogue)'].filter(Boolean).join(' et ') + '.' })
      : null;
    const form = el('form', { className: 'cs-search' },
      el('input', { name: 'q', placeholder: 'Nom : 20 Francs, Souverain…', autocomplete: 'off' }),
      el('div', { className: 'cs-two' },
        el('input', { name: 'country', placeholder: 'Pays', autocomplete: 'off' }),
        el('input', { name: 'year', placeholder: 'Année', inputMode: 'numeric', autocomplete: 'off' })),
      el('button', { type: 'submit', className: 'secondary', textContent: 'Rechercher', disabled: busy }));
    form.onsubmit = e => {
      e.preventDefault();
      search(form);
    };
    const any = photos.face || photos.revers;
    root.replaceChildren(...[
      el('div', { className: 'eyebrow', textContent: 'SCANNER UNE PIÈCE' }),
      missing,
      coin
        ? sheet(coin)
        : el('div', {},
            el('p', { className: 'small', textContent: 'Photographie la face, et le revers si tu peux, bien à plat et éclairée.' }),
            el('div', { className: 'cs-shots' }, photoButton('face', 'Face'), photoButton('revers', 'Revers')),
            el('button', { type: 'button', className: 'primary cs-ask', textContent: busy ? 'Patiente…' : 'Demander à Claude', disabled: !any || busy, onclick: identify }),
            any ? el('button', { type: 'button', className: 'secondary', textContent: 'Effacer les photos',
              onclick: () => { photos.face = photos.revers = null; results = null; say(''); } }) : null,
            el('p', { className: 'small' + (bad ? ' cs-bad' : ''), textContent: message, role: 'status' }),
            results?.length ? el('div', { className: 'cs-hits' }, ...results.map(card)) : null,
            el('details', { className: 'cs-more', open: !any && !results },
              el('summary', { textContent: 'Ou chercher par le nom' }), form)),
    ].filter(Boolean));
  }

  async function load() {
    if (keys) return;
    try {
      keys = await api('/api/scan/state');
    } catch {}
    draw();
  }
  const visible = () => document.body.dataset.view === 'scan';
  window.addEventListener('view-changed', () => visible() && load());
  draw();
  if (visible()) load();
})();
