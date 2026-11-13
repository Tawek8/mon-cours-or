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
  const dayLabel = iso =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Les 4 dernières semaines : météo de chaque jour ouvré (recalculée par le serveur), puis aujourd'hui.
  function past(w) {
    const days = (w.history || []).filter(d => d.weather);
    if (!days.length || !w.weather) return null;
    const last = days[days.length - 1];
    let same = 0;
    for (let i = days.length - 1; i >= 0 && days[i].weather.key === w.weather.key; i--) same++;
    const cell = (d, cls, title) => {
      const c = el('span', { className: cls, textContent: d.weather.icon, title });
      c.setAttribute('aria-label', title);
      return c;
    };
    return el(
      'div',
      { className: 'gw-past' },
      el(
        'div',
        { className: 'gw-strip' },
        ...days.map(d => cell(d, '', dayLabel(d.day) + ' : ' + d.weather.label)),
        cell(w, 'today', 'Aujourd’hui : ' + w.weather.label)
      ),
      el('p', {
        textContent:
          '4 dernières semaines · ' +
          (last.weather.key !== w.weather.key
            ? 'a changé : la veille, ' + last.weather.label.toLowerCase()
            : same >= days.length
              ? 'le même temps depuis au moins 4 semaines'
              : 'le même temps depuis ' + (same + 1) + ' jours ouvrés'),
      })
    );
  }

  // « Et ensuite ? » : ce qui a suivi les jours de même météo depuis 2005 (meteo_or.odds).
  // Conclusion : un écart avec « tous temps confondus » ne compte que s’il sort de la fourchette.
  function verdict(rows) {
    const net = rows.filter(r => r.enough && r.clear),
      shaky = rows.filter(r => r.stable === false);
    return (
      (net.length
        ? 'Écart net avec tous temps confondus après ' + net.map(r => r.horizon).join(', ') + '.'
        : 'Aucune fourchette ne s’écarte nettement de « tous temps confondus » : ce temps-là ne change rien de sûr.') +
      (shaky.length ? ' Instable d’une période à l’autre après ' + shaky.map(r => r.horizon).join(', ') + ' : à ne pas croire.' : '')
    );
  }
  function odds(w) {
    const rows = (w.odds?.rows || []).filter(r => r.up != null);
    if (!rows.length || !w.weather) return null;
    return el(
      'div',
      { className: 'gw-odds' },
      el('h3', { className: 'gw-group', textContent: 'Et ensuite ?' }),
      ...rows.map(r =>
        el(
          'div',
          { className: 'gw-row' },
          el('span'),
          el('strong', { textContent: 'Or plus haut après ' + r.horizon }),
          // Couleur seulement si l’écart avec « tous temps confondus » est net (hors fourchette).
          el('em', {
            className: !r.enough || !r.clear ? 'gw-flat' : r.up >= r.allUp ? 'gw-up' : 'gw-down',
            textContent: r.up + ' %',
          }),
          el('p', {
            textContent:
              (r.enough ? '' : 'Trop peu de cas pour conclure · ') +
              (r.low != null ? 'entre ' + r.low + ' et ' + r.high + ' % 9 fois sur 10 · ' : '') +
              'tous temps confondus : ' + r.allUp + ' %' +
              (r.stable === false ? ' · instable : ' + r.early + ' % avant ' + w.odds.split + ', ' + r.late + ' % depuis' : ''),
          })
        )
      ),
      el('p', {
        className: 'gw-note',
        textContent:
          verdict(rows) +
          ' Jours « ' + w.weather.label + ' » depuis ' + String(w.odds.since || '2005').slice(0, 4) +
          ' : fréquences du passé, pas une prévision.',
      })
    );
  }

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
      past(w),
      odds(w),
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
          ((w.missing || w.errors)?.length
            ? ' · sans réponse pour l’instant : ' + (w.missing || w.errors).join(', ') + ' (nouvel essai dans 5 min)'
            : ''),
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
      // Une source n'a pas répondu : relue au bout de 5 minutes (comme le serveur).
      at = Date.now() - (weather.errors?.length ? 25 * 60000 : 0);
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
