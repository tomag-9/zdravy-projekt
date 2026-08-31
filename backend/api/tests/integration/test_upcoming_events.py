"""Nadchádzajúce — prehľad naplánovaných cronov (#527/#528 follow-up)."""

import json

import pytest
from django_celery_beat.models import CrontabSchedule, PeriodicTask
from rest_framework import status

from api.services.push_reminder_service import REMINDER_TITLE

pytestmark = pytest.mark.integration


def _crontab(**overrides):
    defaults = {
        "minute": "30",
        "hour": "11",
        "day_of_week": "1-5",
        "day_of_month": "*",
        "month_of_year": "*",
    }
    defaults.update(overrides)
    schedule, _ = CrontabSchedule.objects.get_or_create(**defaults)
    return schedule


@pytest.mark.django_db
def test_upcoming_events_is_read_only_for_plain_admin(plain_admin_client):
    """Rola `admin` (bez extra sekcií) vidí prehľad — je to READ default (#484)."""
    response = plain_admin_client.get("/api/admin/upcoming-events/")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_upcoming_events_requires_admin_or_above(authenticated_client):
    response = authenticated_client.get("/api/admin/upcoming-events/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_lists_next_run_and_description(admin_client):
    PeriodicTask.objects.create(
        name="edupage-scrape-lunch",
        task="api.tasks.scrape_edupage_orders_task",
        crontab=_crontab(),
        args=json.dumps([]),
        kwargs=json.dumps({}),
        enabled=True,
        description="Edupage scrape at lunch deadline.",
    )

    response = admin_client.get("/api/admin/upcoming-events/")

    assert response.status_code == status.HTTP_200_OK
    results = response.json()["results"]
    assert any(
        r["name"] == "edupage-scrape-lunch"
        and r["description"] == "Edupage scrape at lunch deadline."
        and r["next_run"] is not None
        for r in results
    )


@pytest.mark.django_db
def test_push_deadline_task_carries_a_text_preview(admin_client):
    PeriodicTask.objects.create(
        name="push-reminder-lunch",
        task="api.tasks.send_push_deadline_reminder_task",
        crontab=_crontab(),
        args=json.dumps([["lunch"]]),
        kwargs=json.dumps({}),
        enabled=True,
        description="Push reminder: 30 min before lunch deadline.",
    )

    response = admin_client.get("/api/admin/upcoming-events/")

    entry = next(
        r for r in response.json()["results"] if r["name"] == "push-reminder-lunch"
    )
    assert entry["push_preview"]["title"] == REMINDER_TITLE
    assert "obed" in entry["push_preview"]["body"]
    assert "Uzávierka je o chvíľu!" in entry["push_preview"]["body"]


@pytest.mark.django_db
def test_weekly_reminder_task_carries_a_text_preview(admin_client):
    PeriodicTask.objects.create(
        name="weekly-order-reminder-sunday",
        task="api.tasks.send_weekly_order_reminder_task",
        crontab=_crontab(hour="17", minute="0", day_of_week="0"),
        args=json.dumps([]),
        kwargs=json.dumps({}),
        enabled=True,
        description="Sunday 17:00 – remind clients who have no orders for next week",
    )

    response = admin_client.get("/api/admin/upcoming-events/")

    entry = next(
        r
        for r in response.json()["results"]
        if r["name"] == "weekly-order-reminder-sunday"
    )
    assert entry["push_preview"]["title"] == REMINDER_TITLE
    assert "budúci týždeň" in entry["push_preview"]["body"]


@pytest.mark.django_db
def test_disabled_tasks_are_not_listed(admin_client):
    PeriodicTask.objects.create(
        name="edupage-scrape-old",
        task="api.tasks.scrape_edupage_orders_task",
        crontab=_crontab(),
        enabled=False,
    )

    response = admin_client.get("/api/admin/upcoming-events/")

    names = [r["name"] for r in response.json()["results"]]
    assert "edupage-scrape-old" not in names
