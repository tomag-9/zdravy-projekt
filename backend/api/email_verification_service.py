"""
Email verification service for new user registrations.
Handles token generation, email sending, and verification.
"""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from .models import EmailVerificationToken

logger = logging.getLogger(__name__)

# Email verification token expires after 24 hours
TOKEN_EXPIRY_HOURS = 24


def generate_verification_token(user):
    """
    Generate a secure random verification token for the user.
    Invalidates any existing unused tokens.

    Args:
        user: Django User instance

    Returns:
        EmailVerificationToken instance
    """
    # Invalidate any existing unused tokens
    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

    # Generate secure random token
    token_value = secrets.token_urlsafe(32)

    # Create new token with expiry
    expires_at = timezone.now() + timedelta(hours=TOKEN_EXPIRY_HOURS)

    token = EmailVerificationToken.objects.create(
        user=user,
        token=token_value,
        expires_at=expires_at,
    )

    return token


def send_verification_email(user, token):
    """
    Send verification email to the user with verification link.

    Args:
        user: Django User instance
        token: EmailVerificationToken instance

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Build verification URL
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        verification_url = f"{frontend_url}/verify-email/{token.token}"

        # Email context
        context = {
            "user": user,
            "company_name": (
                user.profile.company_name if hasattr(user, "profile") else ""
            ),
            "verification_url": verification_url,
            "expiry_hours": TOKEN_EXPIRY_HOURS,
        }

        # Render email (HTML and plain text versions)
        subject = "Overenie emailu - Zdravý projekt"
        html_message = render_to_string("email/verify_email.html", context)
        plain_message = strip_tags(html_message)

        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [user.email]

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Verification email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}")
        return False


def verify_email_token(token_value):
    """
    Verify the email verification token and mark user as verified.

    Args:
        token_value: String token value

    Returns:
        tuple: (success: bool, message: str, user: User|None)
    """
    try:
        token = EmailVerificationToken.objects.get(token=token_value)
    except EmailVerificationToken.DoesNotExist:
        return False, "Neplatný verifikačný token.", None

    if token.used:
        return False, "Tento token už bol použitý.", None

    if token.is_expired:
        return (
            False,
            "Platnosť tokenu vypršala. Požiadajte o nový verifikačný email.",
            None,
        )

    # Mark token as used
    token.used = True
    token.save()

    # Mark user's email as verified
    user = token.user
    if hasattr(user, "profile"):
        user.profile.email_verified = True
        user.profile.save()

    logger.info(f"Email verified for user {user.email}")
    return True, "Email bol úspešne overený!", user


def resend_verification_email(user):
    """
    Resend verification email to user (generates new token).

    Args:
        user: Django User instance

    Returns:
        bool: True if email was sent successfully
    """
    if hasattr(user, "profile") and user.profile.email_verified:
        logger.warning(
            f"Attempted to resend verification to already verified user {user.email}"
        )
        return False

    token = generate_verification_token(user)
    return send_verification_email(user, token)
