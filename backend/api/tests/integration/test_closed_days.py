import datetime

import pytest
from django.urls import reverse
from rest_framework import status

from api.models import ClosedDay, DailyOrder, EventLog

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

    event = EventLog.objects.get(
        event_type=EventLog.EventType.SETTINGS_CHANGE,
        payload__model=ClosedDay._meta.label_lower,
        payload__changes__is_closed__to=True,
    )
    assert event.actor == admin_user


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


def test_admin_unlocks_day_and_order_writes_succeed_again(
    admin_client, admin_user, user
):
    ClosedDay.objects.create(date=TARGET_DATE, closed_by=admin_user)
    order_url = reverse("dailyorder-list") + f"?user_id={user.pk}"

    rejected = admin_client.post(
        order_url,
        {"date": TARGET_DATE.isoformat(), "data": ORDER_DATA},
        format="json",
    )
    unlocked = admin_client.delete(
        reverse("closed-day-unlock"),
        {"date": TARGET_DATE.isoformat()},
        format="json",
    )
    accepted = admin_client.post(
        order_url,
        {"date": TARGET_DATE.isoformat(), "data": ORDER_DATA},
        format="json",
    )

    assert rejected.status_code == status.HTTP_403_FORBIDDEN
    assert unlocked.status_code == status.HTTP_200_OK
    assert unlocked.json() == {
        "date": TARGET_DATE.isoformat(),
        "is_closed": False,
    }
    assert not ClosedDay.objects.filter(date=TARGET_DATE).exists()
    assert accepted.status_code == status.HTTP_201_CREATED
    event = EventLog.objects.get(
        event_type=EventLog.EventType.SETTINGS_CHANGE,
        actor=admin_user,
    )
    assert event.payload["date"] == TARGET_DATE.isoformat()
    assert event.payload["changes"]["is_closed"] == {"from": True, "to": False}


def test_admin_cannot_unlock_open_day(admin_client):
    response = admin_client.delete(
        reverse("closed-day-unlock"),
        {"date": TARGET_DATE.isoformat()},
        format="json",
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["error"]["message"] == "Deň nie je uzavretý."


def test_non_staff_cannot_unlock_day(authenticated_client, admin_user):
    ClosedDay.objects.create(date=TARGET_DATE, closed_by=admin_user)

    response = authenticated_client.delete(
        reverse("closed-day-unlock"),
        {"date": TARGET_DATE.isoformat()},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert ClosedDay.objects.filter(date=TARGET_DATE).exists()


def _run_pdf_task_inline(monkeypatch):
    """`cache_closed_day_pdf_task` beží mimo requestu (code review 2026-08-31,
    WeasyPrint predtým blokoval web worker admina) - v teste bez skutočného
    Celery workera nahraď `.delay()` priamym synchrónnym behom, nech testy
    naďalej overujú end-to-end správanie (PDF sa reálne dostane do cache),
    nielen že sa úloha zaradila do fronty."""
    from api.tasks import cache_closed_day_pdf_task

    monkeypatch.setattr(
        cache_closed_day_pdf_task,
        "delay",
        lambda date_str: cache_closed_day_pdf_task.run(date_str),
    )


def test_closing_day_pregenerates_and_caches_pdf(admin_client, monkeypatch):
    """Uzavretie dňa predgeneruje PDF snapshot, ktorý export potom servíruje
    priamo z cache namiesto opätovného renderu (#528)."""
    from django.core.cache import cache

    from api.cache_service import get_closed_day_pdf_cache_key

    _run_pdf_task_inline(monkeypatch)

    close = admin_client.post(
        reverse("closed-day-list"), {"date": TARGET_DATE.isoformat()}, format="json"
    )
    assert close.status_code == status.HTTP_201_CREATED

    cache_key = get_closed_day_pdf_cache_key(TARGET_DATE.isoformat())
    cached_pdf = cache.get(cache_key)
    assert cached_pdf is not None
    assert cached_pdf.startswith(b"%PDF")

    pdf_response = admin_client.get(
        "/api/admin/meal-plans/gramage-dashboard-pdf/",
        {"date": TARGET_DATE.isoformat()},
    )
    assert pdf_response.status_code == status.HTTP_200_OK
    assert pdf_response.content == cached_pdf


def test_closing_day_dispatches_pdf_task_asynchronously(admin_client, monkeypatch):
    """Uzavretie dňa už nesmie čakať na WeasyPrint v requeste admina (code
    review 2026-08-31) - overuje sa dispatch na Celery, nie sync render."""
    from unittest.mock import MagicMock

    from api.tasks import cache_closed_day_pdf_task

    mock_delay = MagicMock()
    monkeypatch.setattr(cache_closed_day_pdf_task, "delay", mock_delay)

    close = admin_client.post(
        reverse("closed-day-list"), {"date": TARGET_DATE.isoformat()}, format="json"
    )

    assert close.status_code == status.HTTP_201_CREATED
    mock_delay.assert_called_once_with(TARGET_DATE.isoformat())


def test_unlocking_day_clears_cached_pdf(admin_client, monkeypatch):
    from django.core.cache import cache

    from api.cache_service import get_closed_day_pdf_cache_key

    _run_pdf_task_inline(monkeypatch)

    admin_client.post(
        reverse("closed-day-list"), {"date": TARGET_DATE.isoformat()}, format="json"
    )
    cache_key = get_closed_day_pdf_cache_key(TARGET_DATE.isoformat())
    assert cache.get(cache_key) is not None

    unlocked = admin_client.delete(
        reverse("closed-day-unlock"),
        {"date": TARGET_DATE.isoformat()},
        format="json",
    )

    assert unlocked.status_code == status.HTTP_200_OK
    assert cache.get(cache_key) is None
