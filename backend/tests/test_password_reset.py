"""
Tests for the password-reset feature.

Covers:
- Service layer (unit tests with mocked email)
- API endpoints (integration tests)

The cache is overridden to LocMem for every test so Redis is not required.
Email sending is mocked via unittest.mock to avoid outgoing SMTP calls.
"""

import datetime
import time
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from api.models import PasswordResetToken
from api.password_reset_service import (
    BLOCK_DURATION,
    MAX_ATTEMPTS,
    RESEND_COOLDOWN,
    RateLimitExceeded,
    TooSoonError,
    confirm_password_reset,
    request_password_reset,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MOCK_EMAIL_PATH = "api.password_reset_service.send_password_reset_email"


def _clear_cache():
    """Clear all entries in the LocMem cache between tests."""
    cache.clear()


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


def test_block_duration_is_one_hour():
    """BLOCK_DURATION must be exactly 3600 s (max 5 attempts per hour)."""
    assert BLOCK_DURATION == 3600


def test_resend_cooldown_is_one_minute():
    """RESEND_COOLDOWN must be exactly 60 s."""
    assert RESEND_COOLDOWN == 60


def test_max_attempts_is_five():
    assert MAX_ATTEMPTS == 5


# ---------------------------------------------------------------------------
# Service-layer unit tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPasswordResetService:
    """Unit tests for request_password_reset and confirm_password_reset."""

    def setup_method(self):
        _clear_cache()

    def test_sends_email_for_registered_address(self, user):
        """Known email → token created + email sent."""
        with patch(MOCK_EMAIL_PATH) as mock_send:
            request_password_reset(user.email)

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["user"] == user
        assert len(call_kwargs["token"]) > 20

        assert PasswordResetToken.objects.filter(user=user, used=False).count() == 1

    def test_silent_noop_for_unknown_email(self):
        """Unknown email → returns without error and without sending email."""
        with patch(MOCK_EMAIL_PATH) as mock_send:
            request_password_reset("nobody@example.com")

        mock_send.assert_not_called()
        assert PasswordResetToken.objects.count() == 0

    def test_silent_noop_for_inactive_user(self, user):
        """Inactive user → treated as unknown (silent no-op)."""
        user.is_active = False
        user.save()

        with patch(MOCK_EMAIL_PATH) as mock_send:
            request_password_reset(user.email)

        mock_send.assert_not_called()

    def test_raises_too_soon_error_within_cooldown(self, user):
        """Second request within RESEND_COOLDOWN raises TooSoonError."""
        with patch(MOCK_EMAIL_PATH):
            request_password_reset(user.email)

        with pytest.raises(TooSoonError) as exc_info:
            request_password_reset(user.email)

        assert exc_info.value.wait_seconds >= 1

    def test_raises_rate_limit_after_max_attempts(self, user):
        """MAX_ATTEMPTS requests raise RateLimitExceeded on the last one."""
        # Each call needs to pass the resend cooldown check → mock time to advance it.
        base_time = time.time()

        with patch(MOCK_EMAIL_PATH):
            for i in range(MAX_ATTEMPTS):
                # Fake that enough time has passed since the last send.
                with patch("api.password_reset_service.time") as mock_time:
                    mock_time.time.return_value = base_time + (
                        i * (RESEND_COOLDOWN + 10)
                    )
                    if i < MAX_ATTEMPTS - 1:
                        request_password_reset(user.email)
                    else:
                        with pytest.raises(RateLimitExceeded) as exc_info:
                            request_password_reset(user.email)
                        assert exc_info.value.retry_after_seconds > 0

    def test_invalidates_existing_tokens_on_new_request(self, user):
        """A second valid request invalidates the previous token."""
        with patch(MOCK_EMAIL_PATH):
            request_password_reset(user.email)

        old_token = PasswordResetToken.objects.filter(user=user).first()
        assert old_token is not None
        assert not old_token.used

        # Advance past cooldown
        with patch("api.password_reset_service.time") as mock_time:
            mock_time.time.return_value = time.time() + RESEND_COOLDOWN + 5
            with patch(MOCK_EMAIL_PATH):
                request_password_reset(user.email)

        old_token.refresh_from_db()
        assert old_token.used

        fresh_tokens = PasswordResetToken.objects.filter(user=user, used=False)
        assert fresh_tokens.count() == 1

    def test_confirm_changes_password_and_marks_token_used(self, user):
        """Valid token → password changed, token marked used."""
        with patch(MOCK_EMAIL_PATH):
            request_password_reset(user.email)

        token_obj = PasswordResetToken.objects.filter(user=user, used=False).first()
        confirm_password_reset(token=token_obj.token, new_password="NewSecurePass99!")

        user.refresh_from_db()
        assert user.check_password("NewSecurePass99!")

        token_obj.refresh_from_db()
        assert token_obj.used

    def test_confirm_raises_for_invalid_token(self):
        """Random token → ValueError raised."""
        with pytest.raises(ValueError):
            confirm_password_reset(token="totally-invalid-token", new_password="x")

    def test_confirm_raises_for_expired_token(self, user):
        """Expired token → ValueError raised."""
        expired_token = PasswordResetToken.objects.create(
            user=user,
            token="expired-token-abc123",
            expires_at=timezone.now() - datetime.timedelta(hours=2),
        )

        with pytest.raises(ValueError):
            confirm_password_reset(token=expired_token.token, new_password="NewPass1!")

    def test_confirm_raises_for_already_used_token(self, user):
        """Already-used token → ValueError raised."""
        used_token = PasswordResetToken.objects.create(
            user=user,
            token="used-token-abc123",
            expires_at=timezone.now() + datetime.timedelta(hours=1),
            used=True,
        )

        with pytest.raises(ValueError):
            confirm_password_reset(token=used_token.token, new_password="NewPass1!")

    def test_confirm_clears_rate_limit_cache(self, user):
        """Successful confirm clears rate-limit cache keys."""
        # Simulate a prior request to populate cache.
        with patch(MOCK_EMAIL_PATH):
            request_password_reset(user.email)

        token_obj = PasswordResetToken.objects.filter(user=user, used=False).first()
        confirm_password_reset(token=token_obj.token, new_password="NewPass1!")

        # After confirm, a fresh request should NOT hit TooSoon.
        with patch(MOCK_EMAIL_PATH) as mock_send:
            request_password_reset(user.email)
        mock_send.assert_called_once()


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPasswordResetRequestEndpoint:
    """Tests for POST /api/auth/password-reset/"""

    def setup_method(self):
        _clear_cache()

    def _url(self):
        return reverse("password_reset_request")

    def test_returns_200_for_registered_email(self, api_client, user):
        with patch(MOCK_EMAIL_PATH):
            response = api_client.post(self._url(), {"email": user.email})

        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data

    def test_returns_200_for_unknown_email(self, api_client):
        """Same 200 response for unknown email – no information leak."""
        with patch(MOCK_EMAIL_PATH):
            response = api_client.post(self._url(), {"email": "ghost@unknown.com"})

        assert response.status_code == status.HTTP_200_OK

    def test_returns_400_when_email_missing(self, api_client):
        response = api_client.post(self._url(), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_429_when_resend_too_soon(self, api_client, user):
        with patch(MOCK_EMAIL_PATH):
            api_client.post(self._url(), {"email": user.email})
            response = api_client.post(self._url(), {"email": user.email})

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "error" in response.data
        assert response.data["error"]["code"] == "too_soon"
        assert "wait_seconds" in response.data["error"]["details"]

    def test_returns_429_when_rate_limited(self, api_client, user):
        """After MAX_ATTEMPTS exhausted, returns 429 with retry_after_seconds."""
        base = time.time()
        for i in range(MAX_ATTEMPTS):
            with patch("api.password_reset_service.time") as mt:
                mt.time.return_value = base + i * (RESEND_COOLDOWN + 10)
                with patch(MOCK_EMAIL_PATH):
                    resp = api_client.post(self._url(), {"email": user.email})

        assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "error" in resp.data
        assert resp.data["error"]["code"] == "rate_limit_exceeded"
        assert "retry_after_seconds" in resp.data["error"]["details"]

    def test_is_case_insensitive_for_email(self, api_client, user):
        """Email lookup is case-insensitive."""
        with patch(MOCK_EMAIL_PATH) as mock_send:
            response = api_client.post(self._url(), {"email": user.email.upper()})

        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_called_once()


@pytest.mark.django_db
class TestPasswordResetConfirmEndpoint:
    """Tests for POST /api/auth/password-reset/confirm/"""

    def setup_method(self):
        _clear_cache()

    def _url(self):
        return reverse("password_reset_confirm")

    def _create_token(self, user):
        return PasswordResetToken.objects.create(
            user=user,
            token="valid-test-token-abc",
            expires_at=timezone.now() + datetime.timedelta(hours=1),
        )

    def test_returns_200_and_changes_password(self, api_client, user):
        token = self._create_token(user)
        response = api_client.post(
            self._url(), {"token": token.token, "new_password": "NewPass123!"}
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password("NewPass123!")

    def test_returns_400_for_invalid_token(self, api_client):
        response = api_client.post(
            self._url(), {"token": "bogus-token", "new_password": "NewPass123!"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_400_when_token_missing(self, api_client):
        response = api_client.post(self._url(), {"new_password": "NewPass123!"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_400_when_password_missing(self, api_client, user):
        token = self._create_token(user)
        response = api_client.post(self._url(), {"token": token.token})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_400_for_expired_token(self, api_client, user):
        expired = PasswordResetToken.objects.create(
            user=user,
            token="expired-token-xyz",
            expires_at=timezone.now() - datetime.timedelta(minutes=1),
        )
        response = api_client.post(
            self._url(), {"token": expired.token, "new_password": "NewPass123!"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_cannot_be_reused(self, api_client, user):
        token = self._create_token(user)
        api_client.post(
            self._url(), {"token": token.token, "new_password": "FirstPass1!"}
        )
        response = api_client.post(
            self._url(), {"token": token.token, "new_password": "SecondPass2!"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
