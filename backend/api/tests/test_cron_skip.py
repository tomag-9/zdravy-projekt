"""Tests for #442: cron tasks must skip weekends and configured Holiday
days off, log the skip, and never run their side effects for that day."""

import datetime

import pytest
from django.utils import timezone

from api.models import EventLog, GlobalSettings, Holiday
from api.scheduling import cron_skip_reason
from api.tasks import (
    apply_auto_orders_task,
    scrape_edupage_orders_task,
    send_daily_report_task,
)

SATURDAY = datetime.date(2026, 8, 8)
SUNDAY = datetime.date(2026, 8, 9)
MONDAY = datetime.date(2026, 8, 10)


@pytest.mark.django_db
class TestCronSkipReason:
    def test_saturday_is_skipped_as_weekend(self):
        assert cron_skip_reason(SATURDAY) == "weekend"

    def test_sunday_is_skipped_as_weekend(self):
        assert cron_skip_reason(SUNDAY) == "weekend"

    def test_configured_holiday_on_a_weekday_is_skipped(self):
        Holiday.objects.create(date=MONDAY, reason="Firemné voľno")
        assert cron_skip_reason(MONDAY) == "configured_day_off"

    def test_normal_weekday_is_not_skipped(self):
        assert cron_skip_reason(MONDAY) is None


@pytest.mark.django_db
def test_apply_auto_orders_task_skips_on_weekend_and_logs(monkeypatch):
    monkeypatch.setattr(timezone, "localdate", lambda: SATURDAY)

    def fail(*args, **kwargs):
        raise AssertionError("apply_auto_orders should not run on a skipped day")

    monkeypatch.setattr("api.services.apply_auto_orders", fail)

    result = apply_auto_orders_task.run()

    assert result == {"skipped": True, "reason": "weekend"}
    assert (
        EventLog.objects.filter(event_type=EventLog.EventType.CRON_SKIPPED).count() == 1
    )
    log = EventLog.objects.get(event_type=EventLog.EventType.CRON_SKIPPED)
    assert log.payload["reason"] == "weekend"
    assert log.payload["date"] == SATURDAY.isoformat()


@pytest.mark.django_db
def test_apply_auto_orders_task_runs_on_explicit_date_even_on_weekend(monkeypatch):
    """An explicit date_str is a deliberate manual/admin trigger, not the
    automatic Beat path — it must not be silently skipped."""
    monkeypatch.setattr(timezone, "localdate", lambda: SATURDAY)
    called = {}

    def fake_apply(target_date):
        called["target_date"] = target_date
        return {"date": str(target_date), "created": [], "skipped": 0}

    monkeypatch.setattr("api.services.apply_auto_orders", fake_apply)

    result = apply_auto_orders_task.run(date_str=SATURDAY.isoformat())

    assert called["target_date"] == SATURDAY
    assert result["date"] == SATURDAY.isoformat()


@pytest.mark.django_db
def test_apply_auto_orders_task_skips_on_configured_holiday(monkeypatch):
    Holiday.objects.create(date=MONDAY, reason="Firemné voľno")
    monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)

    def fail(*args, **kwargs):
        raise AssertionError("apply_auto_orders should not run on a configured day off")

    monkeypatch.setattr("api.services.apply_auto_orders", fail)

    result = apply_auto_orders_task.run()

    assert result == {"skipped": True, "reason": "configured_day_off"}


@pytest.mark.django_db
def test_send_daily_report_task_skips_on_weekend_without_sending(monkeypatch):
    monkeypatch.setattr(timezone, "localdate", lambda: SUNDAY)

    def fail(*args, **kwargs):
        raise AssertionError("send_order_report should not run on a skipped day")

    monkeypatch.setattr("django.core.management.call_command", fail)

    result = send_daily_report_task.run()

    assert result == {"skipped": True, "reason": "weekend"}


@pytest.mark.django_db
def test_scrape_edupage_orders_task_skips_on_weekend(monkeypatch):
    GlobalSettings.objects.create(pk=1)
    monkeypatch.setattr(timezone, "localdate", lambda: SATURDAY)

    def fail(self, *args, **kwargs):
        raise AssertionError("EdupageScraper.scrape should not run on a skipped day")

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fail)

    result = scrape_edupage_orders_task.run()

    assert result["skipped_run"] is True
    assert result["reason"] == "weekend"
    assert result["scraped"] == 0
