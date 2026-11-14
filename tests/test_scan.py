"""Scanner de pièces (onglet Scan) : clés lues dans Render, recherche Numista, Claude
(réseau simulé : aucun appel réel). Mêmes cas que tests_scanner_pieces.py d'Orbis."""

import json
import os
import tempfile
import unittest
import urllib.parse
from pathlib import Path
from unittest.mock import patch

import pieces_scan as S

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200
TYPE = {
    "id": 1234,
    "title": "20 Francs - Napoléon III (tête laurée)",
    "url": "https://fr.numista.com/1234",
    "issuer": {"code": "france", "name": "France"},
    "value": {"text": "20 Francs"},
    "min_year": 1861,
    "max_year": 1870,
    "composition": {"text": "Or (,900)"},
    "weight": 6.4516,
    "size": 21,
    "thickness": 1.3,
    "obverse": {"thumbnail": "https://fr.numista.com/a.jpg"},
    "reverse": {"thumbnail": "https://fr.numista.com/b.jpg"},
}
CANDIDATE = {"label_fr": "20 Francs Napoléon III tête laurée", "country_fr": "France",
             "numista_query": "20 Francs Napoléon III", "numista_issuer": "france", "year": 1866, "confidence": 0.8}


class FakeWeb:
    def __init__(self, claude=None):
        self.calls, self.claude = [], claude

    def __call__(self, method, url, headers, body=None, timeout=20):
        self.calls.append((method, url, headers, body))
        if url.startswith(S.CLAUDE):
            return 200, json.dumps(self.claude).encode()
        u = urllib.parse.urlparse(url)
        q = dict(urllib.parse.parse_qsl(u.query))
        if u.path.endswith("/types"):
            return 200, json.dumps({"types": [TYPE] if "napol" in q["q"].lower() else []}).encode()
        if u.path.endswith("/1234/issues"):
            return 200, json.dumps([{"year": 1866, "mint_letter": "A", "mintage": 5000000}]).encode()
        if u.path.endswith("/1234"):
            return 200, json.dumps(TYPE).encode()
        return 404, b""


def claude_reply(candidates):
    text = json.dumps({"is_coin": True, "candidates": candidates, "photo_advice": None})
    return {"stop_reason": "end_turn", "content": [{"type": "text", "text": text}]}


class ScanTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.folder = Path(self.tmp.name)
        env = patch.dict(os.environ, {"NUMISTA_API_KEY": "cle-numista-123", "ANTHROPIC_API_KEY": "sk-ant-test-123"})
        env.start()
        self.addCleanup(env.stop)

    def tearDown(self):
        self.tmp.cleanup()

    def test_keys_from_render_settings_never_sent_back(self):
        self.assertEqual(S.keys_state(), {"numista": True, "claude": True})
        with patch.dict(os.environ, {"NUMISTA_API_KEY": "", "ANTHROPIC_API_KEY": ""}):
            self.assertEqual(S.keys_state(), {"numista": False, "claude": False})
            with self.assertRaises(ValueError) as e:
                S.search(self.folder, "Napoléon")
            self.assertIn("NUMISTA_API_KEY", str(e.exception))

    def test_search_and_sheet(self):
        web = FakeWeb()
        with patch.object(S, "http", web):
            self.assertEqual([t["id"] for t in S.search(self.folder, "20 Francs Napoléon", year=1866)], [1234])
            fiche = S.details(self.folder, "1234", 1866)
        self.assertEqual((fiche["metalCode"], fiche["fineness"], fiche["weight"], fiche["fine"]["grams"]), ("AU", 900, 6.4516, 5.806))
        self.assertEqual(web.calls[0][2]["Numista-API-Key"], "cle-numista-123")

    def test_identify_with_claude_then_catalogue(self):
        web = FakeWeb(claude_reply([CANDIDATE]))
        with patch.object(S, "http", web):
            found = S.identify(self.folder, [("face", JPEG), ("revers", JPEG)])
        self.assertEqual([m["id"] for m in found["matches"]], [1234])
        method, url, headers, body = web.calls[0]
        self.assertEqual((url, headers["x-api-key"]), (S.CLAUDE, "sk-ant-test-123"))
        self.assertEqual(len([c for c in json.loads(body)["messages"][0]["content"] if c["type"] == "image"]), 2)
        with self.assertRaises(ValueError):
            S.identify(self.folder, [("face", b"GIF89a")])


if __name__ == "__main__":
    unittest.main()
