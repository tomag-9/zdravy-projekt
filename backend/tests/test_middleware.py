"""
Tests for NoCacheMiddleware.
Verifies that cache-control headers are applied to /api/ endpoints
and not applied to non-API paths.
"""

from django.http import HttpResponse
from django.test import RequestFactory

from api.middleware import NoCacheMiddleware


class TestNoCacheMiddleware:
    """Unit tests for NoCacheMiddleware."""

    def setup_method(self):
        self.factory = RequestFactory()
        self.get_response = lambda request: HttpResponse("ok")
        self.middleware = NoCacheMiddleware(self.get_response)

    def _get_response(self, path: str) -> HttpResponse:
        request = self.factory.get(path)
        return self.middleware(request)

    # --- API endpoints: headers MUST be present ---

    def test_api_endpoint_sets_cache_control(self):
        response = self._get_response("/api/orders/")
        assert (
            response["Cache-Control"] == "no-cache, no-store, must-revalidate, private"
        )

    def test_api_endpoint_sets_pragma(self):
        response = self._get_response("/api/profile/")
        assert response["Pragma"] == "no-cache"

    def test_api_endpoint_sets_expires(self):
        response = self._get_response("/api/meals/")
        assert response["Expires"] == "0"

    def test_api_root_sets_headers(self):
        """Exact /api/ path also receives headers."""
        response = self._get_response("/api/")
        assert (
            response["Cache-Control"] == "no-cache, no-store, must-revalidate, private"
        )

    # --- Non-API paths: headers MUST NOT be present ---

    def test_non_api_path_no_cache_control(self):
        response = self._get_response("/admin/")
        assert "Cache-Control" not in response

    def test_static_path_no_cache_control(self):
        response = self._get_response("/static/app.js")
        assert "Cache-Control" not in response

    def test_root_path_no_cache_control(self):
        response = self._get_response("/")
        assert "Cache-Control" not in response

    # --- Integration: middleware does not alter response body ---

    def test_response_body_unchanged(self):
        request = self.factory.get("/api/orders/")
        response = self.middleware(request)
        assert response.content == b"ok"

    def test_non_api_response_body_unchanged(self):
        request = self.factory.get("/")
        response = self.middleware(request)
        assert response.content == b"ok"
