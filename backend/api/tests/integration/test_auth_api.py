"""
Authentication tests for login, JWT token flow, and password reset.
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

COOKIE_NAME = "refresh_token"


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────


def _login(api_client, email, password):
    """Perform a login and return the response (cookies are set on api_client)."""
    return api_client.post(
        reverse("token_obtain_pair"),
        {"email": email, "password": password},
        format="json",
    )


def _get_refresh_cookie(response):
    """Extract the raw refresh token string from a response's Set-Cookie header."""
    return response.cookies.get(COOKIE_NAME)


# ──────────────────────────────────────────────────────────────────────────
# LOGIN FLOW
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLoginFlow:
    """Test login and JWT token flow."""

    def test_login_with_valid_credentials(self, api_client, user):
        response = _login(api_client, "client@example.com", "client123")

        assert response.status_code == status.HTTP_200_OK
        # Access token is in the body
        assert "access" in response.data
        # Refresh token must NOT be in the body — it is set as an httpOnly cookie
        assert "refresh" not in response.data
        # Cookie must be present
        assert COOKIE_NAME in response.cookies
        assert response.cookies[COOKIE_NAME].value

    def test_login_with_invalid_password(self, api_client, user):
        response = _login(api_client, "client@example.com", "wrongpassword")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_invalid_email(self, api_client):
        response = _login(api_client, "nonexistent@example.com", "anypassword")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_case_insensitive_email(self, api_client, user):
        response = _login(api_client, "CLIENT@EXAMPLE.COM", "client123")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_with_duplicate_email_prefers_matching_active_account(
        self, api_client
    ):
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

        response = _login(api_client, "duplicate@example.com", "active-pass")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_with_inactive_user(self, api_client, user):
        user.is_active = False
        user.save()

        response = _login(api_client, "client@example.com", "client123")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_inactive_account_returns_same_error_as_invalid_credentials(
        self, api_client, user
    ):
        """H3 regression: login must not distinguish inactive from wrong-password.
        Both paths must return identical error codes so an attacker cannot use
        login to confirm a valid password against a disabled account."""
        user.is_active = False
        user.save()

        inactive_response = _login(api_client, "client@example.com", "client123")
        wrong_pw_response = _login(api_client, "client@example.com", "wrongpassword")

        assert inactive_response.status_code == wrong_pw_response.status_code == 401
        assert (
            inactive_response.data["error"]["code"]
            == wrong_pw_response.data["error"]["code"]
            == "invalid_credentials"
        )

    def test_login_missing_email(self, api_client):
        response = api_client.post(
            reverse("token_obtain_pair"), {"password": "anypassword"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client, user):
        response = api_client.post(
            reverse("token_obtain_pair"),
            {"email": "client@example.com"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_empty_email(self, api_client):
        response = api_client.post(
            reverse("token_obtain_pair"),
            {"email": "", "password": "anypassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_client_gets_30_day_refresh_token(self, api_client, user):
        """Client users receive a 30-day refresh token."""
        assert not user.is_staff
        response = _login(api_client, "client@example.com", "client123")

        assert response.status_code == status.HTTP_200_OK
        cookie = _get_refresh_cookie(response)
        assert cookie is not None

        refresh = RefreshToken(cookie.value)
        lifetime_days = (refresh.payload["exp"] - refresh.payload["iat"]) / 86400
        assert abs(lifetime_days - 30) < 1  # within 1 day tolerance

    def test_admin_gets_1_day_refresh_token(self, api_client, admin_user):
        """Admin users receive a 1-day refresh token."""
        assert admin_user.is_staff
        response = _login(api_client, "admin@example.com", "admin123")

        assert response.status_code == status.HTTP_200_OK
        cookie = _get_refresh_cookie(response)
        assert cookie is not None

        refresh = RefreshToken(cookie.value)
        lifetime_days = (refresh.payload["exp"] - refresh.payload["iat"]) / 86400
        assert abs(lifetime_days - 1) < 0.1  # within ~2.5 hours tolerance

    def test_dev_demo_email_login_migrates_legacy_user(self, api_client, settings):
        settings.DEBUG = True
        User.objects.create_user(username="admin", email="admin", password="old")

        response = _login(api_client, "admin@example.com", "admin")

        assert response.status_code == status.HTTP_200_OK
        migrated = User.objects.get(email="admin@example.com")
        assert migrated.username == "admin@example.com"
        assert migrated.is_staff is True
        assert migrated.is_superuser is True


# ──────────────────────────────────────────────────────────────────────────
# TOKEN REFRESH
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTokenRefreshFlow:
    """Test JWT token refresh via httpOnly cookie."""

    def test_token_refresh_success(self, api_client, user):
        # Login to obtain the refresh cookie
        _login(api_client, "client@example.com", "client123")

        refresh_url = reverse("token_refresh")
        refresh_response = api_client.post(refresh_url, format="json")

        assert refresh_response.status_code == status.HTTP_200_OK
        assert "access" in refresh_response.data
        # Rotation: new refresh cookie must be set
        assert COOKIE_NAME in refresh_response.cookies

    def test_token_refresh_uses_valid_duplicate_cookie(self, api_client, user):
        login_response = _login(api_client, "client@example.com", "client123")
        valid_refresh = login_response.cookies[COOKIE_NAME].value
        api_client.cookies.clear()

        response = api_client.post(
            reverse("token_refresh"),
            format="json",
            HTTP_COOKIE=(
                f"{COOKIE_NAME}=aaa.bbb.ccc; " f"{COOKIE_NAME}={valid_refresh}"
            ),
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_token_refresh_rotates_cookie(self, api_client, user):
        """Each refresh call produces a new refresh cookie (rotation)."""
        _login(api_client, "client@example.com", "client123")
        first_refresh = api_client.cookies[COOKIE_NAME].value

        api_client.post(reverse("token_refresh"), format="json")
        second_refresh = api_client.cookies[COOKIE_NAME].value

        assert first_refresh != second_refresh

    def test_rotation_preserves_role_based_lifetime(self, api_client, admin_user):
        """Rotated token must keep the admin's 1-day lifetime, not fall back to 30 days."""
        _login(api_client, "admin@example.com", "admin123")

        rotate_response = api_client.post(reverse("token_refresh"), format="json")
        assert rotate_response.status_code == status.HTTP_200_OK

        rotated_cookie = api_client.cookies[COOKIE_NAME].value
        rotated = RefreshToken(rotated_cookie)
        lifetime_days = (rotated.payload["exp"] - rotated.payload["iat"]) / 86400
        # Must still be ~1 day, not 30
        assert abs(lifetime_days - 1) < 0.1

    def test_token_refresh_with_invalid_cookie(self, api_client):
        """An invalid cookie value is rejected."""
        api_client.cookies[COOKIE_NAME] = "invalid-token"
        response = api_client.post(reverse("token_refresh"), format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh_missing_cookie(self, api_client):
        """Missing cookie returns 401."""
        response = api_client.post(reverse("token_refresh"), format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_token_contains_user_info(self, api_client, user):
        login_response = _login(api_client, "client@example.com", "client123")
        access_token_str = login_response.data["access"]

        token = AccessToken(access_token_str)
        assert int(token.payload["user_id"]) == user.id


# ──────────────────────────────────────────────────────────────────────────
# LOGOUT
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLogoutFlow:
    """Test server-side logout with token blacklisting."""

    def test_logout_blacklists_refresh_token(self, api_client, user):
        """After logout the refresh cookie can no longer be used to refresh."""
        login_response = _login(api_client, "client@example.com", "client123")
        access_token = login_response.data["access"]

        # Logout
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_response = api_client.post(reverse("token_logout"), format="json")
        assert logout_response.status_code == status.HTTP_200_OK

        # The old refresh cookie is now blacklisted — refresh must fail
        refresh_response = api_client.post(reverse("token_refresh"), format="json")
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_clears_cookie(self, api_client, user):
        """Logout response deletes the refresh cookie."""
        login_response = _login(api_client, "client@example.com", "client123")
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        logout_response = api_client.post(reverse("token_logout"), format="json")

        # Cookie should be cleared (max-age=0 or explicit deletion)
        assert logout_response.status_code == status.HTTP_200_OK

    def test_logout_requires_authentication(self, api_client):
        """Unauthenticated logout is rejected (401 from JWT, 403 from SessionAuthentication)."""
        response = api_client.post(reverse("token_logout"), format="json")
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


# ──────────────────────────────────────────────────────────────────────────
# PASSWORD RESET
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordResetFlow:
    """Test password reset request and validation."""

    def test_password_reset_request_success(self, api_client, user):
        response = api_client.post(
            reverse("password_reset_request"), {"email": user.email}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

        token = PasswordResetToken.objects.filter(user=user).first()
        assert token is not None
        assert not token.used

    def test_password_reset_request_unknown_email(self, api_client):
        response = api_client.post(
            reverse("password_reset_request"),
            {"email": "unknown@example.com"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_request_missing_email(self, api_client):
        response = api_client.post(reverse("password_reset_request"), {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_request_rate_limit(self, api_client, user):
        url = reverse("password_reset_request")

        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data["error"]["code"] in ["rate_limit_exceeded", "too_soon"]

    def test_password_reset_request_cooldown(self, api_client, user):
        url = reverse("password_reset_request")

        api_client.post(url, {"email": user.email}, format="json")

        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data["error"]["code"] == "too_soon"
        assert "wait_seconds" in response.data["error"]["details"]

    def test_password_reset_confirm_success(self, api_client, user):
        PasswordResetToken.objects.create(
            user=user,
            token="valid-reset-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        response = api_client.post(
            reverse("password_reset_confirm"),
            {"token": "valid-reset-token", "new_password": "NewPassword123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        token = PasswordResetToken.objects.get(token="valid-reset-token")
        assert token.used is True

        user.refresh_from_db()
        assert user.check_password("NewPassword123")

    def test_password_reset_invalidates_existing_sessions(self, api_client, user):
        """After a password reset all outstanding refresh tokens are blacklisted."""
        # Log in to create an outstanding refresh token
        login_response = _login(api_client, "client@example.com", "client123")

        # Reset password
        PasswordResetToken.objects.create(
            user=user,
            token="invalidate-sessions-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )
        api_client.post(
            reverse("password_reset_confirm"),
            {"token": "invalidate-sessions-token", "new_password": "NewPassword456"},
            format="json",
        )

        # The old refresh cookie must now be rejected
        api_client.cookies[COOKIE_NAME] = api_client.cookies.get(COOKIE_NAME, "")
        refresh_response = api_client.post(reverse("token_refresh"), format="json")
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_password_reset_confirm_with_invalid_token(self, api_client):
        response = api_client.post(
            reverse("password_reset_confirm"),
            {"token": "invalid-token", "new_password": "NewPassword123"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_with_expired_token(self, api_client, user):
        PasswordResetToken.objects.create(
            user=user,
            token="expired-reset-token",
            expires_at=timezone.now() - timedelta(hours=1),
            used=False,
        )

        response = api_client.post(
            reverse("password_reset_confirm"),
            {"token": "expired-reset-token", "new_password": "NewPassword123"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_with_already_used_token(self, api_client, user):
        PasswordResetToken.objects.create(
            user=user,
            token="used-reset-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=True,
        )

        response = api_client.post(
            reverse("password_reset_confirm"),
            {"token": "used-reset-token", "new_password": "NewPassword123"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_weak_password(self, api_client, user):
        PasswordResetToken.objects.create(
            user=user,
            token="weak-password-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        for weak_pass in ["123", "password", "weak"]:
            response = api_client.post(
                reverse("password_reset_confirm"),
                {"token": "weak-password-token", "new_password": weak_pass},
                format="json",
            )
            if response.status_code != status.HTTP_200_OK:
                assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_missing_fields(self, api_client):
        url = reverse("password_reset_confirm")

        response = api_client.post(
            url, {"new_password": "NewPassword123"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        response = api_client.post(url, {"token": "some-token"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_can_login_after_reset(self, api_client, user):
        PasswordResetToken.objects.create(
            user=user,
            token="reset-and-login-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        api_client.post(
            reverse("password_reset_confirm"),
            {"token": "reset-and-login-token", "new_password": "NewLogin123"},
            format="json",
        )

        login_response = _login(api_client, user.email, "NewLogin123")
        assert login_response.status_code == status.HTTP_200_OK
        assert "access" in login_response.data


# ──────────────────────────────────────────────────────────────────────────
# EDGE CASES AND SECURITY
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAuthEdgeCases:
    """Test edge cases and security scenarios."""

    def test_multiple_failed_login_attempts(self, api_client, user):
        url = reverse("token_obtain_pair")
        for _ in range(10):
            response = api_client.post(
                url, {"email": user.email, "password": "wrongpass"}, format="json"
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Still able to log in with correct password
        response = api_client.post(
            url, {"email": user.email, "password": "client123"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_token_expiry_not_accessible(self, api_client, user):
        """An expired refresh token in the cookie is rejected."""
        refresh = RefreshToken.for_user(user)
        refresh.set_exp(lifetime=timedelta(seconds=-10))
        api_client.cookies[COOKIE_NAME] = str(refresh)

        response = api_client.post(reverse("token_refresh"), format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sql_injection_attempt(self, api_client):
        response = api_client.post(
            reverse("token_obtain_pair"),
            {"email": "test' OR '1'='1", "password": "test' OR '1'='1"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_email_whitespace_trimming(self, api_client):
        User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="Password123",
            is_active=True,
        )

        response = api_client.post(
            reverse("token_obtain_pair"),
            {"email": "  test@example.com  ", "password": "Password123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_token_uniqueness(self, api_client, user):
        url = reverse("password_reset_request")
        tokens = []
        with patch("api.password_reset_service.RESEND_COOLDOWN", 0):
            for _ in range(2):
                api_client.post(url, {"email": user.email}, format="json")
                token = PasswordResetToken.objects.filter(user=user).latest(
                    "created_at"
                )
                tokens.append(token.token)

        assert len(tokens) == 2
        assert tokens[0] != tokens[1]

    def test_cross_user_token_reuse(self, api_client, user):
        user2 = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="other123",
            is_active=True,
        )

        PasswordResetToken.objects.create(
            user=user,
            token="user1-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        response = api_client.post(
            reverse("password_reset_confirm"),
            {"token": "user1-token", "new_password": "Hacked123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.check_password("Hacked123")

        user2.refresh_from_db()
        assert not user2.check_password("Hacked123")

    def test_long_email_handling(self, api_client):
        long_email = "a" * 200 + "@example.com"
        response = api_client.post(
            reverse("token_obtain_pair"),
            {"email": long_email, "password": "anypassword"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ]
