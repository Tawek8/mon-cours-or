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

    def test_missing_sources_have_plain_names_and_are_retried_sooner(self):
        from unittest.mock import patch

        def broken():
            raise OSError("pas de réseau")

        f = fetch(10)
        del f["us10y"], f["vix"]
        with patch.dict(M.LOADERS, us10y=broken, vix=broken):
            w = M.build(NOW, f)
        self.assertEqual(w["errors"], ["us10y", "vix"])
        self.assertEqual(w["missing"], ["taux américains", "indice de la peur"])
        # Gardée 5 minutes seulement quand une source manque, 30 minutes sinon.
        calls = []
        with patch.object(M, "build", side_effect=lambda: calls.append(1) or w), patch.object(
            M, "daily_replay", return_value=[]
        ), patch.object(M.time, "monotonic") as clock:
            M._cache.update(at=0.0, value=None)
            clock.return_value = 1000.0
            M.weather()
            clock.return_value = 1000.0 + 4 * 60
            M.weather()
            self.assertEqual(len(calls), 1)
            clock.return_value = 1000.0 + 6 * 60
            M.weather()
            self.assertEqual(len(calls), 2)
            ok = dict(w, errors=[], missing=[])
            M._cache.update(at=2000.0, value=ok)
            clock.return_value = 2000.0 + 20 * 60
            self.assertIs(M.weather(), ok)
        M._cache.update(at=0.0, value=None)

    def test_rsi(self):
        self.assertEqual(M.rsi(list(range(1, 30))), 100.0)
        self.assertAlmostEqual(M.rsi([10, 11] * 10), 50.0, delta=5)


def dated(values):
    """Série Yahoo datée : une valeur par jour ouvré jusqu'à NOW."""
    out, day = [], NOW
    for v in reversed(values):
        while day.weekday() >= 5:
            day -= timedelta(days=1)
        out.append((day.replace(hour=14), v))
        day -= timedelta(days=1)
    return out[::-1]


class HistoryTests(unittest.TestCase):
    """Météo des derniers jours ouvrés, recalculée avec les séries coupées à la fin du jour."""

    def test_twenty_working_days_oldest_first(self):
        h = M.build(NOW, fetch(10))["history"]
        self.assertEqual(len(h), 20)
        days = [datetime.fromisoformat(d["day"]).date() for d in h]
        self.assertEqual(days, sorted(days))
        self.assertTrue(all(d.weekday() < 5 for d in days))
        self.assertEqual(days[-1], (NOW - timedelta(days=1)).date())  # NOW est un jeudi
        self.assertTrue(all(d["weather"] for d in h))

    def test_a_past_day_ignores_what_came_after(self):
        calm = fetch(10)
        later = fetch(10)
        cut = NOW - timedelta(days=3)
        later["gold3m"] = [(at, p * (0.5 if at >= cut else 1)) for at, p in later["gold3m"]]
        a, b = M.build(NOW, calm)["history"], M.build(NOW, later)["history"]
        old = [d for d in a if datetime.fromisoformat(d["day"]).date() < cut.date()]
        self.assertEqual(old, b[: len(old)])
        self.assertNotEqual(a[-1], b[-1])  # la veille, elle, voit la chute

    def test_storm_then_sun(self):
        # L'or baisse pendant des mois puis remonte fort sur les 15 derniers jours.
        f = fetch(-60)
        turn = NOW - timedelta(days=15)
        for k in ("gold5a", "gold1a", "gold3m"):
            low = min(p for at, p in f[k] if at <= turn)
            f[k] = [(at, p if at <= turn else low + 900 * (at - turn).days) for at, p in f[k]]
        h = M.build(NOW, f)["history"]
        self.assertIn(h[0]["weather"]["key"], ("orage", "averses"))
        self.assertGreater(h[-1]["score"], h[0]["score"])

    def test_dated_yahoo_series_count_in_the_past(self):
        f = fetch(10)
        f["us10y"] = dated([4.0] * 40 + [3.0] * 20)  # taux en forte baisse depuis 20 jours ouvrés
        h = M.build(NOW, f)["history"]
        old, recent = h[0], h[-1]
        self.assertLess(old["score"], recent["score"])
        # Une série sans dates ne peut pas être coupée : absente des jours passés.
        g = fetch(10, rates=(4.3, 4.0))
        self.assertEqual(M.build(NOW, g)["history"], M.build(NOW, fetch(10))["history"])


class OddsTests(unittest.TestCase):
    """« Et ensuite ? » : ce qui a suivi les jours de même météo."""

    def days(self, keys, prices):
        start = datetime(2020, 1, 1).date()
        return [(start + timedelta(days=i), k, p) for i, (k, p) in enumerate(zip(keys, prices))]

    def test_counts_cases_episodes_and_compares_with_all_days(self):
        # 70 jours : orage du jour 0 à 9 puis du jour 30 à 39, éclaircies sinon ; prix qui monte
        # de 1 par jour sauf une chute de 20 au jour 8.
        keys = ["orage" if i < 10 or 30 <= i < 40 else "eclaircies" for i in range(70)]
        prices = [100 + i - (20 if i >= 8 else 0) for i in range(70)]
        o = M.odds("orage", self.days(keys, prices))
        week = o["rows"][0]
        self.assertEqual((week["horizon"], week["days"]), ("1 semaine", 5))
        self.assertEqual(week["cases"], 20)
        self.assertEqual(week["episodes"], 2)
        # Jours 3 à 7 : la chute du jour 8 arrive dans les 5 jours → plus bas ; les autres plus hauts.
        self.assertEqual(week["up"], 75)
        self.assertFalse(week["enough"])  # moins de 50 cas
        self.assertGreater(week["allUp"], week["up"])
        self.assertEqual(o["since"], "2020-01-01")
        # 3 mois (63 jours) : seuls les 7 premiers jours ont une suite connue.
        self.assertEqual(o["rows"][2]["cases"], 7)

    def test_unknown_weather_and_short_history(self):
        o = M.odds("soleil", self.days(["orage"] * 3, [1, 2, 3]))
        self.assertEqual([r["cases"] for r in o["rows"]], [0, 0, 0])
        self.assertIsNone(o["rows"][0]["up"])
        self.assertIsNone(o["rows"][0]["allUp"])

    def test_replay_uses_the_rules_of_the_day(self):
        # 3 ans de cours journaliers en hausse régulière, euro fixe : temps plutôt beau ;
        # les jours d'avant le début du rejeu ne sont pas comptés.
        first = datetime(2018, 1, 1).date()
        days = [first + timedelta(days=i) for i in range(3 * 365) if (first + timedelta(days=i)).weekday() < 5]
        f = dict(
            gold=[(d, 1000 + i) for i, d in enumerate(days)],
            eurusd=[(first, 1.25)],
            us10y=[(d, 3.0) for d in days],
            vix=[(d, 15.0) for d in days],
        )
        start = datetime(2019, 6, 3).date()
        out = M.replay(f, start=start)
        self.assertEqual(out[0][0], start)
        self.assertTrue(all(d.weekday() < 5 for d, _, _ in out))
        self.assertIn(out[-1][1], ("soleil", "eclaircies"))
        # Or en euros par kilo : dollars l'once ÷ euro × onces par kilo.
        self.assertAlmostEqual(out[-1][2], (1000 + len(days) - 1) / 1.25 * M.TROY_OUNCES_PER_KG)

    def test_weather_survives_a_failed_replay(self):
        from unittest.mock import patch

        w = M.build(NOW, fetch(10))
        with patch.object(M, "build", return_value=dict(w)), patch.object(M, "daily_replay", side_effect=OSError("réseau")):
            M._cache.update(at=0.0, value=None)
            got = M.weather()
        M._cache.update(at=0.0, value=None)
        self.assertIsNone(got["odds"])
        self.assertEqual(got["weather"], w["weather"])


if __name__ == "__main__":
    unittest.main()
