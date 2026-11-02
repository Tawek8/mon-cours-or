"""Météo de l'or : indices de tendance, à titre informatif seulement.

Chaque indice donne un signal (+1 plutôt haussier, 0 neutre, -1 plutôt baissier) et une
phrase simple ; leur moyenne pondérée donne la « météo » du moment. Ce n'est pas une
prévision : seulement un résumé de ce que regardent les opérateurs de marché.

Sources (lues au plus toutes les 30 minutes) :
  - or et argent en euros : graphiques BullionVault (comme la page « Cours ») ;
  - dollar (indice DXY), euro/dollar, taux américain 10 ans, indice de la peur (VIX) :
    Yahoo Finance ;
  - prime du Napoléon : cotation CPoR et instantané (fournis par le serveur de GoldApp).
Repris de GoldGestion (meteo_or.py) : mêmes indices, mêmes seuils, mêmes textes.
Un indice indisponible est simplement absent.
"""

import json
import statistics
import threading
import time
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen

MAX_AGE = 30 * 60  # secondes
# Fourni par server.py : {"instant": €/kg, "quotes": {"coq": prix du Napoléon}}.
refs_loader = None
_cache = {"at": 0.0, "value": None}
_lock = threading.Lock()
NAPOLEON_FINE = 5.806  # grammes d'or fin
YAHOO = {"dxy": "DX-Y.NYB", "eurusd": "EURUSD%3DX", "us10y": "%5ETNX", "vix": "%5EVIX"}
WEATHER = [
    (0.5, "soleil", "☀️", "Grand soleil", "La plupart des indices penchent nettement vers la hausse."),
    (0.2, "eclaircies", "🌤️", "Éclaircies", "Les indices penchent plutôt vers la hausse."),
    (-0.2, "variable", "⛅", "Temps variable", "Pas de direction claire : les indices se contredisent."),
    (-0.5, "averses", "🌦️", "Averses", "Les indices penchent plutôt vers la baisse."),
    (-9, "orage", "⛈️", "Orage", "La plupart des indices penchent nettement vers la baisse."),
]


def _yahoo(symbol):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?range=3mo&interval=1d"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}
    with urlopen(Request(url, headers=headers), timeout=15) as r:
        data = json.loads(r.read(1_000_000))["chart"]["result"][0]
    closes = [c for c in data["indicators"]["quote"][0]["close"] if isinstance(c, (int, float))]
    if len(closes) < 22:
        raise ValueError("Historique insuffisant : " + symbol)
    return closes


def _history(period, metal="gold"):
    from bullionvault_history import fetch_history

    return [
        (datetime.fromisoformat(p["date"]), p["price"])
        for p in fetch_history(period, metal)["points"]
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


def build(now=None, fetch=None):
    """Indices et météo. « fetch » permet de fournir les données (tests)."""
    now = now or datetime.now(timezone.utc)
    fetch = fetch or {}
    errors, ind = [], []

    def get(name, loader):
        if name in fetch:
            return fetch[name]
        try:
            return loader()
        except Exception:
            errors.append(name)
            return None

    long_ = get("gold5a", lambda: _history("1825"))
    year = get("gold1a", lambda: _history("365"))
    quarter = get("gold3m", lambda: _history("90"))
    silver = get("silver1a", lambda: _history("365", "silver"))
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
            add("vol", "Tendance", "Agitation", fr(vol, 2) + " % par jour", 0,
                "Variation moyenne d'un jour à l'autre sur un mois. "
                + ("Marché agité : les prix bougent vite." if vol > 1.2 else "Marché calme." if vol < 0.6 else "Agitation habituelle."), 0)

    # --- Économie (Yahoo Finance) ---
    dxy = get("dxy", lambda: _yahoo(YAHOO["dxy"]))
    if dxy:
        m = _pct(dxy[-1], dxy[-22])
        s = -1 if m > 1.5 else 1 if m < -1.5 else 0
        add("dxy", "Économie", "Dollar", ("+" if m > 0 else "") + fr(m, 1) + " % sur un mois", s,
            "Un dollar qui monte freine souvent l'or (il est coté en dollars), un dollar qui baisse l'aide. "
            + ("Ici : dollar en hausse." if s < 0 else "Ici : dollar en baisse." if s > 0 else "Ici : dollar stable."))
    eur = get("eurusd", lambda: _yahoo(YAHOO["eurusd"]))
    if eur:
        m = _pct(eur[-1], eur[-22])
        s = 1 if m < -1.5 else -1 if m > 1.5 else 0
        add("eur", "Économie", "Euro face au dollar", fr(eur[-1], 4) + " $ (" + ("+" if m > 0 else "") + fr(m, 1) + " %)", s,
            "Nos prix sont en euros : un euro qui baisse fait monter l'or en euros, un euro qui monte le fait baisser. "
            + ("Ici : euro en baisse." if s > 0 else "Ici : euro en hausse." if s < 0 else "Ici : euro stable."))
    tnx = get("us10y", lambda: _yahoo(YAHOO["us10y"]))
    if tnx:
        d = tnx[-1] - tnx[-22]
        s = -1 if d > 0.2 else 1 if d < -0.2 else 0
        add("rates", "Économie", "Taux d'intérêt américains", fr(tnx[-1], 2) + " % (" + ("+" if d > 0 else "") + fr(d, 2) + " pt)", s,
            "L'or ne rapporte pas d'intérêts : quand les taux montent, il attire moins ; quand ils baissent, il attire plus. "
            + ("Ici : taux en hausse." if s < 0 else "Ici : taux en baisse." if s > 0 else "Ici : taux stables."))
    vix = get("vix", lambda: _yahoo(YAHOO["vix"]))
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
    refs = get("refs", lambda: refs_loader())
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
    return dict(
        at=now.isoformat(),
        price=price,
        ma200=ma200,
        score=round(score, 2) if score is not None else None,
        weather=weather,
        up=sum(1 for x in weighted if x["signal"] > 0),
        down=sum(1 for x in weighted if x["signal"] < 0),
        indicators=ind,
        errors=errors,
    )


def weather():
    """Météo gardée 30 minutes."""
    with _lock:
        if _cache["value"] is not None and time.monotonic() - _cache["at"] < MAX_AGE:
            return _cache["value"]
    value = build()
    with _lock:
        _cache.update(at=time.monotonic(), value=value)
    return value
