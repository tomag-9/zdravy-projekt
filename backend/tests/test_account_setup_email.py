"""The first (set-password) email carries the operations manual — issue #475.

A new prevádzka gets exactly one email when its login is created; the návod has
to ride along with it, otherwise nobody ever sends it.
"""

import pytest
from django.contrib.auth.models import User
from django.core import mail

from api.services.notification_service import (
    ACCOUNT_SETUP_INTRO,
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


@pytest.mark.django_db
class TestAccountSetupEmailIntro:
    """Úvodný text klienta ide pred odkaz na heslo — je to jediný e-mail, ktorý
    prevádzka dostane, takže vysvetlenie „prečo" nemá kam inam ísť."""

    def test_intro_comes_before_the_password_link(self, new_user):
        NotificationService.send_account_setup_email(
            user=new_user, setup_url="https://example.com/set-password?token=abc"
        )

        body = mail.outbox[0].body
        assert ACCOUNT_SETUP_INTRO in body
        assert body.index(ACCOUNT_SETUP_INTRO) < body.index(
            "https://example.com/set-password?token=abc"
        )
        # Pozdrav ostáva úplne hore, úvod až za ním.
        assert body.startswith("Dobrý deň ")
        assert body.rstrip().endswith("Stanislav Šulc\nZdravý projekt")

    def test_intro_keeps_the_deadlines_and_contact(self, new_user):
        """Časy uzávierok a telefón sú to, kvôli čomu e-mail vznikol."""
        NotificationService.send_account_setup_email(
            user=new_user, setup_url="https://example.com/set-password?token=abc"
        )

        body = mail.outbox[0].body
        assert "21:00" in body and "7:30" in body
        assert "0903186328" in body
