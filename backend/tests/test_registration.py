"""
Tests for user registration, email verification, and admin approval flows.
"""

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from api.models import EmailVerificationToken, UserProfile


@pytest.mark.django_db
class TestRegistration:
    """Test user registration endpoint."""

    def test_register_success(self, api_client):
        """Test successful user registration with all required fields."""
        url = reverse("register")
        data = {
            "email": "newcompany@example.com",
            "password": "SecurePass123",
            "password_confirm": "SecurePass123",
            "company_name": "Test Company s.r.o.",
            "ico": "12345678",
            "dic": "SK2020123456",
            "first_name": "John",
            "last_name": "Doe",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "detail" in response.data
        assert "email" in response.data

        # Verify user was created
        user = User.objects.get(username="newcompany@example.com")
        assert user.email == "newcompany@example.com"
        assert not user.is_active  # Should be inactive until approved

        # Verify profile was created
        assert hasattr(user, "profile")
        profile = user.profile
        assert profile.company_name == "Test Company s.r.o."
        assert profile.ico == "12345678"
        assert profile.dic == "SK2020123456"
        assert profile.registration_status == UserProfile.REGISTRATION_PENDING
        assert not profile.email_verified

        # Verify email verification token was created
        assert EmailVerificationToken.objects.filter(user=user).exists()

    def test_register_without_optional_fields(self, api_client):
        """Test registration with only required fields."""
        url = reverse("register")
        data = {
            "email": "minimal@example.com",
            "password": "Password123",
            "password_confirm": "Password123",
            "company_name": "Minimal Company",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username="minimal@example.com")
        assert user.profile.company_name == "Minimal Company"
        assert user.profile.ico == ""
        assert user.profile.dic == ""

    def test_register_password_too_short(self, api_client):
        """Test registration fails with password < 8 characters."""
        url = reverse("register")
        data = {
            "email": "test@example.com",
            "password": "Pass1",
            "password_confirm": "Pass1",
            "company_name": "Test Company",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data

    def test_register_password_no_number(self, api_client):
        """Test registration fails with password without a number."""
        url = reverse("register")
        data = {
            "email": "test@example.com",
            "password": "PasswordOnly",
            "password_confirm": "PasswordOnly",
            "company_name": "Test Company",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data

    def test_register_passwords_dont_match(self, api_client):
        """Test registration fails when passwords don't match."""
        url = reverse("register")
        data = {
            "email": "test@example.com",
            "password": "Password123",
            "password_confirm": "DifferentPass123",
            "company_name": "Test Company",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data

    def test_register_duplicate_email(self, api_client, user):
        """Test registration fails with existing email."""
        url = reverse("register")
        data = {
            "email": "client@example.com",  # Already exists from fixture
            "password": "Password123",
            "password_confirm": "Password123",
            "company_name": "Test Company",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_register_missing_company_name(self, api_client):
        """Test registration fails without company_name."""
        url = reverse("register")
        data = {
            "email": "test@example.com",
            "password": "Password123",
            "password_confirm": "Password123",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "company_name" in response.data


@pytest.mark.django_db
class TestEmailVerification:
    """Test email verification flow."""

    def test_verify_email_success(self, api_client):
        """Test successful email verification."""
        # Create a user with profile
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="Password123",
            is_active=False,
        )
        UserProfile.objects.create(
            user=user,
            company_name="Test Company",
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=False,
        )

        # Create verification token
        token = EmailVerificationToken.objects.create(
            user=user,
            token="test-token-12345",
            expires_at=timezone.now() + timezone.timedelta(hours=24),
        )

        url = reverse("verify_email")
        data = {"token": "test-token-12345"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Verify token was marked as used
        token.refresh_from_db()
        assert token.used

        # Verify profile was updated
        user.profile.refresh_from_db()
        assert user.profile.email_verified

    def test_verify_email_invalid_token(self, api_client):
        """Test email verification with invalid token."""
        url = reverse("verify_email")
        data = {"token": "invalid-token"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_expired_token(self, api_client):
        """Test email verification with expired token."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="Password123",
        )
        UserProfile.objects.create(
            user=user,
            company_name="Test Company",
        )

        # Create expired token
        EmailVerificationToken.objects.create(
            user=user,
            token="expired-token",
            expires_at=timezone.now() - timezone.timedelta(hours=1),
        )

        url = reverse("verify_email")
        data = {"token": "expired-token"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_already_used_token(self, api_client):
        """Test email verification with already used token."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="Password123",
        )
        UserProfile.objects.create(
            user=user,
            company_name="Test Company",
        )

        # Create used token
        EmailVerificationToken.objects.create(
            user=user,
            token="used-token",
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used=True,
        )

        url = reverse("verify_email")
        data = {"token": "used-token"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAdminApproval:
    """Test admin approval/denial of registrations."""

    def test_approve_registration_success(self, api_client, admin_user):
        """Test admin can approve a pending registration."""
        # Create pending user
        user = User.objects.create_user(
            username="pending@example.com",
            email="pending@example.com",
            password="Password123",
            is_active=False,
        )
        profile = UserProfile.objects.create(
            user=user,
            company_name="Pending Company",
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=True,
        )

        # Admin approves
        api_client.force_authenticate(user=admin_user)
        url = reverse("pending-registrations-approve", kwargs={"pk": user.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verify user is now active and approved
        user.refresh_from_db()
        profile.refresh_from_db()
        assert user.is_active
        assert profile.registration_status == UserProfile.REGISTRATION_APPROVED
        assert profile.approval_date is not None
        assert profile.approved_by == admin_user

    def test_approve_registration_without_email_verification(
        self, api_client, admin_user
    ):
        """Test admin cannot approve registration without email verification."""
        user = User.objects.create_user(
            username="pending@example.com",
            email="pending@example.com",
            password="Password123",
            is_active=False,
        )
        UserProfile.objects.create(
            user=user,
            company_name="Pending Company",
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=False,  # Not verified
        )

        api_client.force_authenticate(user=admin_user)
        url = reverse("pending-registrations-approve", kwargs={"pk": user.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_deny_registration_success(self, api_client, admin_user):
        """Test admin can deny a pending registration."""
        user = User.objects.create_user(
            username="pending@example.com",
            email="pending@example.com",
            password="Password123",
            is_active=False,
        )
        profile = UserProfile.objects.create(
            user=user,
            company_name="Pending Company",
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=True,
        )

        api_client.force_authenticate(user=admin_user)
        url = reverse("pending-registrations-deny", kwargs={"pk": user.id})
        data = {"reason": "Invalid company details"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Verify profile was denied
        profile.refresh_from_db()
        assert profile.registration_status == UserProfile.REGISTRATION_DENIED
        assert profile.denial_reason == "Invalid company details"
        assert profile.approved_by == admin_user

    def test_list_pending_registrations(self, api_client, admin_user):
        """Test admin can list pending registrations."""
        # Create pending users
        for i in range(3):
            user = User.objects.create_user(
                username=f"pending{i}@example.com",
                email=f"pending{i}@example.com",
                password="Password123",
                is_active=False,
            )
            UserProfile.objects.create(
                user=user,
                company_name=f"Pending Company {i}",
                registration_status=UserProfile.REGISTRATION_PENDING,
                email_verified=(i % 2 == 0),  # Alternate verified/unverified
            )

        api_client.force_authenticate(user=admin_user)
        url = reverse("pending-registrations-list")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_non_admin_cannot_approve(self, api_client, user):
        """Test non-admin users cannot approve registrations."""
        pending_user = User.objects.create_user(
            username="pending@example.com",
            email="pending@example.com",
            password="Password123",
            is_active=False,
        )
        UserProfile.objects.create(
            user=pending_user,
            company_name="Pending Company",
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=True,
        )

        api_client.force_authenticate(user=user)  # Regular user, not admin
        url = reverse("pending-registrations-approve", kwargs={"pk": pending_user.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
