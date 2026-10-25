"""Cours spot or pur en EUR/kg, flux public du graphique BullionVault."""

import json, time, math
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from urllib.request import Request, urlopen
from urllib.parse import urlencode

BASE = "https://chart-data.bullionvault.com/prices/prices.json"


def fetch_quote():
    params = dict(
        noCache=int(time.time() * 1000),
        version="v2",
        chartType="CHART_POINTS",
        securityId="AUX",
        interval=5,
        batch="Full",
        valuationSecurityId="EUR",
    )
    with urlopen(
        Request(
            BASE + "?" + urlencode(params),
            headers={
                "User-Agent": "Mozilla/5.0",
                "Cache-Control": "no-cache",
                "Referer": "https://or.bullionvault.fr/Cours-De-L-Or.do",
            },
        ),
        timeout=20,
    ) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Réponse BullionVault trop volumineuse")
        payload = json.loads(raw)
    value = payload["latestPrice"]
    price = value["price"]
    timestamp = value["timestamp"]
    if (
        isinstance(price, bool)
        or isinstance(timestamp, bool)
        or not isinstance(timestamp, (int, float))
        or not math.isfinite(timestamp)
    ):
        raise ValueError("Horodatage ou cours invalide")
    if (
        value.get("securityId") != "AUX"
        or value.get("valuationSecurityId") != "EUR"
        or not isinstance(price, (int, float))
        or not math.isfinite(price)
        or price <= 0
    ):
        raise ValueError("Cours ou devise inattendu")
    at = datetime.fromtimestamp(timestamp / 1000, timezone.utc)
    now = datetime.now(timezone.utc)
    age = (now - at).total_seconds()
    from market import validate_quote
    closed_at = validate_quote(at, now, 120)
    money = lambda n: str(
        Decimal(str(n)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
    )
    return dict(
        marketClosed=closed_at is not None,
        closedAt=closed_at,
        source="BullionVault",
        metal="Or",
        currency="EUR",
        unit="EUR/kg",
        price=price,
        priceKg=money(price),
        priceGram=money(price / 1000),
        quotedAt=at.isoformat(),
        retrievedAt=datetime.now(timezone.utc).isoformat(),
        ageSeconds=round(age, 1),
    )
