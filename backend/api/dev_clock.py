"""Dev-only posun `timezone.now()` pre manuálne testovanie termínovej logiky
(Menu B/C 2-dňový termín, meal deadliny...) bez čakania na skutočný čas.

`api.apps.ApiConfig.ready()` nahradí `django.utils.timezone.now` za
`patched_now` pri štarte procesu — VŽDY, nezávisle od prostredia. Bezpečnosť
nestojí na tom, či sa patch nainštaluje, ale na tom, že `patched_now` sám
o sebe vráti override len keď `DEV_CLOCK_ENABLED` je zapnuté (`app/settings/
dev.py`, nikdy `prod.py`/`staging.py`) — takže na produkcii je táto funkcia
vždy no-op, aj keby v zdieľanej cache nejakým omylom ostala hodnota.
"""

from __future__ import annotations

import datetime

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone as django_timezone

CACHE_KEY = "dev_clock_override"

# Zachytené pri importe tohto modulu (teda pred `install()` v `ApiConfig.ready()`)
# — jediný spôsob, ako sa dostať k skutočnému reálnemu času po tom, čo
# `django.utils.timezone.now` prepíšeme.
_real_now = django_timezone.now


class DevClockDisabledError(Exception):
    """`set_dev_clock_override` mimo `DEV_CLOCK_ENABLED` prostredia."""


def is_dev_clock_enabled() -> bool:
    return bool(getattr(settings, "DEV_CLOCK_ENABLED", False))


def real_now() -> datetime.datetime:
    """Skutočný reálny čas, nezávislý od nastaveného override — na zobrazenie
    v adminovi ("toto je reálny čas, toto testovací")."""
    return _real_now()


def get_dev_clock_override() -> datetime.datetime | None:
    if not is_dev_clock_enabled():
        return None
    raw = cache.get(CACHE_KEY)
    if not raw:
        return None
    dt = datetime.datetime.fromisoformat(raw)
    if django_timezone.is_naive(dt):
        dt = django_timezone.make_aware(dt)
    return dt


def set_dev_clock_override(dt: datetime.datetime | None) -> None:
    if not is_dev_clock_enabled():
        raise DevClockDisabledError(
            "Dev clock override nie je v tomto prostredí zapnutý (DEV_CLOCK_ENABLED)."
        )
    if dt is None:
        cache.delete(CACHE_KEY)
        return
    if django_timezone.is_naive(dt):
        dt = django_timezone.make_aware(dt)
    # timeout=None — drž override, kým ho niekto výslovne nezmaže; appka pri
    # reštarte cache (napr. Redis flush) jednoducho spadne späť na reálny čas.
    cache.set(CACHE_KEY, dt.isoformat(), timeout=None)


def patched_now() -> datetime.datetime:
    override = get_dev_clock_override()
    return override if override is not None else _real_now()


def install() -> None:
    """Nahraď `django.utils.timezone.now` za `patched_now`. Volané raz z
    `ApiConfig.ready()`. Django interne `localtime()`/`localdate()` volajú
    `now()` cez atribút modulu, takže tento jeden patch stačí na celú appku."""
    django_timezone.now = patched_now
