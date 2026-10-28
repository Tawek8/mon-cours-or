(function () {
  'use strict';
  let last = [],
    days = 1,
    metal = 'gold',
    color = '#e9bf75',
    animated = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Animation du point du dernier cours (une seule feuille de style pour le graphique).
  const style = document.createElement('style');
  style.textContent =
    '#spot-chart .sc-pulse{transform-box:fill-box;transform-origin:center;animation:sc-pulse 2.2s ease-out infinite}@keyframes sc-pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(4);opacity:0}}@media(prefers-reduced-motion:reduce){#spot-chart .sc-pulse{animation:none;opacity:0}}';
  document.head.append(style);
  // Variation sur la période affichée (↑ vert, ↓ rouge), comme dans GoldGestion.
  function paintVariation(values, period) {
    const host = document.getElementById('spot-variation');
    if (!host) return;
    const first = values[0],
      lastPoint = values.at(-1);
    if (values.length < 2 || !(first.price > 0)) {
      host.hidden = true;
      return;
    }
    const delta = lastPoint.price - first.price,
      percent = (delta / first.price) * 100,
      dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      fmt = n =>
        new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
          Math.abs(n)
        ),
      sign = dir === 'up' ? '+' : dir === 'down' ? '−' : '';
    host.dataset.dir = dir;
    host.textContent =
      (dir === 'up' ? '↑ ' : dir === 'down' ? '↓ ' : '→ ') +
      sign +
      fmt(percent) +
      ' % · ' +
      sign +
      fmt(delta) +
      ' € sur ' +
      ({ 1: '1 jour', 7: '7 jours', 30: '1 mois', 365: '1 an' }[period] || period + ' jours');
    host.hidden = false;
  }
  function render(points, period, chosenMetal = metal) {
    last = points;
    days = period;
    metal = chosenMetal;
    color = metal === 'silver' ? '#d0dae5' : '#e9bf75';
    const chart = document.getElementById('spot-chart'),
      note = document.getElementById('chart-note');
    if (!chart) return;
    chart.replaceChildren();
    const width = chart.getBoundingClientRect().width;
    if (width < 80) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    const values = points.filter(
      p => new Date(p.date) >= cutoff && Number.isFinite(p.price) && p.price > 0
    );
    document
      .querySelectorAll('[data-period]')
      .forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.period) === period)));
    paintVariation(values, period);
    if (values.length < 2) {
      note.textContent = 'Historique BullionVault insuffisant pour cette période.';
      return;
    }
    const height = 215,
      left = 65,
      right = 10,
      top = 13,
      bottom = 30,
      min = Math.min(...values.map(v => v.price)),
      max = Math.max(...values.map(v => v.price)),
      pad = Math.max(1, (max - min) * 0.12),
      start = new Date(values[0].date).getTime(),
      end = new Date(values.at(-1).date).getTime(),
      x = v =>
        left + ((new Date(v.date).getTime() - start) / (end - start)) * (width - left - right),
      y = v => top + ((max + pad - v) / (max - min + pad * 2)) * (height - top - bottom);
    chart.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    chart.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const ns = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, txt) {
      const n = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (txt !== undefined) n.textContent = txt;
      chart.append(n);
      return n;
    }
    for (let i = 0; i < 4; i++) {
      const value = min + ((max - min) * i) / 3,
        yy = y(value);
      el('line', {
        x1: left,
        x2: width - right,
        y1: yy,
        y2: yy,
        stroke: '#344853',
        'stroke-width': '.7',
        'stroke-dasharray': '2 5',
      });
      el(
        'text',
        { x: left - 8, y: yy + 4, 'text-anchor': 'end', fill: '#b5c7d3', 'font-size': 10 },
        Math.round(value).toLocaleString('fr-FR')
      );
    }
    const indexes = [
      0,
      Math.round((values.length - 1) / 3),
      Math.round(((values.length - 1) * 2) / 3),
      values.length - 1,
    ];
    indexes.forEach((index, i) =>
      el(
        'text',
        {
          x: x(values[index]),
          y: height - 7,
          'text-anchor': i === 0 ? 'start' : i === 3 ? 'end' : 'middle',
          fill: '#b5c7d3',
          'font-size': 10,
        },
        period === 1
          ? new Date(values[index].date).toLocaleTimeString('fr-FR', {
              timeZone: 'Europe/Paris',
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date(values[index].date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
            })
      )
    );
    // Dégradé, halo, repère de début de période, plus haut / plus bas, dernier cours animé.
    const defs = el('defs', {});
    defs.innerHTML =
      '<linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      color +
      '" stop-opacity=".34"/><stop offset=".6" stop-color="' +
      color +
      '" stop-opacity=".07"/><stop offset="1" stop-color="' +
      color +
      '" stop-opacity="0"/></linearGradient><filter id="sc-glow" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    const openY = y(values[0].price);
    el('line', {
      x1: left,
      x2: width - right,
      y1: openY,
      y2: openY,
      stroke: '#8fa4b1',
      'stroke-width': '.8',
      'stroke-dasharray': '4 4',
      opacity: 0.5,
    });
    let d = '';
    values.forEach((v, i) => (d += (i ? ' L' : 'M') + x(v) + ',' + y(v.price)));
    el('path', {
      d:
        d +
        ' L' +
        x(values.at(-1)) +
        ',' +
        (height - bottom) +
        ' L' +
        left +
        ',' +
        (height - bottom) +
        ' Z',
      fill: 'url(#sc-fill)',
    });
    const line = el('path', {
      d,
      fill: 'none',
      stroke: color,
      'stroke-width': 2.2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      filter: 'url(#sc-glow)',
    });
    if (animated !== metal + period && !reducedMotion.matches) {
      animated = metal + period;
      const length = line.getTotalLength();
      line.style.strokeDasharray = length;
      line.style.strokeDashoffset = length;
      line.getBoundingClientRect();
      line.style.transition = 'stroke-dashoffset 800ms ease-out';
      line.style.strokeDashoffset = 0;
    }
    const prices = values.map(v => v.price);
    for (const [index, above] of [
      [prices.indexOf(max), true],
      [prices.indexOf(min), false],
    ]) {
      if (index === values.length - 1 && max !== min) continue;
      const cx = x(values[index]),
        cy = y(prices[index]),
        anchor = cx < left + 60 ? 'start' : cx > width - right - 60 ? 'end' : 'middle';
      el('circle', { cx, cy, r: 3, fill: '#121d25', stroke: color, 'stroke-width': 1.4 });
      el(
        'text',
        {
          x: cx,
          y: above ? cy - 8 : cy + 16,
          'text-anchor': anchor,
          fill: '#edf2f5',
          'font-size': 10,
          'font-weight': 600,
        },
        (above ? '▲ ' : '▼ ') + Math.round(prices[index]).toLocaleString('fr-FR')
      );
    }
    const lastX = x(values.at(-1)),
      lastY = y(values.at(-1).price);
    el('circle', { cx: lastX, cy: lastY, r: 3.5, fill: color, class: 'sc-pulse' });
    el('circle', {
      cx: lastX,
      cy: lastY,
      r: 3.5,
      fill: color,
      stroke: '#121d25',
      'stroke-width': 1.4,
    });
    const guide = el('line', {
        x1: left,
        x2: left,
        y1: top,
        y2: height - bottom,
        stroke: '#b5c7d3',
        'stroke-width': '.7',
        'stroke-dasharray': '3 4',
        opacity: 0,
      }),
      halo = el('circle', { cx: left, cy: top, r: 8, fill: color, opacity: 0 }),
      marker = el('circle', {
        cx: left,
        cy: top,
        r: 4,
        fill: color,
        stroke: '#121d25',
        'stroke-width': 1.4,
        opacity: 0,
      }),
      label = p =>
        new Date(p.date).toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) +
        ' · ' +
        new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(p.price) +
        ' €/kg';
    note.textContent = label(values.at(-1)) + ' · BullionVault';
    chart.onpointermove = e => {
      const target = Math.min(
          width - right,
          Math.max(left, e.clientX - chart.getBoundingClientRect().left)
        ),
        point = values.reduce(
          (best, p) => (Math.abs(x(p) - target) < Math.abs(x(best) - target) ? p : best),
          values[0]
        );
      guide.setAttribute('x1', x(point));
      guide.setAttribute('x2', x(point));
      guide.setAttribute('opacity', 0.75);
      for (const dot of [halo, marker]) {
        dot.setAttribute('cx', x(point));
        dot.setAttribute('cy', y(point.price));
      }
      halo.setAttribute('opacity', 0.22);
      marker.setAttribute('opacity', 1);
      note.textContent = label(point) + ' · BullionVault';
      // Bulle de lecture au-dessus du doigt.
      const tip = document.getElementById('chart-tip');
      if (tip) {
        const [when, price] = label(point).split(' · ');
        tip.replaceChildren();
        const strong = document.createElement('strong');
        strong.textContent = price;
        tip.append(strong, when);
        tip.hidden = false;
        const box = chart.getBoundingClientRect(),
          half = tip.offsetWidth / 2;
        tip.style.left = Math.min(box.width - half, Math.max(half, x(point))) + 'px';
        tip.style.top = Math.max(0, (y(point.price) / height) * box.height - 54) + 'px';
      }
    };
    chart.onpointerleave = () => {
      const tip = document.getElementById('chart-tip');
      if (tip) tip.hidden = true;
      guide.setAttribute('opacity', 0);
      halo.setAttribute('opacity', 0);
      marker.setAttribute('opacity', 0);
      note.textContent = label(values.at(-1)) + ' · BullionVault';
    };
  }
  window.GoldSpotChart = { render };
  new ResizeObserver(() => render(last, days, metal)).observe(document.getElementById('spot-chart'));
})();
