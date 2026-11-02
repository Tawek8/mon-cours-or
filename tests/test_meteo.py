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
    def test_thresholds(self):
        key = lambda score: next(w for w in M.WEATHER if score >= w[0])[1]
        for score, expected in ((1, "soleil"), (0.63, "soleil"), (0.62, "eclaircies"), (0.25, "eclaircies"),
                                (0.24, "variable"), (-0.25, "variable"), (-0.26, "averses"),
                                (-0.63, "averses"), (-0.64, "orage"), (-1, "orage")):
            self.assertEqual(key(score), expected, score)

    def test_rising_gold_is_sunny(self):
        w = M.build(NOW, fetch(60, dxy=(100, 97), eur=(1.12, 1.09), rates=(4.3, 4.0), vix=28))
        # Marché suracheté (RSI) : 0,60, juste sous le seuil du grand soleil.
        self.assertEqual(w["score"], 0.6)
        self.assertEqual(w["weather"]["key"], "eclaircies")
        self.assertEqual(w["errors"], [])
        keys = {x["key"]: x for x in w["indicators"]}
        self.assertEqual(keys["ma200"]["signal"], 1)
        self.assertEqual(keys["cross"]["signal"], 1)
        # Dollar et euro : repères sans signal, mais toujours affichés et expliqués.
        self.assertEqual(keys["dxy"]["signal"], 0)
        self.assertEqual(keys["eur"]["signal"], 0)
        self.assertEqual(keys["dxy"]["group"], "Repères")
        self.assertIn("dollar en baisse", keys["dxy"]["text"])
        self.assertIn("euro en baisse", keys["eur"]["text"])
        self.assertEqual(keys["rates"]["signal"], 1)  # taux en baisse
        self.assertEqual(keys["vix"]["signal"], 1)
        # Repères sans signal : ratio or/argent, prime du Napoléon.
        self.assertEqual(keys["ratio"]["signal"], 0)
        self.assertEqual(keys["prime"]["signal"], 0)

    def test_falling_gold_is_stormy(self):
        w = M.build(NOW, fetch(-60, dxy=(97, 100), eur=(1.08, 1.11), rates=(4.0, 4.3)))
        self.assertIn(w["weather"]["key"], ("orage", "averses"))
        self.assertLess(w["score"], -0.2)

    def test_dollar_and_euro_do_not_change_the_score(self):
        calm = M.build(NOW, fetch(10))
        moved = M.build(NOW, fetch(10, dxy=(100, 110), eur=(1.2, 1.0)))
        self.assertEqual(calm["score"], moved["score"])
        self.assertEqual(calm["up"] + calm["down"] + calm["flat"], moved["up"] + moved["down"] + moved["flat"])

    def test_groups_keep_their_order(self):
        groups = [x["group"] for x in M.build(NOW, fetch(10))["indicators"]]
        self.assertEqual(groups, sorted(groups, key=["Tendance", "Économie", "Repères"].index))

    def test_missing_sources_are_listed(self):
        f = fetch(10)
        for k in ("dxy", "eurusd", "us10y", "vix"):
            f[k] = None
        w = M.build(NOW, f)
        self.assertFalse(any(x["group"] == "Économie" for x in w["indicators"]))
        self.assertFalse(any(x["key"] in ("dxy", "eur") for x in w["indicators"]))
        self.assertIsNotNone(w["weather"])

    def test_rsi(self):
        self.assertEqual(M.rsi(list(range(1, 30))), 100.0)
        self.assertAlmostEqual(M.rsi([10, 11] * 10), 50.0, delta=5)


if __name__ == "__main__":
    unittest.main()
