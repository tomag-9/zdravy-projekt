"""
Email utility functions for the api app.

All outgoing emails go through this module so the sending logic
stays decoupled from the business logic.
"""

import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

_TOKEN_EXPIRY_HOURS = 1


def send_password_reset_email(user: User, token: str) -> None:
    """Send a password-reset link to the given user."""
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    subject = "Obnova hesla"
    message = (
        f"Dobry den {user.first_name or user.username},\n\n"
        "Dostali sme ziadost o obnovu Vasho hesla.\n\n"
        f"Pre obnovu hesla pouzite tento odkaz:\n{reset_url}\n\n"
        f"Odkaz je platny {_TOKEN_EXPIRY_HOURS} hodinu.\n\n"
        "Ak ste o obnovu hesla neziadali, tento e-mail ignorujte.\n\n"
        "S pozdravom, Tim Zdravy projekt"
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
            "Password reset email sent to user %s (id=%s).", user.username, user.pk
        )
    except Exception:
        logger.exception(
            "Failed to send password reset email to user %s.", user.username
        )
        raise
