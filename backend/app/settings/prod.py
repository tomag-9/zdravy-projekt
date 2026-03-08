"""
Production settings.
"""

import os

from .base import *  # noqa: F401, F403

DEBUG = False

# Remove Django admin in production for security
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.admin"]
if "django_prometheus" not in INSTALLED_APPS:
    INSTALLED_APPS = ["django_prometheus", *INSTALLED_APPS]

if "django_prometheus.middleware.PrometheusBeforeMiddleware" not in MIDDLEWARE:
    MIDDLEWARE.insert(0, "django_prometheus.middleware.PrometheusBeforeMiddleware")
if "django_prometheus.middleware.PrometheusAfterMiddleware" not in MIDDLEWARE:
    MIDDLEWARE.append("django_prometheus.middleware.PrometheusAfterMiddleware")

ALLOWED_HOSTS = [
    os.environ.get("PROD_HOST", "example.com"),
    os.environ.get("PROD_HOST_WWW", "www.example.com"),
]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    os.environ.get("FRONTEND_URL", "https://example.com"),
]
CORS_ALLOW_CREDENTIALS = True

# Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# HSTS settings
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Proxy settings (behind Nginx)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Email configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@example.com")


def _init_sentry():
    dsn = env("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
    except ImportError:
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,
        environment="production",
    )


_init_sentry()

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
