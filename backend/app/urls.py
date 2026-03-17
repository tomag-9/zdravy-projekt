"""
URL configuration for the project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django_prometheus.exports import ExportToDjangoView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("api/", include("api.urls")),  # Add your API urls here
    path("", include("django_prometheus.urls")),
    path(
        "metrics/", ExportToDjangoView
    ),  # handle trailing slash (APPEND_SLASH redirect target)
]

# Dev-only push echo endpoint – acts as a fake browser push service.
# seed_dev_data seeds a PushSubscription pointing here so pushes can be
# verified without a real browser subscription.
if settings.DEBUG:
    import logging

    from django.http import HttpResponse
    from django.views.decorators.csrf import csrf_exempt

    _push_echo_logger = logging.getLogger("dev.push_echo")

    @csrf_exempt
    def _dev_push_echo(request):
        _push_echo_logger.info(
            "DEV PUSH ECHO received push: %d bytes encrypted payload",
            len(request.body),
        )
        return HttpResponse(status=201)

    urlpatterns.append(path("api/dev/push-echo/", _dev_push_echo, name="dev_push_echo"))

# Only expose API schema and documentation in development
if settings.DEBUG:
    urlpatterns.extend(
        [
            path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
            path(
                "api/docs/",
                SpectacularSwaggerView.as_view(url_name="schema"),
                name="swagger-ui",
            ),
            path(
                "api/redoc/",
                SpectacularRedocView.as_view(url_name="schema"),
                name="redoc",
            ),
        ]
    )

# Only expose Django admin in development
if settings.DEBUG:
    from django.contrib import admin

    urlpatterns.insert(0, path("admin/", admin.site.urls))

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
