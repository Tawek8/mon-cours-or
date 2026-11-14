"""Scanner de pièces (onglet « Pièces » d'Orbismini), repris du scanner de pièces d'Orbis
(scanner_pieces.py) : même recherche Numista, même question à Claude, mêmes calculs.

  - recherche guidée : mots du nom, pays, année → catalogue Numista ;
  - « Demander à Claude » : photo de la face (et du revers) → jusqu'à 3 pièces possibles,
    cherchées ensuite dans Numista.
La fiche affichée vient toujours du catalogue Numista, jamais de l'IA. C'est une aide à
vérifier à la balance et au pied à coulisse : elle ne prouve ni l'authenticité ni le titre.

Ce qui part sur internet : la photo de la pièce (vers Anthropic, seulement sur demande) et
des mots-clés comme « 20 Francs » (vers Numista). Jamais de donnée client.

Clés dans les réglages de Render (variables d'environnement, jamais dans le dépôt ni renvoyées
à la page) : NUMISTA_API_KEY et ANTHROPIC_API_KEY. Réponses de Numista gardées dans un dossier
temporaire (perdues au redémarrage de Render)."""

import base64
import hashlib
import json
import os
import re
import tempfile
import threading
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

FOLDER = Path(tempfile.gettempdir()) / "orapp-scan"
CACHE_DIR = "cache-numista"
NUMISTA = "https://api.numista.com/v3"
CLAUDE = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-opus-5-5"
MAX_PHOTO = 5 * 1024 * 1024  # limite d'Anthropic par image
TROY_OUNCE = 31.1034768
_lock = threading.Lock()

# Métal reconnu dans le texte « Composition » de Numista (français ou anglais) → code
# utilisé par les tarifs d'Orbis.
METALS = (
    ("AU", ("or", "gold")),
    ("AG", ("argent", "silver")),
    ("PT", ("platine", "platinum")),
    ("PD", ("palladium",)),
)


# ---------------------------------------------------------------- outils


def normalize(text):
    text = unicodedata.normalize("NFKD", str(text or ""))
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def parse_fineness(text):
    """Titre en millièmes d'un texte comme « Or (,900) », « Argent .835 », « 916,7 ‰ »,
    « 900/1000 » ; None s'il n'y en a pas."""
    if not text:
        return None
    m = re.search(r"(\d{3}(?:[.,]\d+)?)\s*‰", text)
    if m:
        value = float(m.group(1).replace(",", "."))
    else:
        m = re.search(r"(?<!\d)(\d{3,4})\s*/\s*1000(?!\d)", text)
        if m:
            value = float(m.group(1))
        else:
            m = re.search(r"(?<![\d])0?[.,](\d{3,5})(?!\d)", text)
            if not m:
                return None
            value = round(float("0." + m.group(1)) * 1000, 2)
    return value if 0 < value <= 1000 else None


def parse_metal(text):
    """(nom affiché, code) du premier métal précieux cité ; (None, None) sinon."""
    words = normalize(text).split()
    label = re.split(r"[(\[\d]", str(text or ""), maxsplit=1)[0].strip(" ,.-") or None
    if {"plaque", "plaquee", "dore", "doree", "plated", "gilt", "gilded"} & set(words):
        return label, None  # « cuivre plaqué or » : pas une pièce en métal précieux
    found = [(words.index(w), code) for code, names in METALS for w in names if w in words]
    if not found:
        return label, None
    return label, min(found)[1]


def fine_weight(weight, fineness):
    if not weight or not fineness:
        return None
    grams = weight * fineness / 1000
    return dict(grams=round(grams, 3), oz=round(grams / TROY_OUNCE, 4))


def _number(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _http(method, url, headers, body=None, timeout=20):
    """(statut, contenu) ; erreur réseau → OSError."""
    request = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read(4_000_000)
    except urllib.error.HTTPError as e:
        return e.code, e.read(100_000)


# Remplacé par les tests (aucun appel réseau).
http = _http


# ---------------------------------------------------------------- clés


def _keys(folder=None):
    """Clés lues dans les variables d'environnement de Render."""
    keys = dict(numista=os.environ.get("NUMISTA_API_KEY", "").strip(), claude=os.environ.get("ANTHROPIC_API_KEY", "").strip())
    return {k: v for k, v in keys.items() if v}


def keys_state(folder=None):
    """Clés présentes (jamais leur valeur)."""
    keys = _keys()
    return dict(numista=bool(keys.get("numista")), claude=bool(keys.get("claude")))


# ---------------------------------------------------------------- Numista


def _numista(folder, path, params=None):
    key = _keys(folder).get("numista")
    if not key:
        raise ValueError("Clé Numista à ajouter dans les réglages de Render (NUMISTA_API_KEY).")
    params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
    url = NUMISTA + path + ("?" + urllib.parse.urlencode(params) if params else "")
    cache = Path(folder) / CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest() + ".json")
    try:
        return json.loads(cache.read_text(encoding="utf-8"))  # gardée sans limite de durée
    except (OSError, ValueError):
        pass
    try:
        status, raw = http("GET", url, {"Numista-API-Key": key, "Accept": "application/json"})
    except OSError:
        raise ValueError("Numista injoignable (connexion internet ?).")
    if status == 404:
        return None
    if status in (401, 403):
        raise ValueError("Clé Numista refusée : vérifie NUMISTA_API_KEY dans les réglages de Render.")
    if status == 429:
        raise ValueError("Quota Numista du mois atteint.")
    if status != 200:
        raise ValueError("Numista ne répond pas (erreur %s)." % status)
    try:
        data = json.loads(raw)
    except ValueError:
        raise ValueError("Réponse de Numista illisible.")
    try:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass
    return data


def _summary(t):
    return dict(
        id=t.get("id"),
        title=t.get("title"),
        issuer=(t.get("issuer") or {}).get("name"),
        minYear=t.get("min_year"),
        maxYear=t.get("max_year"),
        obverse=t.get("obverse_thumbnail"),
        reverse=t.get("reverse_thumbnail"),
    )


def issuer_code(folder, country):
    """Code émetteur Numista (« france ») d'un nom de pays tapé (« France ») ; None sinon."""
    wanted = normalize(country)
    if not wanted:
        return None
    issuers = (_numista(folder, "/issuers", {"lang": "fr"}) or {}).get("issuers", [])
    for i in issuers:
        if normalize(i.get("name")) == wanted or normalize(i.get("code")) == wanted:
            return i.get("code")
    starts = [i for i in issuers if normalize(i.get("name")).startswith(wanted)]
    return starts[0].get("code") if len(starts) == 1 else None


def search(folder, query, country=None, year=None, issuer=None):
    """Pièces du catalogue pour des mots (« 20 Francs », « Lion »), un pays et une année."""
    query = re.sub(r"\s+", " ", str(query or "")).strip()[:80]
    if len(query) < 2:
        raise ValueError("Tapez au moins la valeur ou un mot du nom de la pièce.")
    year = int(year) if str(year or "").isdigit() and 500 <= int(year) <= 2100 else None
    if not issuer and country:
        issuer = issuer_code(folder, country)
    found, tried = [], []
    # Du plus précis au plus large : sans l'année, puis sans le pays, si rien n'est trouvé.
    for params in (
        dict(q=query, issuer=issuer, year=year),
        dict(q=query, issuer=issuer),
        dict(q=query, year=year),
        dict(q=query),
    ):
        params = {k: v for k, v in params.items() if v is not None}
        if params in tried:
            continue
        tried.append(params)
        found = (_numista(folder, "/types", dict(params, lang="fr", count=12)) or {}).get("types", [])
        if found:
            break
    found = [_summary(t) for t in found if t.get("id")]
    if country and not issuer:
        # Pays non reconnu comme émetteur : les pièces de ce pays d'abord.
        wanted = normalize(country)
        found.sort(key=lambda t: wanted not in normalize(t["issuer"]))
    return found[:12]


def details(folder, type_id, year=None):
    """Fiche d'une pièce du catalogue : métal, titre, poids, diamètre, métal fin, tirages."""
    if not str(type_id).isdigit():
        raise ValueError("Pièce inconnue.")
    t = _numista(folder, "/types/%d" % int(type_id), {"lang": "fr"})
    if not t:
        raise ValueError("Pièce introuvable dans Numista.")
    issues = _numista(folder, "/types/%d/issues" % int(type_id), {"lang": "fr"}) or []
    composition = (t.get("composition") or {}).get("text")
    fineness = parse_fineness(composition)
    metal, code = parse_metal(composition)
    weight = _number(t.get("weight"))
    return dict(
        id=t.get("id"),
        title=t.get("title"),
        url=t.get("url"),
        issuer=(t.get("issuer") or {}).get("name"),
        value=(t.get("value") or {}).get("text"),
        minYear=t.get("min_year"),
        maxYear=t.get("max_year"),
        composition=composition,
        metal=metal,
        metalCode=code,
        fineness=fineness,
        weight=weight,
        size=_number(t.get("size")),
        thickness=_number(t.get("thickness")),
        fine=fine_weight(weight, fineness),
        obverse=(t.get("obverse") or {}).get("thumbnail") or (t.get("obverse") or {}).get("picture"),
        reverse=(t.get("reverse") or {}).get("thumbnail") or (t.get("reverse") or {}).get("picture"),
        issues=[
            dict(year=i.get("year"), mint=i.get("mint_letter"), mintage=i.get("mintage"), comment=i.get("comment"))
            for i in issues[:200]
            if isinstance(i, dict)
        ],
        year=int(year) if str(year or "").isdigit() else None,
    )


# ---------------------------------------------------------------- Claude

IDENTIFY = """Tu es un expert en numismatique. On te montre une ou deux photos d'une pièce \
(face et/ou revers). Identifie la pièce et propose jusqu'à 3 candidats, du plus probable au moins probable.

Pour chaque candidat :
- numista_query : 2 à 5 mots-clés courts, comme ils apparaîtraient dans un titre du catalogue Numista \
en français (ex. « 20 Francs Napoléon III », « Krugerrand », « 5 Francs Semeuse », « Souverain George V »). \
Pas d'année ni de pays dans cette requête.
- numista_issuer : code émetteur Numista probable, en anglais et en minuscules (ex. « france », \
« south_africa », « united_kingdom », « switzerland », « mexico », « canada », « austria »). \
null si tu n'es pas sûr.
- year : le millésime UNIQUEMENT s'il est lisible sur la photo, sinon null. Ne devine jamais l'année.
- confidence : entre 0 et 1.

Si l'image ne montre pas une pièce, mets is_coin à false et candidates vide. Si la photo est floue, \
mal cadrée ou trop sombre, donne un conseil court en français dans photo_advice, sinon null."""

_NULL_STR = {"anyOf": [{"type": "string"}, {"type": "null"}]}
SCHEMA = {
    "type": "object",
    "properties": {
        "is_coin": {"type": "boolean"},
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label_fr": {"type": "string"},
                    "country_fr": {"type": "string"},
                    "numista_query": {"type": "string"},
                    "numista_issuer": _NULL_STR,
                    "year": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                    "confidence": {"type": "number"},
                },
                "required": ["label_fr", "country_fr", "numista_query", "numista_issuer", "year", "confidence"],
                "additionalProperties": False,
            },
        },
        "photo_advice": _NULL_STR,
    },
    "required": ["is_coin", "candidates", "photo_advice"],
    "additionalProperties": False,
}


def _ask_claude(key, photos):
    content = []
    for side, data in photos:
        content.append({"type": "text", "text": "Photo : " + side})
        content.append(
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(data).decode()}}
        )
    content.append({"type": "text", "text": "Identifie cette pièce."})
    body = dict(
        model=CLAUDE_MODEL,
        max_tokens=8000,
        system=IDENTIFY,
        messages=[{"role": "user", "content": content}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        # Si le modèle décline la demande, l'API la confie à un autre modèle (même appel).
        fallbacks="default",
    )
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
    }
    try:
        status, raw = http("POST", CLAUDE, headers, json.dumps(body).encode("utf-8"), timeout=120)
    except OSError:
        raise ValueError("Claude injoignable (connexion internet ?).")
    if status in (401, 403):
        raise ValueError("Clé Anthropic refusée : vérifie ANTHROPIC_API_KEY dans les réglages de Render.")
    if status == 429:
        raise ValueError("Trop de demandes à Claude : réessayez dans un instant.")
    if status == 400 and b"credit" in raw.lower():
        raise ValueError("Crédit Anthropic épuisé : à recharger sur platform.claude.com.")
    if status != 200:
        raise ValueError("Claude ne répond pas (erreur %s)." % status)
    try:
        reply = json.loads(raw)
        if reply.get("stop_reason") == "refusal":
            raise ValueError("Claude n'a pas pu analyser cette photo.")
        text = next(b["text"] for b in reply.get("content", []) if b.get("type") == "text")
        found = json.loads(text)
        if not isinstance(found.get("candidates"), list):
            raise KeyError
        return found
    except (ValueError, KeyError, StopIteration, TypeError, AttributeError) as e:
        if isinstance(e, ValueError) and str(e).startswith("Claude"):
            raise
        raise ValueError("Réponse de Claude illisible : réessayez.")


def identify(folder, photos):
    """photos : [(côté, JPEG)] (face, revers). Pièces possibles selon Claude, cherchées dans
    Numista : {isCoin, advice, candidates, matches, warnings}."""
    photos = [(str(side)[:10], data) for side, data in photos if data][:2]
    if not photos:
        raise ValueError("Aucune photo de la pièce.")
    for _side, data in photos:
        if not data.startswith(b"\xff\xd8"):
            raise ValueError("Photo invalide (JPEG attendu).")
        if len(data) > MAX_PHOTO:
            raise ValueError("Photo trop lourde pour l'identification (5 Mo au plus).")
    key = _keys(folder).get("claude")
    if not key:
        raise ValueError("Clé Anthropic à ajouter dans les réglages de Render (ANTHROPIC_API_KEY) pour demander à Claude.")
    found = _ask_claude(key, photos)
    candidates = [
        dict(
            label=str(c.get("label_fr") or "")[:120],
            country=str(c.get("country_fr") or "")[:60],
            query=str(c.get("numista_query") or "")[:80],
            issuer=c.get("numista_issuer") if re.fullmatch(r"[a-z0-9_-]{2,60}", str(c.get("numista_issuer") or "")) else None,
            year=c.get("year") if isinstance(c.get("year"), int) else None,
            confidence=max(0.0, min(1.0, float(c.get("confidence") or 0))),
        )
        for c in found.get("candidates", [])[:3]
        if isinstance(c, dict)
    ]
    matches, seen, warnings = [], set(), []
    if _keys(folder).get("numista"):
        for c in candidates:
            if len(c["query"]) < 2:
                continue
            try:
                hits = search(folder, c["query"], year=c["year"], issuer=c["issuer"])
            except ValueError as e:
                warnings.append(str(e))
                continue
            for h in hits[:4]:
                if h["id"] not in seen:
                    seen.add(h["id"])
                    matches.append(dict(h, year=c["year"], guess=c["label"]))
    else:
        warnings.append("Clé Numista absente : pas de fiche du catalogue.")
    return dict(
        isCoin=bool(found.get("is_coin")),
        advice=str(found.get("photo_advice") or "")[:300] or None,
        candidates=candidates,
        matches=matches[:8],
        warnings=sorted(set(warnings)),
    )
