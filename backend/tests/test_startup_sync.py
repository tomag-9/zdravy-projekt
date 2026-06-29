"""Tests for deploy-time scheduled task synchronization."""

import datetime
import json
from io import StringIO

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import (
    EDUPAGE_SCRAPE_TASK_PREFIX,
    PUSH_REMINDER_TASK_PREFIX,
    WEEKLY_REMINDER_TASK_NAME,
)


def _make_settings(**kwargs):
    defaults = dict(
        deadline_breakfast=datetime.time(8, 0),
        deadline_lunch=datetime.time(10, 0),
        deadline_olovrant=datetime.time(9, 0),
    )
    defaults.update(kwargs)
    return GlobalSettings.objects.get_or_create(pk=1, defaults=defaults)[0]


@pytest.mark.django_db
class TestStartupSync:
    def test_push_reminder_tasks_created_by_sync_command(self):
        """
        The explicit deploy sync path creates push-reminder tasks when none exist.
        """
        from django.core import management

        gs = _make_settings()

        # Precondition: no tasks exist yet
        PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX).delete()
        assert not PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).exists()

        management.call_command("sync_periodic_tasks", "--fix")

        assert PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).exists()

    def test_edupage_scrape_sync_verify_handles_string_crontab_values(self):
        """
        django-celery-beat stores crontab hour/minute fields as strings. The
        verify output must not format them with integer-only format codes.
        """
        from django.core import management

        _make_settings()
        out = StringIO()

        management.call_command("sync_periodic_tasks", "--fix", stdout=out)

        output = out.getvalue()
        assert "Failed to sync edupage scrape tasks" not in output
        assert PeriodicTask.objects.filter(
            name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX
        ).exists()

    def test_edupage_scrape_tasks_store_meal_type_kwargs(self):
        """
        Edupage scrape tasks must know which meal deadline fired so evening
        breakfast imports and morning lunch imports do not overwrite each other.
        """
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(18, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(9, 0),
            deadline_lunch_is_day_before=False,
            deadline_olovrant=datetime.time(10, 0),
        )

        _sync_edupage_scrape_schedule(gs)

        breakfast_task = PeriodicTask.objects.get(name="edupage-scrape-breakfast")
        lunch_task = PeriodicTask.objects.get(name="edupage-scrape-lunch")

        assert json.loads(breakfast_task.kwargs) == {"meal_types": ["breakfast"]}
        assert json.loads(lunch_task.kwargs) == {"meal_types": ["lunch"]}
        assert "next workday" in breakfast_task.description
        assert "today" in lunch_task.description

    def test_weekly_reminder_task_created_on_startup(self):
        """Startup sync also self-heals the Sunday weekly reminder."""
        from api.signals import _sync_weekly_reminder_schedule

        _make_settings()

        PeriodicTask.objects.filter(name=WEEKLY_REMINDER_TASK_NAME).delete()
        assert not PeriodicTask.objects.filter(name=WEEKLY_REMINDER_TASK_NAME).exists()

        _sync_weekly_reminder_schedule()

        assert PeriodicTask.objects.filter(name=WEEKLY_REMINDER_TASK_NAME).exists()

    def test_startup_sync_is_idempotent(self):
        """Running the startup sync twice does not duplicate tasks."""
        from api.signals import _sync_push_reminder_schedule

        gs = _make_settings()

        _sync_push_reminder_schedule(gs)
        count_after_first = PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).count()

        _sync_push_reminder_schedule(gs)
        count_after_second = PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).count()

        assert count_after_first == count_after_second

    def test_app_ready_does_not_query_database(self, django_assert_num_queries):
        """
        AppConfig.ready() should only register signals. Deploy-time data sync
        runs through management commands so Django startup stays side-effect free.
        """
        import api
        from api.apps import ApiConfig

        with django_assert_num_queries(0):
            ApiConfig("api", api).ready()
