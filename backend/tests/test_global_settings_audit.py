"""Audit trail for GlobalSettings changes (issue #472).

Deadlines steer the order cut-off, the EduPage scrape and the daily report
schedules. A change to one used to leave no trace at all, so "who moved the
lunch deadline and when" was unanswerable without digging in the DB.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from api.models import EventLog, GlobalSettings

ENDPOINT = "/api/admin/global-settings/"


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="audit-admin@example.com",
        email="audit-admin@example.com",
        password="admin1234",
        is_staff=True,
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def global_settings(db):
    settings, _ = GlobalSettings.objects.get_or_create(pk=1)
    return settings


def _settings_events():
    return EventLog.objects.filter(
        event_type=EventLog.EventType.SETTINGS_CHANGE,
        payload__model=GlobalSettings._meta.label_lower,
    )


@pytest.mark.django_db
class TestGlobalSettingsAudit:
    def test_deadline_change_records_actor_and_old_new_values(
        self, admin_client, admin_user, global_settings
    ):
        global_settings.deadline_lunch = datetime.time(10, 0)
        global_settings.save()

        res = admin_client.post(ENDPOINT, {"deadline_lunch": "07:30:00"}, format="json")
        assert res.status_code == status.HTTP_200_OK

        event = _settings_events().get()
        assert event.actor == admin_user
        assert event.actor_label == "audit-admin@example.com"
        assert event.payload["changes"] == {
            "deadline_lunch": {"from": "10:00:00", "to": "07:30:00"}
        }
        assert "deadline_lunch" in event.summary

    def test_day_before_flag_change_is_logged(self, admin_client, global_settings):
        res = admin_client.post(
            ENDPOINT, {"deadline_breakfast_is_day_before": True}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK

        event = _settings_events().get()
        assert event.payload["changes"] == {
            "deadline_breakfast_is_day_before": {"from": False, "to": True}
        }

    def test_non_deadline_fields_are_logged_too(self, admin_client, global_settings):
        res = admin_client.post(
            ENDPOINT, {"daily_report_enabled": False}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK

        event = _settings_events().get()
        assert event.payload["changes"] == {
            "daily_report_enabled": {"from": True, "to": False}
        }

    def test_no_op_save_writes_no_event(self, admin_client, global_settings):
        global_settings.deadline_lunch = datetime.time(10, 0)
        global_settings.save()

        res = admin_client.post(ENDPOINT, {"deadline_lunch": "10:00:00"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert not _settings_events().exists()

    def test_rejected_payload_writes_no_event(self, admin_client, global_settings):
        res = admin_client.post(
            ENDPOINT, {"report_email_recipients": ["not-an-email"]}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert not _settings_events().exists()

    def test_django_admin_save_is_audited(self, admin_user, global_settings):
        """Changes made through the Django admin land in the same log."""
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory

        from api.admin import GlobalSettingsAdmin

        global_settings.deadline_olovrant = datetime.time(9, 0)
        global_settings.save()

        model_admin = GlobalSettingsAdmin(GlobalSettings, AdminSite())
        request = RequestFactory().post("/admin/")
        request.user = admin_user

        global_settings.deadline_olovrant = datetime.time(15, 30)

        class _Form:
            changed_data = ["deadline_olovrant"]

        model_admin.save_model(request, global_settings, _Form(), change=True)

        event = _settings_events().get()
        assert event.actor == admin_user
        assert event.payload["changes"] == {
            "deadline_olovrant": {"from": "09:00:00", "to": "15:30:00"}
        }

    def test_change_history_renders_recorded_events(
        self, admin_client, admin_user, global_settings
    ):
        from django.contrib.admin.sites import AdminSite

        from api.admin import GlobalSettingsAdmin

        model_admin = GlobalSettingsAdmin(GlobalSettings, AdminSite())
        assert "Zatiaľ žiadne" in model_admin.change_history(global_settings)

        admin_client.post(ENDPOINT, {"deadline_lunch": "07:30:00"}, format="json")

        rendered = model_admin.change_history(global_settings)
        assert "deadline_lunch" in rendered
        assert "audit-admin@example.com" in rendered
