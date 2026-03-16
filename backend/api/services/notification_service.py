"""Notification service – centralised transactional email sending."""

import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class NotificationService:
    """Send transactional notification emails."""

    @staticmethod
    def send_account_setup_email(user: User, setup_url: str) -> None:
        """
        Send a new App user an email with a link to set their password.

        Failures are logged but not re-raised so the caller's transaction
        is not rolled back when the mail server is temporarily unavailable.
        """
        try:
            subject = "Vitajte – nastavte si heslo"
            message = (
                f"Dobrý deň {user.first_name or user.email},\n\n"
                "Bol vám vytvorený účet v systéme Zdravý projekt.\n\n"
                "Pre aktiváciu účtu si prosím nastavte heslo kliknutím na odkaz nižšie:\n"
                f"{setup_url}\n\n"
                "Odkaz je platný 7 dní.\n\n"
                "Ak ste o tento účet nežiadali, tento e-mail ignorujte.\n\n"
                "S pozdravom, Tím Zdravý projekt"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )

            logger.info("Account setup email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to send account setup email to %s: %s", user.email, exc
            )

    @staticmethod
    def send_api_user_registered_email(user: User) -> None:
        """
        Notify an API user that their account has been registered.

        Failures are logged but not re-raised.
        """
        try:
            subject = "Registrácia účtu – Zdravý projekt"
            message = (
                f"Dobrý deň {user.first_name or user.email},\n\n"
                "Bol vám zaregistrovaný API účet v systéme Zdravý projekt.\n\n"
                "V prípade otázok nás kontaktujte.\n\n"
                "S pozdravom, Tím Zdravý projekt"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )

            logger.info("API user registered email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to send API user registered email to %s: %s", user.email, exc
            )
