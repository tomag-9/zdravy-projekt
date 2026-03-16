"""User service – business logic for admin-managed user lifecycle."""

import logging

logger = logging.getLogger(__name__)


class RegistrationError(ValueError):
    """Raised when a user creation business-rule is violated."""
