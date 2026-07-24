"""
Cached settings retrieval service.

Provides cached retrieval of the singleton GlobalSettings row.
Cache is automatically invalidated via signals when settings are updated.
"""

from api.cache_service import (
    GLOBAL_SETTINGS_TIMEOUT,
    get_cached,
    get_global_settings_cache_key,
    set_cached,
)
from api.models import GlobalSettings


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
