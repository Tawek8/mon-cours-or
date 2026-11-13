"""Météo de l'or : indices de tendance, à titre informatif seulement.

Chaque indice donne un signal (+1 plutôt haussier, 0 neutre, -1 plutôt baissier) et une
phrase simple ; leur moyenne pondérée donne la « météo » du moment. Ce n'est pas une
prévision : seulement un résumé de ce que regardent les opérateurs de marché.

Sources (lues au plus toutes les 30 minutes) :
  - or et argent en euros : graphiques BullionVault (comme la page « Cours ») ;
  - dollar (indice DXY), euro/dollar, taux américain 10 ans, indice de la peur (VIX) :
    Yahoo Finance ;
  - prime du Napoléon : cotation CPoR et instantané (fournis par le serveur d’OrApp).
Repris de GoldGestion / Orbis (meteo_or.py) : mêmes indices, seuils, textes et historique.
Un indice indisponible est simplement absent.
Historique : la météo des 20 derniers jours ouvrés est recalculée avec les mêmes séries,
coupées à la fin de chaque jour (sans la prime du Napoléon, repère sans effet sur le score).
« Et ensuite ? » : la météo de chaque jour de bourse depuis 2005 est rejouée avec les mêmes
règles (cours journaliers Yahoo Finance : or en dollars converti en euros), une fois par jour,
pour dire ce qui a suivi les jours de même météo. Fréquences du passé, pas une prévision.
Dollar et euro sont de simples repères, sans effet sur le score : testés sur 2005-2026, ils
se contredisent presque toujours (dollar en hausse = baissier, euro en baisse = haussier).
"""

import bisect
import json
import statistics
import threading
import time
from datetime import date, datetime, time as day_time, timedelta, timezone
from urllib.request import Request, urlopen

MAX_AGE = 30 * 60  # secondes
RETRY_AGE = 5 * 60  # une source n'a pas répondu : nouvel essai au bout de 5 minutes
# Noms des sources tels qu'affichés quand l'une d'elles ne répond pas.
SOURCE_NAMES = {
    "gold5a": "or sur 5 ans",
    "gold1a": "or sur 1 an",
    "gold3m": "or sur 3 mois",
    "silver1a": "argent",
    "dxy": "dollar",
    "eurusd": "euro / dollar",
    "us10y": "taux américains",
    "vix": "indice de la peur",
    "refs": "cotation du Napoléon",
}
_cache = {"at": 0.0, "value": None}
_lock = threading.Lock()
NAPOLEON_FINE = 5.806  # grammes d'or fin
YAHOO = {"dxy": "DX-Y.NYB", "eurusd": "EURUSD%3DX", "us10y": "%5ETNX", "vix": "%5EVIX"}
# Seuils 0,2 et 0,5 multipliés par 9,5 / 7,5 : le score ne compte plus le dollar et l'euro
# (2 points sur 9,5), sans quoi soleil et orage deviendraient deux fois plus fréquents.
WEATHER = [
    (0.63, "soleil", "☀️", "Grand soleil", "La plupart des indices penchent nettement vers la hausse."),
    (0.25, "eclaircies", "🌤️", "Éclaircies", "Les indices penchent plutôt vers la hausse."),
    (-0.25, "variable", "⛅", "Temps variable", "Pas de direction claire : les indices se contredisent."),
    (-0.63, "averses", "🌦️", "Averses", "Les indices penchent plutôt vers la baisse."),
    (-9, "orage", "⛈️", "Orage", "La plupart des indices penchent nettement vers la baisse."),
]


def _yahoo(symbol):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?range=3mo&interval=1d"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}
    with urlopen(Request(url, headers=headers), timeout=15) as r:
        data = json.loads(r.read(1_000_000))["chart"]["result"][0]
    closes = [
        (datetime.fromtimestamp(at, timezone.utc), c)
        for at, c in zip(data["timestamp"], data["indicators"]["quote"][0]["close"])
        if isinstance(c, (int, float))
    ]
    if len(closes) < 22:
        raise ValueError("Historique insuffisant : " + symbol)
    return closes


def _values(series):
    """Cours seuls, que la série soit datée (Yahoo) ou non (tests)."""
    return [p[1] if isinstance(p, tuple) else p for p in series] if series else None


# Durées d'Orbis → périodes de bullionvault_history (mêmes intervalles entre deux points).
PERIODS = {"5a": "1825", "1a": "365", "3m": "90"}

# Fourni par server.py : {"instant": €/kg, "quotes": {"coq": prix du Napoléon}}.
refs_loader = None


def _history(period, metal="gold"):
    from bullionvault_history import fetch_history

    return [
        (datetime.fromisoformat(p["date"]), p["price"])
        for p in fetch_history(PERIODS[period], metal)["points"]
    ]


def _daily(points):
    """Dernier cours de chaque jour."""
    days = {}
    for at, price in points:
        days[at.date()] = price
    return [days[d] for d in sorted(days)]


def rsi(closes, n=14):
    gains = losses = 0.0
    for a, b in zip(closes[-n - 1 : -1], closes[-n:]):
        d = b - a
        gains, losses = gains + max(d, 0), losses + max(-d, 0)
    if losses == 0:
        return 100.0
    return 100 - 100 / (1 + gains / losses)


def _mean_since(points, days, now):
    since = now - timedelta(days=days)
    values = [p for at, p in points if at >= since]
    return statistics.fmean(values) if values else None


def _pct(a, b):
    return (a / b - 1) * 100 if a and b else None


def fr(v, digits=0):
    return f"{v:,.{digits}f}".replace(",", " ").replace(".", ",")


LOADERS = {
    "gold5a": lambda: _history("5a"),
    "gold1a": lambda: _history("1a"),
    "gold3m": lambda: _history("3m"),
    "silver1a": lambda: _history("1a", "silver"),
    "dxy": lambda: _yahoo(YAHOO["dxy"]),
    "eurusd": lambda: _yahoo(YAHOO["eurusd"]),
    "us10y": lambda: _yahoo(YAHOO["us10y"]),
    "vix": lambda: _yahoo(YAHOO["vix"]),
    "refs": lambda: refs_loader(),
}
HISTORY_DAYS = 20  # jours ouvrés


def build(now=None, fetch=None):
    """Indices, météo et historique. « fetch » permet de fournir les données (tests)."""
    now = now or datetime.now(timezone.utc)
    fetch = fetch or {}
    errors, src = [], {}
    for name, loader in LOADERS.items():
        if name in fetch:
            src[name] = fetch[name]
            continue
        try:
            src[name] = loader()
        except Exception:
            errors.append(name)
            src[name] = None
    out = compute(now, src)
    out["errors"] = errors
    out["missing"] = [SOURCE_NAMES.get(e, e) for e in errors]
    out["history"] = past(now, src)
    return out


def past(now, src, days=HISTORY_DAYS):
    """Météo à la fin de chacun des derniers jours ouvrés (du plus ancien au plus récent)."""
    out, day = [], now.date()
    while len(out) < days:
        day -= timedelta(days=1)
        if day.weekday() >= 5:
            continue
        end = datetime.combine(day + timedelta(days=1), day_time(0), timezone.utc)
        cut = {
            # Séries datées coupées à la fin du jour ; une série sans dates ne peut pas l'être.
            k: [p for p in v if p[0] < end] if v and isinstance(v[0], tuple) else None
            for k, v in src.items()
            if k != "refs"
        }
        w = compute(end, cut)
        out.append(dict(day=day.isoformat(), score=w["score"], weather=w["weather"]))
    return out[::-1]


def compute(now, src):
    """Indices et météo au moment « now » à partir des séries déjà lues."""
    ind = []
    agitation = None
    long_, year, quarter, silver = (src.get(k) for k in ("gold5a", "gold1a", "gold3m", "silver1a"))
    price = (quarter or year or [(None, None)])[-1][1]

    def add(key, group, label, value, signal, text, weight=1.0):
        ind.append(dict(key=key, group=group, label=label, value=value, signal=signal, text=text, weight=weight))

    # --- Tendance (graphique de l'or en euros) ---
    ma200 = _mean_since(long_, 290, now) if long_ else None  # 200 jours de bourse ≈ 290 jours
    if price and ma200:
        gap = _pct(price, ma200)
        add("ma200", "Tendance", "Tendance de fond", fr(ma200) + " €/kg", 1 if gap > 0 else -1,
            "Le cours est " + fr(abs(gap), 1) + " % " + ("au-dessus" if gap > 0 else "en dessous")
            + " de sa moyenne des 200 derniers jours de bourse : tendance de fond "
            + ("haussière." if gap > 0 else "baissière."), 2.0)
    ma50 = _mean_since(year, 70, now) if year else None  # 50 jours de bourse ≈ 70 jours
    if ma50 and ma200:
        up = ma50 > ma200
        add("cross", "Tendance", "Tendance des derniers mois", "50 j " + ("au-dessus" if up else "en dessous") + " des 200 j",
            1 if up else -1,
            "La moyenne des 50 derniers jours est " + ("au-dessus" if up else "en dessous")
            + " de celle des 200 jours : les derniers mois " + ("tirent vers le haut." if up else "tirent vers le bas."), 1.5)
    daily = _daily(quarter) if quarter else []
    if len(daily) >= 23:
        month = _pct(daily[-1], daily[-22])
        s = 1 if month > 2 else -1 if month < -2 else 0
        add("month", "Tendance", "Élan du mois", ("+" if month > 0 else "") + fr(month, 1) + " %", s,
            "Sur un mois, l'or a " + ("pris " if month >= 0 else "perdu ") + fr(abs(month), 1) + " %"
            + (" : l'élan est haussier." if s > 0 else " : l'élan est baissier." if s < 0 else " : pas d'élan marqué."))
    if len(daily) >= 15:
        r = rsi(daily)
        s = -1 if r > 70 else 1 if r < 30 else 0
        add("rsi", "Tendance", "Essoufflement (RSI)", fr(r) + " / 100", s,
            "Au-dessus de 70, la hausse a été rapide : une pause ou un repli est fréquent. Sous 30, un rebond est fréquent. "
            + ("Ici : marché suracheté." if r > 70 else "Ici : marché survendu." if r < 30 else "Ici : zone normale."))
    if year and price:
        hi, lo = max(p for _, p in year), min(p for _, p in year)
        pos = (price - lo) / (hi - lo) * 100 if hi > lo else 50
        s = 1 if pos > 85 else -1 if pos < 15 else 0
        add("range", "Tendance", "Place sur un an", fr(pos) + " %", s,
            "0 % = plus bas de l'année (" + fr(lo) + " €/kg), 100 % = plus haut (" + fr(hi) + " €/kg)."
            + (" L'or est près de ses sommets." if pos > 85 else " L'or est près de ses plus bas." if pos < 15 else ""), 0.5)
        if len(daily) >= 31:
            moves = [abs(_pct(b, a)) for a, b in zip(daily[-31:-1], daily[-30:])]
            vol = statistics.fmean(moves)
            agitation = dict(
                percent=round(vol, 2),
                level="agité" if vol > 1.2 else "calme" if vol < 0.6 else "habituelle",
            )
            add("vol", "Tendance", "Agitation", fr(vol, 2) + " % par jour", 0,
                "Variation moyenne d'un jour à l'autre sur un mois. "
                + ("Marché agité : les prix bougent vite." if vol > 1.2 else "Marché calme." if vol < 0.6 else "Agitation habituelle."), 0)

    # --- Économie (Yahoo Finance) ---
    dxy = _values(src.get("dxy"))
    if dxy and len(dxy) >= 22:
        m = _pct(dxy[-1], dxy[-22])
        s = -1 if m > 1.5 else 1 if m < -1.5 else 0
        add("dxy", "Repères", "Dollar", ("+" if m > 0 else "") + fr(m, 1) + " % sur un mois", 0,
            "Un dollar qui monte freine souvent l'or (il est coté en dollars), un dollar qui baisse l'aide. "
            + ("Ici : dollar en hausse." if s < 0 else "Ici : dollar en baisse." if s > 0 else "Ici : dollar stable."), 0)
    eur = _values(src.get("eurusd"))
    if eur and len(eur) >= 22:
        m = _pct(eur[-1], eur[-22])
        s = 1 if m < -1.5 else -1 if m > 1.5 else 0
        add("eur", "Repères", "Euro face au dollar", fr(eur[-1], 4) + " $ (" + ("+" if m > 0 else "") + fr(m, 1) + " %)", 0,
            "Nos prix sont en euros : un euro qui baisse fait monter l'or en euros, un euro qui monte le fait baisser. "
            + ("Ici : euro en baisse." if s > 0 else "Ici : euro en hausse." if s < 0 else "Ici : euro stable."), 0)
    tnx = _values(src.get("us10y"))
    if tnx and len(tnx) >= 22:
        d = tnx[-1] - tnx[-22]
        s = -1 if d > 0.2 else 1 if d < -0.2 else 0
        add("rates", "Économie", "Taux d'intérêt américains", fr(tnx[-1], 2) + " % (" + ("+" if d > 0 else "") + fr(d, 2) + " pt)", s,
            "L'or ne rapporte pas d'intérêts : quand les taux montent, il attire moins ; quand ils baissent, il attire plus. "
            + ("Ici : taux en hausse." if s < 0 else "Ici : taux en baisse." if s > 0 else "Ici : taux stables."))
    vix = _values(src.get("vix"))
    if vix:
        v = vix[-1]
        s = 1 if v > 25 else 0
        add("vix", "Économie", "Indice de la peur (VIX)", fr(v, 1), s,
            "Mesure l'inquiétude des marchés boursiers. Quand la peur monte (au-dessus de 25), l'or est recherché comme valeur refuge. "
            + ("Ici : forte inquiétude." if v > 25 else "Ici : marchés calmes." if v < 15 else "Ici : inquiétude modérée."), 0.5)

    # --- Repères (à titre d'information, sans signal) ---
    if silver and price:
        ratio = price / silver[-1][1]
        add("ratio", "Repères", "Ratio or / argent", fr(ratio, 1), 0,
            "Nombre de kilos d'argent pour un kilo d'or. "
            + ("Élevé : l'argent est bon marché par rapport à l'or." if ratio > 85 else "Bas : l'argent est cher par rapport à l'or." if ratio < 65 else "Dans sa moyenne habituelle (65 à 85)."), 0)
    refs = src.get("refs")
    if refs and refs.get("instant") and (refs.get("quotes") or {}).get("coq"):
        prime = _pct(refs["quotes"]["coq"], refs["instant"] * NAPOLEON_FINE / 1000)
        add("prime", "Repères", "Prime du Napoléon", fr(prime, 1) + " %", 0,
            "Écart entre le prix du Napoléon et son poids d'or. Une prime qui grimpe montre une forte demande des particuliers.", 0)

    weighted = [x for x in ind if x["weight"]]
    total = sum(x["weight"] for x in weighted)
    score = sum(x["signal"] * x["weight"] for x in weighted) / total if total else None
    weather = None
    if score is not None and len(weighted) >= 3:
        lim, key, icon, label, text = next(w for w in WEATHER if score >= w[0])
        weather = dict(key=key, icon=icon, label=label, text=text)
    for x in ind:
        x.pop("weight")
    # Toujours le même ordre à l'écran : Tendance, Économie, puis Repères.
    ind.sort(key=lambda x: ["Tendance", "Économie", "Repères"].index(x["group"]))
    return dict(
        at=now.isoformat(),
        price=price,
        ma200=ma200,
        score=round(score, 2) if score is not None else None,
        weather=weather,
        up=sum(1 for x in weighted if x["signal"] > 0),
        down=sum(1 for x in weighted if x["signal"] < 0),
        flat=sum(1 for x in weighted if x["signal"] == 0),
        agitation=agitation,
        indicators=ind,
    )


# ---------- « Et ensuite ? » : ce qui a suivi les jours de même météo depuis 2005 ----------
TROY_OUNCES_PER_KG = 32.1507466
ODDS_START = date(2005, 1, 3)
ODDS_HORIZONS = ((5, "1 semaine"), (21, "1 mois"), (63, "3 mois"))  # jours de bourse
ODDS_MIN_CASES = 50  # en dessous : trop peu de cas pour conclure
YAHOO_DAILY = {"gold": "GC%3DF", "eurusd": YAHOO["eurusd"], "us10y": YAHOO["us10y"], "vix": YAHOO["vix"]}
_replay = {"day": None, "value": None}


def _yahoo_daily(symbol, since=date(2003, 1, 1)):
    """Cours de clôture jour par jour depuis « since » : [(jour, cours)] (jour de la bourse)."""
    start = int(datetime.combine(since, day_time(0), timezone.utc).timestamp())
    url = "https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d" % (
        symbol, start, int(time.time()))
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}
    with urlopen(Request(url, headers=headers), timeout=30) as r:
        data = json.loads(r.read(5_000_000))["chart"]["result"][0]
    shift = data["meta"].get("gmtoffset") or 0
    days = {}
    for at, c in zip(data["timestamp"], data["indicators"]["quote"][0]["close"]):
        if isinstance(c, (int, float)) and c > 0:
            days[datetime.fromtimestamp(at + shift, timezone.utc).date()] = c
    if len(days) < 1000:
        raise ValueError("Historique journalier insuffisant : " + symbol)
    return sorted(days.items())


def replay(fetch=None, start=ODDS_START):
    """Météo de chaque jour de bourse depuis « start », avec les règles de compute() :
    [(jour, météo, cours de l'or en €/kg)]. « fetch » fournit les séries (tests)."""
    fetch = fetch or {}
    series = {k: fetch[k] if k in fetch else _yahoo_daily(s) for k, s in YAHOO_DAILY.items()}
    eur = series["eurusd"]
    eur_days = [d for d, _ in eur]
    gold = []
    for d, usd in series["gold"]:
        j = bisect.bisect_right(eur_days, d) - 1  # euro du jour, sinon de la veille
        if j >= 0:
            gold.append((datetime.combine(d, day_time(21), timezone.utc), usd / eur[j][1] * TROY_OUNCES_PER_KG))
    stamp = lambda pts: [(datetime.combine(d, day_time(20), timezone.utc), v) for d, v in pts]
    rates, fear = stamp(series["us10y"]), stamp(series["vix"])
    g_at, r_at, v_at = ([p[0] for p in s] for s in (gold, rates, fear))
    out = []
    for i, (at, price) in enumerate(gold):
        if at.date() < start:
            continue
        end = datetime.combine(at.date() + timedelta(days=1), day_time(0), timezone.utc)
        since = lambda days: bisect.bisect_left(g_at, end - timedelta(days=days))
        r, v = bisect.bisect_left(r_at, end), bisect.bisect_left(v_at, end)
        w = compute(end, dict(
            # Mêmes fenêtres que les séries BullionVault de la météo du jour.
            gold5a=gold[since(300): i + 1],
            gold1a=gold[since(366): i + 1],
            gold3m=gold[since(92): i + 1],
            us10y=rates[max(0, r - 30): r],
            vix=fear[max(0, v - 5): v],
        ))["weather"]
        if w:
            out.append((at.date(), w["key"], price))
    return out


def odds(key, days):
    """Ce qui a suivi, depuis le début du rejeu, les jours de météo « key » : pour chaque
    horizon, part des cas où l'or était plus haut, variation médiane, nombre de jours et
    d'épisodes distincts (les fenêtres se chevauchent) ; la même chose tous temps confondus."""
    keys = [k for _, k, _ in days]
    prices = [p for _, _, p in days]
    rows = []
    for h, label in ODDS_HORIZONS:
        n = len(days) - h
        moves = [prices[i + h] / prices[i] - 1 for i in range(max(n, 0))]
        same = [m for i, m in enumerate(moves) if keys[i] == key]
        episodes = sum(1 for i in range(max(n, 0)) if keys[i] == key and (i == 0 or keys[i - 1] != key))
        pct = lambda xs: round(100 * sum(1 for m in xs if m > 0) / len(xs)) if xs else None
        med = lambda xs: round(100 * statistics.median(xs), 1) if xs else None
        rows.append(dict(
            horizon=label, days=h, cases=len(same), episodes=episodes, enough=len(same) >= ODDS_MIN_CASES,
            up=pct(same), median=med(same), allUp=pct(moves), allMedian=med(moves),
        ))
    return dict(key=key, since=days[0][0].isoformat() if days else None, rows=rows)


def daily_replay():
    """Rejeu depuis 2005, refait une fois par jour (environ 6 000 jours de bourse)."""
    today = date.today()
    with _lock:
        if _replay["day"] == today:
            return _replay["value"]
    value = replay()
    with _lock:
        _replay.update(day=today, value=value)
    return value


def weather():
    """Météo gardée 30 minutes, avec ce qui a suivi les jours de même météo depuis 2005."""
    with _lock:
        kept = _cache["value"]
        if kept is not None and time.monotonic() - _cache["at"] < (RETRY_AGE if kept.get("errors") else MAX_AGE):
            return _cache["value"]
    value = build()
    try:
        value["odds"] = odds(value["weather"]["key"], daily_replay()) if value.get("weather") else None
    except Exception:
        value["odds"] = None  # rejeu indisponible : l'encadré n'est pas affiché
    with _lock:
        _cache.update(at=time.monotonic(), value=value)
    return value
