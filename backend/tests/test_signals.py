"""
Tests for api/signals.py

Verifies that saving GlobalSettings creates/updates the Celery Beat
PeriodicTasks for auto-orders — one per group of meals sharing a deadline
(#548), the same grouping push reminders use.
"""

import datetime
import json

import pytest
from django_celery_beat.models import PeriodicTask

from api.models import GlobalSettings
from api.signals import AUTO_ORDER_TASK_PREFIX, _auto_order_task_name


@pytest.mark.django_db
class TestAutoOrderScheduleSync:
    def test_creates_one_periodic_task_per_deadline_group(self):
        """Three distinct deadlines → three separate auto-order tasks."""
        assert not PeriodicTask.objects.filter(
            name__startswith=AUTO_ORDER_TASK_PREFIX
        ).exists()

        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        tasks = list(
            PeriodicTask.objects.filter(name__startswith=AUTO_ORDER_TASK_PREFIX)
        )
        assert len(tasks) == 3
        for task in tasks:
            assert task.task == "api.tasks.apply_auto_orders_task"
            assert task.enabled is True

    def test_shared_deadline_creates_one_grouped_task(self):
        """Lunch and olovrant sharing a deadline → one combined task."""
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 35),
            deadline_olovrant=datetime.time(7, 35),
        )

        assert (
            PeriodicTask.objects.filter(name__startswith=AUTO_ORDER_TASK_PREFIX).count()
            == 2
        )
        grouped = PeriodicTask.objects.get(
            name=_auto_order_task_name(["lunch", "olovrant"])
        )
        assert sorted(json.loads(grouped.args)[1]) == ["lunch", "olovrant"]

    def test_task_fires_exactly_at_its_own_group_deadline(self):
        """Each group's crontab is the deadline itself, not a max() across all
        three (that used to always pick the latest raw clock time regardless
        of which day it actually belonged to)."""
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 35),
            deadline_olovrant=datetime.time(7, 35),
        )

        breakfast = PeriodicTask.objects.get(name=_auto_order_task_name(["breakfast"]))
        lunch_olovrant = PeriodicTask.objects.get(
            name=_auto_order_task_name(["lunch", "olovrant"])
        )
        assert (breakfast.crontab.hour, breakfast.crontab.minute) == ("21", "0")
        assert (lunch_olovrant.crontab.hour, lunch_olovrant.crontab.minute) == (
            "7",
            "35",
        )

    def test_updates_periodic_task_when_deadline_changes(self):
        """Updating GlobalSettings reschedules the affected group's task."""
        settings = GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )

        settings.deadline_lunch = datetime.time(11, 30)
        settings.save()

        task = PeriodicTask.objects.get(name=_auto_order_task_name(["lunch"]))
        assert task.crontab.hour == "11"
        assert task.crontab.minute == "30"

    def test_orphaned_tasks_deleted_when_groups_merge(self):
        """When two previously separate deadlines merge, the old tasks are
        deleted so no stale run survives on the old (now wrong) time."""
        settings = GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(8, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(9, 0),
        )
        assert (
            PeriodicTask.objects.filter(name__startswith=AUTO_ORDER_TASK_PREFIX).count()
            == 3
        )

        settings.deadline_lunch = datetime.time(9, 0)
        settings.save()

        tasks = list(
            PeriodicTask.objects.filter(name__startswith=AUTO_ORDER_TASK_PREFIX)
        )
        assert len(tasks) == 2
        assert not PeriodicTask.objects.filter(
            name=_auto_order_task_name(["lunch"])
        ).exists()
        assert PeriodicTask.objects.filter(
            name=_auto_order_task_name(["lunch", "olovrant"])
        ).exists()

    def test_day_before_group_runs_on_the_eve_same_day_group_runs_on_the_day(self):
        """Raňajky (deň vopred): Ne–Št. Obed/olovrant (v deň podávania): Po–Pi.

        S jedinou spoločnou maskou Ne–Št (pôvodné správanie pre všetky tri)
        by obed/olovrant beh v sobotu vôbec nenabehol napriek tomu, že v deň
        podávania (pracovný deň) mal.
        """
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 35),
            deadline_lunch_is_day_before=False,
            deadline_olovrant=datetime.time(7, 35),
            deadline_olovrant_is_day_before=False,
        )

        breakfast = PeriodicTask.objects.get(name=_auto_order_task_name(["breakfast"]))
        lunch_olovrant = PeriodicTask.objects.get(
            name=_auto_order_task_name(["lunch", "olovrant"])
        )
        assert breakfast.crontab.day_of_week == "0-4"  # Ne–Št
        assert lunch_olovrant.crontab.day_of_week == "1-5"  # Po–Pi

    def test_same_day_kwarg_reflects_is_day_before(self):
        """`same_day` v kwargs úlohy hovorí `apply_auto_orders_task`, či má
        dopĺňať dnešok (uzávierka v deň podávania) alebo zajtrajšok (uzávierka
        deň vopred) — bez toho by obed/olovrant beh ráno dopĺňal zajtrajšok
        namiesto dňa, ktorého uzávierka práve pominula."""
        GlobalSettings.objects.create(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 35),
            deadline_lunch_is_day_before=False,
            deadline_olovrant=datetime.time(7, 35),
            deadline_olovrant_is_day_before=False,
        )

        breakfast = PeriodicTask.objects.get(name=_auto_order_task_name(["breakfast"]))
        lunch_olovrant = PeriodicTask.objects.get(
            name=_auto_order_task_name(["lunch", "olovrant"])
        )
        assert json.loads(breakfast.kwargs) == {"same_day": False}
        assert json.loads(lunch_olovrant.kwargs) == {"same_day": True}


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
