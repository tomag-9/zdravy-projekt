"""Unit tests for UserService and NotificationService."""

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from api.models import UserProfile
from api.services import RegistrationError, UserService
from api.services.notification_service import NotificationService

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


def _make_pending_user(email="pending@example.com", email_verified=True):
    """Create a user with a pending UserProfile."""
    user = User.objects.create_user(
        username=email, email=email, password="testpass123", is_active=False
    )
    profile = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "company_name": "Test Company",
            "registration_status": UserProfile.REGISTRATION_PENDING,
            "email_verified": email_verified,
        },
    )[0]
    if profile.registration_status != UserProfile.REGISTRATION_PENDING:
        profile.registration_status = UserProfile.REGISTRATION_PENDING
        profile.email_verified = email_verified
        profile.save()
    return user


# ---------------------------------------------------------------------------
# UserService.get_pending_registrations
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGetPendingRegistrations:
    def test_returns_pending_users_only(self):
        pending = _make_pending_user("p1@example.com")
        approved_user = User.objects.create_user(
            username="ap@example.com", email="ap@example.com"
        )
        UserProfile.objects.filter(user=approved_user).update(
            registration_status=UserProfile.REGISTRATION_APPROVED
        )

        qs = UserService.get_pending_registrations()
        emails = list(qs.values_list("email", flat=True))
        assert pending.email in emails
        assert "ap@example.com" not in emails

    def test_empty_when_no_pending(self):
        qs = UserService.get_pending_registrations()
        assert qs.count() == 0


# ---------------------------------------------------------------------------
# UserService.approve_registration
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestApproveRegistration:
    def test_approve_sets_status_and_activates_user(self):
        user = _make_pending_user(email_verified=True)
        admin = User.objects.create_user(
            username="admin", email="admin@example.com", is_staff=True
        )

        with patch.object(NotificationService, "send_approval_email"):
            result = UserService.approve_registration(user.id, admin)

        result.refresh_from_db()
        assert result.is_active is True
        assert result.profile.registration_status == UserProfile.REGISTRATION_APPROVED
        assert result.profile.approved_by == admin

    def test_approve_user_not_found_raises(self):
        admin = User.objects.create_user(username="adm", email="adm@example.com")
        with pytest.raises(User.DoesNotExist):
            UserService.approve_registration(99999, admin)

    def test_approve_already_approved_raises(self):
        user = _make_pending_user()
        user.profile.registration_status = UserProfile.REGISTRATION_APPROVED
        user.profile.save()
        admin = User.objects.create_user(username="adm2", email="adm2@example.com")

        with pytest.raises(RegistrationError, match="čakajúca"):
            UserService.approve_registration(user.id, admin)

    def test_approve_email_not_verified_raises(self):
        user = _make_pending_user(email_verified=False)
        user.profile.email_verified = False
        user.profile.save()
        admin = User.objects.create_user(username="adm3", email="adm3@example.com")

        with pytest.raises(RegistrationError, match="overený"):
            UserService.approve_registration(user.id, admin)

    def test_approval_email_is_sent(self):
        user = _make_pending_user(email_verified=True)
        admin = User.objects.create_user(username="adm4", email="adm4@example.com")

        with patch.object(NotificationService, "send_approval_email") as mock_send:
            result = UserService.approve_registration(user.id, admin)

        mock_send.assert_called_once_with(result, result.profile.company_name)


# ---------------------------------------------------------------------------
# UserService.deny_registration
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDenyRegistration:
    def test_deny_sets_denied_status(self):
        user = _make_pending_user()
        admin = User.objects.create_user(username="adm5", email="adm5@example.com")

        with patch.object(NotificationService, "send_denial_email"):
            result = UserService.deny_registration(user.id, admin, "Duplicate account")

        result.refresh_from_db()
        assert result.profile.registration_status == UserProfile.REGISTRATION_DENIED
        assert result.profile.denial_reason == "Duplicate account"

    def test_deny_user_not_found_raises(self):
        admin = User.objects.create_user(username="adm6", email="adm6@example.com")
        with pytest.raises(User.DoesNotExist):
            UserService.deny_registration(99999, admin)

    def test_deny_already_denied_raises(self):
        user = _make_pending_user()
        user.profile.registration_status = UserProfile.REGISTRATION_DENIED
        user.profile.save()
        admin = User.objects.create_user(username="adm7", email="adm7@example.com")

        with pytest.raises(RegistrationError, match="čakajúca"):
            UserService.deny_registration(user.id, admin)

    def test_denial_email_is_sent(self):
        user = _make_pending_user()
        admin = User.objects.create_user(username="adm8", email="adm8@example.com")

        with patch.object(NotificationService, "send_denial_email") as mock_send:
            UserService.deny_registration(user.id, admin, "reason")

        mock_send.assert_called_once_with(user, user.profile.company_name, "reason")


# ---------------------------------------------------------------------------
# UserService.register_user
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRegisterUser:
    VALID_DATA = {
        "email": "newuser@example.com",
        "password": "strongpassword123",
        "password_confirm": "strongpassword123",
        "first_name": "Test",
        "last_name": "User",
        "company_name": "Test Corp",
        "phone": "0900123456",
    }

    def test_invalid_data_raises_registration_error(self):
        with patch("api.rate_limit.check_registration_rate_limit"):
            with pytest.raises(RegistrationError):
                UserService.register_user({}, "127.0.0.1")

    def test_rate_limit_exceeded_propagates(self):
        from api.rate_limit import RateLimitExceeded

        with patch(
            "api.rate_limit.check_registration_rate_limit",
            side_effect=RateLimitExceeded(60),
        ):
            with pytest.raises(RateLimitExceeded):
                UserService.register_user(self.VALID_DATA, "127.0.0.1")


# ---------------------------------------------------------------------------
# NotificationService
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotificationService:
    def _user(self, email="notif@example.com"):
        return User.objects.create_user(username=email, email=email)

    def test_send_approval_email_calls_send_mail(self):
        user = self._user()
        with patch("api.services.notification_service.send_mail") as mock_send:
            with patch(
                "api.services.notification_service.render_to_string",
                return_value="<html>",
            ):
                NotificationService.send_approval_email(user, "ACME Corp")

        mock_send.assert_called_once()
        assert user.email in mock_send.call_args.kwargs["recipient_list"]

    def test_send_denial_email_calls_send_mail(self):
        user = self._user("d@example.com")
        with patch("api.services.notification_service.send_mail") as mock_send:
            with patch(
                "api.services.notification_service.render_to_string",
                return_value="<html>",
            ):
                NotificationService.send_denial_email(user, "ACME Corp", "reason")

        mock_send.assert_called_once()

    def test_send_approval_email_logs_error_on_failure(self):
        user = self._user("err@example.com")
        with patch(
            "api.services.notification_service.send_mail",
            side_effect=Exception("SMTP error"),
        ):
            with patch(
                "api.services.notification_service.render_to_string", return_value=""
            ):
                # Should not raise
                NotificationService.send_approval_email(user, "Corp")

    def test_send_denial_email_logs_error_on_failure(self):
        user = self._user("err2@example.com")
        with patch(
            "api.services.notification_service.send_mail", side_effect=Exception("fail")
        ):
            with patch(
                "api.services.notification_service.render_to_string", return_value=""
            ):
                # Should not raise
                NotificationService.send_denial_email(user, "Corp", "reason")
