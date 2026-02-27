"""
Generic rate limiting utilities for registration and verification endpoints.

Uses Django's cache framework (Redis in prod, LocMem in dev/test).
Prevents spam and abuse by limiting requests per IP or email.
"""

import hashlib
import time

from django.core.cache import cache

# ── Configuration ──────────────────────────────────────────────────────────────
REGISTRATION_MAX_ATTEMPTS = 5  # max registration attempts per IP/email
REGISTRATION_BLOCK_DURATION = 60 * 60  # 1 hour block after max attempts
RESEND_VERIFICATION_COOLDOWN = 60  # 1 minute between verification email resends


# ── Custom exceptions ──────────────────────────────────────────────────────────


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limit exceeded. Retry after {retry_after_seconds}s.")


class TooSoonError(Exception):
    """Raised when action is attempted too soon after previous attempt."""

    def __init__(self, wait_seconds: int) -> None:
        self.wait_seconds = wait_seconds
        super().__init__(f"Please wait {wait_seconds}s before trying again.")


# ── Internal helpers ───────────────────────────────────────────────────────────


def _hash_identifier(identifier: str) -> str:
    """Create short deterministic hash for cache keys."""
    return hashlib.sha256(identifier.encode()).hexdigest()[:20]


def _key_registration_attempts(identifier: str) -> str:
    """Cache key for registration attempts (by IP or email)."""
    return f"registration:attempts:{_hash_identifier(identifier)}"


def _key_registration_block(identifier: str) -> str:
    """Cache key for registration block."""
    return f"registration:block_until:{_hash_identifier(identifier)}"


def _key_verification_last_sent(email: str) -> str:
    """Cache key for last verification email sent time."""
    return f"verification:last_sent:{_hash_identifier(email)}"


# ── Public API ─────────────────────────────────────────────────────────────────


def check_registration_rate_limit(identifier: str) -> None:
    """
    Check if registration is allowed for the given identifier (IP or email).

    Raises:
        RateLimitExceeded: If too many attempts or currently blocked
    """
    now = time.time()

    # Check if currently blocked
    block_until = cache.get(_key_registration_block(identifier))
    if block_until is not None:
        retry_after = max(1, int(block_until - now))
        raise RateLimitExceeded(retry_after_seconds=retry_after)

    # Increment attempt counter
    attempts_key = _key_registration_attempts(identifier)
    attempts: int = cache.get(attempts_key, 0)
    new_attempts = attempts + 1

    cache.set(attempts_key, new_attempts, timeout=REGISTRATION_BLOCK_DURATION)

    # Block if exceeded max attempts
    if new_attempts >= REGISTRATION_MAX_ATTEMPTS:
        cache.set(
            _key_registration_block(identifier),
            now + REGISTRATION_BLOCK_DURATION,
            timeout=REGISTRATION_BLOCK_DURATION,
        )
        raise RateLimitExceeded(retry_after_seconds=REGISTRATION_BLOCK_DURATION)


def check_verification_resend_rate_limit(email: str) -> None:
    """
    Check if verification email resend is allowed.

    Raises:
        TooSoonError: If resend requested too soon after last send
    """
    now = time.time()
    last_sent = cache.get(_key_verification_last_sent(email))

    if last_sent is not None:
        elapsed = now - last_sent
        if elapsed < RESEND_VERIFICATION_COOLDOWN:
            raise TooSoonError(
                wait_seconds=int(RESEND_VERIFICATION_COOLDOWN - elapsed) + 1
            )


def record_verification_sent(email: str) -> None:
    """Record that a verification email was sent."""
    cache.set(
        _key_verification_last_sent(email),
        time.time(),
        timeout=RESEND_VERIFICATION_COOLDOWN + 10,
    )


def clear_registration_rate_limit(identifier: str) -> None:
    """Clear rate limit state for identifier (e.g., after successful verification)."""
    cache.delete(_key_registration_attempts(identifier))
    cache.delete(_key_registration_block(identifier))
