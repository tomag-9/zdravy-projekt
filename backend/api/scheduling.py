"""Shared "should this scheduled run happen today" logic.

Used by cron/Celery-beat-triggered tasks (see api/tasks.py) to skip
weekends and admin-configured days off (`Holiday` — same model already
used to block client order submission, "Nastavené voľné dni" in
HolidaysAdmin.tsx), and by the "dodanie podkladov" deadline calculation
(see #447) to push a date off a weekend — same "what day is today/is this
date a day off" primitive, different problem (one skips a run, the other
shifts a date), so it's kept here as a single utility rather than
duplicated.
"""

from __future__ import annotations

import datetime

from django.utils import timezone

WEEKEND_REASON = "weekend"
CONFIGURED_DAY_OFF_REASON = "configured_day_off"


def is_weekend(check_date: datetime.date) -> bool:
    """Saturday (5) or Sunday (6)."""
    return check_date.weekday() >= 5


def is_configured_day_off(check_date: datetime.date) -> bool:
    from .models import Holiday

    return Holiday.objects.filter(date=check_date).exists()


def cron_skip_reason(check_date: datetime.date | None = None) -> str | None:
    """Return why a scheduled run should be skipped for `check_date`
    (default: today in the app's configured timezone), or None if it
    should run normally.

    `django.utils.timezone.localdate()` resolves "today" using
    `settings.TIME_ZONE` (via Django's active/default timezone), so this
    is correct around midnight and DST transitions without any manual
    offset math — it's the same conversion Django uses everywhere else
    for "what day is it".
    """
    day = check_date or timezone.localdate()
    if is_weekend(day):
        return WEEKEND_REASON
    if is_configured_day_off(day):
        return CONFIGURED_DAY_OFF_REASON
    return None


def next_business_day(check_date: datetime.date) -> datetime.date:
    """Shift `check_date` forward until it lands on neither a weekend nor
    a configured day off. Used for deadline/date calculations (#447) that
    must never land on a day off — distinct from `cron_skip_reason`, which
    only decides whether to skip *today's* scheduled run."""
    day = check_date
    while is_weekend(day) or is_configured_day_off(day):
        day += datetime.timedelta(days=1)
    return day
