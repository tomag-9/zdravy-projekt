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
class TestCelokZdrojObjednavok:
    """UserProfile signál drží Celok.zdroj_objednavok v súlade s is_edupage."""

    def _profile(self, is_edupage):
        from django.contrib.auth.models import User

        from api.models import UserProfile

        user = User.objects.create_user(
            username=f"zdroj-{is_edupage}@x.sk", email=f"zdroj-{is_edupage}@x.sk"
        )
        # Auto-vytvorí celok cez signál.
        return UserProfile.objects.create(
            user=user, company_name="Zdroj Test", is_edupage=is_edupage
        )

    def test_edupage_profile_marks_celok_as_edupage(self):
        from api.models import Celok

        profile = self._profile(is_edupage=True)
        profile.refresh_from_db()
        assert profile.celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE

    def test_app_profile_marks_celok_as_app(self):
        from api.models import Celok

        profile = self._profile(is_edupage=False)
        profile.refresh_from_db()
        assert profile.celok.zdroj_objednavok == Celok.ZdrojObjednavok.APP

    def test_toggling_is_edupage_updates_celok(self):
        from api.models import Celok

        profile = self._profile(is_edupage=False)
        profile.refresh_from_db()
        celok = profile.celok
        assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.APP

        profile.is_edupage = True
        profile.save()

        celok.refresh_from_db()
        assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
