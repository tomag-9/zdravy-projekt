from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import EmailVerificationToken, PasswordResetToken


@pytest.mark.unit
@pytest.mark.django_db
class TestTokenModelProperties:
    def test_email_token_valid_when_not_used_and_not_expired(self, user):
        token = EmailVerificationToken.objects.create(
            user=user,
            token="email-valid-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=False,
        )

        assert token.is_expired is False
        assert token.is_valid is True

    def test_password_reset_token_invalid_when_used(self, user):
        token = PasswordResetToken.objects.create(
            user=user,
            token="pwd-used-token",
            expires_at=timezone.now() + timedelta(hours=1),
            used=True,
        )

        assert token.is_expired is False
        assert token.is_valid is False

    def test_password_reset_token_invalid_when_expired(self, user):
        token = PasswordResetToken.objects.create(
            user=user,
            token="pwd-expired-token",
            expires_at=timezone.now() - timedelta(minutes=1),
            used=False,
        )

        assert token.is_expired is True
        assert token.is_valid is False
