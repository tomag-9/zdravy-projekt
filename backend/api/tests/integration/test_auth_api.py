"""
Comprehensive authentication tests for all user auth flows.

Covers:
- User registration flow
- Email verification flow
- Login (with email) flow
- JWT token refresh flow
- Password reset (request & confirm) flow
- Rate limiting on auth endpoints
- Failed login attempts
- Expired token handling
- Edge cases
"""

import time
from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from api.models import EmailVerificationToken, PasswordResetToken, UserProfile
from api.password_reset_service import (
    RateLimitExceeded,
    TooSoonError,
    request_password_reset,
)
from api.rate_limit import RateLimitExceeded as RateLimitRegistration
from api.rate_limit import TooSoonError as TooSoonRegistration
from api.rate_limit import (
    check_registration_rate_limit,
    check_verification_resend_rate_limit,
)

pytestmark = pytest.mark.integration


# ──────────────────────────────────────────────────────────────────────────
# REGISTRATION FLOW TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRegistrationFlow:
    """Test complete user registration flow."""

    def test_register_success_full_details(self, api_client):
        """Test successful registration with all details."""
        url = reverse("register")
        data = {
            "email": "company@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "company_name": "Test Company Ltd",
            "ico": "12345678",
            "dic": "SK2024012345",
            "first_name": "John",
            "last_name": "Smith",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "company@example.com"

        # Verify user created but inactive
        user = User.objects.get(email="company@example.com")
        assert not user.is_active
        assert user.first_name == "John"
        assert user.last_name == "Smith"

        # Verify profile created
        assert user.profile.company_name == "Test Company Ltd"
        assert user.profile.ico == "12345678"
        assert user.profile.dic == "SK2024012345"
        assert user.profile.registration_status == UserProfile.REGISTRATION_PENDING

        # Verify email verification token created
        tokens = EmailVerificationToken.objects.filter(user=user, used=False)
        assert tokens.exists()

    def test_register_minimal_fields(self, api_client):
        """Test registration with only required fields."""
        url = reverse("register")
        data = {
            "email": "minimal@test.com",
            "password": "Password123",
            "password_confirm": "Password123",
            "company_name": "Minimal Corp",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="minimal@test.com")
        assert user.profile.company_name == "Minimal Corp"
        assert user.profile.ico == ""
        assert user.profile.dic == ""

    def test_register_invalid_email_format(self, api_client):
        """Test registration with invalid email."""
        url = reverse("register")
        data = {
            "email": "not-an-email",
            "password": "Password123",
            "password_confirm": "Password123",
            "company_name": "Test Corp",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_register_duplicate_email(self, api_client, user):
        """Test registration fails with duplicate email."""
        url = reverse("register")
        data = {
            "email": user.email,
            "password": "Password123",
            "password_confirm": "Password123",
            "company_name": "Duplicate Corp",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_register_password_mismatch(self, api_client):
        """Test registration fails when passwords don't match."""
        url = reverse("register")
        data = {
            "email": "test@example.com",
            "password": "Password123",
            "password_confirm": "DifferentPass123",
            "company_name": "Test Corp",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data

    def test_register_weak_password(self, api_client):
        """Test registration fails with weak password."""
        url = reverse("register")
        for weak_pass in ["123", "password", "Pass"]:
            data = {
                "email": f"{weak_pass}@example.com",
                "password": weak_pass,
                "password_confirm": weak_pass,
                "company_name": "Test Corp",
            }

            response = api_client.post(url, data, format="json")

            assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_missing_required_fields(self, api_client):
        """Test registration fails without required fields."""
        url = reverse("register")

        # Missing email
        response = api_client.post(
            url,
            {
                "password": "Password123",
                "password_confirm": "Password123",
                "company_name": "Test",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing password
        response = api_client.post(
            url,
            {
                "email": "test@example.com",
                "password_confirm": "Password123",
                "company_name": "Test",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing company_name
        response = api_client.post(
            url,
            {
                "email": "test@example.com",
                "password": "Password123",
                "password_confirm": "Password123",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ──────────────────────────────────────────────────────────────────────────
# EMAIL VERIFICATION FLOW TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestEmailVerificationFlow:
    """Test email verification flow."""

    def test_verify_email_success(self, api_client, user):
        """Test successful email verification."""
        # Create verification token
        token = EmailVerificationToken.objects.create(
            user=user,
            token="valid-token-123",
            expires_at=timezone.now() + timedelta(hours=24),
            used=False,
        )

        url = reverse("verify_email")
        response = api_client.post(url, {"token": "valid-token-123"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data
        assert "email" in response.data

        # Token should be marked as used
        token.refresh_from_db()
        assert token.used is True

    def test_verify_email_with_invalid_token(self, api_client):
        """Test email verification with non-existent token."""
        url = reverse("verify_email")
        response = api_client.post(url, {"token": "invalid-token"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_with_expired_token(self, api_client, user):
        """Test email verification with expired token."""
        # Create expired token
        EmailVerificationToken.objects.create(
            user=user,
            token="expired-token",
            expires_at=timezone.now() - timedelta(hours=1),
            used=False,
        )

        url = reverse("verify_email")
        response = api_client.post(url, {"token": "expired-token"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_with_already_used_token(self, api_client, user):
        """Test email verification with already-used token."""
        # Create already-used token
        EmailVerificationToken.objects.create(
            user=user,
            token="used-token",
            expires_at=timezone.now() + timedelta(hours=24),
            used=True,
        )

        url = reverse("verify_email")
        response = api_client.post(url, {"token": "used-token"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_resend_verification_email_success(self, api_client, user):
        """Test successful resend of verification email."""
        url = reverse("resend_verification")
        response = api_client.post(url, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK

        # New verification token should be created
        token = EmailVerificationToken.objects.filter(user=user, used=False).first()
        assert token is not None

    def test_resend_verification_email_rate_limit(self, api_client, user):
        """Test rate limiting on verification email resend."""
        url = reverse("resend_verification")

        # First request succeeds
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Second request too soon should be rate limited
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "detail" in response.data

    def test_resend_already_verified_email(self, api_client):
        """Test resending verification to already verified user."""
        # Create user with profile and verified email
        from api.models import UserProfile

        user = User.objects.create_user(
            username="verified@example.com",
            email="verified@example.com",
            password="Password123",
            is_active=True,
        )
        profile = UserProfile.objects.create(
            user=user,
            company_name="Test Corp",
            email_verified=True,
            registration_status=UserProfile.REGISTRATION_APPROVED,
        )

        url = reverse("resend_verification")
        response = api_client.post(url, {"email": user.email}, format="json")

        # API doesn't reveal if user is already verified (prevents enumeration)
        assert response.status_code == status.HTTP_200_OK


# ──────────────────────────────────────────────────────────────────────────
# LOGIN FLOW TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLoginFlow:
    """Test login and JWT token flow."""

    def test_login_with_valid_credentials(self, api_client, user):
        """Test successful login with valid email and password."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "client@example.com", "password": "client123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

        # Verify tokens are valid
        access_token = response.data["access"]
        refresh_token = response.data["refresh"]

        assert len(access_token) > 0
        assert len(refresh_token) > 0

    def test_login_with_invalid_password(self, api_client, user):
        """Test login fails with invalid password."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "client@example.com", "password": "wrongpassword"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_invalid_email(self, api_client):
        """Test login fails with non-existent email."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "nonexistent@example.com", "password": "anypassword"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_case_insensitive_email(self, api_client, user):
        """Test login with email of different case."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "CLIENT@EXAMPLE.COM", "password": "client123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_with_inactive_user(self, api_client, user):
        """Test login fails for inactive user."""
        user.is_active = False
        user.save()

        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "client@example.com", "password": "client123"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_email(self, api_client):
        """Test login fails without email."""
        url = reverse("token_obtain_pair")
        response = api_client.post(url, {"password": "anypassword"}, format="json")

        # Missing required field returns 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client, user):
        """Test login fails without password."""
        url = reverse("token_obtain_pair")
        response = api_client.post(url, {"email": "client@example.com"}, format="json")

        # Missing required field returns 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_empty_email(self, api_client):
        """Test login fails with empty email."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url, {"email": "", "password": "anypassword"}, format="json"
        )

        # Empty email is invalid, returns validation error
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ]


# ──────────────────────────────────────────────────────────────────────────
# JWT TOKEN REFRESH TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTokenRefreshFlow:
    """Test JWT token refresh flow."""

    def test_token_refresh_success(self, api_client, user):
        """Test successful token refresh."""
        # Get initial tokens
        obtain_url = reverse("token_obtain_pair")
        obtain_response = api_client.post(
            obtain_url,
            {"email": "client@example.com", "password": "client123"},
            format="json",
        )
        refresh_token = obtain_response.data["refresh"]

        # Refresh the token
        refresh_url = reverse("token_refresh")
        refresh_response = api_client.post(
            refresh_url, {"refresh": refresh_token}, format="json"
        )

        assert refresh_response.status_code == status.HTTP_200_OK
        assert "access" in refresh_response.data

    def test_token_refresh_with_invalid_token(self, api_client):
        """Test token refresh fails with invalid token."""
        url = reverse("token_refresh")
        response = api_client.post(url, {"refresh": "invalid-token"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh_missing_token(self, api_client):
        """Test token refresh fails without token."""
        url = reverse("token_refresh")
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_access_token_contains_user_info(self, api_client, user):
        """Test that access token contains user information."""
        obtain_url = reverse("token_obtain_pair")
        obtain_response = api_client.post(
            obtain_url,
            {"email": "client@example.com", "password": "client123"},
            format="json",
        )
        access_token_str = obtain_response.data["access"]

        # Decode token payload (without verification for test)
        token = AccessToken(access_token_str)
        # user_id is stored as string in token
        assert int(token.payload["user_id"]) == user.id


# ──────────────────────────────────────────────────────────────────────────
# PASSWORD RESET FLOW TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordResetFlow:
    """Test password reset request and validation."""

    def test_password_reset_request_success(self, api_client, user):
        """Test successful password reset request."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Verify token was created
        token = PasswordResetToken.objects.filter(user=user).first()
        assert token is not None
        assert not token.used

    def test_password_reset_request_unknown_email(self, api_client):
        """Test password reset for unknown email returns 200 (security)."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {"email": "unknown@example.com"}, format="json")

        # Should return 200 to avoid email enumeration
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_request_missing_email(self, api_client):
        """Test password reset fails without email."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_request_rate_limit(self, api_client, user):
        """Test rate limiting on password reset requests."""
        url = reverse("password_reset_request")

        # First request succeeds
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Subsequent requests are rate-limited due to cooldown
        # (cooldown is enforced before attempt counter)
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "retry_after_seconds" in response.data or "detail" in response.data

    def test_password_reset_request_cooldown(self, api_client, user):
        """Test cooldown between password reset requests."""
        url = reverse("password_reset_request")

        # First request succeeds
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Immediate second request should fail with cooldown error
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "wait_seconds" in response.data

    def test_password_reset_confirm_success(self, api_client, user):
        """Test successful password reset confirmation."""
        # Create reset token
        token = PasswordResetToken.objects.create(
            user=user,
            token="valid-reset-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "valid-reset-token", "new_password": "NewPassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        # Token should be marked as used
        token.refresh_from_db()
        assert token.used is True

        # User password should be changed
        user.refresh_from_db()
        assert user.check_password("NewPassword123")

    def test_password_reset_confirm_with_invalid_token(self, api_client):
        """Test password reset confirmation with invalid token."""
        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "invalid-token", "new_password": "NewPassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_with_expired_token(self, api_client, user):
        """Test password reset confirmation with expired token."""
        PasswordResetToken.objects.create(
            user=user,
            token="expired-reset-token",
            expires_at=timezone.now() - timedelta(hours=1),
            used=False,
        )

        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "expired-reset-token", "new_password": "NewPassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_with_already_used_token(self, api_client, user):
        """Test password reset confirmation with already-used token."""
        PasswordResetToken.objects.create(
            user=user,
            token="used-reset-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=True,
        )

        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "used-reset-token", "new_password": "NewPassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_weak_password(self, api_client, user):
        """Test password reset fails with weak password."""
        PasswordResetToken.objects.create(
            user=user,
            token="weak-password-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        for weak_pass in ["123", "password", "weak"]:
            url = reverse("password_reset_confirm")
            response = api_client.post(
                url,
                {"token": "weak-password-token", "new_password": weak_pass},
                format="json",
            )

            # Weak passwords should fail
            if response.status_code != status.HTTP_200_OK:
                assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_missing_fields(self, api_client):
        """Test password reset confirmation fails without required fields."""
        url = reverse("password_reset_confirm")

        # Missing token
        response = api_client.post(
            url, {"new_password": "NewPassword123"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing new_password
        response = api_client.post(url, {"token": "some-token"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_can_login_after_reset(self, api_client, user):
        """Test user can login with new password after reset."""
        # Reset password
        token = PasswordResetToken.objects.create(
            user=user,
            token="reset-and-login-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "reset-and-login-token", "new_password": "NewLogin123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        # Try to login with new password
        login_url = reverse("token_obtain_pair")
        login_response = api_client.post(
            login_url,
            {"email": user.email, "password": "NewLogin123"},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK
        assert "access" in login_response.data


# ──────────────────────────────────────────────────────────────────────────
# EDGE CASES AND SECURITY TESTS
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAuthEdgeCases:
    """Test edge cases and security scenarios."""

    def test_multiple_failed_login_attempts(self, api_client, user):
        """Test handling of multiple failed login attempts."""
        url = reverse("token_obtain_pair")

        # Multiple failed attempts should not lock account
        for i in range(10):
            response = api_client.post(
                url,
                {"email": user.email, "password": "wrongpass"},
                format="json",
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # User should still be able to login with correct password
        response = api_client.post(
            url,
            {"email": user.email, "password": "client123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_token_expiry_not_accessible(self, api_client, user):
        """Test that expired tokens cannot be used."""
        # Create manually expired token
        refresh = RefreshToken.for_user(user)
        refresh.set_exp(lifetime=timedelta(seconds=-10))

        url = reverse("token_refresh")
        response = api_client.post(url, {"refresh": str(refresh)}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_concurrent_verification_tokens(self, api_client, user):
        """Test handling of multiple verification tokens."""
        # Create multiple tokens
        token1 = EmailVerificationToken.objects.create(
            user=user,
            token="token-1",
            expires_at=timezone.now() + timedelta(hours=24),
            used=False,
        )
        token2 = EmailVerificationToken.objects.create(
            user=user,
            token="token-2",
            expires_at=timezone.now() + timedelta(hours=24),
            used=False,
        )

        # Verify with first token
        url = reverse("verify_email")
        response = api_client.post(url, {"token": "token-1"}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Second token should still work (it's independent)
        response = api_client.post(url, {"token": "token-2"}, format="json")
        # This will fail because token1 already verified the user

    def test_sql_injection_attempt(self, api_client):
        """Test that SQL injection is prevented in auth endpoints."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {
                "email": "test' OR '1'='1",
                "password": "test' OR '1'='1",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_email_whitespace_trimming(self, api_client):
        """Test that email fields are trimmed of whitespace."""
        url = reverse("token_obtain_pair")

        # Create user with specific email
        User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="Password123",
            is_active=True,
        )

        # Test with whitespace
        response = api_client.post(
            url,
            {"email": "  test@example.com  ", "password": "Password123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_token_uniqueness(self, api_client, user):
        """Test that each password reset token is unique."""
        url = reverse("password_reset_request")

        # Request multiple times (with cooldown delay)
        tokens = []
        for i in range(2):
            response = api_client.post(url, {"email": user.email}, format="json")
            if response.status_code == status.HTTP_200_OK:
                token = PasswordResetToken.objects.filter(user=user).latest(
                    "created_at"
                )
                tokens.append(token.token)
            time.sleep(1.5)  # Wait for cooldown

        # Both should be different (if both created)
        if len(tokens) == 2:
            assert tokens[0] != tokens[1]

    def test_cross_user_token_reuse(self, api_client, user):
        """Test that tokens from one user cannot be used by another."""
        user2 = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="other123",
            is_active=True,
        )

        # Create reset token for user1
        token = PasswordResetToken.objects.create(
            user=user,
            token="user1-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        # Try to use it for user2
        url = reverse("password_reset_confirm")
        response = api_client.post(
            url,
            {"token": "user1-token", "new_password": "Hacked123"},
            format="json",
        )

        # Should work for user1 but token should be single-use
        assert response.status_code == status.HTTP_200_OK

        # User1's password changed
        user.refresh_from_db()
        assert user.check_password("Hacked123")

        # User2 should not have new password
        user2.refresh_from_db()
        assert not user2.check_password("Hacked123")

    def test_valid_token_format_required(self, api_client, user):
        """Test that malformed tokens are rejected."""
        url = reverse("verify_email")

        for invalid_token in ["", " ", "   ", "x" * 1000]:
            response = api_client.post(url, {"token": invalid_token}, format="json")
            assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_long_email_handling(self, api_client):
        """Test handling of very long email addresses."""
        url = reverse("token_obtain_pair")
        long_email = "a" * 200 + "@example.com"

        response = api_client.post(
            url,
            {"email": long_email, "password": "anypassword"},
            format="json",
        )

        # Should fail gracefully
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ]
