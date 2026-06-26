"""Tests for deploy-time scheduled task synchronization."""

import datetime

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import PUSH_REMINDER_TASK_PREFIX, WEEKLY_REMINDER_TASK_NAME


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
