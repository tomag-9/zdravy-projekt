"""Administrátorské zmeny musia po sebe nechať stopu — nielen celky a prevádzky.

Celky a prevádzky sa zapisovali od začiatku, zvyšok admin zoznamov nie: rolu,
jedálniček dňa, sviatok (ktorý rozhoduje, či vôbec pobeží cron), diétu aj trasu
rozvozu sa dalo zmeniť úplne potichu. Tieto testy držia zápis pri všetkých.
"""

import datetime

import pytest
from rest_framework import status

from api.models import Diet, EventLog, Holiday, PortionType

pytestmark = pytest.mark.integration


def _changes(model_label: str):
    return EventLog.objects.filter(
        event_type=EventLog.EventType.SETTINGS_CHANGE, payload__model=model_label
    )


@pytest.mark.django_db
class TestHolidayAudit:
    """Sviatok vypína cron aj objednávky — nesmie sa dať pridať anonymne."""

    def test_creating_a_day_off_is_recorded(self, admin_client, admin_user):
        response = admin_client.post(
            "/api/admin/holidays/",
            {"date": "2026-09-01", "reason": "Firemné voľno"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        event = _changes("api.holiday").get()
        assert event.actor == admin_user
        assert event.payload["changes"]["reason"]["to"] == "Firemné voľno"

    def test_deleting_a_day_off_is_recorded(self, admin_client):
        holiday = Holiday.objects.create(
            date=datetime.date(2026, 9, 1), reason="Firemné voľno"
        )

        response = admin_client.delete(f"/api/admin/holidays/{holiday.pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        event = _changes("api.holiday").get()
        assert event.payload["deleted"] is True
        assert event.payload["object_id"] == holiday.pk


@pytest.mark.django_db
class TestUserAudit:
    def test_role_change_is_recorded(self, admin_client, user):
        response = admin_client.patch(
            f"/api/admin/users/{user.pk}/", {"is_staff": True}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        event = _changes("auth.user").get()
        assert event.payload["changes"]["is_staff"] == {"from": False, "to": True}

    def test_deactivating_a_login_is_recorded(self, admin_client, user):
        admin_client.patch(
            f"/api/admin/users/{user.pk}/", {"is_active": False}, format="json"
        )

        event = _changes("auth.user").get()
        assert event.payload["changes"]["is_active"]["to"] is False

    def test_unchanged_save_writes_nothing(self, admin_client, user):
        """Uloženie bez zmeny je šum — v tabuľke by vyzeralo ako zásah."""
        admin_client.patch(
            f"/api/admin/users/{user.pk}/", {"is_staff": user.is_staff}, format="json"
        )

        assert not _changes("auth.user").exists()

    def test_serializer_only_fields_do_not_break_the_save(self, admin_client, user):
        """`company_name` žije na profile, nie na User — diff ho musí obísť.

        Bez ošetrenia vyhodí `get_field()` FieldDoesNotExist a zhodí uloženie.
        """
        response = admin_client.patch(
            f"/api/admin/users/{user.pk}/",
            {"company_name": "Nová prevádzka"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCatalogAudit:
    def test_diet_change_is_recorded(self, admin_client):
        diet = Diet.objects.create(name="NO MILK")

        admin_client.patch(
            f"/api/diets/{diet.pk}/", {"is_active": False}, format="json"
        )

        event = _changes("api.diet").get()
        assert event.payload["changes"]["is_active"]["to"] is False

    def test_portion_type_change_is_recorded(self, admin_client):
        portion = PortionType.objects.first() or PortionType.objects.create(
            name="Škôlka", coefficient=1
        )

        admin_client.patch(
            f"/api/admin/portion-types/{portion.pk}/",
            {"name": "Škôlka veľká"},
            format="json",
        )

        event = _changes("api.portiontype").get()
        assert event.payload["changes"]["name"]["to"] == "Škôlka veľká"


@pytest.mark.django_db
def test_sensitive_values_are_never_written_to_the_audit():
    """Audit číta každý admin — heslá a tokeny doň nesmú ani omylom."""
    from api.views.audit_mixins import _redact

    redacted = _redact(
        {
            "password": {"from": "staré", "to": "nové"},
            "api_key": {"from": "k1", "to": "k2"},
            "name": {"from": "A", "to": "B"},
        }
    )

    assert redacted["password"] == {"from": "***", "to": "***"}
    assert redacted["api_key"] == {"from": "***", "to": "***"}
    assert redacted["name"] == {"from": "A", "to": "B"}
