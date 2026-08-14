"""Každý cron musí po sebe nechať stopu v Udalostiach — aj keď nič neurobil.

Predtým sa zapisovali len preskočené behy (víkend/sviatok) a auto-objednávky.
Či ráno naozaj zbehol EduPage scrape alebo odišiel denný report sa dalo zistiť
jedine z logov `celery` kontajnera — tie po reštarte alebo redeployi zmiznú a
v audite vyzerá nezbehnutý cron presne ako zbehnutý: ticho.
"""

import datetime
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from api.edupage_scraper import ScrapeResult
from api.models import (
    Celok,
    EdupageConnection,
    EventLog,
    GlobalSettings,
    PushSubscription,
    UserProfile,
)
from api.tasks import (
    scrape_edupage_orders_task,
    send_daily_report_task,
    send_push_deadline_reminder_task,
    send_weekly_order_reminder_task,
)

MONDAY = datetime.date(2026, 6, 29)


def _settings(**kwargs):
    defaults = dict(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
        report_email_recipients=["report@example.com"],
    )
    defaults.update(kwargs)
    return GlobalSettings.objects.create(**defaults)


def _cron_runs(task_name: str):
    return EventLog.objects.filter(
        event_type=EventLog.EventType.CRON_RUN, payload__task=task_name
    )


@pytest.fixture
def edupage_user(db):
    user = User.objects.create_user(
        username="cronlog@example.com", email="cronlog@example.com"
    )
    profile = UserProfile.objects.create(user=user, company_name="Cron school")
    celok = profile.primary_celok()
    celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
    celok.save(update_fields=["zdroj_objednavok"])
    connection = EdupageConnection.objects.create(
        name="Cron school",
        mealsguest_url="https://school.edupage.org/menu/mealsGuest?id=TOKEN",
    )
    profile.dostupne_prevadzky().update(edupage_connection=connection)
    return user


@pytest.mark.django_db
class TestScrapeLogsItsRun:
    def test_successful_scrape_is_recorded(self, edupage_user, monkeypatch):
        _settings()
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)
        monkeypatch.setattr(
            "api.edupage_scraper.EdupageScraper.scrape",
            lambda self, url, target_date, prevadzka_matches=None: ScrapeResult(
                date=target_date, order_data={"lunch": {"menuCounts": {"A": 5}}}
            ),
        )

        scrape_edupage_orders_task.run(meal_types=["lunch"])

        log = _cron_runs("scrape_edupage_orders_task").get()
        assert log.actor_label == "cron"
        assert log.payload["dates"] == ["2026-06-29"]
        assert log.payload["scraped"] == 1
        assert log.payload["errors"] == 0
        assert "EduPage" in log.summary

    def test_failing_connection_still_records_the_run_with_its_error_count(
        self, edupage_user, monkeypatch
    ):
        """Scrape prehltne chybu jednej prevádzky a beží ďalej — nech je vidieť.

        Bez zápisu vyzerá deň, keď každé pripojenie spadlo, rovnako ako deň,
        keď nebolo čo sťahovať.
        """
        _settings()
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)

        def boom(self, url, target_date, prevadzka_matches=None):
            raise RuntimeError("EduPage nedostupné")

        monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", boom)

        scrape_edupage_orders_task.run(meal_types=["lunch"])

        log = _cron_runs("scrape_edupage_orders_task").get()
        assert log.payload["errors"] == 1
        assert log.payload["scraped"] == 0

    def test_exhausted_retries_are_recorded_as_failure_not_skip(
        self, edupage_user, monkeypatch
    ):
        """Vyčerpaný scrape nesmie splynúť s víkendovým preskočením."""
        _settings()
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)
        # Per-prevádzka chyby scrape prehltne, takže na task-level retry treba
        # zlyhať o krok skôr.
        monkeypatch.setattr(
            "api.services.edupage_connection_service.edupage_operations",
            lambda: (_ for _ in ()).throw(RuntimeError("edupage down")),
        )

        with patch.object(
            scrape_edupage_orders_task,
            "retry",
            side_effect=scrape_edupage_orders_task.MaxRetriesExceededError(),
        ):
            with pytest.raises(scrape_edupage_orders_task.MaxRetriesExceededError):
                scrape_edupage_orders_task.run(meal_types=["lunch"])

        assert EventLog.objects.filter(
            event_type=EventLog.EventType.CRON_FAILED
        ).exists()
        assert not EventLog.objects.filter(
            event_type=EventLog.EventType.CRON_SKIPPED
        ).exists()
        assert not _cron_runs("scrape_edupage_orders_task").exists()


@pytest.mark.django_db
class TestDailyReportLogsItsRun:
    def test_sent_report_is_recorded(self, monkeypatch):
        _settings()
        monkeypatch.setattr("django.core.management.call_command", lambda *a, **k: None)

        send_daily_report_task.run(meals=["lunch"], date_str="2026-06-29")

        log = _cron_runs("send_daily_report_task").get()
        assert log.payload["sent"] is True
        assert log.payload["date"] == "2026-06-29"
        assert log.payload["meals"] == ["lunch"]

    def test_disabled_report_is_recorded_too(self, monkeypatch):
        """Vypnutý report je zvonku nerozoznateľný od rozbitého cronu."""
        _settings(daily_report_enabled=False)
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)
        monkeypatch.setattr(
            "django.core.management.call_command",
            lambda *a, **k: pytest.fail("report sa nemal odoslať"),
        )

        result = send_daily_report_task.run(meals=["lunch"])

        assert result == {"skipped": True, "reason": "daily_report_disabled"}
        log = _cron_runs("send_daily_report_task").get()
        assert log.payload["sent"] is False
        assert log.payload["reason"] == "daily_report_disabled"


@pytest.mark.django_db
class TestPushRemindersLogTheirRun:
    def test_deadline_reminder_is_recorded(self, monkeypatch):
        _settings()
        user = User.objects.create_user(
            username="push@example.com", email="push@example.com"
        )
        UserProfile.objects.create(user=user, company_name="Push school")
        PushSubscription.objects.create(
            user=user, endpoint="https://example.com/ep", p256dh="k", auth="a"
        )
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)
        monkeypatch.setattr(
            "api.services.push_notification_service.PushNotificationService"
            ".send_to_user",
            staticmethod(lambda **kwargs: {"sent": 1}),
        )

        send_push_deadline_reminder_task.run(meal_types=["lunch"])

        log = _cron_runs("send_push_deadline_reminder_task").get()
        assert log.payload["sent"] == 1
        assert log.payload["meal_types"] == ["lunch"]

    def test_weekly_reminder_records_even_when_nobody_needs_it(self, monkeypatch):
        """Nulový rozposiel je výsledok, nie dôvod mlčať."""
        _settings()
        monkeypatch.setattr(timezone, "localdate", lambda: MONDAY)

        send_weekly_order_reminder_task.run()

        log = _cron_runs("send_weekly_order_reminder_task").get()
        assert log.payload["sent"] == 0


@pytest.mark.django_db
def test_every_scheduled_task_can_be_traced_in_the_audit():
    """Poistka proti tichému cronu: nová beat úloha musí vedieť zapísať beh.

    Zoznam kopíruje `_sync_*_schedule` v `api/signals.py`. Keď pribudne ďalšia
    plánovaná úloha, tento test padne a donúti doplniť aj jej zápis.
    """
    import inspect

    from api import tasks

    scheduled = {
        "scrape_edupage_orders_task",
        "send_daily_report_task",
        "send_push_deadline_reminder_task",
        "send_weekly_order_reminder_task",
        "apply_auto_orders_task",
    }
    for name in sorted(scheduled):
        source = inspect.getsource(getattr(tasks, name))
        assert "_log_cron_run" in source or "log_event(" in source, (
            f"{name} nezapisuje do Udalostí — cron bez stopy sa nedá odlíšiť "
            "od cronu, ktorý vôbec nebežal."
        )
