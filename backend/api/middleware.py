"""
Middleware for API security and caching control.
"""

from django.conf import settings
from django.http import JsonResponse
from django.urls import resolve
from django.urls.exceptions import Resolver404


class NoCacheMiddleware:
    """
    Middleware to prevent caching of API responses.
    This ensures that authenticated endpoints always return fresh data
    and prevents user data leakage across sessions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
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

    def __init__(self, get_response):
        self.get_response = get_response
        self.get_frontend_url = lambda: getattr(
            settings, "FRONTEND_URL", "https://example.com"
        )

    def __call__(self, request):
        # Allow all API routes through
        if request.path.startswith("/api/"):
            return self.get_response(request)

        # Block /admin/ routes in production
        if not settings.DEBUG and request.path.startswith("/admin/"):
            frontend_url = self.get_frontend_url()
            return JsonResponse(
                {
                    "error": "Not Found",
                    "detail": f"Redirect to {frontend_url}/login",
                    "redirect_url": f"{frontend_url}/login",
                },
                status=404,
            )

        # In production, redirect non-API, non-static requests to frontend login
        if not settings.DEBUG:
            # Allow static files through
            if request.path.startswith("/static/") or request.path.startswith(
                "/media/"
            ):
                return self.get_response(request)

            # Try to resolve the URL; if it fails, redirect to frontend
            try:
                resolve(request.path)
            except Resolver404:
                # If path doesn't exist, redirect to frontend login
                frontend_url = self.get_frontend_url()
                return JsonResponse(
                    {
                        "error": "Not Found",
                        "detail": f"Redirect to {frontend_url}/login",
                        "redirect_url": f"{frontend_url}/login",
                    },
                    status=404,
                )

        return self.get_response(request)
