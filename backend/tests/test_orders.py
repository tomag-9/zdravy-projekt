from datetime import date

import pytest
from django.urls import reverse
from rest_framework import status

from api.models import DailyOrder


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
        # DRF might return 403 Forbidden instead of 401 Unauthorized depending on auth classes (SessionAuth)
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
    def test_create_order(self, authenticated_client, user):
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

    def test_update_order(self, authenticated_client, user):
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
        ]  # Depending on implementation

        # Verify Update
        order = DailyOrder.objects.get(user=user, date=today)
        assert order.data["lunch"]["menuCounts"]["A"] == 2
        assert order.status == "submitted"

    def test_delete_logic(self, authenticated_client, user):
        """Test 'soft delete' logic via API"""
        today = date.today()
        DailyOrder.objects.create(
            user=user,
            date=today,
            status="submitted",
            data={"lunch": {"menuCounts": {"A": 1}}},
        )

        url = reverse("dailyorder-list")
        # Frontend 'deletes' by setting status to draft and empty data
        payload = {
            "date": str(today),
            "status": "draft",
            "data": {"lunch": {"menuCounts": {}}},
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

        order = DailyOrder.objects.get(user=user, date=today)
        assert order.status == "draft"
