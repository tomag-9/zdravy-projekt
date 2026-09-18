"""Unit testy pre api.dev_clock — testovací posun `timezone.now()`.

TDD pred implementáciou `api/dev_clock.py` (žiadosť: "priprav dev funkciu na
zmenu aktuálneho dátumu/času pre testovanie", 18.9.2026 — pozri
memory/stromcek-external-snapshot-write-mystery.md pre kontext, prečo to bolo
potrebné: overiť deadline logiku bez čakania na skutočný čas).
"""

from __future__ import annotations

import datetime

import pytest
from django.core.cache import cache
from django.utils import timezone

from api import dev_clock


@pytest.fixture(autouse=True)
def _clear_dev_clock_cache():
    cache.delete(dev_clock.CACHE_KEY)
    yield
    cache.delete(dev_clock.CACHE_KEY)


class TestIsDevClockEnabled:
    def test_disabled_by_default(self, settings):
        settings.DEV_CLOCK_ENABLED = False
        assert dev_clock.is_dev_clock_enabled() is False

    def test_enabled_when_setting_true(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        assert dev_clock.is_dev_clock_enabled() is True


class TestGetSetOverride:
    def test_get_returns_none_when_nothing_set(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        assert dev_clock.get_dev_clock_override() is None

    def test_get_returns_none_when_disabled_even_if_cached(self, settings):
        """Bezpečnostná poistka: aj keby v cache ostala hodnota (napr. po
        preklopení DEV_CLOCK_ENABLED z True na False), disabled prostredie ju
        nikdy nesmie použiť."""
        settings.DEV_CLOCK_ENABLED = True
        aware = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(aware)

        settings.DEV_CLOCK_ENABLED = False
        assert dev_clock.get_dev_clock_override() is None

    def test_set_then_get_roundtrip(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        aware = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(aware)
        assert dev_clock.get_dev_clock_override() == aware

    def test_set_localizes_naive_datetime(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        naive = datetime.datetime(2026, 9, 20, 8, 0)
        dev_clock.set_dev_clock_override(naive)
        result = dev_clock.get_dev_clock_override()
        assert result is not None
        assert timezone.is_aware(result)

    def test_set_none_clears_override(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        dev_clock.set_dev_clock_override(
            timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        )
        dev_clock.set_dev_clock_override(None)
        assert dev_clock.get_dev_clock_override() is None

    def test_set_raises_when_disabled(self, settings):
        settings.DEV_CLOCK_ENABLED = False
        with pytest.raises(dev_clock.DevClockDisabledError):
            dev_clock.set_dev_clock_override(
                timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
            )


class TestPatchedNow:
    def test_returns_real_time_when_no_override(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        before = dev_clock.real_now()
        result = dev_clock.patched_now()
        after = dev_clock.real_now()
        assert before <= result <= after

    def test_returns_real_time_when_disabled(self, settings):
        settings.DEV_CLOCK_ENABLED = False
        before = dev_clock.real_now()
        result = dev_clock.patched_now()
        after = dev_clock.real_now()
        assert before <= result <= after

    def test_returns_override_when_set_and_enabled(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        override = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(override)
        assert dev_clock.patched_now() == override

    def test_ignores_override_when_disabled(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        override = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(override)

        settings.DEV_CLOCK_ENABLED = False
        result = dev_clock.patched_now()
        assert result != override


@pytest.mark.django_db
class TestGlobalMonkeypatch:
    """`api.apps.ApiConfig.ready()` nahradí `django.utils.timezone.now` za
    `patched_now` pri štarte procesu — tu overujeme, že `timezone.now()`
    volané odkiaľkoľvek (aj `timezone.localdate()`/`localtime()`, ktoré
    interne volajú `now()`) skutočne reflektuje override, keď je zapnutý."""

    def test_timezone_now_reflects_override(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        override = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(override)
        assert timezone.now() == override

    def test_timezone_localdate_reflects_override(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        override = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(override)
        assert timezone.localdate() == datetime.date(2026, 9, 20)

    def test_timezone_now_back_to_real_after_clear(self, settings):
        settings.DEV_CLOCK_ENABLED = True
        override = timezone.make_aware(datetime.datetime(2026, 9, 20, 8, 0))
        dev_clock.set_dev_clock_override(override)
        dev_clock.set_dev_clock_override(None)
        assert timezone.now() != override
