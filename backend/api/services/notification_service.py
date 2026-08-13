"""Notification service – centralised transactional email sending."""

import logging
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage, send_mail

from ..utils import user_operation_name

logger = logging.getLogger(__name__)

#: Návod pre prevádzky, priložený k prvému (set-password) e-mailu — issue #475.
#: Žije v backende, nie v `docs/`, lebo backend image sa buildí z `backend/`
#: ako kontextu (viď docs/manualy/README.md).
OPERATIONS_MANUAL_PATH = (
    Path(__file__).resolve().parent.parent
    / "assets"
    / "manualy"
    / "navodpreprevadzky_zb.pdf"
)
OPERATIONS_MANUAL_FILENAME = "Navod-pre-prevadzky.pdf"


class NotificationService:
    """Send transactional notification emails."""

    @staticmethod
    def send_account_setup_email(user: User, setup_url: str) -> None:
        """
        Send a new App user an email with a link to set their password.

        The návod pre prevádzky PDF rides along as an attachment (issue #475) —
        this is the first and often only email a new operation gets, so the
        instructions belong here rather than in a separate follow-up nobody
        sends. If the file is missing the email still goes out, just without
        the attachment and without the sentence announcing it.

        Failures are logged but not re-raised so the caller's transaction
        is not rolled back when the mail server is temporarily unavailable.
        """
        try:
            manual_available = OPERATIONS_MANUAL_PATH.is_file()
            if not manual_available:
                logger.warning(
                    "Operations manual not found at %s – sending setup email "
                    "without the attachment.",
                    OPERATIONS_MANUAL_PATH,
                )

            subject = "Vitajte – nastavte si heslo"
            manual_paragraph = (
                "V prílohe nájdete návod pre prevádzky — riaďte sa ním pri "
                "objednávaní a vydávaní jedál.\n\n"
                if manual_available
                else ""
            )
            message = (
                f"Dobrý deň {user_operation_name(user)},\n\n"
                "Bol vám vytvorený účet v systéme Zdravý projekt.\n\n"
                "Pre aktiváciu účtu si prosím nastavte heslo kliknutím na odkaz nižšie:\n"
                f"{setup_url}\n\n"
                "Odkaz je platný 7 dní.\n\n"
                f"{manual_paragraph}"
                "Ak ste o tento účet nežiadali, tento e-mail ignorujte.\n\n"
                "S pozdravom, Tím Zdravý projekt"
            )
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

            if manual_available:
                # send_mail() cannot carry attachments — go one level down.
                email = EmailMessage(
                    subject=subject,
                    body=message,
                    from_email=from_email,
                    to=[user.email],
                )
                email.attach(
                    OPERATIONS_MANUAL_FILENAME,
                    OPERATIONS_MANUAL_PATH.read_bytes(),
                    "application/pdf",
                )
                email.send(fail_silently=False)
            else:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
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
                f"Dobrý deň {user_operation_name(user)},\n\n"
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
