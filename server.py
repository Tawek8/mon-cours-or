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
from http.cookies import SimpleCookie
import hashlib, hmac, json, os, re, unicodedata, time

ROOT = Path(__file__).resolve().parent
BASE = "https://www.gold.fr"
# Seuls les fichiers de l’application sont publiés (pas le code serveur ni les notes).
PUBLIC_SUFFIXES = {".html", ".js", ".css", ".png", ".svg", ".webp", ".webmanifest", ".ico", ".jpg"}
PRIVATE = {"server.py"}

# Mot de passe à l’ouverture : variable d’environnement GOLDAPP_PASSWORD (réglée sur Render).
# Sans elle, l’application reste ouverte comme avant.
PASSWORD = os.environ.get("GOLDAPP_PASSWORD", "")
SESSION_DAYS = 180
# Clé du widget iPhone (Scriptable) : lecture seule des cours, sans le mot de passe.
# Variable GOLDAPP_WIDGET_KEY sur Render ; sans elle, /api/widget est fermé.
WIDGET_KEY = os.environ.get("GOLDAPP_WIDGET_KEY", "")
# Fichiers lisibles sans mot de passe, pour l’icône de l’écran d’accueil.
OPEN_FILES = {"/manifest.webmanifest", "/icon.svg", "/icon.png", "/favicon.ico"}
LOGIN_PAGE = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#121d25"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GoldApp">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon.png">
<title>GoldApp</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:radial-gradient(60% 40% at 50% 35%,rgba(233,191,117,.12),transparent 70%),#121d25;
color:#edf2f5;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
form{width:min(340px,calc(100% - 32px));display:grid;gap:14px;text-align:center}
img{width:84px;height:84px;margin:0 auto 4px;border-radius:18px;box-shadow:0 10px 40px #0008}
h1{margin:0;font-size:26px;font-weight:600}p{margin:0;color:#b5c7d3;font-size:14px}
input{width:100%;min-height:50px;padding:12px 14px;border:1px solid #344853;border-radius:12px;
background:#101c24;color:#edf2f5;font:inherit;font-size:17px;text-align:center}
input:focus{outline:2px solid #e9bf75;outline-offset:2px}
button{min-height:50px;border:0;border-radius:12px;background:#e9bf75;color:#18242b;font:inherit;
font-weight:650;cursor:pointer}
.error{color:#ffb3ad}
</style></head><body>
<form method="post" action="login">
<img src="icon.svg" alt="">
<h1>GoldApp</h1>
<p>Saisis le mot de passe pour ouvrir l’application.</p>
<input type="text" name="username" value="GoldApp" autocomplete="username" hidden>
<input type="password" name="password" autocomplete="current-password" placeholder="Mot de passe" required autofocus>
__ERROR__
<button type="submit">Ouvrir</button>
</form></body></html>"""


def session_token():
    """Jeton de session : dérivé du mot de passe, il change si le mot de passe change."""
    return hmac.new(PASSWORD.encode(), b"goldapp-session-v1", hashlib.sha256).hexdigest()


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


def thin(points, limit=120):
    """Allège une courbe pour le widget : au plus `limit` points, le dernier conservé."""
    if len(points) <= limit:
        return points
    step = len(points) / limit
    kept = [points[int(i * step)] for i in range(limit - 1)]
    return kept + [points[-1]]


def widget_live(period="1"):
    """Cours et courbes de l’or et de l’argent, en un seul appel, pour le widget."""
    if period not in ("1", "7", "30", "365"):
        raise ValueError("Période non disponible")
    result = dict(period=period, updatedAt=datetime.now(timezone.utc).isoformat())
    for metal in ("gold", "silver"):
        try:
            history = history_live(period, metal)
            points = [[p["date"], round(p["price"], 2)] for p in history["points"]]
            result[metal] = dict(points=thin(points), price=points[-1][1], source="BullionVault")
        except Exception as error:
            result[metal] = dict(error=str(error)[:160])
    try:
        spot = spot_live()
        result["gold"].update(
            price=spot["price"],
            source=spot["source"],
            quotedAt=spot.get("updatedAt"),
            marketClosed=bool(spot.get("marketClosed")),
        )
    except Exception:
        pass
    return result


def history_live(period="1", metal="gold"):
    from bullionvault_history import fetch_history

    return cached(
        "history-bullionvault-" + metal + "-" + period, 60, lambda: fetch_history(period, metal)
    )


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
    "/api/widget": lambda query: widget_live(query.get("period", ["1"])[0]),
    "/api/spot-history": lambda query: history_live(
        query.get("period", ["1"])[0], query.get("metal", ["gold"])[0]
    ),
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

    def authorized(self):
        if not PASSWORD:
            return True
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except Exception:
            return False
        given = cookie.get("goldapp_session")
        return bool(given) and hmac.compare_digest(given.value, session_token())

    def send_login(self, status=401, error=""):
        body = LOGIN_PAGE.replace(
            "__ERROR__", '<p class="error" role="alert">' + error + "</p>" if error else ""
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def set_session(self, value, max_age):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
        self.send_header(
            "Set-Cookie",
            "goldapp_session=" + value + "; Path=/; Max-Age=" + str(max_age)
            + "; HttpOnly; SameSite=Lax" + secure,
        )

    def widget_allowed(self):
        given = self.headers.get("X-Widget-Key", "")
        return bool(WIDGET_KEY) and hmac.compare_digest(given.encode(), WIDGET_KEY.encode())

    def guard(self, path):
        """Vrai si la requête peut continuer ; sinon la page de connexion est envoyée."""
        if path == "/api/widget":
            # Le widget n’a que sa clé : ni la session, ni le mot de passe ne l’ouvrent.
            if self.widget_allowed():
                return True
            time.sleep(1)
            payload = b'{"error": "Cle du widget absente ou incorrecte"}'
            self.send_response(403)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return False
        if self.authorized() or path in OPEN_FILES:
            return True
        if path.startswith("/api/"):
            payload = b'{"error": "Mot de passe requis"}'
            self.send_response(401)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
        else:
            self.send_login()
        return False

    def do_POST(self):
        if urlparse(self.path).path != "/login" or not PASSWORD:
            return self.send_error(404)
        length = min(int(self.headers.get("Content-Length") or 0), 4096)
        form = parse_qs(self.rfile.read(length).decode("utf-8", "replace"))
        given = (form.get("password") or [""])[0]
        if not hmac.compare_digest(given.encode(), PASSWORD.encode()):
            time.sleep(1)  # Freine les essais en série.
            return self.send_login(error="Mot de passe incorrect.")
        self.send_response(303)
        self.set_session(session_token(), SESSION_DAYS * 86400)
        self.send_header("Location", "/")
        self.end_headers()

    def do_HEAD(self):
        path = self.path.split("?")[0]
        if not public(path):
            return self.send_error(404)
        if not (self.authorized() or path in OPEN_FILES):
            self.send_response(401)
            self.end_headers()
            return None
        return super().do_HEAD()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/logout":
            self.send_response(303)
            self.set_session("", 0)
            self.send_header("Location", "/")
            self.end_headers()
            return
        if url.path == "/login":
            if self.authorized():
                self.send_response(303)
                self.send_header("Location", "/")
                self.end_headers()
                return
            return self.send_login(200)
        if not self.guard(url.path):
            return
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
