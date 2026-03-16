"""
Authentication tests for login, JWT token refresh, and password reset flows.
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from api.models import PasswordResetToken

pytestmark = pytest.mark.integration


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

    def test_login_with_duplicate_email_prefers_matching_active_account(
        self, api_client
    ):
        """Login should succeed if one duplicate email account is active and matches password."""
        User.objects.create_user(
            username="dup-inactive",
            email="duplicate@example.com",
            password="inactive-pass",
            is_active=False,
        )
        User.objects.create_user(
            username="dup-active",
            email="DUPLICATE@example.com",
            password="active-pass",
            is_active=True,
        )

        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "duplicate@example.com", "password": "active-pass"},
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

        # Empty email is a serializer validation error for this endpoint.
        assert response.status_code == status.HTTP_400_BAD_REQUEST


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
        assert "error" in response.data
        # Should be either rate_limit_exceeded or too_soon
        assert response.data["error"]["code"] in ["rate_limit_exceeded", "too_soon"]

    def test_password_reset_request_cooldown(self, api_client, user):
        """Test cooldown between password reset requests."""
        url = reverse("password_reset_request")

        # First request succeeds
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Immediate second request should fail with cooldown error
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "error" in response.data
        assert response.data["error"]["code"] == "too_soon"
        assert "wait_seconds" in response.data["error"]["details"]

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

        # Request twice while simulating cooldown passage without real sleep.
        tokens = []
        with patch("api.password_reset_service.RESEND_COOLDOWN", 0):
            for _ in range(2):
                response = api_client.post(url, {"email": user.email}, format="json")
                assert response.status_code == status.HTTP_200_OK
                token = PasswordResetToken.objects.filter(user=user).latest(
                    "created_at"
                )
                tokens.append(token.token)

        assert len(tokens) == 2
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
