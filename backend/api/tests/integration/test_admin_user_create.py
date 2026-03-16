"""
Integration tests for admin user creation onboarding flow.

Covers:
- App user creation triggers account-setup email
- API user creation triggers registration notification email
- Email failures do not break user creation
- client_type and api_identifier are persisted correctly
- update() propagates client_type / api_identifier to UserProfile
"""

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework import status

from api.models import PasswordResetToken, UserProfile

pytestmark = pytest.mark.integration

API_URL = "/api/admin/users/"

# send_account_setup_email is imported lazily inside perform_create, so patch
# it at its definition site (api.email_utils), not at api.views.admin_views.
_SETUP_EMAIL = "api.email_utils.send_account_setup_email"
_API_EMAIL = "api.services.notification_service.NotificationService.send_api_user_registered_email"


@pytest.mark.django_db
class TestAdminUserCreate:
    """Test admin user creation endpoint and onboarding emails."""

    def test_create_app_user_sends_setup_email(self, admin_client):
        """Creating an App user triggers send_account_setup_email."""
        with patch(_SETUP_EMAIL) as mock_email:
            res = admin_client.post(
                API_URL,
                {
                    "email": "appuser@example.com",
                    "first_name": "App",
                    "last_name": "User",
                    "client_type": "app",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        mock_email.assert_called_once()
        user = User.objects.get(email="appuser@example.com")
        assert user.profile.client_type == UserProfile.CLIENT_TYPE_APP
        assert not user.has_usable_password()

    def test_create_app_user_creates_password_reset_token(self, admin_client):
        """Creating an App user creates a PasswordResetToken for setup link."""
        with patch(
            "api.services.notification_service.NotificationService.send_account_setup_email"
        ):
            res = admin_client.post(
                API_URL,
                {
                    "email": "appsetup@example.com",
                    "client_type": "app",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="appsetup@example.com")
        token = PasswordResetToken.objects.filter(user=user, used=False).first()
        assert token is not None
        assert token.is_valid

    def test_create_api_user_sends_registration_email(self, admin_client):
        """Creating an API user triggers send_api_user_registered_email."""
        with patch(_API_EMAIL) as mock_email:
            res = admin_client.post(
                API_URL,
                {
                    "email": "apiuser@example.com",
                    "client_type": "api",
                    "api_identifier": "EXT-001",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        mock_email.assert_called_once()
        user = User.objects.get(email="apiuser@example.com")
        assert user.profile.client_type == UserProfile.CLIENT_TYPE_API
        assert user.profile.api_identifier == "EXT-001"
        assert not user.has_usable_password()

    def test_create_api_user_no_password_reset_token(self, admin_client):
        """API user creation does not create a PasswordResetToken."""
        with patch(_API_EMAIL):
            res = admin_client.post(
                API_URL,
                {
                    "email": "apinotoken@example.com",
                    "client_type": "api",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="apinotoken@example.com")
        assert not PasswordResetToken.objects.filter(user=user).exists()

    def test_email_failure_does_not_break_user_creation(self, admin_client):
        """If the onboarding email fails, the user is still created."""
        with patch(_SETUP_EMAIL, side_effect=Exception("SMTP error")):
            res = admin_client.post(
                API_URL,
                {
                    "email": "failmail@example.com",
                    "client_type": "app",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="failmail@example.com").exists()

    def test_create_user_defaults_to_app_type(self, admin_client):
        """Omitting client_type defaults to APP_USER."""
        with patch(_SETUP_EMAIL):
            res = admin_client.post(
                API_URL,
                {"email": "defaulttype@example.com", "is_active": True},
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="defaulttype@example.com")
        assert user.profile.client_type == UserProfile.CLIENT_TYPE_APP

    def test_update_user_propagates_client_type(self, admin_client):
        """PATCH on existing user updates client_type on UserProfile."""
        user = User.objects.create_user(
            username="updateme@example.com",
            email="updateme@example.com",
            password="pass123",
        )
        UserProfile.objects.create(user=user, client_type=UserProfile.CLIENT_TYPE_APP)

        res = admin_client.patch(
            f"{API_URL}{user.pk}/",
            {"client_type": "api", "api_identifier": "NEW-ID"},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        user.profile.refresh_from_db()
        assert user.profile.client_type == UserProfile.CLIENT_TYPE_API
        assert user.profile.api_identifier == "NEW-ID"
