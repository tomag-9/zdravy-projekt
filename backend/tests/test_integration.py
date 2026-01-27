from datetime import date

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestFullFlow:
    """Smoke test for the critical user journey"""

    def test_full_order_flow(self, api_client):
        # 1. Obtain Token (Login)
        auth_url = reverse("token_obtain_pair")
        # Use fixture user creds 'testuser'/'testpassword' but create them first
        from django.contrib.auth.models import User

        User.objects.create_user("testuser", "test@example.com", "testpassword")

        auth_resp = api_client.post(
            auth_url, {"username": "testuser", "password": "testpassword"}
        )
        assert auth_resp.status_code == status.HTTP_200_OK
        token = auth_resp.data["access"]

        # 2. Authenticate
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 3. Create Order
        orders_url = reverse("dailyorder-list")
        today = str(date.today())

        order_payload = {
            "date": today,
            "status": "submitted",
            "data": {"lunch": {"menuCounts": {"A": 5, "B": 2}}},
        }
        create_resp = api_client.post(orders_url, order_payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED

        # 4. Fetch Order by Date
        # Note: Need to make sure the by-date endpoint matches the implemented URL regex
        # Assuming URL like /api/orders/by-date/YYYY-MM-DD/
        # Check urls.py: url_path="by-date/(?P<date>[^/.]+)" -> reverse('dailyorder-by-date', args=[today])

        by_date_url = reverse("dailyorder-by-date", args=[today])
        get_resp = api_client.get(by_date_url)

        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.data["data"]["lunch"]["menuCounts"]["A"] == 5
