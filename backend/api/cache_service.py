"""
Cache service for managing application-level caching.

Provides centralized cache key management and TTL configuration
for frequently accessed data: GlobalSettings, ClientSettings, Diet, and daily stats.
"""

from typing import Any, Optional

from django.core.cache import cache

# Cache key constants
GLOBAL_SETTINGS_CACHE_KEY = "global_settings"
CLIENT_SETTINGS_CACHE_KEY_PREFIX = "client_settings"
DIET_LIST_CACHE_KEY = "diet_list"
DAILY_STATS_CACHE_KEY_PREFIX = "daily_stats"

# Cache timeout (TTL) constants in seconds
GLOBAL_SETTINGS_TIMEOUT = 3600  # 1 hour
CLIENT_SETTINGS_TIMEOUT = 3600  # 1 hour
DIET_LIST_TIMEOUT = 86400  # 24 hours (static data)
DAILY_STATS_TIMEOUT = 300  # 5 minutes


def get_global_settings_cache_key() -> str:
    """Return the cache key for GlobalSettings."""
    return GLOBAL_SETTINGS_CACHE_KEY


def get_client_settings_cache_key(user_id: int) -> str:
    """Return the cache key for ClientSettings by user ID."""
    return f"{CLIENT_SETTINGS_CACHE_KEY_PREFIX}:{user_id}"


def get_diet_list_cache_key() -> str:
    """Return the cache key for Diet list."""
    return DIET_LIST_CACHE_KEY


def get_daily_stats_cache_key(date_str: str) -> str:
    """Return the cache key for daily stats by date (YYYY-MM-DD format)."""
    return f"{DAILY_STATS_CACHE_KEY_PREFIX}:{date_str}"


def get_cached(key: str) -> Optional[Any]:
    """
    Retrieve a value from cache.

    Args:
        key: The cache key.

    Returns:
        The cached value or None if not found.
    """
    return cache.get(key)


def set_cached(key: str, value: Any, timeout: Optional[int] = None) -> None:
    """
    Set a value in cache.

    Args:
        key: The cache key.
        value: The value to cache.
        timeout: TTL in seconds. If None, uses default timeout.
    """
    cache.set(key, value, timeout=timeout or 300)


def delete_cached(key: str) -> None:
    """
    Delete a value from cache.

    Args:
        key: The cache key.
    """
    cache.delete(key)


def clear_global_settings_cache() -> None:
    """Clear the GlobalSettings cache."""
    delete_cached(get_global_settings_cache_key())


def clear_client_settings_cache(user_id: int) -> None:
    """
    Clear the ClientSettings cache for a specific user.

    Args:
        user_id: The user ID.
    """
    delete_cached(get_client_settings_cache_key(user_id))


def clear_diet_list_cache() -> None:
    """Clear the Diet list cache."""
    delete_cached(get_diet_list_cache_key())


def clear_daily_stats_cache(date_str: Optional[str] = None) -> None:
    """
    Clear the daily stats cache.

    Args:
        date_str: Optional specific date (YYYY-MM-DD). If None, clears all stats.
    """
    if date_str:
        delete_cached(get_daily_stats_cache_key(date_str))
    else:
        # Clear all daily stats cache keys (pattern matching via cache backend)
        # This is a simplified approach: delete all keys matching the pattern
        cache.delete_many([get_daily_stats_cache_key("*")])


def get_cache_stats() -> dict:
    """
    Get cache hit/miss statistics and metrics.

    Returns:
        Dictionary with cache statistics (backend-dependent).
    """
    # This would need Redis-specific implementation to track hits/misses
    # For now, return placeholder structure
    try:
        info = cache._cache.conn.info()  # Requires redis backend
        return {
            "connected": True,
            "memory_used_mb": info.get("used_memory", 0) / (1024 * 1024),
            "connected_clients": info.get("connected_clients", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
        }
    except (AttributeError, Exception):
        # Not a Redis cache or Redis unavailable
        return {
            "connected": False,
            "message": "Cache stats not available for current backend",
        }
