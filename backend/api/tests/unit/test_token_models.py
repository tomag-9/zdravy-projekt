from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import PasswordResetToken


@pytest.mark.unit
@pytest.mark.django_db
class TestTokenModelProperties:
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
