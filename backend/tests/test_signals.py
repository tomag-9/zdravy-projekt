"""
Tests for api/signals.py

Verifies that saving GlobalSettings creates/updates the Celery Beat
PeriodicTask for auto-orders.
"""

import datetime

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import PERIODIC_TASK_NAME_AUTO_ORDER


@pytest.mark.django_db
class TestAutoOrderScheduleSync:
    def test_creates_periodic_task_on_first_save(self):
        """Saving GlobalSettings for the first time creates the PeriodicTask."""
        assert not PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_AUTO_ORDER
        ).exists()

        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        task = PeriodicTask.objects.get(name=PERIODIC_TASK_NAME_AUTO_ORDER)
        assert task.task == "api.tasks.apply_auto_orders_task"
        assert task.enabled is True
        # Trigger time = max(08:00, 10:00, 09:00) = 10:00
        assert task.crontab.hour == "10"
        assert task.crontab.minute == "0"
        assert task.crontab.day_of_week == "1-5"

    def test_updates_periodic_task_when_deadline_changes(self):
        """Updating GlobalSettings reschedules the task to the new latest deadline."""
        settings = GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        # Change lunch deadline to 11:30 – new latest deadline
        settings.deadline_lunch = datetime.time(11, 30)
        settings.save()

        task = PeriodicTask.objects.get(name=PERIODIC_TASK_NAME_AUTO_ORDER)
        assert task.crontab.hour == "11"
        assert task.crontab.minute == "30"

    def test_trigger_time_is_max_of_all_three_deadlines(self):
        """Olovrant being the latest picks olovrant time."""
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(7, 30),
            deadline_lunch=datetime.time(9, 0),
            deadline_olovrant=datetime.time(12, 45),
        )

        task = PeriodicTask.objects.get(name=PERIODIC_TASK_NAME_AUTO_ORDER)
        assert task.crontab.hour == "12"
        assert task.crontab.minute == "45"

    def test_task_runs_only_on_workdays(self):
        """PeriodicTask crontab is limited to Monday–Friday."""
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(10, 0),
        )

        task = PeriodicTask.objects.get(name=PERIODIC_TASK_NAME_AUTO_ORDER)
        assert task.crontab.day_of_week == "1-5"


@pytest.mark.django_db
class TestDefaultProfileFacility:
    def _profile(self, email="profile@x.sk", company_name="Test prevádzka"):
        from django.contrib.auth.models import User

        from api.models import UserProfile

        user = User.objects.create_user(username=email, email=email)
        return UserProfile.objects.create(user=user, company_name=company_name)

    def test_new_profile_gets_own_celok_prevadzka_and_access(self):
        profile = self._profile()
        celok = profile.primary_celok()

        assert celok is not None
        assert celok.nazov == "Test prevádzka"
        assert list(profile.dostupne_prevadzky().values_list("nazov", flat=True)) == [
            "Test prevádzka"
        ]
        assert profile.celok_accesses.filter(celok=celok).exists()

    def test_profile_update_does_not_rename_manually_named_celok(self):
        profile = self._profile()
        celok = profile.primary_celok()
        celok.nazov = "Ručne pomenovaný celok"
        celok.save(update_fields=["nazov"])

        profile.company_name = "Nový login názov"
        profile.save(update_fields=["company_name"])

        celok.refresh_from_db()
        assert celok.nazov == "Ručne pomenovaný celok"
