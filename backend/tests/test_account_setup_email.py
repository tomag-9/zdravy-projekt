"""The first (set-password) email carries the operations manual — issue #475.

A new prevádzka gets exactly one email when its login is created; the návod has
to ride along with it, otherwise nobody ever sends it.
"""

import pytest
from django.contrib.auth.models import User
from django.core import mail

from api.services.notification_service import (
    OPERATIONS_MANUAL_FILENAME,
    OPERATIONS_MANUAL_PATH,
    NotificationService,
)


@pytest.fixture
def new_user(db):
    return User.objects.create_user(
        username="prevadzka@example.com",
        email="prevadzka@example.com",
        password="pass1234",
    )


@pytest.mark.django_db
class TestAccountSetupEmailAttachment:
    def test_manual_pdf_ships_with_the_backend(self):
        """The PDF must live inside the backend build context to be attachable."""
        assert OPERATIONS_MANUAL_PATH.is_file()
        assert OPERATIONS_MANUAL_PATH.read_bytes()[:4] == b"%PDF"

    def test_setup_email_attaches_the_manual_and_mentions_it(self, new_user):
        NotificationService.send_account_setup_email(
            user=new_user, setup_url="https://example.com/set-password?token=abc"
        )

        assert len(mail.outbox) == 1
        message = mail.outbox[0]
        assert message.to == ["prevadzka@example.com"]
        assert "návod pre prevádzky" in message.body

        assert len(message.attachments) == 1
        filename, content, content_type = message.attachments[0]
        assert filename == OPERATIONS_MANUAL_FILENAME
        assert content_type == "application/pdf"
        assert content[:4] == b"%PDF"

    def test_setup_link_still_present_alongside_the_attachment(self, new_user):
        NotificationService.send_account_setup_email(
            user=new_user, setup_url="https://example.com/set-password?token=abc"
        )

        assert "https://example.com/set-password?token=abc" in mail.outbox[0].body

    def test_missing_manual_does_not_block_the_email(self, new_user, monkeypatch):
        """A missing PDF must not cost a new login its set-password link."""
        monkeypatch.setattr(
            "api.services.notification_service.OPERATIONS_MANUAL_PATH",
            OPERATIONS_MANUAL_PATH.with_name("does-not-exist.pdf"),
        )

        NotificationService.send_account_setup_email(
            user=new_user, setup_url="https://example.com/set-password?token=abc"
        )

        assert len(mail.outbox) == 1
        message = mail.outbox[0]
        assert message.attachments == []
        assert "https://example.com/set-password?token=abc" in message.body
        assert "V prílohe" not in message.body
