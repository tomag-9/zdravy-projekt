"""Jediné miesto, ktoré vie odpovedať na "objednáva sa v tento deň?".

Tri vrstvy voľna, od najširšej po najužšiu:

1. **víkend** — sobota/nedeľa, nikdy sa neobjednáva,
2. **`Holiday`** — celosystémové voľno kuchyne ("Nastavené voľné dni" v
   HolidaysAdmin.tsx): nevarí sa nikde,
3. **`PrevadzkaClosure`** — voľno JEDNEJ prevádzky (#490, napr. prázdniny
   škôlky): ostatné prevádzky objednávajú ďalej.

Vrstvy 1+2 sú "globálne" (`is_day_off(date)`), vrstva 3 sa pýta len keď
poznáme prevádzku (`is_day_off(date, prevadzka=…)`). Používajú to
cron/Celery-beat úlohy (api/tasks.py), výpočet termínu dodania podkladov
(#447), auto-objednávky, EduPage scrape aj generovanie zoznamu dní na
objednanie (#489) — preto je logika tu a nie rozkopírovaná po volajúcich.

Frontend má zrkadlový helper vo `frontend/src/lib/businessDay.ts`.
"""

from __future__ import annotations

import datetime
from collections.abc import Iterable

from django.utils import timezone

WEEKEND_REASON = "weekend"
CONFIGURED_DAY_OFF_REASON = "configured_day_off"
PREVADZKA_CLOSURE_REASON = "prevadzka_closure"

# Poistka proti nekonečnej slučke, keby niekto nastavil voľno na roky dopredu.
_MAX_DAY_SCAN = 400


def is_weekend(check_date: datetime.date) -> bool:
    """Saturday (5) or Sunday (6)."""
    return check_date.weekday() >= 5


def is_configured_day_off(check_date: datetime.date) -> bool:
    """Celosystémové voľno (`Holiday`) — platí pre všetky prevádzky."""
    from .models import Holiday

    return Holiday.objects.filter(date=check_date).exists()


def _prevadzka_id(prevadzka: object) -> int | None:
    """Prijmi buď inštanciu `Prevadzka`, alebo rovno jej PK."""
    if prevadzka is None:
        return None
    if isinstance(prevadzka, int):
        return prevadzka
    return getattr(prevadzka, "pk", None)


def is_prevadzka_closed(check_date: datetime.date, prevadzka: object) -> bool:
    """Má daná prevádzka na `check_date` nastavené vlastné voľno (#490)?"""
    from .models import PrevadzkaClosure

    pk = _prevadzka_id(prevadzka)
    if pk is None:
        return False
    return PrevadzkaClosure.objects.filter(
        prevadzka_id=pk, date_from__lte=check_date, date_to__gte=check_date
    ).exists()


def expand_closures(
    rows: Iterable[tuple[int, datetime.date, datetime.date]],
    date_from: datetime.date,
    date_to: datetime.date,
) -> dict[int, set[datetime.date]]:
    """Rozbaľ `(prevadzka_id, date_from, date_to)` riadky na {id: {dni}}, orezané
    na okno `date_from`–`date_to`.

    Oddelené od dotazu, aby si volajúci mohol prevádzky vyfiltrovať vlastným
    poddotazom (`prevadzka__in=…`) a neplatil dotaz navyše za zoznam id-čiek.
    Vracia len prevádzky, ktoré nejaké voľno naozaj majú — prázdny výsledok tak
    znamená "nikto nemá voľno" a volajúci sa nemusí pýtať na nič ďalšie.
    """
    result: dict[int, set[datetime.date]] = {}
    if date_to < date_from:
        return result
    for pid, start, end in rows:
        days = result.setdefault(pid, set())
        day = max(start, date_from)
        last = min(end, date_to)
        while day <= last:
            days.add(day)
            day += datetime.timedelta(days=1)
    return result


def closed_dates_for_prevadzky(
    prevadzka_ids: Iterable[int],
    date_from: datetime.date,
    date_to: datetime.date,
) -> dict[int, set[datetime.date]]:
    """{prevadzka_id: {dni voľna v intervale}} — jeden dotaz pre celú dávku.

    Reporty a scrape prechádzajú desiatky prevádzok krát niekoľko dní; robiť
    na to `is_prevadzka_closed()` v cykle by bola klasická N+1. Kľúč má každá
    zadaná prevádzka (aj bez voľna), aby volajúci mohol robiť `result[pid]`.
    """
    from .models import PrevadzkaClosure

    ids = list(prevadzka_ids)
    result: dict[int, set[datetime.date]] = {pid: set() for pid in ids}
    if not ids or date_to < date_from:
        return result

    rows = PrevadzkaClosure.objects.filter(
        prevadzka_id__in=ids, date_from__lte=date_to, date_to__gte=date_from
    ).values_list("prevadzka_id", "date_from", "date_to")
    result.update(expand_closures(rows, date_from, date_to))
    return result


def day_off_reason(
    check_date: datetime.date, prevadzka: object = None
) -> str | None:
    """Prečo je `check_date` voľný, alebo None keď sa objednáva.

    Bez `prevadzka` posudzuje len globálne voľno (víkend + `Holiday`).
    """
    if is_weekend(check_date):
        return WEEKEND_REASON
    if is_configured_day_off(check_date):
        return CONFIGURED_DAY_OFF_REASON
    if prevadzka is not None and is_prevadzka_closed(check_date, prevadzka):
        return PREVADZKA_CLOSURE_REASON
    return None


def is_day_off(check_date: datetime.date, prevadzka: object = None) -> bool:
    """`day_off_reason()` ako bool — "v tento deň sa neobjednáva"."""
    return day_off_reason(check_date, prevadzka) is not None


def cron_skip_reason(check_date: datetime.date | None = None) -> str | None:
    """Return why a scheduled run should be skipped for `check_date`
    (default: today in the app's configured timezone), or None if it
    should run normally.

    Cron beží nad celým systémom, takže vedome pozná len globálne voľno —
    voľno jednej prevádzky beh nezastaví, len sa pri nej preskočí
    (viď `scrape_edupage_orders_task`, `apply_auto_orders`).

    `django.utils.timezone.localdate()` resolves "today" using
    `settings.TIME_ZONE` (via Django's active/default timezone), so this
    is correct around midnight and DST transitions without any manual
    offset math — it's the same conversion Django uses everywhere else
    for "what day is it".
    """
    return day_off_reason(check_date or timezone.localdate())


def next_business_day(
    check_date: datetime.date, prevadzka: object = None
) -> datetime.date:
    """Shift `check_date` forward until it lands on a day that is ordered on.
    Used for deadline/date calculations (#447) that must never land on a day
    off — distinct from `cron_skip_reason`, which only decides whether to skip
    *today's* scheduled run."""
    day = check_date
    for _ in range(_MAX_DAY_SCAN):
        if not is_day_off(day, prevadzka):
            return day
        day += datetime.timedelta(days=1)
    return day


def previous_business_day(
    check_date: datetime.date, prevadzka: object = None
) -> datetime.date:
    """Opak `next_business_day` — posunie dátum dozadu na najbližší pracovný deň."""
    day = check_date
    for _ in range(_MAX_DAY_SCAN):
        if not is_day_off(day, prevadzka):
            return day
        day -= datetime.timedelta(days=1)
    return day


def business_days(
    start: datetime.date,
    count: int = 5,
    prevadzka: object = None,
) -> list[datetime.date]:
    """Prvých `count` dní na objednanie od `start` (vrátane) — #489.

    Preskočí víkendy, `Holiday` aj voľno danej prevádzky.
    """
    from .models import Holiday

    days: list[datetime.date] = []
    if count <= 0:
        return days

    # Horný odhad okna: `count` pracovných dní sa nikdy nezmestí do menej ako
    # `count` dní a v praxi ani do viac ako `_MAX_DAY_SCAN`.
    end = start + datetime.timedelta(days=_MAX_DAY_SCAN)
    holidays = set(
        Holiday.objects.filter(date__gte=start, date__lte=end).values_list(
            "date", flat=True
        )
    )
    pk = _prevadzka_id(prevadzka)
    closures = (
        closed_dates_for_prevadzky([pk], start, end).get(pk, set())
        if pk is not None
        else set()
    )

    day = start
    for _ in range(_MAX_DAY_SCAN):
        if len(days) >= count:
            break
        if not is_weekend(day) and day not in holidays and day not in closures:
            days.append(day)
        day += datetime.timedelta(days=1)
    return days


def business_days_in_range(
    date_from: datetime.date,
    date_to: datetime.date,
    prevadzka: object = None,
) -> list[datetime.date]:
    """Dni na objednanie v uzavretom intervale `date_from`–`date_to` (#489)."""
    from .models import Holiday

    if date_to < date_from:
        return []

    holidays = set(
        Holiday.objects.filter(date__gte=date_from, date__lte=date_to).values_list(
            "date", flat=True
        )
    )
    pk = _prevadzka_id(prevadzka)
    closures = (
        closed_dates_for_prevadzky([pk], date_from, date_to).get(pk, set())
        if pk is not None
        else set()
    )

    days: list[datetime.date] = []
    day = date_from
    while day <= date_to:
        if not is_weekend(day) and day not in holidays and day not in closures:
            days.append(day)
        day += datetime.timedelta(days=1)
    return days
