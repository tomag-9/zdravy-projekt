"""Notification service – centralised transactional email sending."""

import logging
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class NotificationService:
    """Send transactional notification emails."""

    @staticmethod
    def send_approval_email(user: User, company_name: str) -> None:
        """
        Notify *user* that their registration has been approved.

        Failures are logged but not re-raised so the caller's transaction
        is not rolled back when the mail server is temporarily unavailable.
        """
        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            login_url = f"{frontend_url}/login"

            context = {
                "user": user,
                "company_name": company_name,
                "login_url": login_url,
            }

            subject = "Účet schválený - Zdravý projekt"
            html_message = render_to_string("email/registration_approved.html", context)
            plain_message = strip_tags(html_message)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info("Approval email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send approval email to %s: %s", user.email, exc)

    @staticmethod
    def send_denial_email(
        user: User, company_name: str, denial_reason: Optional[str] = ""
    ) -> None:
        """
        Notify *user* that their registration has been denied.

        Failures are logged but not re-raised.
        """
        try:
            context = {
                "user": user,
                "company_name": company_name,
                "denial_reason": denial_reason or "",
            }

            subject = "Registrácia zamietnutá - Zdravý projekt"
            html_message = render_to_string("email/registration_denied.html", context)
            plain_message = strip_tags(html_message)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info("Denial email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send denial email to %s: %s", user.email, exc)
