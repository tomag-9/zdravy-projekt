"""Unit tests for OrderService."""

import datetime
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from api.models import DailyOrder
from api.services import OrderService

# ---------------------------------------------------------------------------
# next_workdays
# ---------------------------------------------------------------------------


class TestNextWorkdays:
    def test_starts_on_monday_returns_mon_to_fri(self):
        monday = datetime.date(2025, 1, 6)
        result = OrderService.next_workdays(monday, 5)
        assert result == [
            datetime.date(2025, 1, 6),
            datetime.date(2025, 1, 7),
            datetime.date(2025, 1, 8),
            datetime.date(2025, 1, 9),
            datetime.date(2025, 1, 10),
        ]

    def test_starts_on_friday_spans_into_next_week(self):
        friday = datetime.date(2025, 1, 10)
        result = OrderService.next_workdays(friday, 5)
        assert result[0] == datetime.date(2025, 1, 10)
        assert result[1] == datetime.date(2025, 1, 13)  # skip Sat/Sun
        assert len(result) == 5

    def test_starts_on_saturday_first_day_is_monday(self):
        saturday = datetime.date(2025, 1, 11)
        result = OrderService.next_workdays(saturday, 3)
        assert result[0] == datetime.date(2025, 1, 13)

    def test_custom_count(self):
        monday = datetime.date(2025, 1, 6)
        assert len(OrderService.next_workdays(monday, 1)) == 1
        assert len(OrderService.next_workdays(monday, 10)) == 10


# ---------------------------------------------------------------------------
# order_total
# ---------------------------------------------------------------------------


class TestOrderTotal:
    def test_empty_data_returns_zeros(self):
        total, meal_count = OrderService.order_total({})
        assert total == 0
        assert meal_count == {"breakfast": 0, "lunch": 0, "olovrant": 0}

    def test_flat_shape(self):
        data = {
            "breakfast": {"menuCounts": {"A": 2}},
            "lunch": {"menuCounts": {"B": 3}},
            "olovrant": {"menuCounts": {}},
        }
        total, meal_count = OrderService.order_total(data)
        assert total == 5
        assert meal_count == {"breakfast": 2, "lunch": 3, "olovrant": 0}

    def test_category_nested_shape(self):
        data = {
            "breakfast": {"Dospelý": {"menuCounts": {"A": 1}}},
            "lunch": {
                "Dospelý": {"menuCounts": {"B": 4}},
                "Dieťa": {"menuCounts": {"C": 1}},
            },
            "olovrant": {},
        }
        total, meal_count = OrderService.order_total(data)
        assert total == 6
        assert meal_count["lunch"] == 5

    def test_none_counts_treated_as_zero(self):
        data = {"lunch": {"menuCounts": {"A": None, "B": 0}}}
        total, _ = OrderService.order_total(data)
        assert total == 0

    def test_non_dict_value_in_category_is_skipped(self):
        # If a category value is not a dict, it should not crash
        data = {"lunch": {"cat1": "invalid"}}
        total, _ = OrderService.order_total(data)
        assert total == 0


# ---------------------------------------------------------------------------
# get_planned_orders
# ---------------------------------------------------------------------------


MONDAY = datetime.date(2025, 1, 6)


@pytest.mark.django_db
class TestGetPlannedOrders:
    def _make_user(self, email="plan@example.com"):
        from api.models import UserProfile

        user = User.objects.create_user(username=email, email=email, password="pw")
        UserProfile.objects.get_or_create(user=user, defaults={"company_name": email})
        return user

    def _make_order(self, user, date, data):
        return DailyOrder.objects.create(
            user=user, date=date, data=data, status="submitted"
        )

    NON_EMPTY = {
        "breakfast": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
        "lunch": {},
        "olovrant": {},
    }

    @patch("api.services.order_service.timezone")
    def test_no_existing_orders_no_template_all_zeros(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user = self._make_user()
        result = OrderService.get_planned_orders(user, [])

        assert len(result) == 5
        for day in result:
            assert day["exists"] is False
            assert day["predictedTotal"] == 0

    @patch("api.services.order_service.timezone")
    def test_existing_order_reflected_in_result(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user = self._make_user()
        self._make_order(user, MONDAY, self.NON_EMPTY)

        result = OrderService.get_planned_orders(user, [])

        monday_result = next(r for r in result if r["date"] == str(MONDAY))
        assert monday_result["exists"] is True
        assert monday_result["totalPortions"] == 1

    @patch("api.services.order_service.timezone")
    def test_historical_template_used_for_prediction(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user = self._make_user()
        # Historical order one day before the planned window
        historical_date = datetime.date(2025, 1, 5)  # Sunday – still stored
        self._make_order(user, historical_date, self.NON_EMPTY)

        result = OrderService.get_planned_orders(user, [])

        monday_result = next(r for r in result if r["date"] == str(MONDAY))
        assert monday_result["exists"] is False
        assert monday_result["predictedTotal"] == 1
        assert (
            monday_result["predictedData"]["breakfast"]["Dospelý"]["menuCounts"]["A"]
            == 1
        )

    @patch("api.services.order_service.timezone")
    def test_visible_meals_filter_prediction(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user = self._make_user()
        template_data = {
            "breakfast": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}},
            "lunch": {"Dospelý": {"menuCounts": {"B": 3}, "diets": {}}},
            "olovrant": {},
        }
        historical_date = datetime.date(2025, 1, 5)
        self._make_order(user, historical_date, template_data)

        # Only breakfast is visible
        result = OrderService.get_planned_orders(user, ["breakfast"])

        monday_result = next(r for r in result if r["date"] == str(MONDAY))
        # lunch and olovrant are suppressed
        assert monday_result["predictedTotal"] == 2
        assert monday_result["predictedMealCount"]["lunch"] == 0

    @patch("api.services.order_service.timezone")
    def test_result_has_five_entries(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user = self._make_user()
        result = OrderService.get_planned_orders(user, [])
        assert len(result) == 5


# ---------------------------------------------------------------------------
# Celok s viacerými prevádzkami — deň je súčet, nie jedna z objednávok
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPlannedOrdersAcrossPrevadzky:
    """Objednávka patrí prevádzke, takže deň musí zahrnúť všetky prevádzky."""

    def _celok_user(self, email="viac@example.com", pocet=2):
        from api.models import Celok, Prevadzka, ProfileCelokAccess, UserProfile

        celok = Celok.objects.create(nazov="Celok s viac prevádzkami")
        prevadzky = [
            Prevadzka.objects.create(celok=celok, nazov=f"Prevádzka {i}", sort_order=i)
            for i in range(1, pocet + 1)
        ]
        user = User.objects.create_user(username=email, email=email, password="pw")
        profile = UserProfile(user=user, company_name=email)
        profile._skip_default_facility = True
        profile.save()
        ProfileCelokAccess.objects.create(profile=profile, celok=celok)
        return user, prevadzky

    @staticmethod
    def _data(count):
        return {
            "breakfast": {"Dospelý": {"menuCounts": {"A": count}, "diets": {}}},
            "lunch": {},
            "olovrant": {},
        }

    @patch("api.services.order_service.timezone")
    def test_day_sums_every_prevadzka(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user, prevadzky = self._celok_user()
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[0],
            date=MONDAY,
            data=self._data(2),
            status="submitted",
        )
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[1],
            date=MONDAY,
            data=self._data(3),
            status="submitted",
        )

        result = OrderService.get_planned_orders(user, [])

        monday = next(r for r in result if r["date"] == str(MONDAY))
        assert monday["exists"] is True
        # Predtým tu vyhrala posledná objednávka (3) a zvyšok sa stratil.
        assert monday["totalPortions"] == 5
        assert monday["mealCount"]["breakfast"] == 5

    @patch("api.services.order_service.timezone")
    def test_prediction_covers_every_prevadzka(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user, prevadzky = self._celok_user()
        historical = datetime.date(2025, 1, 5)
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[0],
            date=historical,
            data=self._data(2),
            status="submitted",
        )
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[1],
            date=historical,
            data=self._data(3),
            status="submitted",
        )

        result = OrderService.get_planned_orders(user, [])

        monday = next(r for r in result if r["date"] == str(MONDAY))
        assert monday["exists"] is False
        # Auto-objednávka vytvorí obom prevádzkam, odhad to musí ukázať tiež.
        assert monday["predictedTotal"] == 5
        assert monday["predictedData"]["breakfast"]["Dospelý"]["menuCounts"]["A"] == 5

    @patch("api.services.order_service.timezone")
    def test_day_is_auto_only_when_every_prevadzka_is_auto(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user, prevadzky = self._celok_user()
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[0],
            date=MONDAY,
            data=self._data(1),
            status="submitted",
            is_auto=True,
        )
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[1],
            date=MONDAY,
            data=self._data(1),
            status="submitted",
            is_auto=False,
        )

        result = OrderService.get_planned_orders(user, [])

        monday = next(r for r in result if r["date"] == str(MONDAY))
        assert monday["is_auto"] is False

    @patch("api.services.order_service.timezone")
    def test_monthly_summary_sums_every_prevadzka(self, mock_tz):
        mock_tz.localdate.return_value = MONDAY
        user, prevadzky = self._celok_user()
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[0],
            date=MONDAY,
            data=self._data(2),
            status="submitted",
        )
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzky[1],
            date=MONDAY,
            data=self._data(3),
            status="submitted",
        )

        summary = OrderService.monthly_summary(
            user, MONDAY.year, MONDAY.month, through_date=MONDAY
        )

        assert summary["total"] == 5

    @patch("api.services.order_service.timezone")
    def test_sees_order_placed_by_another_login_of_the_celok(self, mock_tz):
        """Login je len audit — druhé prihlásenie celku vidí tú istú objednávku."""
        from api.models import ProfileCelokAccess, UserProfile

        mock_tz.localdate.return_value = MONDAY
        user, prevadzky = self._celok_user()
        celok = prevadzky[0].celok
        other = User.objects.create_user(
            username="druhy@example.com", email="druhy@example.com", password="pw"
        )
        other_profile = UserProfile(user=other, company_name="druhy")
        other_profile._skip_default_facility = True
        other_profile.save()
        ProfileCelokAccess.objects.create(profile=other_profile, celok=celok)

        DailyOrder.objects.create(
            user=other,
            prevadzka=prevadzky[0],
            date=MONDAY,
            data=self._data(4),
            status="submitted",
        )

        result = OrderService.get_planned_orders(user, [])

        monday = next(r for r in result if r["date"] == str(MONDAY))
        assert monday["exists"] is True
        assert monday["totalPortions"] == 4


# ---------------------------------------------------------------------------
# ReportService.aggregate_daily_stats
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAggregateDailyStats:
    def test_empty_date_returns_zero_stats(self):
        from api.services import ReportService

        result = ReportService.aggregate_daily_stats(datetime.date(2025, 1, 1))
        assert result["total_orders"] == 0
        assert result["status_breakdown"]["submitted"] == 0

    def test_single_order_counted(self):
        from api.models import UserProfile
        from api.services import ReportService

        user = User.objects.create_user(username="s@example.com", email="s@example.com")
        UserProfile.objects.get_or_create(
            user=user, defaults={"company_name": "s@example.com"}
        )
        target = datetime.date(2025, 1, 6)
        DailyOrder.objects.create(
            user=user,
            date=target,
            data={"lunch": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}}},
        )
        result = ReportService.aggregate_daily_stats(target)
        assert result["total_orders"] == 1
        assert result["meals"]["lunch"]["Dospelý"]["total"] == 2

    def test_flat_shape_aggregated(self):
        from api.models import UserProfile
        from api.services import ReportService

        user = User.objects.create_user(username="f@example.com", email="f@example.com")
        UserProfile.objects.get_or_create(
            user=user, defaults={"company_name": "f@example.com"}
        )
        target = datetime.date(2025, 1, 7)
        DailyOrder.objects.create(
            user=user,
            date=target,
            data={"lunch": {"menuCounts": {"B": 3}, "diets": {}}},
        )
        result = ReportService.aggregate_daily_stats(target)
        # Flat shape wraps into category keyed by meal_key "lunch"
        assert result["meals"]["lunch"]["lunch"]["total"] == 3

    def test_aggregate_meal_skips_empty_data(self):
        from api.services import ReportService

        stats = {
            "total_orders": 0,
            "status_breakdown": {},
            "meals": {"breakfast": {}, "lunch": {}, "olovrant": {}},
        }
        # Calling with missing meal key should be a no-op
        ReportService._aggregate_meal(stats, {}, "breakfast")
        assert stats["meals"]["breakfast"] == {}

    def test_aggregate_meal_skips_non_dict(self):
        from api.services import ReportService

        stats = {
            "total_orders": 0,
            "status_breakdown": {},
            "meals": {"lunch": {}},
        }
        ReportService._aggregate_meal(stats, {"lunch": "invalid"}, "lunch")
        assert stats["meals"]["lunch"] == {}
