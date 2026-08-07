import datetime

import pytest
from django.urls import reverse
from rest_framework import status

from api.models import ClosedDay, DailyOrder

pytestmark = [pytest.mark.integration, pytest.mark.django_db]

TARGET_DATE = datetime.date(2099, 8, 7)
OTHER_DATE = datetime.date(2099, 8, 8)
ORDER_DATA = {
    "lunch": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}},
}
CLOSED_MESSAGE = "Deň je uzavretý, objednávky sa už nedajú upravovať."


def test_admin_closes_day_once_and_get_returns_persisted_state(
    admin_client, admin_user
):
    url = reverse("closed-day-list")

    open_response = admin_client.get(url, {"date": TARGET_DATE.isoformat()})
    first = admin_client.post(url, {"date": TARGET_DATE.isoformat()}, format="json")
    second = admin_client.post(url, {"date": TARGET_DATE.isoformat()}, format="json")
    closed_response = admin_client.get(url, {"date": TARGET_DATE.isoformat()})

    assert open_response.status_code == status.HTTP_200_OK
    assert open_response.json() == {
        "date": TARGET_DATE.isoformat(),
        "is_closed": False,
    }
    assert first.status_code == status.HTTP_201_CREATED
    assert first.json()["is_closed"] is True
    assert ClosedDay.objects.get(date=TARGET_DATE).closed_by == admin_user
    assert second.status_code == status.HTTP_409_CONFLICT
    assert second.json()["error"]["message"] == "Deň je už uzavretý."
    assert closed_response.json()["is_closed"] is True


def test_client_submission_for_closed_day_is_rejected(authenticated_client, admin_user):
    ClosedDay.objects.create(date=TARGET_DATE, closed_by=admin_user)

    response = authenticated_client.post(
        reverse("dailyorder-list"),
        {"date": TARGET_DATE.isoformat(), "data": ORDER_DATA},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["message"] == CLOSED_MESSAGE
    assert not DailyOrder.objects.filter(date=TARGET_DATE).exists()


def test_admin_editor_create_for_closed_day_is_rejected(admin_client, admin_user, user):
    ClosedDay.objects.create(date=TARGET_DATE, closed_by=admin_user)
    url = reverse("dailyorder-list") + f"?user_id={user.pk}"

    response = admin_client.post(
        url,
        {"date": TARGET_DATE.isoformat(), "data": ORDER_DATA},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["message"] == CLOSED_MESSAGE


def test_admin_editor_update_for_closed_day_is_rejected(admin_client, admin_user, user):
    order = DailyOrder.objects.create(user=user, date=TARGET_DATE, data={})
    ClosedDay.objects.create(date=TARGET_DATE, closed_by=admin_user)
    url = (
        reverse("dailyorder-detail", args=[order.pk])
        + f"?prevadzka={order.prevadzka_id}"
    )

    response = admin_client.patch(url, {"data": ORDER_DATA}, format="json")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["message"] == CLOSED_MESSAGE
    order.refresh_from_db()
    assert order.data == {}


def test_client_submission_for_open_day_still_succeeds(authenticated_client):
    response = authenticated_client.post(
        reverse("dailyorder-list"),
        {"date": OTHER_DATE.isoformat(), "data": ORDER_DATA},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert DailyOrder.objects.filter(date=OTHER_DATE, data=ORDER_DATA).exists()
