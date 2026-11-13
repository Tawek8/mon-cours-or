import os
import tempfile
import unittest
from datetime import datetime, timezone

import alerte as A


class AlertTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        A.FILE = os.path.join(self.tmp.name, "etat.json")
        A._state = None
        A._sent.clear()
        A._checked[0] = 0.0
        self.sent = []
        A._post = lambda topic, title, body: self.sent.append((topic, title, body))

    def tearDown(self):
        self.tmp.cleanup()

    def test_same_key_and_channel_as_orbis(self):
        # alerte_cours.py d'Orbis fait le même calcul : ces deux valeurs doivent y être identiques.
        key = A.key_from_password("secret")
        self.assertEqual(key, "8c0accab658463f107f2bccc9a3bbb41032fdf2e20a4fa91081443cf91f209c4")
        self.assertEqual(A.channel(key), "orapp-fa84a8da8493c514cf4f")
        self.assertIsNone(A.channel(""))

    def test_check_rings_once_and_notifies_iphone(self):
        key = A.key_from_password("secret")
        A.update(dict(above=120000, below="100000", updated="2026-11-13T10:00:00+00:00"), key)
        now = datetime.now(timezone.utc).isoformat()
        self.assertFalse(A.check(lambda: (110000.0, now), key))
        A._checked[0] = 0.0
        self.assertTrue(A.check(lambda: (120500.0, now), key))
        s = A.state()
        self.assertNotIn("above", s)
        self.assertEqual(s["below"], 100000.0)
        self.assertEqual(len(self.sent), 1)
        topic, title, body = self.sent[0]
        self.assertEqual(topic, A.channel(key))
        self.assertIn("au-dessus de 120", title)
        self.assertIn("120", body)
        # Contrôle suivant : rien de nouveau, rien d'envoyé.
        A._checked[0] = 0.0
        A.check(lambda: (121000.0, now), key)
        self.assertEqual(len(self.sent), 1)

    def test_hit_from_orbis_is_sent_once_and_old_ones_not(self):
        key = A.key_from_password("x")
        now = datetime.now(timezone.utc).isoformat()
        hit = dict(id="h1", dir="below", level=100000, price=99900, at=now)
        old = dict(id="h0", dir="above", level=130000, price=130100, at="2026-01-01T00:00:00+00:00")
        A.update(dict(hits=[old, hit]), key)
        A.update(dict(hits=[hit]), key)
        self.assertEqual([t for _, t, _ in self.sent], ["Or en dessous de 100 000 €/kg"])

    def test_bad_values_refused(self):
        with self.assertRaises(ValueError):
            A.update(dict(above="12"), "k")


if __name__ == "__main__":
    unittest.main()
