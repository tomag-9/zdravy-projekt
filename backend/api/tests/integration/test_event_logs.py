import datetime
from copy import deepcopy
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from api.models import Celok, DailyOrder, EventLog, Prevadzka
from api.services.event_log_service import log_event
from api.tasks import apply_auto_orders_task

pytestmark = pytest.mark.integration


@pytest.mark.django_db
def test_log_event_snapshots_actor_email(admin_user, user):
    event = log_event(
        EventLog.EventType.ORDER_ADMIN_UPDATE,
        actor=admin_user,
        target_user=user,
        summary="Objednávka upravená.",
        payload={"date": datetime.date(2026, 8, 3)},
    )

    assert event.actor_label == admin_user.email
    assert event.target_user == user
    assert event.payload == {"date": "2026-08-03"}


@pytest.mark.django_db
def test_event_log_endpoint_is_admin_only_and_filterable(
    admin_client, authenticated_client, admin_user, user
):
    log_event(
        EventLog.EventType.ORDER_ADMIN_CREATE,
        actor=admin_user,
        target_user=user,
        summary="Prvá udalosť",
    )
    older = log_event(
        EventLog.EventType.AUTO_ORDER_RUN,
        actor_label="cron",
        summary="Cron udalosť",
    )
    EventLog.objects.filter(pk=older.pk).update(
        created_at=timezone.now() - datetime.timedelta(days=10)
    )

    forbidden = authenticated_client.get("/api/admin/event-logs/")
    admin_client.force_authenticate(user=admin_user)
    response = admin_client.get(
        "/api/admin/event-logs/",
        {
            "event_type": EventLog.EventType.ORDER_ADMIN_CREATE,
            "actor": admin_user.pk,
            "date_from": timezone.localdate().isoformat(),
        },
    )

    assert forbidden.status_code == status.HTTP_403_FORBIDDEN
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["count"] == 1
    result = response.json()["results"][0]
    assert result["actor_label"] == admin_user.email
    assert result["target_user_email"] == user.email


@pytest.mark.django_db
def test_event_log_endpoint_rejects_invalid_filters(admin_client):
    response = admin_client.get("/api/admin/event-logs/?actor=invalid")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

    response = admin_client.get("/api/admin/event-logs/?date_from=02-08-2026")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_admin_order_create_and_update_are_audited(admin_client, admin_user, user):
    date = datetime.date(2099, 8, 3)
    initial_data = {
        "breakfast": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}},
        "lunch": {},
        "olovrant": {},
    }
    create_response = admin_client.post(
        reverse("dailyorder-list") + f"?user_id={user.pk}",
        {"date": str(date), "data": initial_data},
        format="json",
    )

    assert create_response.status_code == status.HTTP_201_CREATED
    created_event = EventLog.objects.get(
        event_type=EventLog.EventType.ORDER_ADMIN_CREATE
    )
    assert created_event.actor == admin_user
    assert created_event.target_user == user
    assert created_event.payload["date"] == str(date)
    assert created_event.payload["changed_meals"] == ["breakfast"]
    assert created_event.payload["changes"]["breakfast.Dospelý.menuCounts.A"] == {
        "from": None,
        "to": 2,
    }

    order_id = create_response.json()["id"]
    updated_data = {**initial_data, "lunch": {"Dospelý": {"menuCounts": {"A": 1}}}}
    update_response = admin_client.patch(
        reverse("dailyorder-detail", kwargs={"pk": order_id}) + f"?user_id={user.pk}",
        {"data": updated_data},
        format="json",
    )

    assert update_response.status_code == status.HTTP_200_OK
    updated_event = EventLog.objects.get(
        event_type=EventLog.EventType.ORDER_ADMIN_UPDATE
    )
    assert updated_event.payload["changed_meals"] == ["lunch"]
    assert updated_event.payload["meals"]["lunch"] == updated_data["lunch"]
    assert updated_event.payload["changes"]["lunch.Dospelý.menuCounts.A"] == {
        "from": None,
        "to": 1,
    }


@pytest.mark.django_db
def test_admin_prevadzka_order_create_is_audited_but_self_update_is_not(
    admin_client, admin_user
):
    celok = Celok.objects.create(nazov="Admin audit celok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Admin audit prevádzka")
    date = datetime.date(2099, 8, 4)
    initial_data = {
        "breakfast": {},
        "lunch": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
        "olovrant": {},
    }

    create_response = admin_client.post(
        reverse("dailyorder-list"),
        {"date": str(date), "prevadzka": prevadzka.pk, "data": initial_data},
        format="json",
    )

    assert create_response.status_code == status.HTTP_201_CREATED
    created_event = EventLog.objects.get(
        event_type=EventLog.EventType.ORDER_ADMIN_CREATE
    )
    assert created_event.actor == admin_user
    assert created_event.target_user == admin_user
    assert created_event.payload["changes"]["lunch.Dospelý.menuCounts.A"] == {
        "from": None,
        "to": 1,
    }

    updated_data = deepcopy(initial_data)
    updated_data["lunch"]["Dospelý"]["menuCounts"]["A"] = 3
    update_response = admin_client.patch(
        reverse("dailyorder-detail", kwargs={"pk": create_response.json()["id"]}),
        {"data": updated_data},
        format="json",
    )

    assert update_response.status_code == status.HTTP_200_OK
    assert not EventLog.objects.filter(
        event_type=EventLog.EventType.ORDER_ADMIN_UPDATE
    ).exists()


@pytest.mark.django_db
def test_admin_order_delete_is_audited(admin_client, admin_user, user):
    celok = Celok.objects.create(nazov="Delete audit celok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Delete prevádzka")
    date = datetime.date(2099, 8, 5)
    data = {
        "breakfast": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}},
        "lunch": {},
        "olovrant": {},
    }
    order = DailyOrder.objects.create(
        user=user, prevadzka=prevadzka, date=date, data=data
    )

    response = admin_client.delete(
        reverse("dailyorder-detail", kwargs={"pk": order.pk}) + f"?user_id={user.pk}"
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    event = EventLog.objects.get(event_type=EventLog.EventType.ORDER_ADMIN_DELETE)
    assert event.actor == admin_user
    assert event.target_user == user
    assert event.payload["order_id"] == order.pk
    assert event.payload["changes"]["breakfast.Dospelý.menuCounts.A"] == {
        "from": 2,
        "to": None,
    }


@pytest.mark.django_db
def test_manual_and_cron_auto_order_runs_are_audited(admin_client, admin_user):
    manual_result = {"created": ["a@example.com"], "skipped": 2, "date": "2026-08-03"}
    with patch("api.services.apply_auto_orders", return_value=manual_result):
        response = admin_client.post(
            "/api/admin/trigger-auto-orders/",
            {"date": "2026-08-03"},
            format="json",
        )

    assert response.status_code == status.HTTP_200_OK
    manual_event = EventLog.objects.get(actor=admin_user)
    assert manual_event.payload == {
        "created_count": 1,
        "skipped_count": 2,
        "date": "2026-08-03",
    }

    cron_result = {"created": [], "skipped": 4, "date": "2026-08-04"}
    with patch("api.services.apply_auto_orders", return_value=cron_result):
        assert apply_auto_orders_task.run("2026-08-04") == cron_result

    cron_event = EventLog.objects.get(actor__isnull=True)
    assert cron_event.actor_label == "cron"
    assert cron_event.payload["skipped_count"] == 4


@pytest.mark.django_db
def test_push_sends_are_audited(admin_client, admin_user, user):
    with (
        patch(
            "api.views.push_views.PushNotificationService.is_available",
            return_value=True,
        ),
        patch(
            "api.views.push_views.PushNotificationService.send_to_user",
            return_value={"sent": 1, "stale_removed": 2},
        ),
    ):
        response = admin_client.post(
            "/api/admin/push/send/",
            {"title": "Ahoj", "body": "Správa", "user_id": user.pk},
            format="json",
        )

    assert response.status_code == status.HTTP_200_OK
    event = EventLog.objects.get(event_type=EventLog.EventType.PUSH_BROADCAST)
    assert event.actor == admin_user
    assert event.target_user == user
    assert event.payload == {"sent": 1, "stale_removed": 2, "title": "Ahoj"}


@pytest.mark.django_db
def test_facility_and_edupage_changes_include_field_diffs(admin_client, admin_user):
    create_response = admin_client.post(
        "/api/admin/celky/",
        {"nazov": "Auditovaný celok", "billing_name": "Pôvodný názov"},
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    celok_id = create_response.json()["id"]

    update_response = admin_client.patch(
        f"/api/admin/celky/{celok_id}/",
        {"billing_name": "Nový názov"},
        format="json",
    )
    assert update_response.status_code == status.HTTP_200_OK
    facility_event = EventLog.objects.filter(
        event_type=EventLog.EventType.SETTINGS_CHANGE,
        payload__model="api.celok",
        payload__changes__billing_name__from="Pôvodný názov",
    ).get()
    assert facility_event.actor == admin_user
    assert facility_event.payload["changes"]["billing_name"]["to"] == "Nový názov"

    connection_response = admin_client.post(
        "/api/admin/edupage-connections/",
        {
            "name": "Audit EduPage",
            "mealsguest_url": "https://audit.edupage.org/menu/mealsGuest?id=test",
            "api_identifier": "old",
            "is_active": True,
        },
        format="json",
    )
    assert connection_response.status_code == status.HTTP_201_CREATED
    connection_id = connection_response.json()["id"]
    patch_response = admin_client.patch(
        f"/api/admin/edupage-connections/{connection_id}/",
        {"api_identifier": "new"},
        format="json",
    )
    assert patch_response.status_code == status.HTTP_200_OK
    connection_event = EventLog.objects.filter(
        payload__model="api.edupageconnection",
        payload__changes__api_identifier__from="old",
    ).get()
    assert connection_event.payload["changes"]["api_identifier"]["to"] == "new"
    assert Celok.objects.filter(pk=celok_id).exists()
