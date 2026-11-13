"""Alerte de cours de l’or, commune avec Orbis (même calcul que alerte_cours.py d’Orbis).

État : above / below (seuils en €/kg), move (variation brusque en % sur 24 h, gardée après
avoir sonné, une alerte par sens au plus toutes les 20 heures), updated (dernier réglage : le
plus récent l’emporte), hits (dernières alertes [{id, dir, level, price, at}] ; dir up / down
pour une variation, avec ref : cours 24 h plus tôt, et change : variation en %). Gardé en mémoire et dans un fichier
temporaire : après un redémarrage de Render, Orbis (qui garde l’état dans le Dropbox) et
l’iPhone le renvoient au premier échange.
Le contrôle (check) est appelé toutes les 10 minutes par GitHub Actions (.github/workflows),
ce qui garde aussi le service éveillé : seuil passé → notification ntfy sur l’iPhone."""

import base64
import hashlib
import json
import os
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from urllib.request import Request, urlopen

KEEP_HITS = 10
SETTINGS = ("above", "below", "move")
MOVE_GAP_HOURS = 20
NTFY = "https://ntfy.sh/"
FILE = os.path.join(tempfile.gettempdir(), "orapp-alerte.json")
_lock = threading.Lock()
_state = None
_sent = set()
_checked = [0.0]


def key_from_password(password):
    """Clé d’échange avec Orbis : même calcul des deux côtés."""
    return hashlib.sha256(("orapp-alerte:" + password).encode("utf-8")).hexdigest()


def channel(key):
    """Canal ntfy de l’iPhone, tiré de la clé (donc secret)."""
    return "orapp-" + hashlib.sha256(("ntfy:" + key).encode("utf-8")).hexdigest()[:20] if key else None


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _number(v):
    if v in (None, ""):
        return None
    v = float(v)
    if not 1000 < v < 10_000_000:
        raise ValueError("Cours en euros par kilo attendu")
    return round(v, 2)


def _move(v):
    if v in (None, ""):
        return None
    v = float(v)
    if not 0.5 <= v <= 20:
        raise ValueError("Variation entre 0,5 et 20 % attendue")
    return round(v, 1)


def clean(state):
    """Garde seulement les champs connus, seuils vérifiés."""
    out = {}
    for k in SETTINGS:
        v = (_move if k == "move" else _number)((state or {}).get(k))
        if v:
            out[k] = v
    if isinstance((state or {}).get("updated"), str):
        out["updated"] = state["updated"][:40]
    out["hits"] = [
        dict(id=str(h["id"])[:20], dir=h.get("dir"), level=float(h.get("level") or 0),
             price=float(h.get("price") or 0), at=str(h.get("at") or "")[:40],
             **({"ref": float(h.get("ref") or 0), "change": float(h.get("change") or 0)} if h.get("dir") in ("up", "down") else {}))
        for h in (state or {}).get("hits") or []
        if isinstance(h, dict) and h.get("id") and h.get("dir") in ("above", "below", "up", "down")
    ][-KEEP_HITS:]
    return out


def merge(mine, theirs):
    """Réglages du côté réglé le plus récemment ; alertes des deux côtés (sans doublon)."""
    out = dict(mine)
    if (theirs.get("updated") or "") > (mine.get("updated") or ""):
        for k in SETTINGS:
            if theirs.get(k):
                out[k] = theirs[k]
            else:
                out.pop(k, None)
        out["updated"] = theirs["updated"]
    hits = {h["id"]: h for h in (mine.get("hits") or []) + (theirs.get("hits") or [])}
    out["hits"] = sorted(hits.values(), key=lambda h: h.get("at") or "")[-KEEP_HITS:]
    for h in out["hits"]:
        if h.get("dir") in ("above", "below") and out.get(h.get("dir")) == h.get("level"):
            out.pop(h["dir"], None)
    return out


def _stamp(iso):
    try:
        return datetime.fromisoformat(iso).timestamp()
    except (TypeError, ValueError):
        return 0


def apply_price(state, price, at=None, ref=None):
    """Seuil passé : alerte ajoutée, seuil retiré. Variation sur 24 h (par rapport à « ref »)
    plus forte que « move » : alerte ajoutée, surveillance gardée. Renvoie la dernière alerte."""
    at = at or now_iso()
    hit = None
    d = (
        "above" if state.get("above") and price >= state["above"]
        else "below" if state.get("below") and price <= state["below"]
        else None
    )
    if d:
        hit = dict(id=uuid.uuid4().hex[:12], dir=d, level=state[d], price=round(price, 2), at=at)
        state.pop(d)
        state["hits"] = ((state.get("hits") or []) + [hit])[-KEEP_HITS:]
    change = (price / ref - 1) * 100 if state.get("move") and ref else 0
    if abs(change) >= (state.get("move") or 100):
        d = "up" if change > 0 else "down"
        since = (_stamp(at) or time.time()) - MOVE_GAP_HOURS * 3600
        if not any(h.get("dir") == d and _stamp(h.get("at")) > since for h in state.get("hits") or []):
            hit = dict(id=uuid.uuid4().hex[:12], dir=d, level=state["move"], price=round(price, 2),
                       ref=round(ref, 2), change=round(change, 2), at=at)
            state["hits"] = ((state.get("hits") or []) + [hit])[-KEEP_HITS:]
    return hit


def state():
    global _state
    with _lock:
        if _state is None:
            try:
                with open(FILE, encoding="utf-8") as f:
                    _state = clean(json.load(f))
            except (OSError, ValueError):
                _state = {"hits": []}
            # Alertes déjà connues au démarrage : pas renvoyées à l’iPhone.
            _sent.update(h["id"] for h in _state["hits"])
        return json.loads(json.dumps(_state))


def save(new, key):
    """Nouvel état ; les alertes jamais envoyées partent vers l’iPhone."""
    global _state
    with _lock:
        _state = new
        try:
            with open(FILE, "w", encoding="utf-8") as f:
                json.dump(new, f)
        except OSError:
            pass
    notify(new, key)
    return new


def update(theirs, key):
    """Échange avec Orbis ou l’iPhone : état fusionné."""
    return save(merge(state(), clean(theirs)), key)


def what(h):
    """« Or au-dessus de 120 000 €/kg », « Or en hausse de 2,3 % sur 24 h »."""
    if h["dir"] in ("up", "down"):
        return "Or en " + ("hausse" if h["dir"] == "up" else "baisse") + " de " + f"{abs(h.get('change') or 0):.1f}".replace(".", ",") + " % sur 24 h"
    return "Or " + ("au-dessus de " if h["dir"] == "above" else "en dessous de ") + kilo(h["level"])


def kilo(v):
    return f"{round(v):,}".replace(",", " ") + " €/kg"


def notify(s, key, post=None):
    """Envoie à ntfy les alertes de moins de 6 heures pas encore envoyées."""
    topic = channel(key)
    if not topic:
        return []
    post = post or _post
    out = []
    for h in s.get("hits") or []:
        if h["id"] in _sent:
            continue
        _sent.add(h["id"])
        try:
            age = time.time() - datetime.fromisoformat(h["at"]).timestamp()
        except ValueError:
            age = 0
        if age > 6 * 3600:
            continue
        title = what(h)
        body = ("Cours " + kilo(h["price"]) + (", contre " + kilo(h["ref"]) + " 24 h plus tôt" if h.get("ref") else "")
                + " (BullionVault). Ouvrir OrApp pour régler une nouvelle alerte.")
        try:
            post(topic, title, body)
            out.append(h["id"])
        except Exception:
            _sent.discard(h["id"])  # réessayé au prochain contrôle
    return out


def _post(topic, title, body):
    req = Request(
        NTFY + topic,
        data=body.encode("utf-8"),
        method="POST",
        headers={
            # Titre accentué : encodage MIME (accepté par ntfy), les en-têtes HTTP étant en latin-1.
            "Title": "=?UTF-8?B?" + base64.b64encode(title.encode("utf-8")).decode() + "?=",
            "Tags": "bell",
            "Priority": "high",
            "Click": "https://mon-cours-or.onrender.com/",
        },
    )
    with urlopen(req, timeout=15) as r:
        r.read(1000)


def check(price_loader, key):
    """Contrôle du cours (au plus une fois par minute) : seuil passé → alerte + iPhone."""
    if time.monotonic() - _checked[0] < 60:
        return False
    _checked[0] = time.monotonic()
    s = state()
    if not (s.get("above") or s.get("below") or s.get("move")) and all(h["id"] in _sent for h in s["hits"]):
        return False
    got = price_loader()
    hit = apply_price(s, got[0], got[1], got[2] if len(got) > 2 else None)
    save(s, key)
    return bool(hit)
