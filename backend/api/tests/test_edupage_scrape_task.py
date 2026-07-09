import datetime
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import User
from django.core import management
from django.utils import timezone

from api.models import DailyOrder, GlobalSettings, UserProfile
from api.tasks import scrape_edupage_orders_task


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

    def fake_scrape(self, url, target_date):
        seen_dates.append(target_date)
        return SimpleNamespace(
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

    def fake_scrape(self, url, scrape_date):
        return SimpleNamespace(order_data={}, warnings=[], unmapped_letters=[])

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

    def fake_scrape(self, url, scrape_date):
        return SimpleNamespace(
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

    def fake_scrape(self, url, scrape_date):
        return SimpleNamespace(order_data={}, warnings=[], unmapped_letters=["Z:Z"])

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

    def fake_scrape(self, url, scrape_date):
        assert scrape_date == target_date
        return SimpleNamespace(
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
