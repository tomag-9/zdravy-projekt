"""
Cache service for managing application-level caching.

Provides centralized cache key management and TTL configuration
for frequently accessed data: GlobalSettings, ClientSettings, Diet, and daily stats.

Includes fallback handling for Redis timeouts/connection failures to prevent
cache errors from crashing the application.
"""

import logging
from typing import Any, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)

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
    Retrieve a value from cache with graceful fallback on connection errors.

    If Redis is unavailable or times out, returns None instead of raising an
    exception. This prevents cache errors from crashing the application.

    Args:
        key: The cache key.

    Returns:
        The cached value, None if not found or on connection error.
    """
    try:
        return cache.get(key)
    except Exception as exc:
        # Log Redis connection/timeout errors but don't crash
        logger.warning(
            "Cache get failed for key '%s': %s (%s). Falling back to None.",
            key,
            exc.__class__.__name__,
            exc,
        )
        return None


def set_cached(key: str, value: Any, timeout: Optional[int] = None) -> None:
    """
    Set a value in cache with graceful fallback on connection errors.

    If Redis is unavailable or times out, logs the error but continues
    without caching. This prevents cache errors from crashing the application.

    Args:
        key: The cache key.
        value: The value to cache.
        timeout: TTL in seconds. If None, uses cache backend's default.
    """
    try:
        # Pass timeout as-is; Django will use backend default if None
        cache.set(key, value, timeout=timeout)
    except Exception as exc:
        # Log Redis connection/timeout errors but don't crash
        logger.warning(
            "Cache set failed for key '%s': %s (%s). Data will not be cached.",
            key,
            exc.__class__.__name__,
            exc,
        )


def delete_cached(key: str) -> None:
    """
    Delete a value from cache with graceful fallback on connection errors.

    If Redis is unavailable, logs the error but continues.

    Args:
        key: The cache key.
    """
    try:
        cache.delete(key)
    except Exception as exc:
        # Log but continue – cache delete failures shouldn't crash the app
        logger.warning(
            "Cache delete failed for key '%s': %s (%s)",
            key,
            exc.__class__.__name__,
            exc,
        )


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
    """Clear the Diet list cache (all paginated variants)."""
    base_key = get_diet_list_cache_key()

    # django-redis supports wildcard invalidation via delete_pattern.
    # Use it when available so keys like diet_list:page=1 are all removed.
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern(f"{base_key}*")
            return
    except Exception as exc:
        logger.warning(
            "Cache delete_pattern failed for key prefix '%s*': %s (%s)",
            base_key,
            exc.__class__.__name__,
            exc,
        )

    # Backend-agnostic fallback: clear known keys.
    # (Safe fallback when wildcard delete is unsupported.)
    delete_cached(base_key)
    delete_cached(f"{base_key}:page=1")


def clear_daily_stats_cache(date_str: Optional[str] = None) -> None:
    """
    Clear the daily stats cache for a specific date.

    Args:
        date_str: Specific date (YYYY-MM-DD). If None, no action is taken.
    """
    if date_str:
        delete_cached(get_daily_stats_cache_key(date_str))
    else:
        # Global deletion of all daily stats keys is not implemented here because
        # the Django cache API does not support wildcard deletion in a backend-
        # agnostic way. Callers should explicitly clear known date keys instead.
        pass


def get_cache_stats() -> dict:
    """
    Get cache hit/miss statistics and metrics (Redis only).

    Returns:
        Dictionary with cache statistics, or empty dict if Redis is unavailable.

    Works with both django-redis and Django's built-in RedisCache backends.
    """
    try:
        redis_client = None

        # Try django-redis: cache.client.get_client()
        client = getattr(cache, "client", None)
        if client is not None and hasattr(client, "get_client"):
            redis_client = client.get_client()
        # For Django's built-in RedisCache, cache.client may be a redis client
        elif client is not None and hasattr(client, "info"):
            redis_client = client
        # Some backends may expose get_client() directly on the cache
        elif hasattr(cache, "get_client"):
            redis_client = cache.get_client()  # type: ignore[call-arg]
        # As last resort, treat the cache itself as a redis client if it has info()
        elif hasattr(cache, "info"):
            redis_client = cache  # type: ignore[assignment]

        if redis_client is None or not hasattr(redis_client, "info"):
            # Not a Redis cache or unsupported backend
            return {}

        info = redis_client.info()
        return {
            "connected": True,
            "memory_used_mb": info.get("used_memory", 0) / (1024 * 1024),
            "connected_clients": info.get("connected_clients", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
        }
    except Exception:  # noqa: BLE001
        # Redis unavailable or unexpected backend behavior
        pass
    return {}
