// Alerte de cours de l’or, commune avec Orbis : mêmes seuils sur l’iPhone et sur les postes.
// Le serveur contrôle le cours toutes les 10 minutes et prévient l’iPhone par l’appli ntfy.
(() => {
  'use strict';
  const box = document.getElementById('gold-alert');
  if (!box) return;
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids.filter(k => k != null && k !== ''));
    return e;
  };
  const kilo = v => Math.round(v).toLocaleString('fr-FR') + ' €/kg';
  const level = (v, dir) => (dir === 'above' ? 'au-dessus de ' : 'en dessous de ') + kilo(v);
  const pct = v => (Math.round(v * 10) / 10).toLocaleString('fr-FR') + ' %';
  // « en hausse de 2,3 % sur 24 h » (variation) ou « au-dessus de 120 000 €/kg » (seuil).
  const what = h => (h.dir === 'up' || h.dir === 'down'
    ? 'en ' + (h.dir === 'up' ? 'hausse' : 'baisse') + ' de ' + pct(Math.abs(h.change || 0)) + ' sur 24 h'
    : level(h.level, h.dir));
  const when = iso =>
    new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const KEY = 'orapp-alerte';
  let state = null;

  async function call(body) {
    const r = await fetch('/api/alert', body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }
      : { cache: 'no-store' });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'HTTP ' + r.status);
    state = data;
    try {
      localStorage.setItem(KEY, JSON.stringify({ above: data.above, below: data.below, move: data.move, updated: data.updated, hits: data.hits }));
    } catch {}
    return data;
  }

  // Après un redémarrage du serveur, l’état gardé sur l’iPhone est renvoyé (le plus récent l’emporte).
  async function load() {
    try {
      await call();
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept?.updated && (!state.updated || kept.updated > state.updated)) await call(kept);
    } catch {}
    draw();
  }

  function draw(message, bad) {
    const a = state;
    box.hidden = !a;
    if (!a) return;
    const field = (name, label) => {
      const input = el('input', {
        name,
        inputMode: 'numeric',
        placeholder: '—',
        value: a[name] ? Math.round(a[name]).toLocaleString('fr-FR') : '',
      });
      input.setAttribute('aria-label', 'Prévenir si l’or passe ' + label + ' (€/kg)');
      return el('label', {}, el('span', { textContent: label }), input, el('small', { textContent: '€/kg' }));
    };
    const msg = el('p', { className: 'small' + (bad ? ' ga-bad' : ''), textContent: message || '' });
    const refuse = text => {
      msg.className = 'small ga-bad';
      msg.textContent = text;
    };
    const send = async (above, below, move, done) => {
      try {
        await call({ above, below, move, updated: new Date().toISOString(), hits: a.hits || [] });
        draw(done);
      } catch (e) {
        refuse(e.message);
      }
    };
    const form = el('form', { className: 'ga-form' },
      field('above', 'Au-dessus de'),
      field('below', 'En dessous de'),
      (() => {
        const input = el('input', { name: 'move', inputMode: 'decimal', placeholder: '—', value: a.move ? String(a.move).replace('.', ',') : '' });
        input.setAttribute('aria-label', 'Prévenir si l’or monte ou baisse de plus de (% sur 24 h)');
        return el('label', {}, el('span', { textContent: 'Hausse ou baisse de plus de' }), input, el('small', { textContent: '% sur 24 h' }));
      })(),
      el('div', { className: 'ga-buttons' },
        el('button', { type: 'submit', className: 'primary', textContent: 'Enregistrer' }),
        a.above || a.below || a.move
          ? el('button', { type: 'button', className: 'secondary', textContent: 'Retirer', onclick: () => send(null, null, null, 'Alerte retirée.') })
          : null));
    form.onsubmit = e => {
      e.preventDefault();
      const read = name => {
        const t = form.elements[name].value.replace(/[\s\u202f\u00a0€]/g, '').replace(',', '.');
        return t ? Number(t) : null;
      };
      const above = read('above'),
        below = read('below'),
        move = read('move');
      if ([above, below].some(v => v != null && !(v > 1000))) return refuse('Saisir un cours en euros par kilo, par exemple 120 000.');
      if (move != null && !(move >= 0.5 && move <= 20)) return refuse('Saisir une variation entre 0,5 et 20 %, par exemple 2.');
      if (a.price && above != null && above <= a.price) return refuse('Le cours est déjà au-dessus de ' + kilo(above) + ' : choisir un seuil plus haut.');
      if (a.price && below != null && below >= a.price) return refuse('Le cours est déjà en dessous de ' + kilo(below) + ' : choisir un seuil plus bas.');
      send(above, below, move, above || below || move ? 'Alerte enregistrée, aussi pour les postes d’Orbis.' : 'Alerte retirée.');
    };
    const active = [a.above && level(a.above, 'above'), a.below && level(a.below, 'below'),
      a.move && 'en cas de hausse ou de baisse de plus de ' + pct(a.move) + ' sur 24 h'].filter(Boolean);
    const last = a.hits?.at(-1);
    const copy = el('button', { type: 'button', className: 'secondary', textContent: 'Copier le nom du canal' });
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(a.channel);
        copy.textContent = 'Copié ✓';
      } catch {
        copy.textContent = a.channel;
      }
    };
    box.replaceChildren(...[
      el('div', { className: 'eyebrow', textContent: 'ALERTE DE COURS' }),
      a.price ? el('p', { className: 'small', textContent: 'Cours actuel : ' + kilo(a.price) }) : null,
      form,
      msg,
      el('p', {
        className: 'small' + (active.length ? ' ga-on' : ''),
        textContent: active.length
          ? '🔔 Active : prévenir ' + active.join(' ou ') + '. Mêmes réglages sur les postes d’Orbis ; un seuil sonne une fois, la variation reste surveillée (une alerte par sens et par jour au plus).'
          : 'Aucune alerte en place. Les réglages faits ici valent aussi pour les postes d’Orbis.',
      }),
      last ? el('p', { className: 'small', textContent: 'Dernière alerte : or ' + what(last) + ', le ' + when(last.at) + ' (' + kilo(last.price) + ').' }) : null,
      a.channel
        ? el('details', { className: 'ga-help' },
            el('summary', { textContent: 'Recevoir l’alerte sur ce téléphone' }),
            el('p', { className: 'small', textContent:
              'Installe l’appli gratuite « ntfy » depuis l’App Store, touche « + », puis abonne-toi au canal ci-dessous (serveur ntfy.sh, celui par défaut). ' +
              'La notification arrive même Orbismini fermée. Le cours est contrôlé toutes les 10 minutes en semaine.' }),
            el('p', { className: 'ga-channel', textContent: a.channel }),
            copy)
        : null,
    ].filter(Boolean));
  }

  const visible = () => document.body.dataset.view === 'meteo';
  window.addEventListener('view-changed', () => visible() && load());
  if (visible()) load();
})();
