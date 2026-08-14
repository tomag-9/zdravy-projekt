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

        assert json.loads(breakfast_task.kwargs)["meal_types"] == ["breakfast"]
        assert json.loads(lunch_task.kwargs)["meal_types"] == ["lunch"]
        assert "next workday" in breakfast_task.description
        assert "today" in lunch_task.description

    def test_edupage_scrape_fires_exactly_at_the_deadline(self):
        """
        Scrape musí bežať presne v čase deadlinu — nie skôr. Import spustený
        pred deadlinom by minul objednávky zadané v zvyšných minútach a do
        kuchyne by odišli podhodnotené počty.
        """
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 30),
            deadline_olovrant=datetime.time(7, 30),
        )

        _sync_edupage_scrape_schedule(gs)

        breakfast = PeriodicTask.objects.get(name="edupage-scrape-breakfast")
        assert (breakfast.crontab.hour, breakfast.crontab.minute) == ("21", "0")

        lunch = PeriodicTask.objects.get(name="edupage-scrape-lunch-olovrant")
        assert (lunch.crontab.hour, lunch.crontab.minute) == ("7", "30")

    def test_day_before_scrape_runs_on_the_eve_sunday_to_thursday(self):
        """Deň-vopred deadline musí bežať v predvečer obsluhovaného dňa.

        Presne to je prod nastavenie: raňajky majú deadline 21:00 deň vopred a
        task importuje `_next_workday(dnes)`. S maskou Po–Pi sa pondelkové
        raňajky natiahli už v piatok o 21:00 — 48 h pred deadlinom, ktorý má
        klient v nedeľu — a v nedeľu nebežalo nič, takže víkendové objednávky
        a odhlášky sa do appky nikdy nedostali. Ranný obed/olovrant sa naopak
        týka dňa, v ktorý beží, a ostáva Po–Pi.
        """
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 30),
            deadline_lunch_is_day_before=False,
            deadline_olovrant=datetime.time(7, 30),
            deadline_olovrant_is_day_before=False,
        )

        _sync_edupage_scrape_schedule(gs)

        breakfast = PeriodicTask.objects.get(name="edupage-scrape-breakfast")
        lunch = PeriodicTask.objects.get(name="edupage-scrape-lunch-olovrant")

        assert breakfast.crontab.day_of_week == "0-4"  # Ne–Št
        assert lunch.crontab.day_of_week == "1-5"  # Po–Pi

    def test_scrape_mask_follows_the_flag_not_the_meal(self):
        """Maska visí na `is_day_before`, nie na tom, o ktoré jedlo ide."""
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(7, 0),
            deadline_breakfast_is_day_before=False,
            deadline_lunch=datetime.time(20, 0),
            deadline_lunch_is_day_before=True,
            deadline_olovrant=datetime.time(6, 0),
            deadline_olovrant_is_day_before=False,
        )

        _sync_edupage_scrape_schedule(gs)

        assert (
            PeriodicTask.objects.get(name="edupage-scrape-lunch").crontab.day_of_week
            == "0-4"
        )
        assert (
            PeriodicTask.objects.get(
                name="edupage-scrape-breakfast"
            ).crontab.day_of_week
            == "1-5"
        )

    def test_edupage_scrape_handles_deadline_near_midnight(self):
        """
        Bez offsetu už nie je čo orezávať na 00:00 — deadline tesne po polnoci
        sa prenesie 1:1.
        """
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(0, 10),
            deadline_lunch=datetime.time(0, 10),
            deadline_olovrant=datetime.time(0, 10),
        )

        _sync_edupage_scrape_schedule(gs)

        task = PeriodicTask.objects.get(name="edupage-scrape-breakfast-lunch-olovrant")
        assert (task.crontab.hour, task.crontab.minute) == ("0", "10")

    def test_daily_reports_are_chained_after_the_scrape_not_scheduled(self):
        """
        Report sa musí odoslať až po scrape, inak ide do kuchyne s počtami,
        ktoré import ešte nestihol zapísať. Časový odstup to negarantoval —
        preto report visí na scrape tasku, nie na vlastnom crontabe (#474).
        """
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
            _sync_daily_report_schedule,
            _sync_edupage_scrape_schedule,
        )

        gs = _make_settings(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
            deadline_lunch=datetime.time(7, 30),
            deadline_olovrant=datetime.time(7, 30),
            report_email_recipients=["report@example.com"],
        )

        _sync_edupage_scrape_schedule(gs)
        _sync_daily_report_schedule(gs)

        assert not PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).exists()

        breakfast_scrape = PeriodicTask.objects.get(name="edupage-scrape-breakfast")
        assert json.loads(breakfast_scrape.kwargs)["chained_reports"] == [["breakfast"]]

        lunch_scrape = PeriodicTask.objects.get(name="edupage-scrape-lunch-olovrant")
        assert json.loads(lunch_scrape.kwargs)["chained_reports"] == [
            ["breakfast", "lunch", "olovrant"]
        ]

    def test_shared_deadline_chains_both_reports_off_one_scrape(self):
        """Keď raňajky aj olovrant zdieľajú uzávierku, jeden scrape ťahá oba reporty."""
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(10, 0),
            report_email_recipients=["report@example.com"],
        )

        _sync_edupage_scrape_schedule(gs)

        task = PeriodicTask.objects.get(name="edupage-scrape-breakfast-lunch-olovrant")
        assert json.loads(task.kwargs)["chained_reports"] == [
            ["breakfast"],
            ["breakfast", "lunch", "olovrant"],
        ]

    def test_no_reports_chained_when_reports_are_off(self):
        """Vypnuté reporty (alebo prázdni príjemcovia) nesmú visieť na scrape."""
        from api.signals import _sync_edupage_scrape_schedule

        gs = _make_settings(
            deadline_breakfast=datetime.time(10, 0),
            deadline_lunch=datetime.time(10, 0),
            deadline_olovrant=datetime.time(10, 0),
            report_email_recipients=[],
        )
        _sync_edupage_scrape_schedule(gs)
        task = PeriodicTask.objects.get(name="edupage-scrape-breakfast-lunch-olovrant")
        assert json.loads(task.kwargs)["chained_reports"] == []

        gs.report_email_recipients = ["report@example.com"]
        gs.daily_report_enabled = False
        _sync_edupage_scrape_schedule(gs)
        task.refresh_from_db()
        assert json.loads(task.kwargs)["chained_reports"] == []

    def test_report_offset_wraps_around_midnight(self):
        """Deadline tesne pred polnocou posunie report do ďalšieho dňa, nie mimo rozsah.

        Vlastný crontab má report už len keď je EduPage scrape vypnutý — inak
        je zreťazený za scrape a odstup nerieši (#474).
        """
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            _sync_daily_report_schedule,
        )

        gs = _make_settings(
            deadline_olovrant=datetime.time(23, 55),
            report_email_recipients=["report@example.com"],
            edupage_auto_scrape_enabled=False,
        )

        _sync_daily_report_schedule(gs)

        task = PeriodicTask.objects.get(name=PERIODIC_TASK_NAME_REPORT_ALL)
        assert (task.crontab.hour, task.crontab.minute) == ("0", "5")

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


@pytest.mark.django_db
class TestDailyReportEnabledFlag:
    """`daily_report_enabled` switches the reports off without losing recipients.

    The standalone crontabs these exercise only exist while the EduPage
    auto-scrape is off; with it on, the reports hang off the scrape task
    instead (#474, covered in `TestStartupSync`).
    """

    def test_disabled_flag_removes_report_tasks_but_keeps_recipients(self):
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
            _sync_daily_report_schedule,
        )

        gs = _make_settings(
            report_email_recipients=["report@example.com"],
            edupage_auto_scrape_enabled=False,
        )
        _sync_daily_report_schedule(gs)
        assert (
            PeriodicTask.objects.filter(
                name__in=[
                    PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                    PERIODIC_TASK_NAME_REPORT_ALL,
                ]
            ).count()
            == 2
        )

        gs.daily_report_enabled = False
        gs.save()

        assert not PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).exists()
        gs.refresh_from_db()
        assert gs.report_email_recipients == ["report@example.com"]

    def test_re_enabling_recreates_the_tasks_from_the_kept_recipients(self):
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
            _sync_daily_report_schedule,
        )

        gs = _make_settings(
            report_email_recipients=["report@example.com"],
            daily_report_enabled=False,
            edupage_auto_scrape_enabled=False,
        )
        _sync_daily_report_schedule(gs)
        assert not PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_BREAKFAST
        ).exists()

        gs.daily_report_enabled = True
        _sync_daily_report_schedule(gs)

        assert (
            PeriodicTask.objects.filter(
                name__in=[
                    PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                    PERIODIC_TASK_NAME_REPORT_ALL,
                ]
            ).count()
            == 2
        )

    def test_clearing_recipients_also_drops_stale_tasks(self):
        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
            _sync_daily_report_schedule,
        )

        gs = _make_settings(
            report_email_recipients=["report@example.com"],
            edupage_auto_scrape_enabled=False,
        )
        _sync_daily_report_schedule(gs)

        gs.report_email_recipients = []
        _sync_daily_report_schedule(gs)

        assert not PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).exists()

    def test_scheduled_task_run_skips_when_reports_are_disabled(self):
        from api.tasks import send_daily_report_task

        _make_settings(
            report_email_recipients=["report@example.com"],
            daily_report_enabled=False,
        )

        result = send_daily_report_task()

        assert result == {"skipped": True, "reason": "daily_report_disabled"}
