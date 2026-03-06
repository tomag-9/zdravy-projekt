"""
Middleware for API security and caching control.
"""

from typing import Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.urls import resolve
from django.urls.exceptions import Resolver404


class NoCacheMiddleware:
    """
    Middleware to prevent caching of API responses.
    This ensures that authenticated endpoints always return fresh data
    and prevents user data leakage across sessions.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        # Only apply to API endpoints
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "no-cache, no-store, must-revalidate, private"
            response["Pragma"] = "no-cache"
            response["Expires"] = "0"

        return response


class UnauthorizedAccessRedirectMiddleware:
    """
    Redirect unauthorized access to non-API routes to the frontend.
    - In production, there is no Django admin.
    - Non-API requests that don't resolve are redirected to frontend.
    This prevents users from seeing raw Django error pages.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response
        self.get_frontend_url = lambda: getattr(
            settings, "FRONTEND_URL", "https://example.com"
        )

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Allow all API routes through
        if request.path.startswith("/api/"):
            return self.get_response(request)

        # Block only the Django admin root in production (/admin/ and /admin)
        # Do NOT block frontend admin routes like /admin/settings, /admin/clients, etc.
        if not settings.DEBUG and request.path in ("/admin/", "/admin"):
            frontend_url = self.get_frontend_url()
            # Use proper HTTP redirect instead of JSON error
            return HttpResponseRedirect(f"{frontend_url}/login")

        # In production, redirect non-API, non-static requests to frontend login
        if not settings.DEBUG:
            # Allow static files through
            if request.path.startswith("/static/") or request.path.startswith(
                "/media/"
            ):
                return self.get_response(request)

            # Try to resolve the URL; if it fails, redirect to frontend login
            try:
                resolve(request.path)
            except Resolver404:
                # If path doesn't exist, redirect to frontend login
                frontend_url = self.get_frontend_url()
                return HttpResponseRedirect(f"{frontend_url}/login")

        return self.get_response(request)
