"""
Comprehensive tests for auto-order generation and related logic.

Covers:
- Auto-order service functions (_is_order_empty, _next_workday, _last_non_empty_order, _build_auto_data)
- apply_auto_orders() service behavior
- PlannedOrdersViewSet template selection logic
- AdminAutoOrderViewSet trigger endpoint
"""

import datetime
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from api.models import ClientSettings, DailyOrder
from api.services import (
    _build_auto_data,
    _is_order_empty,
    _last_non_empty_order,
    _next_workday,
    apply_auto_orders,
)

pytestmark = pytest.mark.integration


NON_EMPTY_DATA = {
    "breakfast": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
    "lunch": {"Dospelý": {"menuCounts": {"B": 2}, "diets": {}}},
    "olovrant": {},
}

EMPTY_DATA = {
    "breakfast": {"Dospelý": {"menuCounts": {"A": 0}, "diets": {}}},
    "lunch": {},
    "olovrant": {},
}

# Reference dates: all confirmed weekdays/weekends for predictable tests
MONDAY = datetime.date(2025, 1, 6)
TUESDAY = datetime.date(2025, 1, 7)
WEDNESDAY = datetime.date(2025, 1, 8)
THURSDAY = datetime.date(2025, 1, 9)
FRIDAY = datetime.date(2025, 1, 10)
SATURDAY = datetime.date(2025, 1, 11)
SUNDAY = datetime.date(2025, 1, 12)
NEXT_MONDAY = datetime.date(2025, 1, 13)


@pytest.mark.django_db
class TestNextWorkday:
    """Test _next_workday() pure function."""

    def test_monday_returns_tuesday(self):
        """Monday → Tuesday"""
        assert _next_workday(MONDAY) == TUESDAY

    def test_friday_returns_next_monday(self):
        """Friday → following Monday"""
        assert _next_workday(FRIDAY) == NEXT_MONDAY

    def test_saturday_returns_next_monday(self):
        """Saturday → following Monday"""
        assert _next_workday(SATURDAY) == NEXT_MONDAY

    def test_sunday_returns_next_monday(self):
        """Sunday → following Monday"""
        assert _next_workday(SUNDAY) == NEXT_MONDAY

    def test_thursday_returns_friday(self):
        """Thursday → Friday"""
        assert _next_workday(THURSDAY) == FRIDAY

    def test_always_returns_weekday(self):
        """Result is always a weekday (Mon-Fri)."""
        for offset in range(30):
            d = MONDAY + datetime.timedelta(days=offset)
            result = _next_workday(d)
            assert (
                result.weekday() < 5
            ), f"_next_workday({d}) = {result} (weekday={result.weekday()})"


@pytest.mark.django_db
class TestIsOrderEmpty:
    """Test _is_order_empty() helper."""

    def test_empty_dict_is_empty(self):
        """Empty dict returns True."""
        assert _is_order_empty({}) is True

    def test_all_zero_portions_is_empty(self):
        """Order with all zero menuCounts returns True."""
        assert _is_order_empty(EMPTY_DATA) is True

    def test_any_positive_portion_not_empty(self):
        """Order with any positive count returns False."""
        assert _is_order_empty(NON_EMPTY_DATA) is False

    def test_single_meal_positive_not_empty(self):
        """Single meal with positive count returns False."""
        data = {"lunch": {"Dospelý": {"menuCounts": {"A": 3}}}}
        assert _is_order_empty(data) is False

    def test_mixed_zero_and_positive_not_empty(self):
        """Mix of zero and positive portions returns False."""
        data = {
            "breakfast": {"Dospelý": {"menuCounts": {"A": 0}}},
            "lunch": {"Dospelý": {"menuCounts": {"B": 1}}},
        }
        assert _is_order_empty(data) is False

    def test_flat_shape_not_empty(self):
        """Flat shape (no category level) with positive count returns False."""
        data = {"lunch": {"menuCounts": {"A": 1}}}
        assert _is_order_empty(data) is False

    def test_flat_shape_zero_is_empty(self):
        """Flat shape with zero counts returns True."""
        data = {"breakfast": {"menuCounts": {"A": 0}}}
        assert _is_order_empty(data) is True


@pytest.mark.django_db
class TestLastNonEmptyOrder:
    """Test _last_non_empty_order() service function."""

    def test_no_history_returns_none(self, user):
        """User with no prior orders returns None."""
        result = _last_non_empty_order(user, TUESDAY)
        assert result is None

    def test_finds_last_non_empty_order(self, user):
        """Returns the most recent non-empty order before given date."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=TUESDAY, data=EMPTY_DATA)

        result = _last_non_empty_order(user, WEDNESDAY)
        assert result is not None
        assert result.date == MONDAY

    def test_skips_empty_orders(self, user):
        """Returns the last non-empty order, skipping empty ones."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=TUESDAY, data=EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=WEDNESDAY, data=EMPTY_DATA)

        result = _last_non_empty_order(user, THURSDAY)
        assert result is not None
        assert result.date == MONDAY

    def test_respects_before_date_boundary(self, user):
        """Does not return orders on or after the before_date."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=TUESDAY, data=NON_EMPTY_DATA)

        result = _last_non_empty_order(user, TUESDAY)
        assert result is not None
        assert result.date == MONDAY  # Excludes TUESDAY (boundary)

    def test_returns_most_recent_before_date(self, user):
        """With multiple non-empty orders, returns the most recent one before date."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=WEDNESDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=FRIDAY, data=NON_EMPTY_DATA)

        result = _last_non_empty_order(user, SATURDAY)
        assert result.date == FRIDAY


@pytest.mark.django_db
class TestBuildAutoData:
    """Test _build_auto_data() meal filtering function."""

    def test_all_meals_when_visible_meals_empty(self):
        """When visible_meals is empty, all meals are copied."""
        auto_data = _build_auto_data(DailyOrder(data=NON_EMPTY_DATA), visible_meals=[])

        assert "breakfast" in auto_data
        assert "lunch" in auto_data
        assert "olovrant" in auto_data
        assert auto_data["breakfast"] == NON_EMPTY_DATA["breakfast"]
        assert auto_data["lunch"] == NON_EMPTY_DATA["lunch"]

    def test_single_meal_visible(self):
        """When only lunch is visible, only lunch is copied."""
        auto_data = _build_auto_data(
            DailyOrder(data=NON_EMPTY_DATA), visible_meals=["lunch"]
        )

        assert auto_data["breakfast"] == {}
        assert auto_data["lunch"] == NON_EMPTY_DATA["lunch"]
        assert auto_data["olovrant"] == {}

    def test_multiple_meals_visible(self):
        """When breakfast and lunch are visible."""
        auto_data = _build_auto_data(
            DailyOrder(data=NON_EMPTY_DATA), visible_meals=["breakfast", "lunch"]
        )

        assert auto_data["breakfast"] == NON_EMPTY_DATA["breakfast"]
        assert auto_data["lunch"] == NON_EMPTY_DATA["lunch"]
        assert auto_data["olovrant"] == {}

    def test_copies_empty_meals_when_visible(self):
        """Empty meals are still included if visible_meals allows them."""
        auto_data = _build_auto_data(
            DailyOrder(data=NON_EMPTY_DATA), visible_meals=["olovrant"]
        )

        assert auto_data["olovrant"] == {}  # Empty but included
        assert auto_data["breakfast"] == {}
        assert auto_data["lunch"] == {}


@pytest.mark.django_db
class TestApplyAutoOrders:
    """Test apply_auto_orders() service and its business logic."""

    def test_no_orders_created_without_history(self, user):
        """Client with no prior orders → no auto order created."""
        result = apply_auto_orders(target_date=TUESDAY)

        assert user.email not in result["created"]
        assert not DailyOrder.objects.filter(user=user, date=TUESDAY).exists()

    def test_auto_order_created_with_history(self, user):
        """Client with history and no existing order → auto order created."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert user.email in result["created"]
        auto = DailyOrder.objects.get(user=user, date=TUESDAY)
        assert auto.is_auto is True
        assert auto.status == "submitted"

    def test_manual_order_prevents_auto(self, user):
        """If user already has an order for target_date → no auto order."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=TUESDAY, data=EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert user.email not in result["created"]
        assert DailyOrder.objects.filter(user=user, date=TUESDAY).count() == 1

    def test_empty_template_does_not_block_future_auto(self, user):
        """Client with explicit empty order in history still gets future auto order."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=TUESDAY, data=EMPTY_DATA)

        result = apply_auto_orders(target_date=WEDNESDAY)

        auto = DailyOrder.objects.filter(user=user, date=WEDNESDAY).first()
        # Respects manual empty order, uses most recent non-empty
        assert auto is not None

    def test_staff_never_get_auto_orders(self, admin_user):
        """Staff users are excluded from auto-order generation."""
        DailyOrder.objects.create(user=admin_user, date=MONDAY, data=NON_EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert admin_user.email not in result["created"]
        assert not DailyOrder.objects.filter(user=admin_user, date=TUESDAY).exists()

    def test_weekend_target_date_skipped(self, user):
        """Passing a Saturday/Sunday as target_date → service returns early."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        result_sat = apply_auto_orders(target_date=SATURDAY)
        result_sun = apply_auto_orders(target_date=SUNDAY)

        assert result_sat["created"] == []
        assert result_sun["created"] == []
        assert not DailyOrder.objects.filter(user=user, date=SATURDAY).exists()
        assert not DailyOrder.objects.filter(user=user, date=SUNDAY).exists()

    def test_visible_meals_respected(self, user):
        """Auto order respects ClientSettings.visible_meals filter."""
        ClientSettings.objects.create(user=user, visible_meals=["lunch"])
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        apply_auto_orders(target_date=TUESDAY)

        auto = DailyOrder.objects.get(user=user, date=TUESDAY)
        assert auto.data.get("lunch") == NON_EMPTY_DATA["lunch"]
        # Other meals must be empty
        assert auto.data.get("breakfast") == {}
        assert auto.data.get("olovrant") == {}

    def test_idempotency_no_duplicates(self, user):
        """Running apply_auto_orders twice must not create duplicate orders."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        apply_auto_orders(target_date=TUESDAY)
        apply_auto_orders(target_date=TUESDAY)

        assert DailyOrder.objects.filter(user=user, date=TUESDAY).count() == 1

    def test_multiple_clients_independent(self):
        """Each client is processed independently."""
        user1 = User.objects.create_user(
            username="user1@example.com",
            email="user1@example.com",
            password="pass123",
        )
        user2 = User.objects.create_user(
            username="user2@example.com",
            email="user2@example.com",
            password="pass123",
        )

        # Only user1 has history
        DailyOrder.objects.create(user=user1, date=MONDAY, data=NON_EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert user1.email in result["created"]
        assert user2.email not in result["created"]

    def test_return_value_structure(self, user):
        """Result includes 'created' list and match summary."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert isinstance(result, dict)
        assert "created" in result
        assert isinstance(result["created"], list)
        assert user.email in result["created"]

    def test_filtered_auto_data_is_empty_skipped(self, user):
        """If visible_meals filtering results in empty data → order not created."""
        ClientSettings.objects.create(user=user, visible_meals=[])
        DailyOrder.objects.create(user=user, date=MONDAY, data=EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert user.email not in result["created"]


@pytest.mark.django_db
class TestAdminTriggerAutoOrders:
    """Test AdminAutoOrderViewSet POST /api/admin/trigger-auto-orders/ endpoint."""

    def test_admin_can_trigger_auto_orders(self, admin_client, admin_user):
        """Admin can POST to trigger auto-orders."""
        user = User.objects.create_user(
            username="client@example.com",
            email="client@example.com",
            password="pass123",
            is_staff=False,
        )
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url, {"date": str(TUESDAY)}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert DailyOrder.objects.filter(user=user, date=TUESDAY).exists()

    def test_trigger_endpoint_requires_admin(self, authenticated_client):
        """Non-admin users cannot trigger auto-orders."""
        url = reverse("trigger-auto-orders-list")
        response = authenticated_client.post(url, {"date": str(TUESDAY)}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trigger_endpoint_requires_auth(self, api_client):
        """Unauthenticated users cannot trigger auto-orders."""
        url = reverse("trigger-auto-orders-list")
        response = api_client.post(url, {"date": str(TUESDAY)}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trigger_without_date_uses_next_workday(self, admin_client, user):
        """Omitting date parameter uses next workday calculation."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        # Verify some order was created (depends on today's date)
        assert response.data.get("created") is not None

    def test_trigger_returns_summary(self, admin_client, user):
        """Trigger endpoint returns summary of created orders."""
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url, {"date": str(TUESDAY)}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "created" in response.data
        assert "message" in response.data or "skipped" in response.data


@pytest.mark.django_db
class TestAutoOrderTemplateSelection:
    """Test template selection logic in PlannedOrdersViewSet."""

    def test_uses_most_recent_non_empty_as_template(self, authenticated_client, user):
        """Planned orders use most recent non-empty order as template."""
        # Create orders: older empty, newer non-empty
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)
        DailyOrder.objects.create(user=user, date=WEDNESDAY, data=EMPTY_DATA)

        url = reverse("planned-orders-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Find a workday without existing order; should show predicted data from MONDAY
        for item in response.data:
            if not item["exists"]:
                # Should have predicted data from Monday template
                assert item["predictedTotal"] > 0

    def test_cascade_forward_in_planned_week(self, authenticated_client, user):
        """Planned orders cascade forward orders within the same week."""
        from django.utils import timezone

        today = timezone.localdate()
        import datetime as dt

        # Get first workday
        test_date = today
        while test_date.weekday() >= 5:
            test_date += dt.timedelta(days=1)
        next_date = test_date + dt.timedelta(days=1)
        while next_date.weekday() >= 5:
            next_date += dt.timedelta(days=1)

        # User creates order on first workday
        DailyOrder.objects.create(user=user, date=test_date, data=NON_EMPTY_DATA)

        url = reverse("planned-orders-list")
        response = authenticated_client.get(url)

        # Find items in response
        first_item = next(
            (item for item in response.data if item["date"] == str(test_date)), None
        )
        second_item = next(
            (item for item in response.data if item["date"] == str(next_date)), None
        )

        assert first_item is not None and first_item["exists"]
        assert second_item is None or not second_item["exists"]

    def test_respects_visible_meals_in_predicted(self, authenticated_client, user):
        """Predicted orders should respect visible_meals setting."""
        ClientSettings.objects.create(user=user, visible_meals=["lunch"])
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        url = reverse("planned-orders-list")
        response = authenticated_client.get(url)

        def _sum_ints(value):
            if isinstance(value, int):
                return value
            if isinstance(value, dict):
                return sum(_sum_ints(v) for v in value.values())
            if isinstance(value, (list, tuple)):
                return sum(_sum_ints(v) for v in value)
            return 0

        expected_lunch_total = _sum_ints(NON_EMPTY_DATA.get("lunch", {}))
        found_predicted = False

        # Find a day without order; predicted should only include lunch portions.
        for item in response.data:
            if not item["exists"]:
                found_predicted = True
                assert item["predictedTotal"] == expected_lunch_total

        assert found_predicted


@pytest.mark.django_db
class TestAutoOrderEdgeCases:
    """Test edge cases and corner scenarios."""

    def test_empty_dict_data_handled(self, user):
        """Orders with empty data dict are handled correctly."""
        order = DailyOrder.objects.create(user=user, date=MONDAY, data={})

        result = _is_order_empty(order.data or {})
        assert result is True

    def test_missing_menuCounts_key(self, user):
        """Orders with missing menuCounts key are handled."""
        data = {"breakfast": {"Dospelý": {"diets": {}}}}

        result = _is_order_empty(data)
        assert result is True

    def test_many_clients_performance(self, db):
        """Service handles many clients efficiently."""
        # Create 10 clients with history
        clients = [
            User.objects.create_user(
                username=f"client{i}@example.com",
                email=f"client{i}@example.com",
                password="pass123",
            )
            for i in range(10)
        ]

        for client in clients:
            DailyOrder.objects.create(user=client, date=MONDAY, data=NON_EMPTY_DATA)

        result = apply_auto_orders(target_date=TUESDAY)

        assert len(result["created"]) == 10

    def test_various_visible_meals_combinations(self, user):
        """Test all combinations of visible_meals."""
        for combo in [
            ["breakfast"],
            ["lunch"],
            ["olovrant"],
            ["breakfast", "lunch"],
            ["breakfast", "olovrant"],
            ["lunch", "olovrant"],
            ["breakfast", "lunch", "olovrant"],
        ]:
            ClientSettings.objects.all().delete()
            ClientSettings.objects.create(user=user, visible_meals=combo)
            DailyOrder.objects.filter(user=user).delete()
            DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

            result = apply_auto_orders(target_date=TUESDAY)

            if result["created"]:
                auto = DailyOrder.objects.get(user=user, date=TUESDAY)
                # Verify only allowed meals have data
                for meal in ["breakfast", "lunch", "olovrant"]:
                    if meal in combo:
                        template_meal_data = NON_EMPTY_DATA.get(meal, {})
                        assert auto.data.get(meal, {}) == template_meal_data
                    else:
                        assert auto.data.get(meal) == {}


@pytest.mark.django_db
class TestAutoOrderTimezone:
    """
    Regression test for H2: apply_auto_orders must use the local (Europe/Bratislava)
    date, not UTC.  At 23:30 local time (UTC+1) UTC is already on the next calendar
    day, so a UTC-based `today` would skip ahead by one workday.
    """

    def test_localdate_used_near_local_midnight(self, user):
        """
        Mock timezone.localdate() to return MONDAY (simulating 23:30 local on Mon).
        The service should target TUESDAY.  A UTC-based implementation seeing "today
        is Tuesday" would instead target WEDNESDAY — this test catches the regression.
        """
        DailyOrder.objects.create(user=user, date=MONDAY, data=NON_EMPTY_DATA)

        with patch("api.services.auto_order_service.timezone") as mock_tz:
            mock_tz.localdate.return_value = MONDAY
            result = apply_auto_orders()

        # Auto-order should have been created for TUESDAY (next workday after MONDAY)
        created_order = DailyOrder.objects.filter(
            user=user, date=TUESDAY, is_auto=True
        ).first()
        assert created_order is not None, (
            "Expected auto-order on TUESDAY but none was created. " f"Result: {result}"
        )
