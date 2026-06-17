"""
Email utility functions for the api app.

All outgoing emails go through this module so the sending logic
stays decoupled from the business logic.
"""

import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage, send_mail

from .utils import user_operation_name

logger = logging.getLogger(__name__)


def send_password_reset_email(user: User, token: str) -> None:
    """Send a password-reset link to the given user."""
    # Lazy import to avoid circular dependency with password_reset_service.
    from .password_reset_service import TOKEN_EXPIRY_HOURS

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    subject = "Obnova hesla"
    message = (
        f"Dobrý deň {user_operation_name(user)},\n\n"
        "Dostali sme žiadosť o obnovu Vášho hesla.\n\n"
        f"Pre obnovu hesla použite tento odkaz:\n{reset_url}\n\n"
        f"Odkaz je platný {TOKEN_EXPIRY_HOURS} hodinu.\n\n"
        "Ak ste o obnovu hesla nežiadali, tento e-mail ignorujte.\n\n"
        "Poznámka: Ak e-mail nevidíte v doručenej pošte, skontrolujte priečinok SPAM.\n\n"
        "S pozdravom, Tím Zdravý projekt"
    )

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(
            "Password reset email sent to user %s (id=%s).", user.email, user.pk
        )
    except Exception:
        logger.exception("Failed to send password reset email to user %s.", user.email)
        raise


def send_account_setup_email(user: User) -> str:
    """
    Create a PasswordResetToken with 7-day expiry and send an account-setup email.

    Returns the token value so callers can log it if needed.
    """
    import datetime
    import secrets

    from django.utils import timezone

    from .models import PasswordResetToken

    TOKEN_EXPIRY_DAYS = 7

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    # Invalidate any existing unused tokens for this user
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    token_value = secrets.token_urlsafe(32)
    expires_at = timezone.now() + datetime.timedelta(days=TOKEN_EXPIRY_DAYS)
    PasswordResetToken.objects.create(
        user=user,
        token=token_value,
        expires_at=expires_at,
    )

    setup_url = f"{frontend_url}/set-password?token={token_value}"

    from .services.notification_service import NotificationService

    NotificationService.send_account_setup_email(user=user, setup_url=setup_url)

    return token_value


def send_daily_report_email(
    recipients: list[str],
    report_date: str,
    attachment_bytes: bytes,
    attachment_filename: str,
    meals: list[str] | None = None,
) -> None:
    """Send the daily order report as an XLSX attachment to *recipients*.

    Args:
        recipients: List of email addresses to send to
        report_date: Date string in YYYY-MM-DD format
        attachment_bytes: XLSX file bytes
        attachment_filename: Name of the attachment file
        meals: List of meals included in report (breakfast, lunch, olovrant)
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

    # Build subject and body based on included meals
    if meals:
        meal_labels = {"breakfast": "Raňajky", "lunch": "Obed", "olovrant": "Olovrant"}
        meals_text = ", ".join(meal_labels.get(m, m) for m in meals)
        subject = f"Denný prehľad ({meals_text}) — {report_date}"
    else:
        subject = f"Denný prehľad objednávok — {report_date}"

    body = (
        f"Dobrý deň,\n\n"
        f"V prílohe nájdete denný prehľad objednávok za {report_date}.\n\n"
        "S pozdravom, Tím Zdravý projekt"
    )
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=recipients,
    )
    email.attach(attachment_filename, attachment_bytes, content_type)
    try:
        email.send(fail_silently=False)
        logger.info(
            "Daily report for %s sent to %d recipient(s).",
            report_date,
            len(recipients),
        )
    except Exception:
        logger.exception("Failed to send daily report email for %s.", report_date)
        raise
