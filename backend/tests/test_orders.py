from datetime import date, datetime, time
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from api.models import DailyOrder, GlobalSettings, PortionType

# Constants mimicking frontend
CATEGORIES = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
DIETS = ["Bez lepku", "Bez laktózy", "Vegetariánske", "Vegánske", "Diabetické"]
FUTURE_ORDER_DATE = date(2099, 1, 2)


@pytest.mark.django_db
class TestOrderPermissions:
    def test_list_orders_authenticated(self, authenticated_client):
        """Authenticated user can list orders"""
        url = reverse("dailyorder-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_list_orders_unauthenticated(self, api_client):
        """Unauthenticated user cannot list orders"""
        url = reverse("dailyorder-list")
        response = api_client.get(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_user_isolation(self, authenticated_client, api_client, user, other_user):
        """User cannot see other user's orders"""
        from api.models import UserProfile

        # other_user má profil → jednoznačná prevádzka, kam objednávku doplniť
        UserProfile.objects.get_or_create(
            user=other_user, defaults={"company_name": other_user.email}
        )
        # Create order for other user
        DailyOrder.objects.create(
            user=other_user, date=date.today(), data={"lunch": {"menuCounts": {"A": 1}}}
        )

        # User checks their list
        url = reverse("dailyorder-list")
        response = authenticated_client.get(url)

        # User should see 0 orders (or only their own)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data.get("results", response.data)) == 0

    def test_admin_restriction(self, authenticated_client, user):
        """Admin/Staff user cannot create orders"""
        user.is_staff = True
        user.save()

        url = reverse("dailyorder-list")
        today = date.today()
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 1}}},
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestOrderCRUD:
    def test_create_order_simple(self, authenticated_client, user):
        """Test simple order creation"""
        url = reverse("dailyorder-list")
        today = FUTURE_ORDER_DATE
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Verify DB
        order = DailyOrder.objects.get(user=user, date=today)
        assert order.data["lunch"]["menuCounts"]["A"] == 1
        assert order.status == "submitted"

    def test_update_order_idempotency(self, authenticated_client, user):
        """Test that posting again updates the existing order (idempotency/upsert)"""
        today = FUTURE_ORDER_DATE
        # Initial
        DailyOrder.objects.create(
            user=user,
            date=today,
            status="draft",
            data={"lunch": {"menuCounts": {"A": 1}}},
        )

        url = reverse("dailyorder-list")
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 2}, "diets": {}}},  # Changed 1 -> 2
        }

        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ]

        # Verify Update
        order = DailyOrder.objects.get(user=user, date=today)
        assert order.data["lunch"]["menuCounts"]["A"] == 2
        assert order.status == "submitted"
        # Ensure no duplicates
        assert DailyOrder.objects.filter(user=user, date=today).count() == 1

    def test_full_frontend_payload(self, authenticated_client, user):
        """Test saving a complex payload similar to what frontend sends"""
        today = FUTURE_ORDER_DATE
        url = reverse("dailyorder-list")

        # Construct a complex nested structure
        data = {"breakfast": {}, "lunch": {}, "olovrant": {}}

        for cat in CATEGORIES:
            data["lunch"][cat] = {
                "menuCounts": {"A": 5, "B": 2},
                "diets": {d: 1 for d in DIETS},
            }

        payload = {"date": str(today), "status": "submitted", "data": data}

        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ]

        order = DailyOrder.objects.get(user=user, date=today)
        saved_data = order.data
        assert saved_data["lunch"]["Jasle"]["menuCounts"]["A"] == 5
        assert saved_data["lunch"]["Jasle"]["diets"]["Bez lepku"] == 1

    def test_delete_logic_frontend_style(self, authenticated_client, user):
        """Test 'soft delete' logic as used by frontend
        (setting status to draft and empty data)"""
        today = FUTURE_ORDER_DATE
        # Create existing order
        DailyOrder.objects.create(
            user=user,
            date=today,
            status="submitted",
            data={"lunch": {"menuCounts": {"A": 10}}},
        )

        url = reverse("dailyorder-list")
        # Frontend 'deletes' by setting status to draft and reset data
        empty_meal = {}
        # In reality frontend sends a deep structure of zeroes,
        # but empty dict should be valid too
        payload = {
            "date": str(today),
            "status": "draft",
            "data": {
                "breakfast": empty_meal,
                "lunch": empty_meal,
                "olovrant": empty_meal,
            },
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

        # Verify DB is empty (drafts not persisted)
        assert not DailyOrder.objects.filter(user=user, date=today).exists()

    def test_by_date_endpoint(self, authenticated_client, user):
        """Test retrieving order by date"""
        today = date.today()
        DailyOrder.objects.create(
            user=user,
            date=today,
            status="submitted",
            data={"lunch": {"menuCounts": {"A": 3}}},
        )

        url = reverse("dailyorder-by-date", kwargs={"date": str(today)})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["lunch"]["menuCounts"]["A"] == 3

    def test_by_date_not_found(self, authenticated_client):
        """Test retrieving non-existent order returns empty data
        instead of 404 (as per view logic)"""
        # Note: The view returns 200 with empty data structure if not found
        tomorrow = date(2099, 1, 1)
        url = reverse("dailyorder-by-date", kwargs={"date": str(tomorrow)})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"data": {}}

    def test_monthly_summary_counts_user_orders(
        self, authenticated_client, user, other_user
    ):
        from api.models import UserProfile

        UserProfile.objects.get_or_create(
            user=other_user, defaults={"company_name": other_user.email}
        )
        DailyOrder.objects.create(
            user=user,
            date=date(2099, 1, 2),
            status="submitted",
            data={
                "breakfast": {"Škôlka": {"menuCounts": {"A": 2}, "diets": {}}},
                "lunch": {"Škôlka": {"menuCounts": {"A": 3, "B": 1}, "diets": {}}},
                "olovrant": {},
            },
        )
        DailyOrder.objects.create(
            user=user,
            date=date(2099, 1, 3),
            status="draft",
            data={"lunch": {"Škôlka": {"menuCounts": {"A": 99}, "diets": {}}}},
        )
        DailyOrder.objects.create(
            user=other_user,
            date=date(2099, 1, 2),
            status="submitted",
            data={"lunch": {"Škôlka": {"menuCounts": {"A": 99}, "diets": {}}}},
        )

        response = authenticated_client.get(
            "/api/orders/planned/monthly-summary/?year=2099&month=1"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 105
        assert response.data["menu_counts"] == {"A": 104, "B": 1}
        assert response.data["meal_counts"]["breakfast"] == 2
        assert response.data["meal_counts"]["lunch"] == 103

    def test_portion_types_list_is_available_to_clients(self, authenticated_client):
        PortionType.objects.create(
            name="Škôlka", coefficient="1.0000", sort_order=1, is_active=True
        )
        PortionType.objects.create(
            name="Interná", coefficient="2.0000", sort_order=2, is_active=False
        )

        response = authenticated_client.get("/api/admin/portion-types/")

        assert response.status_code == status.HTTP_200_OK
        names = [item["name"] for item in response.data.get("results", response.data)]
        assert names == ["Škôlka"]


@pytest.mark.django_db
class TestOrderDeadlines:
    @staticmethod
    def _server_dt(year: int, month: int, day: int, hour: int, minute: int):
        return timezone.make_aware(
            datetime(year, month, day, hour, minute),
            timezone.get_current_timezone(),
        )

    @staticmethod
    def _set_global_deadlines(**overrides):
        defaults = {
            "deadline_breakfast": time(8, 0),
            "deadline_breakfast_is_day_before": False,
            "deadline_lunch": time(10, 0),
            "deadline_lunch_is_day_before": False,
            "deadline_olovrant": time(14, 0),
            "deadline_olovrant_is_day_before": False,
        }
        defaults.update(overrides)
        GlobalSettings.objects.update_or_create(pk=1, defaults=defaults)

    def test_create_order_after_today_deadline_is_rejected(
        self, authenticated_client, user
    ):
        self._set_global_deadlines(deadline_lunch=time(10, 0))
        today = date(2026, 3, 13)
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        }

        with patch(
            "api.serializers.timezone.localtime",
            return_value=self._server_dt(2026, 3, 13, 10, 1),
        ):
            response = authenticated_client.post(
                reverse("dailyorder-list"), payload, format="json"
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "order_deadline_passed"
        assert DailyOrder.objects.filter(user=user, date=today).count() == 0

    def test_deadline_error_has_frontend_contract_shape(self, authenticated_client):
        self._set_global_deadlines(deadline_lunch=time(10, 0))
        today = date(2026, 3, 13)
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        }

        with patch(
            "api.serializers.timezone.localtime",
            return_value=self._server_dt(2026, 3, 13, 10, 1),
        ):
            response = authenticated_client.post(
                reverse("dailyorder-list"), payload, format="json"
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert response.data["error"]["code"] == "order_deadline_passed"
        assert "message" in response.data["error"]
        assert isinstance(response.data["error"]["message"], str)
        assert "details" in response.data["error"]
        assert response.data["error"]["details"]["deadline"] == "13.03.2026 10:00"
        assert response.data["error"]["details"]["current_time"] == "13.03.2026 10:01"

    def test_upsert_existing_order_after_deadline_is_rejected(
        self, authenticated_client, user
    ):
        self._set_global_deadlines(deadline_lunch=time(10, 0))
        today = date(2026, 3, 13)
        DailyOrder.objects.create(
            user=user,
            date=today,
            status="submitted",
            data={"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        )
        payload = {
            "date": str(today),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 2}, "diets": {}}},
        }

        with patch(
            "api.serializers.timezone.localtime",
            return_value=self._server_dt(2026, 3, 13, 10, 5),
        ):
            response = authenticated_client.post(
                reverse("dailyorder-list"), payload, format="json"
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            DailyOrder.objects.get(user=user, date=today).data["lunch"]["menuCounts"][
                "A"
            ]
            == 1
        )

    def test_patch_existing_order_after_deadline_is_rejected(
        self, authenticated_client, user
    ):
        self._set_global_deadlines(deadline_lunch=time(10, 0))
        today = date(2026, 3, 13)
        order = DailyOrder.objects.create(
            user=user,
            date=today,
            status="submitted",
            data={"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        )

        with patch(
            "api.serializers.timezone.localtime",
            return_value=self._server_dt(2026, 3, 13, 10, 10),
        ):
            response = authenticated_client.patch(
                reverse("dailyorder-detail", args=[order.id]),
                {"data": {"lunch": {"menuCounts": {"A": 3}, "diets": {}}}},
                format="json",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        order.refresh_from_db()
        assert order.data["lunch"]["menuCounts"]["A"] == 1

    def test_day_before_deadline_comes_from_global_settings(
        self, authenticated_client, user
    ):
        self._set_global_deadlines(
            deadline_lunch=time(9, 30),
            deadline_lunch_is_day_before=True,
        )
        friday = date(2026, 3, 13)
        payload = {
            "date": str(friday),
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 1}, "diets": {}}},
        }

        with patch(
            "api.serializers.timezone.localtime",
            return_value=self._server_dt(2026, 3, 12, 9, 31),
        ):
            response = authenticated_client.post(
                reverse("dailyorder-list"), payload, format="json"
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert DailyOrder.objects.filter(user=user, date=friday).count() == 0
