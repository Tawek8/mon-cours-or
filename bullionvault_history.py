"""Données du graphique BullionVault EUR/kg ; indépendantes du Bid Kitco."""

import json, gzip, math, time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlencode

PERIODS = {"1": 600, "7": 3600, "30": 14400, "365": 172800}
METALS = {"gold": "AUX", "silver": "AGX"}


def fetch_history(period="1", metal="gold"):
    if period not in PERIODS:
        raise ValueError("Période non disponible")
    if metal not in METALS:
        raise ValueError("Métal non disponible")
    security = METALS[metal]
    params = dict(
        noCache=int(time.time() * 1000),
        version="v2",
        chartType="CHART_POINTS",
        securityId=security,
        interval=PERIODS[period],
        batch="Full",
        valuationSecurityId="EUR",
    )
    url = "https://chart-data.bullionvault.com/prices/prices.json?" + urlencode(params)
    with urlopen(
        Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://or.bullionvault.fr/Cours-De-L-Or.do",
                "Cache-Control": "no-cache",
            },
        ),
        timeout=20,
    ) as response:
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Historique trop volumineux")
    if raw.startswith(b"\x1f\x8b"):
        raw = gzip.decompress(raw)
    payload = json.loads(raw)
    series = payload["seriesData"]
    latest = payload["latestPrice"]
    if (
        series.get("securityId") != security
        or series.get("valuationSecurityId") != "EUR"
        or latest.get("securityId") != security
        or latest.get("valuationSecurityId") != "EUR"
    ):
        raise ValueError("Métal ou devise du graphique invalide")
    points = {}

    def add(stamp, price):
        if (
            isinstance(price, bool)
            or not isinstance(price, (float, int))
            or not math.isfinite(price)
            or price <= 0
        ):
            raise ValueError("Prix du graphique invalide")
        if (
            not isinstance(stamp, (int, float))
            or not math.isfinite(stamp)
            or not 1577836800000 <= stamp <= time.time() * 1000 + 300000
        ):
            raise ValueError("Horodatage du graphique invalide")
        date = datetime.fromtimestamp(stamp / 1000, timezone.utc).isoformat()
        points[date] = dict(date=date, price=price)

    for row in series["prices"]:
        add(row["priceTime"], row["latestPrice"])
    add(latest["timestamp"], latest["price"])
    if len(points) < 2:
        raise ValueError("Historique insuffisant")
    return dict(
        points=sorted(points.values(), key=lambda p: p["date"]),
        source="BullionVault",
        unit="EUR/kg",
        period=period,
        metal=metal,
        kind="market-history",
        quotedAt=datetime.fromtimestamp(
            latest["timestamp"] / 1000, timezone.utc
        ).isoformat(),
        updatedAt=datetime.now(timezone.utc).isoformat(),
    )
