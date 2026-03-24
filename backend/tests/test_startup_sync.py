"""
Tests for the startup self-heal in api/apps.py.

Verifies that ApiConfig.ready() (via _sync_push_reminder_schedule) creates
push-reminder PeriodicTasks on boot, so a fresh deploy never silently loses them.
"""

import datetime

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import PUSH_REMINDER_TASK_PREFIX


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
    def test_push_reminder_tasks_created_on_startup(self):
        """
        Simulating startup (calling _sync_push_reminder_schedule directly as
        apps.py does) creates push-reminder tasks when none exist.
        """
        from api.signals import _sync_push_reminder_schedule

        gs = _make_settings()

        # Precondition: no tasks exist yet
        PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX).delete()
        assert not PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).exists()

        _sync_push_reminder_schedule(gs)

        assert PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).exists()

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

    def test_startup_sync_skipped_when_no_global_settings(self):
        """
        If GlobalSettings doesn't exist yet (fresh DB), ApiConfig.ready() exits
        cleanly without raising and does not create push-reminder tasks.
        """
        import api
        from api.apps import ApiConfig

        assert not GlobalSettings.objects.filter(pk=1).exists()

        pre_count = PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).count()

        ApiConfig("api", api).ready()

        post_count = PeriodicTask.objects.filter(
            name__startswith=PUSH_REMINDER_TASK_PREFIX
        ).count()
        assert pre_count == post_count
