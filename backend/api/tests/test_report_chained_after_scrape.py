"""Denný report visí na EduPage scrape, nie na časovom odstupe — issue #474.

Predtým boli scrape a report dva nezávislé crontaby oddelené 10 minútami. Odstup
nie je záruka: pomalý alebo retryujúci scrape znamenal, že report odišiel s
počtami, ktoré import ešte nezapísal — a nikde sa to neprejavilo.
"""

import datetime
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core import mail
from django.utils import timezone

from api.edupage_scraper import ScrapeResult
from api.models import Celok, EdupageConnection, EventLog, GlobalSettings, UserProfile
from api.tasks import scrape_edupage_orders_task


@pytest.fixture
def edupage_user(db):
    user = User.objects.create_user(
        username="chain@example.com", email="chain@example.com"
    )
    profile = UserProfile.objects.create(user=user, company_name="Chain school")
    celok = profile.primary_celok()
    celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
    celok.save(update_fields=["zdroj_objednavok"])
    connection = EdupageConnection.objects.create(
        name="Chain school",
        mealsguest_url="https://school.edupage.org/menu/mealsGuest?id=TOKEN",
    )
    profile.dostupne_prevadzky().update(edupage_connection=connection)
    return user


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


def _stub_scrape(monkeypatch):
    def fake_scrape(self, url, target_date, prevadzka_matches=None, allowed_diets=None):
        return ScrapeResult(
            date=target_date,
            order_data={"lunch": {"menuCounts": {"A": 5}}},
            warnings=[],
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)


@pytest.mark.django_db
class TestChainedReportDispatch:
    def test_report_is_queued_for_the_date_the_scrape_imported(
        self, edupage_user, monkeypatch
    ):
        """Report ide na deň, ktorý scrape reálne importoval — nie na včerajšok."""
        _settings(deadline_breakfast=datetime.time(18, 0))
        _stub_scrape(monkeypatch)
        monkeypatch.setattr(timezone, "localdate", lambda: datetime.date(2026, 6, 29))

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            result = scrape_edupage_orders_task.run(
                meal_types=["lunch"], chained_reports=[["breakfast", "lunch"]]
            )

        # `dates` nesie aj predbežný Menu B/C scrape 1-2 dni vopred (#fb118d2)
        # — ale ten sa chainovaný report netýka, ten čaká na plný scrape dňa.
        assert result["dates"] == ["2026-06-29", "2026-06-30", "2026-07-01"]
        apply_async.assert_called_once_with(
            kwargs={
                "meals": ["breakfast", "lunch"],
                "date_str": "2026-06-29",
                "scrape_failed": False,
            }
        )

    def test_day_before_deadline_reports_the_scraped_next_workday(
        self, edupage_user, monkeypatch
    ):
        """Pri uzávierke deň vopred sedí report na zajtrajší (importovaný) deň."""
        _settings(
            deadline_breakfast=datetime.time(21, 0),
            deadline_breakfast_is_day_before=True,
        )
        _stub_scrape(monkeypatch)
        monkeypatch.setattr(
            timezone,
            "localdate",
            lambda: datetime.date(2026, 6, 29),  # Monday
        )

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            scrape_edupage_orders_task.run(
                meal_types=["breakfast"], chained_reports=[["breakfast"]]
            )

        apply_async.assert_called_once_with(
            kwargs={
                "meals": ["breakfast"],
                "date_str": "2026-06-30",
                "scrape_failed": False,
            }
        )

    def test_two_chained_reports_both_go_out(self, edupage_user, monkeypatch):
        _settings()
        _stub_scrape(monkeypatch)
        monkeypatch.setattr(timezone, "localdate", lambda: datetime.date(2026, 6, 29))

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            scrape_edupage_orders_task.run(
                meal_types=["lunch"],
                chained_reports=[["breakfast"], ["breakfast", "lunch", "olovrant"]],
            )

        assert apply_async.call_count == 2

    def test_no_report_without_chaining_configured(self, edupage_user, monkeypatch):
        _settings()
        _stub_scrape(monkeypatch)

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            scrape_edupage_orders_task.run(meal_types=["lunch"])

        apply_async.assert_not_called()

    def test_skipped_run_does_not_send_a_report(self, edupage_user, monkeypatch):
        """Víkend/sviatok — scrape sa preskočí, report nemá čo hlásiť."""
        _settings()
        _stub_scrape(monkeypatch)
        monkeypatch.setattr(
            "api.tasks._cron_skip_check", lambda name, check_date=None: "weekend"
        )

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            result = scrape_edupage_orders_task.run(
                meal_types=["lunch"], chained_reports=[["lunch"]]
            )

        assert result["skipped_run"] is True
        apply_async.assert_not_called()


@pytest.mark.django_db
class TestScrapeGiveUp:
    """Keď scrape vyčerpá retries, report neodíde ticho ako v bežný deň."""

    def test_exhausted_scrape_sends_a_flagged_report_and_logs_it(
        self, edupage_user, monkeypatch
    ):
        _settings()
        monkeypatch.setattr(timezone, "localdate", lambda: datetime.date(2026, 6, 29))

        def blow_up(self, url, target_date, prevadzka_matches=None, allowed_diets=None):
            raise RuntimeError("edupage down")

        monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", blow_up)
        # The scraper's own except-continue swallows per-operation errors, so
        # fail one step earlier to reach the task-level retry path.
        monkeypatch.setattr(
            "api.services.edupage_connection_service.edupage_operations",
            lambda: (_ for _ in ()).throw(RuntimeError("edupage down")),
        )

        with patch("api.tasks.send_daily_report_task.apply_async") as apply_async:
            with patch.object(
                scrape_edupage_orders_task,
                "retry",
                side_effect=scrape_edupage_orders_task.MaxRetriesExceededError(),
            ):
                with pytest.raises(scrape_edupage_orders_task.MaxRetriesExceededError):
                    scrape_edupage_orders_task.run(
                        meal_types=["lunch"], chained_reports=[["lunch"]]
                    )

        apply_async.assert_called_once_with(
            kwargs={
                "meals": ["lunch"],
                "date_str": "2026-06-29",
                "scrape_failed": True,
            }
        )

        # Vyčerpaný scrape je zlyhanie, nie preskočený víkend — v audite sa
        # tie dve veci nesmú miešať.
        event = EventLog.objects.get(event_type=EventLog.EventType.CRON_FAILED)
        assert event.payload["task"] == "scrape_edupage_orders_task"
        assert event.payload["dates"] == ["2026-06-29"]
        assert not EventLog.objects.filter(
            event_type=EventLog.EventType.CRON_SKIPPED
        ).exists()


@pytest.mark.django_db
class TestStaleDataWarning:
    def test_flagged_report_email_says_the_counts_may_not_be_final(self):
        from api.email_utils import send_daily_report_email

        send_daily_report_email(
            recipients=["report@example.com"],
            report_date="2026-06-29",
            attachment_bytes=b"xlsx",
            attachment_filename="prehlad.xlsx",
            meals=["lunch"],
            data_may_be_stale=True,
        )

        message = mail.outbox[-1]
        assert "[NEÚPLNÉ DÁTA]" in message.subject
        assert "zlyhal" in message.body

    def test_normal_report_email_carries_no_warning(self):
        from api.email_utils import send_daily_report_email

        send_daily_report_email(
            recipients=["report@example.com"],
            report_date="2026-06-29",
            attachment_bytes=b"xlsx",
            attachment_filename="prehlad.xlsx",
            meals=["lunch"],
        )

        message = mail.outbox[-1]
        assert "NEÚPLNÉ" not in message.subject
        assert "UPOZORNENIE" not in message.body
