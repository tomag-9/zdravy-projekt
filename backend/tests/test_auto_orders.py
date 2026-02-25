"""
Tests for the auto-order feature.

Covers:
- _is_order_empty() helper
- _next_workday() helper
- apply_auto_orders() service: all edge cases
- GET /api/orders/planned/ endpoint
- POST /api/admin/trigger-auto-orders/ endpoint
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from api.models import ClientSettings, DailyOrder
from api.services import (
    _is_order_empty,
    _last_non_empty_order,
    _next_workday,
    apply_auto_orders,
)

# ---------------------------------------------------------------------------
# Sample data helpers
# ---------------------------------------------------------------------------

NON_EMPTY_DATA = {
    "breakfast": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
    "lunch": {"Dospelý": {"menuCounts": {"B": 2}, "diets": {}}},
    "olovrant": {},
}

EMPTY_DATA: dict = {
    "breakfast": {"Dospelý": {"menuCounts": {"A": 0}, "diets": {}}},
    "lunch": {},
    "olovrant": {},
}

# A Monday so we have full predictability for workday arithmetic
MONDAY = datetime.date(2025, 1, 6)  # confirmed Monday
TUESDAY = datetime.date(2025, 1, 7)
FRIDAY = datetime.date(2025, 1, 10)
SATURDAY = datetime.date(2025, 1, 11)
SUNDAY = datetime.date(2025, 1, 12)
NEXT_MONDAY = datetime.date(2025, 1, 13)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def client_user(db):
    return User.objects.create_user(username="c@e.com", password="pw", email="c@e.com")


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="a@e.com", password="pw", email="a@e.com", is_staff=True
    )


@pytest.fixture
def auth_client(client_user):
    c = APIClient()
    c.force_authenticate(user=client_user)
    return c


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


# ---------------------------------------------------------------------------
# Unit: _is_order_empty
# ---------------------------------------------------------------------------


class TestIsOrderEmpty:
    def test_empty_when_all_zero(self):
        assert _is_order_empty(EMPTY_DATA) is True

    def test_empty_when_no_keys(self):
        assert _is_order_empty({}) is True

    def test_not_empty_when_positive_count(self):
        assert _is_order_empty(NON_EMPTY_DATA) is False

    def test_single_positive_count_is_not_empty(self):
        data = {"lunch": {"Dospelý": {"menuCounts": {"A": 3}}}}
        assert _is_order_empty(data) is False

    def test_mixed_zero_and_nonzero(self):
        data = {
            "breakfast": {"Dospelý": {"menuCounts": {"A": 0}}},
            "lunch": {"Dospelý": {"menuCounts": {"B": 1}}},
        }
        assert _is_order_empty(data) is False

    # --- Flat shape (meal -> menuCounts directly, without a category level) ---

    def test_flat_shape_not_empty(self):
        data = {"lunch": {"menuCounts": {"A": 1}}}
        assert _is_order_empty(data) is False

    def test_flat_shape_zero_counts_is_empty(self):
        data = {
            "lunch": {"menuCounts": {"A": 0}},
            "breakfast": {"menuCounts": {"B": 0}},
        }
        assert _is_order_empty(data) is True

    def test_flat_shape_mixed_meals(self):
        data = {
            "breakfast": {"menuCounts": {"A": 0}},
            "lunch": {"menuCounts": {"B": 3}},
        }
        assert _is_order_empty(data) is False


# ---------------------------------------------------------------------------
# Unit: _next_workday
# ---------------------------------------------------------------------------


class TestNextWorkday:
    def test_monday_returns_tuesday(self):
        assert _next_workday(MONDAY) == TUESDAY

    def test_friday_returns_next_monday(self):
        assert _next_workday(FRIDAY) == NEXT_MONDAY

    def test_saturday_returns_next_monday(self):
        assert _next_workday(SATURDAY) == NEXT_MONDAY

    def test_sunday_returns_next_monday(self):
        assert _next_workday(SUNDAY) == NEXT_MONDAY

    def test_thursday_returns_friday(self):
        thu = datetime.date(2025, 1, 9)
        fri = datetime.date(2025, 1, 10)
        assert _next_workday(thu) == fri

    def test_never_returns_weekend(self):
        for i in range(20):
            d = MONDAY + datetime.timedelta(days=i)
            result = _next_workday(d)
            assert result.weekday() < 5, f"Got weekend for input {d}: {result}"


# ---------------------------------------------------------------------------
# Unit: apply_auto_orders – service logic
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestApplyAutoOrders:
    def test_no_history_no_auto_order_created(self, client_user):
        """A client with no prior submitted orders gets no auto order."""
        result = apply_auto_orders(target_date=TUESDAY)
        assert client_user.email not in result["created"]
        assert not DailyOrder.objects.filter(user=client_user, date=TUESDAY).exists()

    def test_auto_order_created_when_no_existing_order(self, client_user):
        """Client with history and no order on target_date → auto order created."""
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        result = apply_auto_orders(target_date=TUESDAY)

        assert client_user.email in result["created"]
        auto = DailyOrder.objects.get(user=client_user, date=TUESDAY)
        assert auto.is_auto is True
        assert auto.status == "submitted"

    def test_manual_order_prevents_auto(self, client_user):
        """Client already has a manual order → auto order is NOT created."""
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )
        DailyOrder.objects.create(
            user=client_user,
            date=TUESDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
            is_auto=False,
        )

        result = apply_auto_orders(target_date=TUESDAY)

        assert client_user.email not in result["created"]
        assert result["skipped"] >= 1

    def test_empty_existing_order_prevents_auto(self, client_user):
        """Client explicitly submitted a zero-portion order → respect it, no auto."""
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )
        DailyOrder.objects.create(
            user=client_user,
            date=TUESDAY,
            status="submitted",
            data=EMPTY_DATA,
            is_auto=False,
        )

        result = apply_auto_orders(target_date=TUESDAY)

        assert client_user.email not in result["created"]
        # Still only one order for TUESDAY
        assert DailyOrder.objects.filter(user=client_user, date=TUESDAY).count() == 1

    def test_staff_user_excluded(self, admin_user):
        """Staff/admin clients never receive auto orders."""
        DailyOrder.objects.create(
            user=admin_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        result = apply_auto_orders(target_date=TUESDAY)

        assert admin_user.email not in result["created"]
        assert not DailyOrder.objects.filter(user=admin_user, date=TUESDAY).exists()

    def test_idempotency(self, client_user):
        """Running apply_auto_orders twice must not create duplicate orders."""
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        apply_auto_orders(target_date=TUESDAY)
        apply_auto_orders(target_date=TUESDAY)

        assert DailyOrder.objects.filter(user=client_user, date=TUESDAY).count() == 1

    def test_weekend_target_date_skipped(self, client_user):
        """Passing a Saturday as target_date → service skips entirely."""
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        result = apply_auto_orders(target_date=SATURDAY)

        assert result["created"] == []
        assert not DailyOrder.objects.filter(user=client_user, date=SATURDAY).exists()

    def test_visible_meals_respected(self, client_user):
        """If ClientSettings.visible_meals = ['lunch'], only lunch is copied."""
        ClientSettings.objects.create(user=client_user, visible_meals=["lunch"])
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        apply_auto_orders(target_date=TUESDAY)

        auto = DailyOrder.objects.get(user=client_user, date=TUESDAY)
        assert auto.data.get("lunch") == NON_EMPTY_DATA["lunch"]
        # Other meals must be empty
        assert auto.data.get("breakfast") == {}
        assert auto.data.get("olovrant") == {}

    def test_last_non_empty_order_skips_empty(self, client_user):
        """Template selection skips empty orders and picks the last non-empty one."""
        # Older non-empty order (template)
        template = DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )
        # Newer but empty order (should be skipped when choosing template)
        DailyOrder.objects.create(
            user=client_user,
            date=TUESDAY,
            status="submitted",
            data=EMPTY_DATA,
        )

        wednesday = datetime.date(2025, 1, 8)
        found = _last_non_empty_order(client_user, before_date=wednesday)

        assert found is not None
        assert found.pk == template.pk

    def test_summary_contains_date(self, client_user):
        """Result dict includes the target_date as 'date' string."""
        result = apply_auto_orders(target_date=TUESDAY)
        assert result["date"] == str(TUESDAY)

    def test_multiple_clients_independent(self, db):
        """Each client is processed independently."""
        u1 = User.objects.create_user(username="u1@test.com", password="pw", email="u1@test.com")
        u2 = User.objects.create_user(username="u2@test.com", password="pw", email="u2@test.com")

        DailyOrder.objects.create(
            user=u1, date=MONDAY, status="submitted", data=NON_EMPTY_DATA
        )
        # u2 has no history

        result = apply_auto_orders(target_date=TUESDAY)

        assert "u1@test.com" in result["created"]
        assert "u2@test.com" not in result["created"]
        assert DailyOrder.objects.filter(user=u1, date=TUESDAY, is_auto=True).exists()
        assert not DailyOrder.objects.filter(user=u2, date=TUESDAY).exists()


# ---------------------------------------------------------------------------
# API: GET /api/orders/planned/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPlannedOrdersEndpoint:
    def test_requires_authentication(self):
        c = APIClient()
        url = reverse("planned-orders-list")
        response = c.get(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_returns_five_workdays(self, auth_client):
        url = reverse("planned-orders-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5

    def test_response_fields(self, auth_client):
        url = reverse("planned-orders-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        day = response.data[0]
        assert "date" in day
        assert "exists" in day
        assert "is_auto" in day
        assert "is_empty" in day
        assert "totalPortions" in day
        assert "mealCount" in day

    def test_no_weekend_dates_returned(self, auth_client):
        url = reverse("planned-orders-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        for day in response.data:
            d = datetime.date.fromisoformat(day["date"])
            assert d.weekday() < 5, f"Weekend date returned: {day['date']}"

    def test_existing_order_reflected(self, auth_client, client_user):
        """An existing order for a planned day sets exists=True."""
        url = reverse("planned-orders-list")
        response = auth_client.get(url)
        first_date = response.data[0]["date"]

        DailyOrder.objects.create(
            user=client_user,
            date=first_date,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        response2 = auth_client.get(url)
        first_day = next(d for d in response2.data if d["date"] == first_date)
        assert first_day["exists"] is True
        assert first_day["is_empty"] is False

    def test_auto_order_flag_returned(self, auth_client, client_user):
        """An auto order for a planned day has is_auto=True."""
        url = reverse("planned-orders-list")
        response = auth_client.get(url)
        first_date = response.data[0]["date"]

        DailyOrder.objects.create(
            user=client_user,
            date=first_date,
            status="submitted",
            data=NON_EMPTY_DATA,
            is_auto=True,
        )

        response2 = auth_client.get(url)
        first_day = next(d for d in response2.data if d["date"] == first_date)
        assert first_day["is_auto"] is True

    def test_staff_can_also_access(self, admin_client):
        """Staff users can call planned orders (they may want to review)."""
        url = reverse("planned-orders-list")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# API: POST /api/admin/trigger-auto-orders/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminTriggerAutoOrders:
    def test_requires_authentication(self):
        c = APIClient()
        url = reverse("trigger-auto-orders-list")
        response = c.post(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_non_staff_forbidden(self, auth_client):
        url = reverse("trigger-auto-orders-list")
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_trigger(self, admin_client):
        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_response_contains_summary(self, admin_client):
        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url)
        data = response.data
        assert "created" in data
        assert "skipped" in data
        assert "date" in data

    def test_creates_auto_orders(self, admin_client, db):
        """Trigger endpoint actually creates auto orders for eligible clients."""
        client_user = User.objects.create_user(username="c1@test.com", password="pw", email="c1@test.com")
        DailyOrder.objects.create(
            user=client_user,
            date=MONDAY,
            status="submitted",
            data=NON_EMPTY_DATA,
        )

        url = reverse("trigger-auto-orders-list")
        response = admin_client.post(url, {"date": str(TUESDAY)}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "c1@test.com" in response.data["created"]
        assert DailyOrder.objects.filter(
            user=client_user, date=TUESDAY, is_auto=True
        ).exists()
