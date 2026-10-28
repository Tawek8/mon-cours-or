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


def parse(table, napoleon=None):
    """Lire le tableau officiel même si une fiche produit est en panne.

    Le tableau publie une date de séance, sans heure de cotation.
    Une fiche fournie peut servir au contrôle du prix, mais n'est pas requise.
    """
    mapping = {name: key for name, key, _ in ROWS}
    prices, products, dates, seen = {}, [], set(), set()
    for block in re.findall(
        r'<div class="raterow_preview[^\"]*">([\s\S]*?)<div class="raterow_detail">',
        table,
    ):
        def cell(cls):
            match = re.search(r'<div class="col ' + cls + r'">([\s\S]*?)</div>', block)
            return clean(match[1]) if match else ""

        name = cell("col_name")
        if name not in mapping:
            continue
        key = mapping[name]
        if key in seen:
            raise ValueError("Cotation CPoR dupliquée")
        seen.add(key)
        suspended = "cotation suspendue" in clean(block).lower()
        date = None
        value = None
        if not suspended:
            stamp = re.search(r"\b(\d{2}/\d{2}/\d{4})\b", cell("col_date"))
            if not stamp:
                raise ValueError("Date CPoR absente")
            session = datetime.strptime(stamp[1], "%d/%m/%Y").date()
            # La date du jour à Paris peut précéder/suivre la date UTC.
            if session > (datetime.now(timezone.utc) + timedelta(hours=2)).date():
                raise ValueError("Cotation CPoR future")
            date = session.isoformat()
            dates.add(date)
            match = re.fullmatch(r"([\d\s.,]+)\s*€", cell("col_price"))
            if not match:
                raise ValueError("Cours CPoR invalide")
            value = float(re.sub(r"\s", "", match[1]).replace(",", "."))
            if not 0 < value < float("inf"):
                raise ValueError("Cours CPoR invalide")
            prices[key] = value
        products.append(dict(key=key, name=name, price=str(value) if value else None,
                             date=date, quoteSource="CPoR", suspended=suspended))
    if len(seen) != len(ROWS) or not all(key in prices for key in ["cpor", "coq", "suisse"]):
        raise ValueError("Tableau CPoR incomplet")
    if len(dates) != 1:
        raise ValueError("Dates CPoR incohérentes dans le tableau")
    source_date = next(iter(dates))
    if napoleon is not None:
        match = re.search(r'<div class="value">([\s\S]*?)</div>', napoleon)
        if not match:
            raise ValueError("Cours du Napoléon absent")
        raw = re.sub(r"\s", "", clean(match[1])).replace("€", "").replace(",", ".")
        if abs(float(raw) - prices["coq"]) > 0.005:
            raise ValueError("Cours du Napoléon incohérent entre fiche et tableau")
    return dict(prices=prices, products=products, quotedAt=source_date,
                sourceDate=source_date, pageDate=datetime.strptime(source_date, "%Y-%m-%d").strftime("%d/%m/%Y"),
                source="CPoR", updatedAt=datetime.now(timezone.utc).isoformat(), warnings=[])


def live():
    global _cache
    with _lock:
        if _cache and time.monotonic() - _cache[0] < 30:
            return _cache[1]
        payload = parse(fetch(TABLE))
        _cache = (time.monotonic(), payload)
        return payload
