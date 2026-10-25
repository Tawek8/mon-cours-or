"""Serveur de Mon Cours de l’Or : application et cotations, mêmes sources que GoldApp.

Sources :
  - or pur (valeur intrinsèque) : Kitco Bid en €/kg ; BullionVault en secours ;
  - pièces et lingots boursables : cotations CPoR (Loomis), comme GoldApp ;
  - argent : cotations Gold.fr ; argent C3E achat : Cookson-Clal ;
  - graphique : historique BullionVault.
Chaque source est mise en cache quelques secondes pour ne pas solliciter les sites
à chaque actualisation.
"""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs, unquote
from datetime import datetime, timezone, timedelta
import json, os, re, unicodedata, time

ROOT = Path(__file__).resolve().parent
BASE = "https://www.gold.fr"
# Seuls les fichiers de l’application sont publiés (pas le code serveur ni les notes).
PUBLIC_SUFFIXES = {".html", ".js", ".css", ".png", ".svg", ".webp", ".webmanifest"}
PRIVATE = {"server.py"}


class HTMLText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        if tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        self.parts.append(data)
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join(" ".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None


def fetch(path):
    req = Request(
        BASE + path,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; PersonalGoldDashboard/1.0)",
            "Accept-Language": "fr-FR,fr;q=0.9",
        },
    )
    with urlopen(req, timeout=16) as r:
        return r.read().decode("utf-8", errors="replace")


def normalize(s):
    return "".join(
        c
        for c in unicodedata.normalize("NFKD", s.lower())
        if not unicodedata.combining(c)
    ).replace("’", "'")


def euro(s):
    m = re.search(r"(?<!\d)(\d[\d\s\u00a0.,]*?)\s*€", s)
    if not m:
        return None
    t = m.group(1).replace("\u00a0", "").replace(" ", "")
    if "," in t and "." in t:
        t = t.replace(".", "").replace(",", ".")
    elif "," in t:
        t = t.replace(",", ".")
    elif "." in t and len(t.rsplit(".", 1)[-1]) == 3:
        t = t.replace(".", "")
    try:
        return float(t)
    except ValueError:
        return None


def extract_c3e(html):
    parser = HTMLText()
    parser.feed(html)
    text = " ".join(" ".join(parser.parts).split())
    # Lecture des seules cellules de la ligne C3E, dans le tableau achat/vente.
    rows = [
        cells
        for cells in parser.rows
        if any(normalize(c) == "argent c3e" for c in cells)
    ]
    if len(rows) != 1:
        raise ValueError("Ligne Argent C3E absente ou ambiguë")
    row = rows[0]
    idx = next(i for i, c in enumerate(row) if normalize(c) == "argent c3e")
    amounts = [c for c in row[idx + 1 :] if c.strip()]
    if len(amounts) != 2 or not all(
        re.fullmatch(r"[\d\s.,]+\s*€/\s*kg", c) for c in amounts
    ):
        raise ValueError("Colonnes C3E achat/vente non reconnues")
    # Le prix achat doit rester associé à l'en-tête achat précédant vente.
    normalized = normalize(text)
    block = normalized.split("metaux industriels", 1)[-1].split("argent c3e", 1)[0]
    if not re.search(r"achat\s+vente", block):
        raise ValueError("En-tête achat/vente C3E non reconnu")
    dates = re.findall(r"(?:le|du)\s+(\d{2}/\d{2}/\d{4})", block)
    if not dates:
        raise ValueError("Date du cours C3E non trouvée")
    source_date = datetime.strptime(dates[-1], "%d/%m/%Y").date().isoformat()
    value = euro(amounts[0])
    if value is None or value <= 0:
        raise ValueError("Prix achat C3E invalide")
    return {
        "price": value,
        "sourceDate": source_date,
        "unit": "EUR/kg",
        "side": "achat",
        "source": "https://www.cookson-clal.com/cours/",
    }


def c3e_live():
    req = Request(
        "https://www.cookson-clal.com/cours/",
        headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "fr-FR"},
    )
    with urlopen(req, timeout=16) as response:
        html = response.read().decode("utf-8", errors="replace")
    return {**extract_c3e(html), "updatedAt": datetime.now(timezone.utc).isoformat()}


SILVER_LABELS = [
    "Lingot Argent 1Kg",
    "Maple Leaf 1 Oz",
    "Vienna Philharmonic 1 Oz",
    "Kangourou 1 Oz",
    "Britannia 1 Oz",
    "American Eagle 1 Oz",
    "Krugerrand Argent 1 Oz",
    "China Panda 30g 2025-26",
    "Kookaburra 1 Oz",
    "Koala 1 Oz",
    "Kookaburra 1Kg (2008-2018)",
    "Koala Argent 1Kg 2025-2026",
    "20 Francs Turin en Argent",
    "50 Francs Hercule",
    "5 Francs Semeuse en Argent",
    "10 Francs Hercule",
    "10 Francs Turin",
    "5 Francs Hercule en Argent (Ecu)",
    "100 Francs en Argent",
]


def extract_silver(html):
    parser = HTMLText()
    parser.feed(html)
    products = []
    # Lecture exclusive de la cellule qui suit le nom du produit.
    # Aucun recours au tableau international ni aux variations/primes.
    for label in SILVER_LABELS:
        matches = []
        for cells in parser.rows:
            for i, cell in enumerate(cells[:-1]):
                if normalize(cell) == normalize(label):
                    matches.append(cells[i + 1])
        price = None
        status = "unavailable"
        if len(matches) == 1:
            if "suspendue" in normalize(matches[0]):
                status = "suspended"
            else:
                price = euro(matches[0])
                if price is not None and price > 0:
                    status = "available"
                else:
                    price = None
        products.append({"name": label, "price": price, "status": status})
    if not any(p["status"] in ("available", "suspended") for p in products):
        raise ValueError("Tableau des cours argent non reconnu")
    return products


def silver_live():
    return {
        "products": extract_silver(fetch("/cours-argent-prix-de-l-argent/")),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": BASE + "/cours-argent-prix-de-l-argent/",
    }


_cache = {}


def cached(key, seconds, loader):
    item = _cache.get(key)
    if item and time.time() - item[0] < seconds:
        return item[1]
    value = loader()
    _cache[key] = (time.time(), value)
    return value


def spot_live():
    """Or pur en €/kg : Kitco Bid, sinon BullionVault (signalé comme secours)."""

    def load():
        errors = []
        try:
            from kitco import fetch_quote

            quote = fetch_quote()
            return dict(
                price=quote["price"],
                updatedAt=quote["quotedAt"],
                retrievedAt=quote["retrievedAt"],
                source="Kitco",
                basis="Bid",
                unit="EUR/kg",
                currency="EUR",
                marketClosed=quote.get("marketClosed", False),
            )
        except Exception as error:
            errors.append("Kitco : " + str(error)[:100])
        try:
            from bullionvault import fetch_quote as bullionvault_quote

            quote = bullionvault_quote()
            return dict(
                price=quote["price"],
                updatedAt=quote["quotedAt"],
                retrievedAt=quote["retrievedAt"],
                marketClosed=quote.get("marketClosed", False),
                source="BullionVault",
                basis="secours",
                unit="EUR/kg",
                currency="EUR",
                warning=errors[0],
            )
        except Exception as error:
            errors.append("BullionVault : " + str(error)[:100])
        raise ValueError("Or pur indisponible (" + " ; ".join(errors) + ")")

    return cached("spot", 10, load)


def history_live(period="1"):
    from bullionvault_history import fetch_history

    return cached("history-bullionvault-" + period, 60, lambda: fetch_history(period))


def live_prices():
    """Valeur intrinsèque (Kitco / BullionVault) et cotations CPoR (Loomis)."""

    def load():
        prices, warnings, source = {}, [], None
        try:
            spot = spot_live()
            prices["instant"] = spot["price"]
            source = spot["source"]
            if spot.get("warning"):
                warnings.append("Kitco indisponible, BullionVault utilisé")
        except Exception as error:
            warnings.append(str(error)[:160])
        quoted_at = None
        try:
            import cpor

            quotes = cpor.live()
            prices.update(quotes["prices"])
            quoted_at = quotes["quotedAt"]
            missing = [p["name"] for p in quotes["products"] if not p["price"]]
            if missing:
                warnings.append("Cotation suspendue : " + ", ".join(missing))
        except Exception as error:
            warnings.append("Cotations CPoR indisponibles : " + str(error)[:100])
        if not prices:
            raise ValueError("Aucun cours extrait. " + " ; ".join(warnings))
        return {
            "prices": prices,
            "instantSource": source,
            "cporQuotedAt": quoted_at,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "warnings": warnings,
            "origin": "Kitco / CPoR (Loomis)",
        }

    return cached("prices", 30, load)


ROUTES = {
    "/api/prices": lambda query: live_prices(),
    "/api/c3e": lambda query: cached("c3e", 60, c3e_live),
    "/api/silver": lambda query: cached("silver", 60, silver_live),
    "/api/spot": lambda query: spot_live(),
    "/api/spot-history": lambda query: history_live(query.get("period", ["1"])[0]),
}


def public(route):
    """Vrai pour un fichier de l’application ; faux pour le code serveur et les notes."""
    path = PurePosixPath(unquote(route))
    if route in ("/", ""):
        return True
    if any(part.startswith(".") for part in path.parts) or path.name in PRIVATE:
        return False
    return path.suffix.lower() in PUBLIC_SUFFIXES


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Revalider les fichiers de l’application pour les sessions Safari/PWA longues.
        if not self.path.split("?")[0].startswith("/api/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_HEAD(self):
        if not public(self.path.split("?")[0]):
            return self.send_error(404)
        return super().do_HEAD()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ROUTES:
            try:
                data = ROUTES[url.path](parse_qs(url.query))
                status = 200
            except Exception as error:
                data = {"error": str(error)[:300]}
                status = 503
            payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return
        if not public(url.path):
            return self.send_error(404)
        return super().do_GET()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print("Ouvrez http://localhost:" + str(port) + " dans votre navigateur.")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
