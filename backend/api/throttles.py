"""
Global (not per-user/per-IP) throttles for the endpoints that saturate first
under load.

DRF's built-in throttle classes key by user or IP, which does nothing when
the overload comes from many *different* legitimate users arriving at once
(e.g. everyone opening the app right after the 09:45 order-deadline push
notification) — each of those users is nowhere near a per-user rate limit.

These throttles instead share one cache key across all requests to the view,
capping total throughput. Past the limit, DRF's default `Throttled` handling
returns 429 with a `Retry-After` header immediately, instead of the request
queueing behind gunicorn's backlog until it hits the client's own timeout.

Rates are set below the measured collapse point (see load-tests/README.md
"Measured Capacity"), not at DRF's per-endpoint default, so they should be
re-tuned if backend capacity changes (more CPU, more replicas).
"""

from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle


class GlobalRateThrottle(SimpleRateThrottle):
    """Rate-limits ALL requests to the view combined, regardless of caller."""

    def get_cache_key(self, request, view):
        return f"throttle_global_{self.scope}"

    def get_rate(self):
        # SimpleRateThrottle.THROTTLE_RATES is a class attribute snapshotted
        # from api_settings at import time — it never sees changes to
        # settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] made afterwards
        # (e.g. via override_settings in tests, or any runtime settings
        # reload). Read api_settings directly instead so rate changes apply
        # without needing a process restart.
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]


class LoginRateThrottle(GlobalRateThrottle):
    scope = "login_global"


class OrderSubmitRateThrottle(GlobalRateThrottle):
    scope = "order_submit_global"
