"""
Integration tests for admin user creation onboarding flow.

Covers:
- App user creation triggers account-setup email
- Edupage operation creation does NOT trigger account-setup email
- Email failures do not break user creation
- is_edupage and api_identifier are persisted correctly
- update() propagates is_edupage / api_identifier to UserProfile
"""

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework import status

from api.models import PasswordResetToken, UserProfile

pytestmark = pytest.mark.integration

API_URL = "/api/admin/users/"

_SETUP_EMAIL = "api.email_utils.send_account_setup_email"


@pytest.mark.django_db
class TestAdminUserCreate:
    """Test admin user creation endpoint and onboarding emails."""

    def test_create_app_user_sends_setup_email(self, admin_client):
        """Creating a regular user triggers send_account_setup_email."""
        with patch(_SETUP_EMAIL) as mock_email:
            res = admin_client.post(
                API_URL,
                {
                    "email": "appuser@example.com",
                    "first_name": "App",
                    "last_name": "User",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        mock_email.assert_called_once()
        user = User.objects.get(email="appuser@example.com")
        assert not user.profile.is_edupage
        assert not user.has_usable_password()

    def test_create_app_user_creates_password_reset_token(self, admin_client):
        """Creating a regular user creates a PasswordResetToken for setup link."""
        with patch(
            "api.services.notification_service.NotificationService.send_account_setup_email"
        ):
            res = admin_client.post(
                API_URL,
                {
                    "email": "appsetup@example.com",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="appsetup@example.com")
        token = PasswordResetToken.objects.filter(user=user, used=False).first()
        assert token is not None
        assert token.is_valid

    def test_create_edupage_operation_skips_setup_email(self, admin_client):
        """Creating an Edupage operation does NOT send a setup email."""
        with patch(_SETUP_EMAIL) as mock_email:
            res = admin_client.post(
                API_URL,
                {
                    "email": "skolaeduplast@example.com",
                    "is_edupage": True,
                    "api_identifier": "EXT-001",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        mock_email.assert_not_called()
        user = User.objects.get(email="skolaeduplast@example.com")
        assert user.profile.is_edupage
        assert user.profile.api_identifier == "EXT-001"
        assert not user.has_usable_password()

    def test_email_failure_does_not_break_user_creation(self, admin_client):
        """If the onboarding email fails, the user is still created."""
        with patch(_SETUP_EMAIL, side_effect=Exception("SMTP error")):
            res = admin_client.post(
                API_URL,
                {
                    "email": "failmail@example.com",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="failmail@example.com").exists()

    def test_create_user_defaults_to_not_edupage(self, admin_client):
        """Omitting is_edupage defaults to False."""
        with patch(_SETUP_EMAIL):
            res = admin_client.post(
                API_URL,
                {"email": "defaulttype@example.com", "is_active": True},
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="defaulttype@example.com")
        assert not user.profile.is_edupage

    def test_update_user_propagates_is_edupage(self, admin_client):
        """PATCH on existing user updates is_edupage on UserProfile."""
        user = User.objects.create_user(
            username="updateme@example.com",
            email="updateme@example.com",
            password="pass123",
        )
        UserProfile.objects.create(user=user)

        res = admin_client.patch(
            f"{API_URL}{user.pk}/",
            {"is_edupage": True, "api_identifier": "NEW-ID"},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        user.profile.refresh_from_db()
        assert user.profile.is_edupage
        assert user.profile.api_identifier == "NEW-ID"

    def test_create_user_persists_company_profile_fields(self, admin_client):
        """Creating a user with company_name/ico/dic persists them to UserProfile."""
        with patch(_SETUP_EMAIL):
            res = admin_client.post(
                API_URL,
                {
                    "email": "company@example.com",
                    "is_active": True,
                    "company_name": "Acme s.r.o.",
                    "ico": "12345678",
                    "dic": "2012345678",
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="company@example.com")
        assert user.profile.company_name == "Acme s.r.o."
        assert user.profile.ico == "12345678"
        assert user.profile.dic == "2012345678"

    def test_create_user_without_company_fields_defaults_to_empty(self, admin_client):
        """Creating a user without ico/dic stores empty strings, not NULL."""
        with patch(_SETUP_EMAIL):
            res = admin_client.post(
                API_URL,
                {
                    "email": "nocompany@example.com",
                    "is_active": True,
                },
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="nocompany@example.com")
        assert user.profile.company_name == ""
        assert user.profile.ico == ""
        assert user.profile.dic == ""

    def test_update_user_propagates_company_profile_fields(self, admin_client):
        """PATCH on existing user updates company_name/ico/dic on UserProfile."""
        user = User.objects.create_user(
            username="updatecompany@example.com",
            email="updatecompany@example.com",
            password="pass123",
        )
        UserProfile.objects.create(
            user=user,
            company_name="Old Name",
            ico="00000000",
            dic="",
        )

        res = admin_client.patch(
            f"{API_URL}{user.pk}/",
            {"company_name": "New Name s.r.o.", "ico": "99999999", "dic": "SK99999999"},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        user.profile.refresh_from_db()
        assert user.profile.company_name == "New Name s.r.o."
        assert user.profile.ico == "99999999"
        assert user.profile.dic == "SK99999999"

    def test_update_user_clears_company_fields_when_empty(self, admin_client):
        """PATCH with empty strings clears company_name/ico/dic (no NULL stored)."""
        user = User.objects.create_user(
            username="clearfields@example.com",
            email="clearfields@example.com",
            password="pass123",
        )
        UserProfile.objects.create(
            user=user,
            company_name="Old",
            ico="12345678",
            dic="2012345678",
        )

        res = admin_client.patch(
            f"{API_URL}{user.pk}/",
            {"company_name": "", "ico": "", "dic": ""},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        user.profile.refresh_from_db()
        assert user.profile.company_name == ""
        assert user.profile.ico == ""
        assert user.profile.dic == ""
