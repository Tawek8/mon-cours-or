import unittest
from datetime import datetime, timedelta, timezone

import meteo_or as M

NOW = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)


def series(days, step, start, slope):
    """Points réguliers jusqu'à NOW, prix linéaire (pente par jour)."""
    out, n = [], int(days / step)
    for i in range(n + 1):
        d = days - i * step
        out.append((NOW - timedelta(days=d), start + slope * (days - d)))
    return out


def fetch(slope, dxy=(100, 100), eur=(1.10, 1.10), rates=(4.0, 4.0), vix=16):
    flat = lambda a, b: [a] * 21 + [b]  # 22 jours : valeur d'il y a un mois puis aujourd'hui
    return dict(
        gold5a=series(1800, 10, 100000, slope),
        gold1a=series(365, 2, 100000 + slope * 1435, slope),
        gold3m=series(90, 0.5, 100000 + slope * 1710, slope),
        silver1a=[(NOW, 1300.0)],
        dxy=flat(*dxy),
        eurusd=flat(*eur),
        us10y=flat(*rates),
        vix=[vix] * 22,
        refs=dict(instant=118000, quotes=dict(coq=720)),
    )


class WeatherTests(unittest.TestCase):
    def test_rising_gold_is_sunny(self):
        w = M.build(NOW, fetch(60, dxy=(100, 97), eur=(1.12, 1.09), rates=(4.3, 4.0), vix=28))
        self.assertEqual(w["weather"]["key"], "soleil")
        self.assertEqual(w["errors"], [])
        keys = {x["key"]: x for x in w["indicators"]}
        self.assertEqual(keys["ma200"]["signal"], 1)
        self.assertEqual(keys["cross"]["signal"], 1)
        self.assertEqual(keys["dxy"]["signal"], 1)  # dollar en baisse
        self.assertEqual(keys["eur"]["signal"], 1)  # euro en baisse
        self.assertEqual(keys["rates"]["signal"], 1)  # taux en baisse
        self.assertEqual(keys["vix"]["signal"], 1)
        # Repères sans signal : ratio or/argent, prime du Napoléon.
        self.assertEqual(keys["ratio"]["signal"], 0)
        self.assertEqual(keys["prime"]["signal"], 0)

    def test_falling_gold_is_stormy(self):
        w = M.build(NOW, fetch(-60, dxy=(97, 100), eur=(1.08, 1.11), rates=(4.0, 4.3)))
        self.assertIn(w["weather"]["key"], ("orage", "averses"))
        self.assertLess(w["score"], -0.2)

    def test_missing_sources_are_listed(self):
        f = fetch(10)
        for k in ("dxy", "eurusd", "us10y", "vix"):
            f[k] = None
        w = M.build(NOW, f)
        self.assertFalse(any(x["group"] == "Économie" for x in w["indicators"]))
        self.assertIsNotNone(w["weather"])

    def test_rsi(self):
        self.assertEqual(M.rsi(list(range(1, 30))), 100.0)
        self.assertAlmostEqual(M.rsi([10, 11] * 10), 50.0, delta=5)


if __name__ == "__main__":
    unittest.main()
