"""
Password reset service – pure business logic.

Rate-limiting uses Django's cache framework (Redis in prod, LocMem in dev/test).
Increments an attempt counter per email address; blocks after MAX_ATTEMPTS
for BLOCK_DURATION seconds, and enforces a RESEND_COOLDOWN between sends.
"""

import datetime
import hashlib
import logging
import secrets
import time

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

from .email_utils import send_password_reset_email
from .exceptions import RateLimitExceeded, TooSoonError
from .models import PasswordResetToken

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
MAX_ATTEMPTS = 5  # max reset-request attempts per email within BLOCK_DURATION
BLOCK_DURATION = 60 * 60  # seconds – 1 hour block after MAX_ATTEMPTS
RESEND_COOLDOWN = 60  # seconds – minimum gap between consecutive sends (1 minute)
TOKEN_EXPIRY_HOURS = 1  # hours – how long the reset link is valid


# ── Internal cache helpers ─────────────────────────────────────────────────────


def _email_hash(email: str) -> str:
    """Short deterministic identifier used in cache keys (not reversible)."""
    return hashlib.sha256(email.encode()).hexdigest()[:20]


def _key_attempts(email: str) -> str:
    return f"pwd_reset:attempts:{_email_hash(email)}"


def _key_last_sent(email: str) -> str:
    return f"pwd_reset:last_sent:{_email_hash(email)}"


def _key_block_until(email: str) -> str:
    return f"pwd_reset:block_until:{_email_hash(email)}"


# ── Public API ─────────────────────────────────────────────────────────────────


def request_password_reset(email: str) -> None:
    """
    Initiate a password reset for *email*.

    Security design:
    - Always returns successfully (no HTTP error) when the email is unknown,
      to avoid leaking whether an address is registered.
    - Raises RateLimitExceeded / TooSoonError for caller to translate to HTTP 429.

    Rate limiting:
    - Max MAX_ATTEMPTS requests per BLOCK_DURATION seconds.
    - Min RESEND_COOLDOWN seconds between consecutive sends.
    """
    email = email.strip().lower()
    now = time.time()

    # ── 1. Check hard block ───────────────────────────────────────────────────
    block_until = cache.get(_key_block_until(email))
    if block_until is not None:
        retry_after = max(1, int(block_until - now))
        raise RateLimitExceeded(retry_after_seconds=retry_after)

    # ── 2. Check resend cooldown ──────────────────────────────────────────────
    last_sent = cache.get(_key_last_sent(email))
    if last_sent is not None:
        elapsed = now - last_sent
        if elapsed < RESEND_COOLDOWN:
            raise TooSoonError(wait_seconds=int(RESEND_COOLDOWN - elapsed) + 1)

    # ── 3. Increment attempt counter ──────────────────────────────────────────
    # Incremented before user lookup so that rate-limiting applies equally to
    # registered and unregistered addresses (prevents enumeration via rate-limit
    # behaviour differences).
    attempts_key = _key_attempts(email)
    attempts: int = cache.get(attempts_key, 0)

    new_attempts = attempts + 1
    cache.set(attempts_key, new_attempts, timeout=BLOCK_DURATION)

    if new_attempts >= MAX_ATTEMPTS:
        # Persist explicit "blocked until" so TTL drift does not cause confusion.
        cache.set(_key_block_until(email), now + BLOCK_DURATION, timeout=BLOCK_DURATION)
        raise RateLimitExceeded(retry_after_seconds=BLOCK_DURATION)

    # ── 4. Record send timestamp ──────────────────────────────────────────────
    cache.set(_key_last_sent(email), now, timeout=RESEND_COOLDOWN + 10)

    # ── 5. Look up user (silent no-op when unknown) ───────────────────────────
    try:
        user = User.objects.select_related("profile").get(
            email__iexact=email, is_active=True
        )
    except User.DoesNotExist:
        # Do NOT raise – we must not leak whether the address is registered.
        logger.debug("Password reset requested for unknown/inactive email: %s", email)
        return

    # API users never log in – silently skip to avoid leaking their existence.
    if hasattr(user, "profile") and user.profile.client_type == "api":
        logger.debug("Password reset skipped for API user: %s", email)
        return

    # ── 6. Invalidate any existing tokens ────────────────────────────────────
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    # ── 7. Create new token & send email ─────────────────────────────────────
    token_value = secrets.token_urlsafe(32)
    expires_at = timezone.now() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS)

    PasswordResetToken.objects.create(
        user=user,
        token=token_value,
        expires_at=expires_at,
    )

    send_password_reset_email(user=user, token=token_value)


def confirm_password_reset(token: str, new_password: str) -> None:
    """
    Validate *token* and set *new_password* on the associated user.

    Raises:
        ValueError: if the token is invalid, expired, or already used.
    """
    try:
        reset_token = PasswordResetToken.objects.select_related("user").get(token=token)
    except PasswordResetToken.DoesNotExist:
        raise ValueError("Neplatný alebo expirovaný odkaz na obnovu hesla.")

    if not reset_token.is_valid:
        raise ValueError("Neplatný alebo expirovaný odkaz na obnovu hesla.")

    user = reset_token.user

    try:
        validate_password(new_password, user=user)
    except ValidationError as exc:
        raise ValueError(" ".join(exc.messages)) from exc

    user.set_password(new_password)
    user.save(update_fields=["password"])

    reset_token.used = True
    reset_token.save(update_fields=["used"])

    # ── Invalidate all outstanding JWT refresh tokens for this user ────────────
    # Bulk-insert to avoid N+1 and wrap in atomic so a DB error cannot leave a
    # partial blacklist (some sessions live, some revoked).
    from django.db import transaction
    from django.utils import timezone as tz
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    with transaction.atomic():
        token_ids = list(
            OutstandingToken.objects.filter(
                user=user,
                expires_at__gt=tz.now(),
            )
            .exclude(blacklistedtoken__isnull=False)
            .values_list("id", flat=True)
        )
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token_id=tid) for tid in token_ids],
            ignore_conflicts=True,
        )

    # ── Clear rate-limit state so user can log in immediately ─────────────────
    email = user.email.lower()
    cache.delete(_key_attempts(email))
    cache.delete(_key_last_sent(email))
    cache.delete(_key_block_until(email))

    logger.info("Password successfully reset for user %s (id=%s).", user.email, user.pk)
