// Onglet « Météo » : indices de tendance de l’or, à titre informatif (repris de GoldGestion).
(() => {
  'use strict';
  const tile = document.getElementById('gold-weather');
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids.filter(k => k != null && k !== ''));
    return e;
  };
  const ARROW = {
    1: ['▲', 'gw-up', 'plutôt haussier'],
    '-1': ['▼', 'gw-down', 'plutôt baissier'],
    0: ['●', 'gw-flat', 'neutre'],
  };
  // Seuils du score entre deux météos (comme meteo_or.WEATHER).
  const STEPS = [-0.63, -0.25, 0.25, 0.63];
  const plural = (n, word) => n + ' ' + word + (n > 1 ? 's' : '');

  function draw(w, stale) {
    const flat = w.flat ?? w.indicators.filter(x => x.signal === 0).length,
      weather = w.weather || {
        icon: '❔',
        label: 'Indéterminé',
        text: 'Pas assez d’indices disponibles pour le moment.',
      },
      pos = w.score == null ? 50 : ((w.score + 1) / 2) * 100,
      groups = new Map();
    for (const x of w.indicators)
      groups.has(x.group) ? groups.get(x.group).push(x) : groups.set(x.group, [x]);
    const row = x => {
      const [mark, cls, word] = ARROW[x.signal];
      return el(
        'div',
        { className: 'gw-row' },
        el('span', { className: cls, textContent: mark, title: word }),
        el('strong', { textContent: x.label }),
        el('em', { textContent: x.value }),
        el('p', { textContent: x.text })
      );
    };
    const gauge = el('div', { className: 'gw-gauge' });
    gauge.setAttribute('aria-hidden', 'true');
    for (const step of STEPS) {
      const mark = el('b');
      mark.style.left = ((step + 1) / 2) * 100 + '%';
      gauge.append(mark);
    }
    const cursor = el('i');
    cursor.style.left = pos + '%';
    gauge.append(cursor);
    const icon = el('span', { className: 'gw-icon', textContent: weather.icon });
    icon.setAttribute('aria-hidden', 'true');
    const at = new Date(w.at).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    tile.replaceChildren(
      el(
        'div',
        { className: 'gw-head' },
        icon,
        el(
          'div',
          { className: 'gw-title' },
          el('small', { textContent: 'Météo de l’or' }),
          el('b', { textContent: weather.label }),
          el('span', { textContent: weather.text })
        )
      ),
      el(
        'div',
        { className: 'gw-count' },
        el('span', { className: 'gw-up', textContent: '▲ ' + plural(w.up, 'haussier') }),
        el('span', { className: 'gw-down', textContent: '▼ ' + plural(w.down, 'baissier') }),
        el('span', { className: 'gw-flat', textContent: '● ' + plural(flat, 'neutre') })
      ),
      gauge,
      el(
        'div',
        { className: 'gw-scale' },
        el('span', { textContent: 'Plutôt baissier' }),
        el('span', { textContent: 'Plutôt haussier' })
      ),
      ...[...groups].flatMap(([group, list]) => [
        el('h3', { className: 'gw-group', textContent: group }),
        ...list.map(row),
      ]),
      el('p', {
        className: 'gw-note',
        textContent:
          'À titre informatif : ce n’est pas un conseil d’achat ou de vente. ' +
          (stale ? '⚠ Dernière météo enregistrée, du ' : 'Mise à jour toutes les 30 minutes · ') +
          at +
          (w.errors?.length ? ' · indisponible : ' + w.errors.join(', ') : ''),
      })
    );
  }

  const KEY = 'goldapp-meteo';
  let at = 0,
    busy = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.indicators) draw(saved, true);
  } catch {}
  async function load(force) {
    if (busy || (!force && Date.now() - at < 30 * 60000)) return;
    busy = true;
    try {
      const response = await fetch('/api/weather', { cache: 'no-store' });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const weather = await response.json();
      draw(weather, false);
      at = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(weather));
      } catch {}
    } catch {
      if (!at && !tile.querySelector('.gw-head'))
        tile.replaceChildren(
          el('p', { className: 'small', textContent: 'Météo de l’or indisponible pour le moment.' })
        );
    } finally {
      busy = false;
    }
  }
  const visible = () => document.body.dataset.view === 'meteo';
  window.addEventListener('view-changed', () => visible() && load());
  setInterval(() => visible() && !document.hidden && load(), 60000);
  // Tirer pour actualiser, depuis cet onglet (le serveur garde la météo 30 min).
  window.refreshMeteo = () => (visible() ? load(true) : undefined);
})();
