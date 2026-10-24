"""Cotations CPoR (Loomis) : même source et mêmes contrôles que GoldApp."""

import re, json, time, threading, unicodedata
from html import unescape
from pathlib import Path
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from urllib.request import Request, urlopen

BASE = "https://www.loomis-fxgs.fr"
TABLE = BASE + "/fr/or/cotation-produits/"
NAPOLEON = BASE + "/produit/20-francs-napoleon/"
ROWS = [
    ("Lingot", "cpor", 0),
    ("Lingotin oR ® 500g", "bar500", 1),
    ("Lingotin oR ® 250g", "bar250", 2),
    ("Lingotin oR ® 100g", "bar100", 3),
    ("Lingotin oR ® 50g", "bar50", 4),
    ("Lingotin oR ® 20g", "bar20", 5),
    ("Lingotin Once CPoR", "once", 6),
    ("Lingotin oR ® 10g", "bar10", 7),
    ("Lingotin oR ® 5g", "bar5", 8),
    ("20 Dollars", "us20", 9),
    ("10 Dollars", "us10", 10),
    ("5 Dollars US", "us5", 11),
    ("20 Francs Napoléon", "coq", 12),
    ("20 Francs Suisse", "suisse", 13),
    ("50 Pesos", "pesos", 14),
    ("Krugerrand Sud Afrique", "krugerrand", 15),
    ("Souverain", "george", 16),
    ("Souverain Elisabeth II", "elisabeth", 17),
    ("10 Francs Napoléon", "demi_napoleon", 18),
    ("Demi Souverain", "demi_souverain", 19),
    ("10 Florins Hollandais", "florins", 20),
    ("20 Francs Tunisie", "tunisie", 21),
    ("Union latine", "union_latine", 22),
    ("20 Reich Mark", "reichsmark", 23),
]
_cache = None
_lock = threading.Lock()


def clean(s):
    return re.sub(r"\s+", " ", unescape(re.sub("<[^>]+>", " ", s))).strip()


def fetch(url):
    with urlopen(
        Request(
            url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"}
        ),
        timeout=20,
    ) as response:
        raw = response.read(3_000_001)
    if len(raw) > 3_000_000:
        raise ValueError("Réponse CPoR trop volumineuse")
    return raw.decode("utf-8", errors="replace")


def parse(table, napoleon):
    flat = clean(napoleon)
    stamp = re.search(
        r"(?:Mis à jour le|Updated)\s+(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})\s+(?:à|at)\s+(\d{2}:\d{2})",
        flat,
        re.I,
    )
    if not stamp:
        raise ValueError("Horodatage CPoR non reconnu")
    day, month, year, hour = stamp.groups()
    date = f"{int(day):02d}/{int(month):02d}/{year}"
    local = datetime.strptime(date + " " + hour, "%d/%m/%Y %H:%M")
    try:
        paris = ZoneInfo("Europe/Paris")
    except ZoneInfoNotFoundError:
        import calendar

        def last_sunday(month):
            end = datetime(
                local.year, month, calendar.monthrange(local.year, month)[1], 3
            )
            return end - timedelta(days=(end.weekday() + 1) % 7)

        paris = timezone(
            timedelta(hours=2 if last_sunday(3) <= local < last_sunday(10) else 1)
        )
    at = local.replace(tzinfo=paris)
    if at.timestamp() > time.time() + 300:
        raise ValueError("Cotation CPoR future")
    mapping = {name: (key, index) for name, key, index in ROWS}
    prices = {}
    products = []
    for block in re.findall(
        r'<div class="raterow_preview[^\"]*">([\s\S]*?)<div class="raterow_detail">',
        table,
    ):

        def cell(cls):
            m = re.search(r'<div class="col ' + cls + r'">([\s\S]*?)</div>', block)
            return clean(m[1]) if m else ""

        name = cell("col_name")
        if name not in mapping:
            continue
        key, index = mapping[name]
        suspended = "Cotation suspendue" in clean(block)
        if not suspended and date not in cell("col_date"):
            raise ValueError("Dates CPoR incohérentes entre tableau et Napoléon")
        match = re.search(r"([\d\s.,]+)\s*€", cell("col_price"))
        value = float(match[1].replace(" ", "").replace(",", ".")) if match else None
        if not suspended and not (value and value > 0):
            raise ValueError("Cours CPoR invalide")
        product = dict(
            key=key,
            name=name,
            price=str(value) if value else None,
            date=date,
            quotedAt=at.isoformat(),
            quoteSource="CPoR",
            suspended=suspended,
        )
        products.append(product)
        if value:
            prices[key] = value
    nap_price = re.search(r'<div class="value">([\s\S]*?)</div>', napoleon)
    if not nap_price:
        raise ValueError("Cours du Napoléon absent")
    raw_price = clean(nap_price[1]).replace(" ", "").replace("€", "").replace(",", ".")
    if abs(float(raw_price) - prices.get("coq", 0)) > 0.005:
        raise ValueError("Cours du Napoléon incohérent entre fiche et tableau")
    if len(products) != len(ROWS) or not all(
        key in prices for key in ["cpor", "coq", "suisse"]
    ):
        raise ValueError("Tableau CPoR incomplet")
    return dict(
        prices=prices,
        products=products,
        quotedAt=at.isoformat(),
        pageDate=date,
        source="CPoR",
        updatedAt=datetime.now(timezone.utc).isoformat(),
        warnings=[],
    )


def live():
    global _cache
    with _lock:
        if _cache and time.monotonic() - _cache[0] < 30:
            return _cache[1]
        payload = parse(fetch(TABLE), fetch(NAPOLEON))
        _cache = (time.monotonic(), payload)
        return payload
