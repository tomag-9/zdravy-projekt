"""
Staging settings - mirror production as closely as possible.
"""

import os

from .base import *  # noqa: F401, F403

DEBUG = False

if "django_prometheus" not in INSTALLED_APPS:
    INSTALLED_APPS = ["django_prometheus", *INSTALLED_APPS]

if "django_prometheus.middleware.PrometheusBeforeMiddleware" not in MIDDLEWARE:
    MIDDLEWARE.insert(0, "django_prometheus.middleware.PrometheusBeforeMiddleware")
if "django_prometheus.middleware.PrometheusAfterMiddleware" not in MIDDLEWARE:
    MIDDLEWARE.append("django_prometheus.middleware.PrometheusAfterMiddleware")

ALLOWED_HOSTS = [
    "zp.tomag.xyz",
    "backend",
    "localhost",
    "127.0.0.1",
    "192.168.0.14",
    os.environ.get("STAGING_HOST", ""),
]
ALLOWED_HOSTS = [h for h in ALLOWED_HOSTS if h]  # Remove empty strings

# CORS settings
CORS_ALLOWED_ORIGINS = [
    os.environ.get("FRONTEND_URL", "https://staging.example.com"),
]
CORS_ALLOW_CREDENTIALS = True

# Security settings
# Trust X-Forwarded-Proto header from nginx/Cloudflare
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Don't force SSL redirect - nginx/Cloudflare handles this
# Internal health checks and direct backend access would fail with redirect
SECURE_SSL_REDIRECT = False

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# HSTS settings
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Email configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", os.environ.get("EMAIL_HOST_USER", "noreply@example.com")
)


def _init_sentry():
    dsn = env("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
    except Exception:
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,
        environment="staging",
    )


_init_sentry()

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
