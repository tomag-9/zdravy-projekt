"""
Tests for:
- GlobalSettings.report_email_recipients (model + API)
- send_order_report management command
- send_daily_report_email utility
"""

import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.models import User
from django.core import management
from rest_framework import status
from rest_framework.test import APIClient

from api.models import GlobalSettings

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin@example.com",
        email="admin@example.com",
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


# ---------------------------------------------------------------------------
# Model field
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReportEmailRecipientsModel:
    def test_default_is_empty_list(self, global_settings):
        assert global_settings.report_email_recipients == []

    def test_save_and_retrieve(self, global_settings):
        global_settings.report_email_recipients = ["a@example.com", "b@example.com"]
        global_settings.save()
        reloaded = GlobalSettings.objects.get(pk=global_settings.pk)
        assert reloaded.report_email_recipients == ["a@example.com", "b@example.com"]


# ---------------------------------------------------------------------------
# Global-settings API
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGlobalSettingsAPI:
    ENDPOINT = "/api/admin/global-settings/"

    def test_read_returns_recipients_field(self, admin_client, global_settings):
        global_settings.report_email_recipients = ["test@example.com"]
        global_settings.save()

        res = admin_client.get(self.ENDPOINT)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["report_email_recipients"] == ["test@example.com"]

    def test_update_recipients(self, admin_client, global_settings):
        res = admin_client.post(
            self.ENDPOINT,
            {"report_email_recipients": ["one@x.com", "two@x.com"]},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert set(res.data["report_email_recipients"]) == {"one@x.com", "two@x.com"}

        global_settings.refresh_from_db()
        assert "one@x.com" in global_settings.report_email_recipients

    def test_invalid_email_rejected(self, admin_client, global_settings):
        res = admin_client.post(
            self.ENDPOINT,
            {"report_email_recipients": ["not-an-email"]},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_list_accepted(self, admin_client, global_settings):
        global_settings.report_email_recipients = ["old@x.com"]
        global_settings.save()

        res = admin_client.post(
            self.ENDPOINT,
            {"report_email_recipients": []},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["report_email_recipients"] == []

    def test_non_admin_cannot_write(self, db):
        regular_user = User.objects.create_user(
            username="u@x.com", email="u@x.com", password="pass1234"
        )
        client = APIClient()
        client.force_authenticate(user=regular_user)
        res = client.post(
            self.ENDPOINT,
            {"report_email_recipients": ["x@x.com"]},
            format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_non_admin_read_hides_recipients(self, db, global_settings):
        """Non-admin users must not see report_email_recipients (PII)."""
        global_settings.report_email_recipients = ["secret@example.com"]
        global_settings.save()

        regular_user = User.objects.create_user(
            username="r@x.com", email="r@x.com", password="pass1234"
        )
        client = APIClient()
        client.force_authenticate(user=regular_user)
        res = client.get(self.ENDPOINT)
        assert res.status_code == status.HTTP_200_OK
        assert "report_email_recipients" not in res.data


# ---------------------------------------------------------------------------
# send_order_report management command
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendOrderReportCommand:
    def test_skips_when_no_recipients(self, global_settings, capsys):
        global_settings.report_email_recipients = []
        global_settings.save()

        management.call_command("send_order_report", "--days=1")

        captured = capsys.readouterr()
        assert (
            "No report email recipients" in captured.out or "Skipping" in captured.out
        )

    @patch("api.management.commands.send_order_report.send_daily_report_email")
    def test_sends_email_to_configured_recipients(self, mock_send, global_settings, db):
        global_settings.report_email_recipients = ["report@example.com"]
        global_settings.save()

        target_date = datetime.date.today() - datetime.timedelta(days=1)
        management.call_command("send_order_report", "--days=1")

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["recipients"] == ["report@example.com"]
        assert call_kwargs["report_date"] == target_date.isoformat()
        assert call_kwargs["attachment_filename"].endswith(".xlsx")

    @patch("api.management.commands.send_order_report.send_daily_report_email")
    def test_explicit_date_flag(self, mock_send, global_settings, db):
        global_settings.report_email_recipients = ["r@example.com"]
        global_settings.save()

        fixed_date = "2024-06-15"  # a past Saturday — safe fixed date for assertions
        management.call_command("send_order_report", f"--date={fixed_date}")

        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["report_date"] == fixed_date

    @patch("api.management.commands.send_order_report.send_daily_report_email")
    def test_report_includes_order_data(self, mock_send, global_settings, admin_user):
        """XLSX bytes should be non-empty even when there are no orders."""
        global_settings.report_email_recipients = ["r@example.com"]
        global_settings.save()

        management.call_command("send_order_report", "--days=1")

        call_kwargs = mock_send.call_args.kwargs
        assert len(call_kwargs["attachment_bytes"]) > 0

    def test_invalid_date_exits_gracefully(self, global_settings, capsys):
        global_settings.report_email_recipients = ["r@example.com"]
        global_settings.save()

        management.call_command("send_order_report", "--date=not-a-date")

        captured = capsys.readouterr()
        assert "Invalid date" in captured.err


# ---------------------------------------------------------------------------
# send_daily_report_email utility
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendDailyReportEmail:
    @patch("api.email_utils.EmailMessage")
    def test_attaches_xlsx_and_sends(self, MockEmailMessage):
        from api.email_utils import send_daily_report_email

        mock_instance = MagicMock()
        MockEmailMessage.return_value = mock_instance

        send_daily_report_email(
            recipients=["a@x.com", "b@x.com"],
            report_date="2026-02-25",
            attachment_bytes=b"fake-xlsx-content",
            attachment_filename="prehlad_2026-02-25.xlsx",
        )

        MockEmailMessage.assert_called_once()
        call_kwargs = MockEmailMessage.call_args.kwargs
        assert call_kwargs["to"] == ["a@x.com", "b@x.com"]
        assert "2026-02-25" in call_kwargs["subject"]

        mock_instance.attach.assert_called_once_with(
            "prehlad_2026-02-25.xlsx",
            b"fake-xlsx-content",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        mock_instance.send.assert_called_once_with(fail_silently=False)

    @patch("api.email_utils.EmailMessage")
    def test_breakfast_only_report_subject(self, MockEmailMessage):
        from api.email_utils import send_daily_report_email

        mock_instance = MagicMock()
        MockEmailMessage.return_value = mock_instance

        send_daily_report_email(
            recipients=["report@example.com"],
            report_date="2026-02-25",
            attachment_bytes=b"fake-xlsx-content",
            attachment_filename="prehlad_2026-02-25.xlsx",
            meals=["breakfast"],
        )

        call_kwargs = MockEmailMessage.call_args.kwargs
        assert "Raňajky" in call_kwargs["subject"]
        assert "2026-02-25" in call_kwargs["subject"]


# ---------------------------------------------------------------------------
# Periodic task creation and syncing
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPeriodicTaskSync:
    """Test that PeriodicTasks are created when recipients are configured."""

    def test_periodic_tasks_created_when_recipients_set(self, global_settings):
        """Saving GlobalSettings with recipients should create PeriodicTasks."""
        from django_celery_beat.models import PeriodicTask

        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

        # Clear any existing tasks
        PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).delete()

        # Set recipients and save
        global_settings.report_email_recipients = ["report@example.com"]
        global_settings.save()

        # Verify tasks were created
        task_breakfast = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_BREAKFAST
        ).first()
        task_all = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_ALL
        ).first()

        assert task_breakfast is not None, "Breakfast task should be created"
        assert task_all is not None, "Full report task should be created"
        assert task_breakfast.enabled is True
        assert task_all.enabled is True

    def test_periodic_tasks_skipped_when_no_recipients(self, global_settings):
        """Saving GlobalSettings without recipients should not create tasks."""
        from django_celery_beat.models import PeriodicTask

        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

        # Ensure recipients are empty
        global_settings.report_email_recipients = []
        global_settings.save()

        # Clear any existing tasks
        count, _ = PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).delete()

        # Re-save with empty recipients
        global_settings.save()

        # Verify no tasks created (since recipients empty)
        task_breakfast = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_BREAKFAST
        ).first()
        task_all = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_ALL
        ).first()

        assert (
            task_breakfast is None
        ), "Breakfast task should not be created (no recipients)"
        assert (
            task_all is None
        ), "Full report task should not be created (no recipients)"

    def test_sync_periodic_tasks_management_command(self, global_settings):
        """sync_periodic_tasks command should create missing tasks."""
        from django_celery_beat.models import PeriodicTask

        from api.signals import (
            PERIODIC_TASK_NAME_REPORT_ALL,
            PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        )

        global_settings.report_email_recipients = ["test@example.com"]
        global_settings.save()

        # Clear tasks to simulate the bug
        PeriodicTask.objects.filter(
            name__in=[
                PERIODIC_TASK_NAME_REPORT_BREAKFAST,
                PERIODIC_TASK_NAME_REPORT_ALL,
            ]
        ).delete()

        # Run sync command
        management.call_command("sync_periodic_tasks")

        # Verify tasks created
        task_breakfast = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_BREAKFAST
        ).first()
        task_all = PeriodicTask.objects.filter(
            name=PERIODIC_TASK_NAME_REPORT_ALL
        ).first()

        assert task_breakfast is not None
        assert task_all is not None
        assert task_breakfast.enabled is True
        assert task_all.enabled is True
