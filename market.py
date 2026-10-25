"""Validation des cours pendant les fermetures, sans dépendance externe."""
from datetime import datetime, timedelta, timezone


def new_york(at):
    # Transitions américaines exprimées en UTC, indépendantes du fuseau du PC.
    def sunday(month, index, hour):
        first = datetime(at.year, month, 1, hour, tzinfo=timezone.utc)
        return first + timedelta(days=(6 - first.weekday()) % 7 + 7 * (index - 1))
    offset = -4 if sunday(3, 2, 7) <= at < sunday(11, 1, 6) else -5
    return at.astimezone(timezone(timedelta(hours=offset)))


def closing_time(at):
    local = new_york(at)
    close = local.replace(hour=17, minute=0, second=0, microsecond=0)
    day = local.weekday()
    if day == 4 and local.hour >= 17:
        return close
    if day == 5:
        return close - timedelta(days=1)
    if day == 6 and local.hour < 18:
        return close - timedelta(days=2)
    if day < 4 and 17 <= local.hour < 18:
        return close
    return None


def validate_quote(at, now, max_age):
    age = (now - at).total_seconds()
    close = closing_time(now)
    # Certains flux arrêtent la cotation avant 17 h. Accepter uniquement la
    # dernière séance (six heures avant clôture), jamais une séance antérieure.
    valid_close = close is not None and at >= close - timedelta(hours=6)
    if age < -30 or (age > max_age and not valid_close):
        raise ValueError("Cours non récent")
    return close.astimezone(timezone.utc).isoformat() if close else None
