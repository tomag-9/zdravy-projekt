import datetime
import json

import pytest
from django.contrib.auth.models import User
from django.core import management
from django.utils import timezone
from django_celery_beat.models import PeriodicTask

from api.edupage_scraper import ScrapeResult
from api.models import DailyOrder, GlobalSettings, UserProfile
from api.signals import (
    EDUPAGE_MORNING_SCRAPE_HOUR,
    EDUPAGE_SCRAPE_TASK_PREFIX,
    _sync_edupage_scrape_schedule,
)
from api.tasks import scrape_edupage_orders_task


def _scrape_result(order_data=None, **kwargs) -> ScrapeResult:
    """Reálny ScrapeResult, nie SimpleNamespace.

    Nové polia tak dostanú defaulty automaticky a testy nepadnú vždy, keď scraper
    pridá atribút.
    """
    return ScrapeResult(
        date=datetime.date(2026, 1, 1), order_data=order_data or {}, **kwargs
    )


@pytest.fixture
def edupage_user(db):
    user = User.objects.create_user(
        username="edupage@example.com",
        email="edupage@example.com",
    )
    UserProfile.objects.create(
        user=user,
        company_name="Edupage school",
        is_edupage=True,
        mealsguest_url="https://school.edupage.org/menu/mealsGuest?id=TOKEN",
    )
    return user


@pytest.mark.django_db
def test_edupage_scrape_uses_next_workday_for_day_before_meal(
    edupage_user, monkeypatch
):
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_breakfast_is_day_before=True,
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    today = datetime.date(2026, 6, 29)  # Monday
    seen_dates = []

    def fake_scrape(self, url, target_date, prevadzka_matches=None):
        seen_dates.append(target_date)
        return _scrape_result(
            order_data={
                "breakfast": {
                    "menuCounts": {"A": 4},
                    "diets": {"NO MILK": 4},
                },
                "lunch": {
                    "menuCounts": {"A": 10},
                    "diets": {"NO GLUTEN": 10},
                },
            },
            warnings=[],
        )

    monkeypatch.setattr(timezone, "localdate", lambda: today)
    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)

    result = scrape_edupage_orders_task.run(meal_types=["breakfast"])

    tomorrow = datetime.date(2026, 6, 30)
    assert result["dates"] == [str(tomorrow)]
    assert seen_dates == [tomorrow]
    order = DailyOrder.objects.get(user=edupage_user, date=tomorrow)
    assert order.data == {
        "breakfast": {
            "Edupage school": {"menuCounts": {"A": 4}, "diets": {"NO MILK": 4}}
        }
    }


@pytest.mark.django_db
def test_edupage_scrape_persists_attention_flags(edupage_user, monkeypatch):
    """Upozornenia scrapu sa uložia do DailyOrder.scrape_flags a pri čistom
    behu sa vyčistia, nech admin prehľad nezobrazuje starý výkričník."""
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)

    def flagged_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(
            order_data={"lunch": {"menuCounts": {"A": 5}}},
            warnings=[],
            attention=["A:KZ?"],
            config_notes=["olovrant chýba"],
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", flagged_scrape)
    scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    order = DailyOrder.objects.get(user=edupage_user, date=target_date)
    assert order.scrape_flags == {
        "attention": ["A:KZ?"],
        "config_notes": ["olovrant chýba"],
    }

    def clean_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(
            order_data={"lunch": {"menuCounts": {"A": 5}}}, warnings=[]
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", clean_scrape)
    scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    order.refresh_from_db()
    assert order.scrape_flags == {"attention": [], "config_notes": []}


@pytest.mark.django_db
def test_edupage_scrape_splits_attention_flags_per_prevadzka(monkeypatch):
    """Pri rozdelenom celku dostane každá prevádzka len svoje flagy;
    config_notes sú zdieľané (celok-wide)."""
    from api.models import Celok, Prevadzka

    celok = Celok.objects.create(nazov="Jolly")
    p1 = Prevadzka.objects.create(celok=celok, nazov="Jolly 1", edupage_match="J1")
    p2 = Prevadzka.objects.create(celok=celok, nazov="Jolly 2", edupage_match="J2")
    user = User.objects.create_user(username="jolly@x.sk", email="jolly@x.sk")
    UserProfile.objects.create(
        user=user,
        company_name="Jolly",
        is_edupage=True,
        celok=celok,
        mealsguest_url="https://jolly.edupage.org/menu/mealsGuest?id=T",
    )
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)

    def fake_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(
            order_data={"lunch": {"menuCounts": {"A": 8}}},
            order_data_by_prevadzka={
                "Jolly 1": {"lunch": {"menuCounts": {"A": 5}}},
                "Jolly 2": {"lunch": {"menuCounts": {"A": 3}}},
            },
            attention=["A:ZD?"],
            attention_by_prevadzka={"Jolly 1": ["A:ZD?"]},
            config_notes=["olovrant chýba"],
            warnings=[],
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)
    scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    o1 = DailyOrder.objects.get(prevadzka=p1, date=target_date)
    o2 = DailyOrder.objects.get(prevadzka=p2, date=target_date)
    assert o1.scrape_flags == {
        "attention": ["A:ZD?"],
        "config_notes": ["olovrant chýba"],
    }
    # Jolly 2 nemá flag, ale zdieľané config_notes áno.
    assert o2.scrape_flags == {"attention": [], "config_notes": ["olovrant chýba"]}


@pytest.mark.django_db
def test_edupage_scrape_task_skips_automatic_run_when_disabled(
    edupage_user, monkeypatch
):
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
        edupage_auto_scrape_enabled=False,
    )

    def fail_scrape(self, url, target_date):
        raise AssertionError("Automatic EduPage scrape should not run")

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fail_scrape)

    result = scrape_edupage_orders_task.run(meal_types=["breakfast"])

    assert result["disabled"] is True
    assert result["scraped"] == 0
    assert result["dates"] == []
    assert not DailyOrder.objects.filter(user=edupage_user).exists()


@pytest.mark.django_db
def test_edupage_scrape_records_explicit_zero_when_structurally_empty(
    edupage_user, monkeypatch
):
    """A structurally successful scrape (no warnings) with zero counts must
    still create a DailyOrder row, so the day isn't indistinguishable from
    "never scraped" (which would block auto-orders and admin reporting)."""
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)

    def fake_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(order_data={}, warnings=[], unmapped_letters=[])

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)

    result = scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    order = DailyOrder.objects.get(user=edupage_user, date=target_date)
    assert order.data == {}
    assert result["scraped"] == 1
    assert result["skipped"] == 0

    # Idempotent: running again for the same day must not error or duplicate.
    result2 = scrape_edupage_orders_task.run(date_str=target_date.isoformat())
    assert DailyOrder.objects.filter(user=edupage_user, date=target_date).count() == 1
    assert result2["scraped"] == 1


@pytest.mark.django_db
def test_edupage_scrape_skips_without_recording_on_real_scrape_failure(
    edupage_user, monkeypatch
):
    """A scrape failure (prehlad block missing/malformed) must NOT create a
    fabricated zero-order row - that would hide a real scraping problem."""
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)

    def fake_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(
            order_data={},
            warnings=["prehlad block not found in HTML"],
            unmapped_letters=[],
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)

    result = scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    assert not DailyOrder.objects.filter(user=edupage_user, date=target_date).exists()
    assert result["scraped"] == 0
    assert result["skipped"] == 1


@pytest.mark.django_db
def test_sync_edupage_scrape_schedule_creates_and_keeps_morning_task():
    settings_instance = GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(21, 0),
        deadline_olovrant=datetime.time(10, 0),
        edupage_auto_scrape_enabled=True,
    )

    _sync_edupage_scrape_schedule(settings_instance)

    morning_name = f"{EDUPAGE_SCRAPE_TASK_PREFIX}morning"
    morning_task = PeriodicTask.objects.get(name=morning_name)
    assert morning_task.task == "api.tasks.scrape_edupage_orders_task"
    # Olovrant má uzávierku 10:00 > 08:00, raňajky/obed 18:00/21:00 — všetky stíhame.
    assert json.loads(morning_task.kwargs) == {
        "meal_types": ["breakfast", "lunch", "olovrant"]
    }
    assert morning_task.enabled is True
    assert morning_task.crontab.minute == "0"
    assert morning_task.crontab.hour == str(EDUPAGE_MORNING_SCRAPE_HOUR)
    assert morning_task.crontab.day_of_week == "1-5"
    assert morning_task.crontab.day_of_month == "*"
    assert morning_task.crontab.month_of_year == "*"

    _sync_edupage_scrape_schedule(settings_instance)

    assert PeriodicTask.objects.filter(name=morning_name).count() == 1


@pytest.mark.django_db
def test_morning_scrape_only_covers_meals_whose_deadline_has_not_passed():
    """Chod s uzávierkou pred ranným behom sa scrapovať nesmie."""
    settings_instance = GlobalSettings.objects.create(
        pk=1,
        # 07:00 je pred ranným behom (08:00) → raňajky vypadnú
        deadline_breakfast=datetime.time(7, 0),
        deadline_lunch=datetime.time(21, 0),
        # deň vopred → objednávka na dnešok sa zavrela už včera → vypadne
        deadline_olovrant=datetime.time(21, 0),
        deadline_olovrant_is_day_before=True,
        edupage_auto_scrape_enabled=True,
    )

    _sync_edupage_scrape_schedule(settings_instance)

    morning_task = PeriodicTask.objects.get(name=f"{EDUPAGE_SCRAPE_TASK_PREFIX}morning")
    assert json.loads(morning_task.kwargs) == {"meal_types": ["lunch"]}


@pytest.mark.django_db
def test_morning_scrape_task_not_created_when_all_deadlines_are_earlier():
    """Ak žiadny chod nestíha, ranný task nesmie vôbec vzniknúť."""
    settings_instance = GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(6, 0),
        deadline_lunch=datetime.time(7, 30),
        deadline_olovrant=datetime.time(8, 0),  # presne 08:00 = už neskoro
        edupage_auto_scrape_enabled=True,
    )

    _sync_edupage_scrape_schedule(settings_instance)

    assert not PeriodicTask.objects.filter(
        name=f"{EDUPAGE_SCRAPE_TASK_PREFIX}morning"
    ).exists()


@pytest.mark.django_db
def test_morning_scrape_task_is_removed_when_deadline_moves_earlier():
    """Existujúci ranný task musí zmiznúť, keď sa uzávierka posunie pred 08:00."""
    settings_instance = GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(10, 0),
        deadline_lunch=datetime.time(10, 0),
        deadline_olovrant=datetime.time(10, 0),
        edupage_auto_scrape_enabled=True,
    )
    _sync_edupage_scrape_schedule(settings_instance)
    morning_name = f"{EDUPAGE_SCRAPE_TASK_PREFIX}morning"
    assert PeriodicTask.objects.filter(name=morning_name).exists()

    settings_instance.deadline_breakfast = datetime.time(6, 0)
    settings_instance.deadline_lunch = datetime.time(6, 0)
    settings_instance.deadline_olovrant = datetime.time(6, 0)
    _sync_edupage_scrape_schedule(settings_instance)

    assert not PeriodicTask.objects.filter(name=morning_name).exists()


@pytest.mark.django_db
def test_edupage_scrape_skips_without_recording_on_unmapped_letters(
    edupage_user, monkeypatch
):
    """Unmapped diet/menu letters are a real data-mapping failure, not a
    genuine zero - even though _parse reports them via unmapped_letters
    rather than warnings, they must not be recorded as a confirmed zero."""
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)

    def fake_scrape(self, url, scrape_date, prevadzka_matches=None):
        return _scrape_result(order_data={}, warnings=[], unmapped_letters=["Z:Z"])

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)

    result = scrape_edupage_orders_task.run(date_str=target_date.isoformat())

    assert not DailyOrder.objects.filter(user=edupage_user, date=target_date).exists()
    assert result["scraped"] == 0
    assert result["skipped"] == 1


@pytest.mark.django_db
def test_edupage_scrape_merges_requested_meals_without_replacing_existing_day(
    edupage_user, monkeypatch
):
    GlobalSettings.objects.create(
        pk=1,
        deadline_breakfast=datetime.time(18, 0),
        deadline_lunch=datetime.time(9, 0),
        deadline_olovrant=datetime.time(10, 0),
    )
    target_date = datetime.date(2026, 6, 30)
    DailyOrder.objects.create(
        user=edupage_user,
        date=target_date,
        data={
            "breakfast": {
                "Edupage school": {
                    "menuCounts": {"A": 4},
                    "diets": {"NO MILK": 4},
                }
            }
        },
    )

    def fake_scrape(self, url, scrape_date, prevadzka_matches=None):
        assert scrape_date == target_date
        return _scrape_result(
            order_data={
                "lunch": {
                    "menuCounts": {"A": 10},
                    "diets": {"NO GLUTEN": 10},
                },
                "olovrant": {
                    "menuCounts": {"A": 2},
                    "diets": {"NO EGG": 2},
                },
            },
            warnings=[],
        )

    monkeypatch.setattr("api.edupage_scraper.EdupageScraper.scrape", fake_scrape)

    scrape_edupage_orders_task.run(
        date_str=target_date.isoformat(), meal_types=["lunch"]
    )

    order = DailyOrder.objects.get(user=edupage_user, date=target_date)
    assert order.data == {
        "breakfast": {
            "Edupage school": {"menuCounts": {"A": 4}, "diets": {"NO MILK": 4}}
        },
        "lunch": {
            "Edupage school": {"menuCounts": {"A": 10}, "diets": {"NO GLUTEN": 10}}
        },
    }


def test_scrape_edupage_orders_management_command(monkeypatch, capsys):
    calls = []

    def fake_run(date_str=None, meal_types=None):
        calls.append({"date_str": date_str, "meal_types": meal_types})
        return {
            "scraped": 2,
            "errors": 0,
            "skipped": 1,
            "dates": ["2026-06-30"],
            "meal_types": meal_types,
        }

    monkeypatch.setattr(scrape_edupage_orders_task, "run", fake_run)

    management.call_command(
        "scrape_edupage_orders",
        "--date",
        "2026-06-30",
        "--meal",
        "breakfast",
        "--meal",
        "lunch",
    )

    assert calls == [{"date_str": "2026-06-30", "meal_types": ["breakfast", "lunch"]}]
    assert (
        "EduPage scrape complete: scraped=2 skipped=1 errors=0"
        in capsys.readouterr().out
    )


class TestApplyScrapeIdempotency:
    """Scrape v rámci dňa musí byť UPDATE, nie ADD."""

    def test_rescrape_replaces_not_adds(self):
        from api.tasks import _apply_scrape

        existing = {"lunch": {"Škôlka": {"menuCounts": {"A": 21}}}}
        # rovnaký scrape 2x nesmie zdvojiť
        out = _apply_scrape(
            existing, {"lunch": {"Škôlka": {"menuCounts": {"A": 21}}}}, ["lunch"]
        )
        out = _apply_scrape(
            out, {"lunch": {"Škôlka": {"menuCounts": {"A": 21}}}}, ["lunch"]
        )
        assert out["lunch"]["Škôlka"]["menuCounts"]["A"] == 21

    def test_meal_dropped_to_zero_is_cleared(self):
        from api.tasks import _apply_scrape

        existing = {
            "lunch": {"Škôlka": {"menuCounts": {"A": 21}}},
            "olovrant": {"Škôlka": {"menuCounts": {"A": 5}}},
        }
        # olovrant dnes 0 → musí zmiznúť, nie ostať na 5
        out = _apply_scrape(
            existing,
            {"lunch": {"Škôlka": {"menuCounts": {"A": 20}}}},
            ["lunch", "olovrant"],
        )
        assert out["lunch"]["Škôlka"]["menuCounts"]["A"] == 20
        assert "olovrant" not in out

    def test_unrequested_meal_untouched(self):
        from api.tasks import _apply_scrape

        existing = {"olovrant": {"Škôlka": {"menuCounts": {"A": 5}}}}
        out = _apply_scrape(
            existing, {"lunch": {"Škôlka": {"menuCounts": {"A": 3}}}}, ["lunch"]
        )
        assert out["olovrant"]["Škôlka"]["menuCounts"]["A"] == 5

    def test_none_requested_means_all_meals(self):
        from api.tasks import _apply_scrape

        existing = {"breakfast": {"Škôlka": {"menuCounts": {"A": 9}}}}
        out = _apply_scrape(existing, {}, None)
        assert out == {}
