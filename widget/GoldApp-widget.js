// GoldApp — widget d’écran d’accueil pour l’app Scriptable (iPhone).
// Cours de l’or (et de l’argent) avec sa courbe, aux couleurs de GoldApp.
//
// Installation : voir widget/LISEZ-MOI-WIDGET.txt.
// Paramètre du widget (facultatif, dans « Parameter ») : « or » ou « argent »,
// suivi d’une période en jours : 1, 7, 30 ou 365. Exemples : « or », « argent 7 », « or 30 ».

// ---- À remplir une seule fois ----
const ADRESSE = 'https://mon-cours-or.onrender.com'; // adresse de GoldApp, sans « / » à la fin
const CLE = 'COLLE-ICI-LA-CLE-DU-WIDGET'; // même valeur que GOLDAPP_WIDGET_KEY sur Render
// ----------------------------------

const C = {
  bg1: new Color('#1b2a34'),
  bg2: new Color('#121d25'),
  text: new Color('#edf2f5'),
  muted: new Color('#b5c7d3'),
  gold: '#e9bf75',
  silver: '#d0dae5',
  up: new Color('#8fdfb0'),
  down: new Color('#ff9ca4'),
};
const PERIODS = { 1: '1 jour', 7: '7 jours', 30: '1 mois', 365: '1 an' };

// Paramètre : métal et période.
const words = String(args.widgetParameter || '')
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean);
const METAL = words.includes('argent') ? 'silver' : 'gold';
const PERIOD = String(words.find(w => PERIODS[w]) || '1');
const FAMILY = config.widgetFamily || 'medium';

const last = list => list[list.length - 1];
const euros = (n, decimals = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
  ' €';

// ---- Données : GoldApp, sinon dernier relevé gardé sur l’iPhone ----
const files = FileManager.local();
const cachePath = files.joinPath(files.documentsDirectory(), 'goldapp-widget-' + PERIOD + '.json');

async function load() {
  try {
    const request = new Request(ADRESSE + '/api/widget?period=' + PERIOD);
    request.headers = { 'X-Widget-Key': CLE };
    // iOS coupe un widget qui tarde (env. 30 s) : au-delà de 25 s, dernier relevé gardé.
    request.timeoutInterval = 25;
    const data = await request.loadJSON();
    const status = request.response.statusCode;
    if (status === 403) throw new Error('Clé refusée par GoldApp');
    if (status !== 200) throw new Error(data.error || 'Erreur serveur (' + status + ')');
    files.writeString(cachePath, JSON.stringify(data));
    return { data, stale: false };
  } catch (error) {
    if (files.fileExists(cachePath))
      return { data: JSON.parse(files.readString(cachePath)), stale: true, error };
    return { data: null, stale: true, error };
  }
}

function problem() {
  if (CLE.startsWith('COLLE-ICI')) return 'Colle la clé du widget en haut du script.';
  if (!/^https:\/\/[^/]+$/.test(ADRESSE)) return 'Adresse à vérifier : https://… sans « / » final.';
  return null;
}

// ---- Courbe dessinée ----
function curve(points, width, height, hex, withLabels) {
  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const prices = points.map(p => p[1]),
    min = Math.min(...prices),
    max = Math.max(...prices),
    top = withLabels ? 14 : 4,
    bottom = withLabels ? 14 : 4,
    span = max - min || 1,
    x = i => (i / (points.length - 1)) * (width - 6) + 1,
    y = v => top + ((max - v) / span) * (height - top - bottom);

  // Repère du début de période.
  const base = new Path();
  base.move(new Point(0, y(prices[0])));
  base.addLine(new Point(width, y(prices[0])));
  dc.addPath(base);
  dc.setStrokeColor(new Color('#8fa4b1', 0.35));
  dc.setLineWidth(1);
  dc.strokePath();

  // Surface sous la courbe.
  const area = new Path();
  area.move(new Point(x(0), height));
  prices.forEach((v, i) => area.addLine(new Point(x(i), y(v))));
  area.addLine(new Point(x(prices.length - 1), height));
  area.closeSubpath();
  dc.addPath(area);
  dc.setFillColor(new Color(hex, 0.16));
  dc.fillPath();

  // Courbe.
  const line = new Path();
  prices.forEach((v, i) => {
    if (i) line.addLine(new Point(x(i), y(v)));
    else line.move(new Point(x(i), y(v)));
  });
  dc.addPath(line);
  dc.setStrokeColor(new Color(hex));
  dc.setLineWidth(2);
  dc.strokePath();

  // Dernier cours.
  const lx = x(prices.length - 1),
    ly = y(last(prices));
  dc.setFillColor(new Color(hex, 0.3));
  dc.fillEllipse(new Rect(lx - 6, ly - 6, 12, 12));
  dc.setFillColor(new Color(hex));
  dc.fillEllipse(new Rect(lx - 3, ly - 3, 6, 6));

  // Plus haut / plus bas.
  if (withLabels) {
    dc.setFont(Font.mediumSystemFont(9));
    dc.setTextColor(C.muted);
    dc.setTextAlignedRight();
    dc.drawTextInRect('▲ ' + euros(max), new Rect(0, 0, width - 2, 12));
    dc.drawTextInRect('▼ ' + euros(min), new Rect(0, height - 12, width - 2, 12));
  }
  return dc.getImage();
}

// ---- Widget ----
function text(stack, value, font, color, scale = 0.6) {
  const t = stack.addText(value);
  t.font = font;
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = scale;
  return t;
}

function block(stack, metalData, metal, compact) {
  const name = metal === 'silver' ? 'Argent pur · 1 kg' : 'Or pur · 1 kg',
    hex = metal === 'silver' ? C.silver : C.gold;
  text(stack, name, Font.semiboldSystemFont(compact ? 11 : 12), new Color(hex));
  if (!metalData || metalData.error || !metalData.points?.length) {
    text(stack, 'Cours indisponible', Font.systemFont(12), C.muted);
    return;
  }
  text(stack, euros(metalData.price), Font.boldSystemFont(compact ? 20 : 24), C.text, 0.5);
  // Variation sur la courbe elle-même (BullionVault), comme dans GoldApp.
  const first = metalData.points[0][1],
    delta = last(metalData.points)[1] - first,
    percent = (delta / first) * 100,
    sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  text(
    stack,
    (delta > 0 ? '↑ ' : delta < 0 ? '↓ ' : '→ ') +
      sign +
      Math.abs(percent).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) +
      ' %' +
      (compact ? '' : ' · ' + sign + euros(Math.abs(delta))),
    Font.semiboldSystemFont(compact ? 11 : 12),
    delta > 0 ? C.up : delta < 0 ? C.down : C.muted
  );
}

function footer(widget, data, stale) {
  const points = data?.[METAL]?.points,
    when = new Date(
      (METAL === 'gold' && data?.gold?.quotedAt) ||
        (points?.length ? last(points)[0] : null) ||
        data?.updatedAt ||
        Date.now()
    );
  const t = widget.addText(
    (stale ? '⚠ ' : '') +
      PERIODS[PERIOD] +
      ' · ' +
      when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
      (data?.gold?.marketClosed ? ' · marché fermé' : '')
  );
  t.font = Font.systemFont(9);
  t.textColor = C.muted;
  t.lineLimit = 1;
}

async function build() {
  const setup = problem();
  const { data, stale, error } = setup ? { data: null, stale: true } : await load();
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [C.bg1, C.bg2];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.setPadding(12, 14, 10, 14);
  widget.url = ADRESSE;
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60000);

  if (!data) {
    text(widget, 'GoldApp', Font.semiboldSystemFont(13), new Color(C.gold));
    widget.addSpacer(6);
    text(widget, setup ? 'Réglage à finir' : 'Cours indisponibles', Font.systemFont(12), C.text);
    text(
      widget,
      setup || (error ? error.message : '') || 'Réessaie dans quelques minutes.',
      Font.systemFont(10),
      C.muted,
      0.6
    );
    return widget;
  }
  const main = data[METAL],
    hex = METAL === 'silver' ? C.silver : C.gold,
    hasCurve = m => m && !m.error && m.points?.length > 1;

  if (FAMILY === 'small') {
    block(widget, main, METAL, true);
    widget.addSpacer(4);
    if (hasCurve(main)) widget.addImage(curve(main.points, 112, 40, hex, false));
    widget.addSpacer();
    footer(widget, data, stale);
  } else if (FAMILY === 'large') {
    for (const metal of ['gold', 'silver']) {
      block(widget, data[metal], metal, false);
      widget.addSpacer(4);
      if (hasCurve(data[metal]))
        widget.addImage(
          curve(data[metal].points, 284, 62, metal === 'silver' ? C.silver : C.gold, true)
        );
      widget.addSpacer(8);
    }
    widget.addSpacer();
    footer(widget, data, stale);
  } else {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const left = row.addStack();
    left.layoutVertically();
    left.size = new Size(118, 0);
    block(left, main, METAL, false);
    row.addSpacer(8);
    if (hasCurve(main)) {
      const image = row.addImage(curve(main.points, 160, 92, hex, true));
      image.imageSize = new Size(160, 92);
    }
    widget.addSpacer();
    footer(widget, data, stale);
  }
  return widget;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
