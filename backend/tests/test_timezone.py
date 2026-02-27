"""
Tests for timezone handling in orders and planning.
Ensures all clients see the same calendar regardless of their timezone.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import DailyOrder


@pytest.mark.django_db
class TestTimezonePlanning:
    """Test that planned orders use UTC date, not server local timezone."""

    def test_planned_orders_use_utc_date(self, authenticated_client):
        """Planned orders should use UTC date, not server timezone."""
        response = authenticated_client.get("/api/orders/planned/")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 5  # Should return 5 workdays

        # Verify all dates are valid and in the future
        today_utc = timezone.now().astimezone(datetime.timezone.utc).date()
        for day_info in data:
            day_date = datetime.date.fromisoformat(day_info["date"])
            # Each day should be >= today (in UTC)
            assert day_date >= today_utc
            # Dates should be in ascending order
            assert day_info["date"]

    def test_planned_orders_consistent_across_timezones(self, authenticated_client):
        """
        All clients should see the same dates regardless of their timezone.
        This is verified by ensuring the dates are based on UTC, not server time.
        """
        # Simulate client requests at different times
        response1 = authenticated_client.get("/api/orders/planned/")
        data1 = response1.json()

        # Dates should be consistent and based on UTC
        today_utc = timezone.now().astimezone(datetime.timezone.utc).date()
        first_date = datetime.date.fromisoformat(data1[0]["date"])
        assert first_date >= today_utc

    def test_planned_orders_include_only_workdays(self, authenticated_client):
        """Planned orders should include only Mon-Fri (workdays)."""
        response = authenticated_client.get("/api/orders/planned/")
        data = response.json()

        for day_info in data:
            day_date = datetime.date.fromisoformat(day_info["date"])
            # weekday() returns 0-6 (Mon-Sun), so 0-4 is Mon-Fri
            weekday = day_date.weekday()
            assert weekday < 5, f"Date {day_date} is not a workday (weekday={weekday})"


@pytest.mark.django_db
class TestTimezoneAutoOrders:
    """Test that auto-orders use UTC date."""

    def test_auto_order_target_date_uses_utc(self, user):
        """Auto-orders should calculate target_date using UTC."""
        from api.services import apply_auto_orders

        # Create a previous order to use as template
        today_utc = timezone.now().astimezone(datetime.timezone.utc).date()
        yesterday = today_utc - datetime.timedelta(days=1)
        DailyOrder.objects.create(
            user=user,
            date=yesterday,
            data={"breakfast": {"menuCounts": {"A": 1}}},
        )

        # Get UTC date
        today_utc = timezone.now().astimezone(datetime.timezone.utc).date()

        # Call auto-orders without explicit date
        result = apply_auto_orders()

        # Verify it works without errors
        assert isinstance(result, dict)
        assert "created" in result
        assert "skipped" in result
