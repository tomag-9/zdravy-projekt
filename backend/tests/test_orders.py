from datetime import date

import pytest
from django.urls import reverse
from rest_framework import status

from api.models import DailyOrder

# Constants mimicking frontend
CATEGORIES = ["Jasle", "Škôlka", "ZŠ 1.stupeň", "ZŠ 2.stupeň", "Dospelý (SŠ)"]
DIETS = ["Bez lepku", "Bez laktózy", "Vegetariánske", "Vegánske", "Diabetické"]


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


@pytest.mark.django_db
class TestOrderCRUD:
    def test_create_order_simple(self, authenticated_client, user):
        """Test simple order creation"""
        url = reverse("dailyorder-list")
        today = date.today()
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
        today = date.today()
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
        today = date.today()
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
        """Test 'soft delete' logic as used by frontend (setting status to draft and empty data)"""
        today = date.today()
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
        # In reality frontend sends a deep structure of zeroes, but empty dict should be valid too
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

        order = DailyOrder.objects.get(user=user, date=today)
        assert order.status == "draft"
        assert order.data["lunch"] == {}

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
        """Test retrieving non-existent order returns empty data instead of 404 (as per view logic)"""
        # Note: The view returns 200 with empty data structure if not found
        tomorrow = date(2099, 1, 1)
        url = reverse("dailyorder-by-date", kwargs={"date": str(tomorrow)})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"data": {}}
