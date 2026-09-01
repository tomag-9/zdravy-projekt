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
def test_apply_auto_orders_task_runs_on_sunday_because_monday_is_a_normal_workday(
    monkeypatch,
):
    """Regression for a real prod incident (2026-08-31): `auto-order-daily`
    fires Sun-Thu at 21:00 precisely so its Sunday leg can prepare Monday.
    The old code checked "today" (Sunday, always a weekend) instead of the
    resolved next-workday target, so it silently skipped every Sunday and
    Monday never got its auto-orders."""
    monkeypatch.setattr(timezone, "localdate", lambda: SUNDAY)
    called = {}

    def fake_apply(target_date):
        # `target_date=None` here is correct/expected: the task still lets
        # `apply_auto_orders()` resolve "next workday" itself — this test's
        # guarantee is only that it gets called at all, i.e. isn't skipped.
        called["was_called"] = True
        called["target_date"] = target_date
        return {"date": str(MONDAY), "created": [], "skipped": 0}

    monkeypatch.setattr("api.services.apply_auto_orders", fake_apply)

    result = apply_auto_orders_task.run()

    assert called.get("was_called") is True
    assert called["target_date"] is None
    assert result["date"] == MONDAY.isoformat()
    assert (
        EventLog.objects.filter(event_type=EventLog.EventType.CRON_SKIPPED).count() == 0
    )


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
def test_apply_auto_orders_task_clears_gramage_dashboard_cache(monkeypatch):
    """Deadline práve pridal auto-objednávky — cache gramage dashboardu z pred
    deadline by ich ešte 5 minút neukazovala, tak sa musí zahodiť."""
    from django.core.cache import cache

    from api.cache_service import get_gramage_dashboard_cache_key, set_cached

    monkeypatch.setattr(
        "api.services.apply_auto_orders",
        lambda target_date: {"date": str(target_date), "created": [], "skipped": 0},
    )

    cache_key = get_gramage_dashboard_cache_key(SATURDAY.isoformat())
    set_cached(cache_key, {"stale": True}, timeout=300)

    apply_auto_orders_task.run(date_str=SATURDAY.isoformat())

    assert cache.get(cache_key) is None


@pytest.mark.django_db
def test_apply_auto_orders_task_skips_past_a_holiday_on_the_resolved_target(
    monkeypatch,
):
    """`_next_workday` (used to resolve the automatic target) already skips
    weekends AND configured Holidays on its own, so a Holiday sitting on
    what would otherwise be "tomorrow" is never itself a reachable skip
    reason for this task — the run simply lands on the day *after* the
    holiday instead. This locks that composition down."""
    tuesday = MONDAY + datetime.timedelta(days=1)
    Holiday.objects.create(date=tuesday, reason="Firemné voľno")
    monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)
    called = {}

    def fake_apply(target_date):
        # `target_date=None`: the task lets `apply_auto_orders()` resolve
        # the target itself — this test only locks down that the pre-check
        # (evaluated on the *same* `_next_workday` result) doesn't skip it.
        called["was_called"] = True
        return {"date": "irrelevant", "created": [], "skipped": 0}

    monkeypatch.setattr("api.services.apply_auto_orders", fake_apply)

    apply_auto_orders_task.run()

    assert called.get("was_called") is True
    assert (
        EventLog.objects.filter(event_type=EventLog.EventType.CRON_SKIPPED).count() == 0
    )


@pytest.mark.django_db
def test_send_daily_report_task_skips_on_weekend_without_sending(monkeypatch):
    monkeypatch.setattr(timezone, "localdate", lambda: SUNDAY)

    def fail(*args, **kwargs):
        raise AssertionError("send_order_report should not run on a skipped day")

    monkeypatch.setattr("django.core.management.call_command", fail)

    result = send_daily_report_task.run()

    assert result == {"skipped": True, "reason": "weekend"}


@pytest.mark.django_db
def test_send_daily_report_task_skips_when_yesterday_was_weekend_even_though_today_is_not(
    monkeypatch,
):
    """The report is about *yesterday*, not today — checking "today" would
    have let a Monday run try to report on Sunday (a day nobody ordered)."""
    monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)

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
