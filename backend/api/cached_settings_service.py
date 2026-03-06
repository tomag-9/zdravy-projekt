"""
Cached settings retrieval service.

Provides functions to retrieve GlobalSettings and ClientSettings with caching.
Cache is automatically invalidated via signals when settings are updated.
"""

from typing import Optional

from django.contrib.auth.models import User

from api.cache_service import (
    CLIENT_SETTINGS_TIMEOUT,
    GLOBAL_SETTINGS_TIMEOUT,
    get_cached,
    get_client_settings_cache_key,
    get_global_settings_cache_key,
    set_cached,
)
from api.models import ClientSettings, GlobalSettings


def get_global_settings():
    """
    Retrieve GlobalSettings with caching.

    Returns the cached instance if available, otherwise fetches from DB
    and caches for future requests.

    Returns:
        GlobalSettings: The global settings instance (singleton).

    Raises:
        GlobalSettings.DoesNotExist: If GlobalSettings doesn't exist.
    """
    cache_key = get_global_settings_cache_key()

    # Try to get from cache
    cached_settings = get_cached(cache_key)
    if cached_settings is not None:
        return cached_settings

    # Fetch from database (or create if fresh DB)
    settings, _ = GlobalSettings.objects.get_or_create(pk=1)

    # Cache for future requests
    set_cached(cache_key, settings, timeout=GLOBAL_SETTINGS_TIMEOUT)

    return settings


def get_client_settings(user_id: int) -> Optional[ClientSettings]:
    """
    Retrieve ClientSettings for a user with caching.

    Returns the cached instance if available, otherwise fetches from DB
    and caches for future requests.

    Args:
        user_id: The user ID.

    Returns:
        ClientSettings: The client settings instance, or None if not found.
    """
    cache_key = get_client_settings_cache_key(user_id)

    # Try to get from cache
    cached_settings = get_cached(cache_key)
    if cached_settings is not None:
        return cached_settings

    # Fetch from database
    try:
        settings = ClientSettings.objects.get(user_id=user_id)
        # Cache for future requests
        set_cached(cache_key, settings, timeout=CLIENT_SETTINGS_TIMEOUT)
        return settings
    except ClientSettings.DoesNotExist:
        return None


def get_client_settings_by_user(user: User) -> Optional[ClientSettings]:
    """
    Retrieve ClientSettings for a user object with caching.

    Args:
        user: The User instance.

    Returns:
        ClientSettings: The client settings instance, or None if not found.
    """
    return get_client_settings(user.id)
