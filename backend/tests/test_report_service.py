"""Tests for ReportService."""

import datetime

import pytest
from django.contrib.auth.models import User

from api.models import DailyOrder, UserProfile
from api.services import ReportService


def _with_profile(user):
    """Klient bez profilu nemá prevádzku; profil signálom založí default prevádzku."""
    UserProfile.objects.get_or_create(user=user, defaults={"company_name": user.email})
    return user


@pytest.mark.django_db
class TestReportService:
    """Test ReportService data preparation functionality."""

    def test_generate_daily_report_empty_date(self):
        """Test report generation with no orders."""
        target_date = datetime.date(2024, 1, 1)
        result = ReportService.generate_daily_report(target_date)

        assert result["date"] == "2024-01-01"
        assert result["rows"] == []
        assert result["totals"]["grand"] == 0

    def test_generate_daily_report_with_orders(self):
        """Test report generation with actual orders."""
        # Create test user and order
        user = _with_profile(
            User.objects.create_user(username="testuser", email="test@example.com")
        )
        target_date = datetime.date(2024, 1, 1)
        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}},
            "lunch": {"Jasle": {"menuCounts": {"Menu B": 2}, "diets": {"Vegan": 1}}},
            "olovrant": {},
        }
        DailyOrder.objects.create(user=user, date=target_date, data=order_data)

        result = ReportService.generate_daily_report(target_date)

        assert result["date"] == "2024-01-01"
        assert len(result["rows"]) == 1
        assert result["rows"][0]["email"] == "test@example.com"
        assert result["rows"][0]["breakfast"]["total"] == 1
        assert result["rows"][0]["lunch"]["total"] == 2
        assert result["rows"][0]["olovrant"]["total"] == 0
        assert result["totals"]["grand"] == 3

    def test_generate_daily_report_multiple_orders(self):
        """Test report aggregation with multiple users."""
        user1 = _with_profile(
            User.objects.create_user(username="user1", email="user1@example.com")
        )
        user2 = _with_profile(
            User.objects.create_user(username="user2", email="user2@example.com")
        )
        target_date = datetime.date(2024, 1, 1)

        DailyOrder.objects.create(
            user=user1,
            date=target_date,
            data={"breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}}},
        )
        DailyOrder.objects.create(
            user=user2,
            date=target_date,
            data={"breakfast": {"Jasle": {"menuCounts": {"Menu A": 2}, "diets": {}}}},
        )

        result = ReportService.generate_daily_report(target_date)

        assert len(result["rows"]) == 2
        assert result["totals"]["grand"] == 3
        # Totals are flattened per meal (menus/diets are merged across categories)
        assert result["totals"]["breakfast"]["menus"]["Menu A"] == 3
        assert result["totals"]["breakfast"]["total"] == 3

    def test_get_orders_for_export(self):
        """Test getting orders in export format."""
        user = _with_profile(
            User.objects.create_user(username="testuser", email="test@example.com")
        )
        target_date = datetime.date(2024, 1, 1)
        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}}
        }
        DailyOrder.objects.create(user=user, date=target_date, data=order_data)

        rows_data = ReportService.get_orders_for_export(target_date)

        assert len(rows_data) == 1
        assert rows_data[0]["user"].email == "test@example.com"
        assert rows_data[0]["data"] == order_data
        assert "visible_meals" in rows_data[0]


@pytest.mark.django_db
class TestReportServiceHelpers:
    """Test helper functions used by ReportService."""

    def test_build_user_meal_row_empty(self):
        """Test meal row building with empty data."""
        from api.utils import build_user_meal_row

        result = build_user_meal_row({}, "breakfast")

        assert result["total"] == 0
        assert result["categories"] == []

    def test_build_user_meal_row_with_data(self):
        """Test meal row building with order data."""
        from api.utils import build_user_meal_row

        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 2}, "diets": {"Vegan": 1}}}
        }

        result = build_user_meal_row(order_data, "breakfast")

        assert result["total"] == 2
        assert len(result["categories"]) == 1
        assert result["categories"][0]["name"] == "Jasle"
        assert result["categories"][0]["menus"]["Menu A"] == 2
        assert result["categories"][0]["diets"]["Vegan"] == 1

    def test_merge_meal_totals(self):
        """Test merging meal totals."""
        from api.utils import merge_meal_totals

        # Totals after merging are flattened (menus/diets merged across categories)
        totals = {
            "total": 5,
            "menus": {"Menu A": 2},
            "diets": {},
        }
        meal_row = {
            "total": 3,
            "categories": [
                {
                    "name": "Jasle",
                    "menus": {"Menu A": 1},
                    "diets": {"Vegan": 1},
                    "total": 1,
                }
            ],
        }

        merge_meal_totals(totals, meal_row)

        assert totals["total"] == 8
        assert totals["menus"]["Menu A"] == 3
        assert totals["diets"]["Vegan"] == 1
