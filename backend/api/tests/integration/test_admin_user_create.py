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

from api.models import ClientSettings, Diet, PasswordResetToken, UserProfile
from api.reference_data import DEFAULT_DIET_NAMES, DEFAULT_DIETS

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

    def test_create_ignores_login_level_edupage_fields(self, admin_client):
        """EduPage nastavenie sa presunulo na Celok — /admin/users/ tieto polia
        (is_edupage, api_identifier) už neprijíma. Ak ich klient pošle, sú
        ignorované: login vznikne ako bežný app login a setup email SA pošle."""
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
        mock_email.assert_called_once()
        user = User.objects.get(email="skolaeduplast@example.com")
        assert not user.profile.is_edupage
        assert user.profile.api_identifier == ""
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

    def test_create_user_gets_default_diet_settings(self, admin_client):
        """Creating an operation creates settings with the default enabled diets."""
        for name, description in DEFAULT_DIETS:
            Diet.objects.update_or_create(
                name=name,
                defaults={"description": description, "is_active": True},
            )

        with patch(_SETUP_EMAIL):
            res = admin_client.post(
                API_URL,
                {"email": "defaultdiets@example.com", "is_active": True},
                format="json",
            )

        assert res.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="defaultdiets@example.com")
        settings = ClientSettings.objects.get(user=user)
        assert set(settings.visible_diets.values_list("name", flat=True)) == set(
            DEFAULT_DIET_NAMES
        )
        prevadzka = user.profile.dostupne_prevadzky().get()
        assert set(prevadzka.visible_diets.values_list("name", flat=True)) == set(
            DEFAULT_DIET_NAMES
        )

    def test_update_ignores_login_level_edupage_fields(self, admin_client):
        """PATCH cez /admin/users/ už neprijíma is_edupage/api_identifier
        (presunuté na Celok) — poslané hodnoty sú ignorované, profil ostáva."""
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
        assert not user.profile.is_edupage
        assert user.profile.api_identifier == ""

    def test_create_user_persists_company_name(self, admin_client):
        """company_name ostáva na logine (UserProfile); ico/dic sa presunuli na
        Celok a /admin/users/ ich už neprijíma — poslané sú ignorované."""
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
        # ico/dic už login-level serializer neprijíma → ostávajú prázdne.
        assert user.profile.ico == ""
        assert user.profile.dic == ""

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

    def test_update_user_propagates_company_name(self, admin_client):
        """PATCH aktualizuje company_name na UserProfile; ico/dic (teraz na Celku)
        sú ignorované a ostávajú nezmenené."""
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
        # ico/dic login-level serializer neprijíma → ostávajú pôvodné hodnoty.
        assert user.profile.ico == "00000000"
        assert user.profile.dic == ""

    def test_update_user_clears_company_name_when_empty(self, admin_client):
        """PATCH s prázdnym company_name ho vyčistí (uloží prázdny reťazec, nie NULL)."""
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
            {"company_name": ""},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        user.profile.refresh_from_db()
        assert user.profile.company_name == ""
