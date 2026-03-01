import pytest
from django.urls import reverse
from rest_framework import status

from api.models import DailyOrder


@pytest.mark.e2e
@pytest.mark.django_db
def test_user_can_login_create_order_and_read_it(api_client, user):
    token_response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "client123"},
        format="json",
    )
    assert token_response.status_code == status.HTTP_200_OK
    access_token = token_response.data["access"]

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    payload = {
        "date": "2030-01-10",
        "data": {"lunch": {"Dospely": {"menuCounts": {"A": 2}, "diets": {}}}},
    }
    create_response = api_client.post(
        reverse("dailyorder-list"), payload, format="json"
    )
    assert create_response.status_code in {
        status.HTTP_201_CREATED,
        status.HTTP_200_OK,
    }

    detail_response = api_client.get(reverse("dailyorder-by-date", args=["2030-01-10"]))
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.data["data"]["lunch"]["Dospely"]["menuCounts"]["A"] == 2
    assert DailyOrder.objects.filter(user=user, date="2030-01-10").exists()
