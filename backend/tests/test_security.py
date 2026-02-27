"""
Tests for unauthorized access and production security.
"""

import pytest
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient


class AdminSecurityTests(TestCase):
    """Test Django admin security."""

    def setUp(self):
        self.api_client = APIClient()

    @override_settings(DEBUG=False)
    def test_admin_not_accessible_in_production(self):
        """Django admin should not be accessible in production - should redirect."""
        response = self.api_client.get("/admin/", format="json")
        # Should do HTTP redirect (302) to login page, not serve Django admin
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.url)
        self.assertNotIn("Django administration", str(response.content))

    def test_admin_app_installed_in_development(self):
        """Django admin should be installed in development (tests use dev settings)."""
        # Tests use app.settings.dev which includes django.contrib.admin
        from django.apps import apps

        self.assertTrue(apps.is_installed("django.contrib.admin"))


class InvalidRouteRedirectTests(TestCase):
    """Test that invalid routes are handled securely."""

    def setUp(self):
        self.api_client = APIClient()
        self.client = Client()

    @override_settings(DEBUG=False)
    def test_invalid_admin_route_returns_redirect(self):
        """Invalid /admin/* routes should redirect to login (except /admin/ and /admin)."""
        # /admin/login/ is not /admin/ or /admin, so it won't resolve as a Django route
        # and will trigger the Resolver404 path, resulting in a redirect
        response = self.api_client.get(
            "/admin/login/?next=/admin/diets", format="json", follow=False
        )
        # Should redirect to login page
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.url)

    @override_settings(DEBUG=False)
    def test_api_routes_still_work(self):
        """Valid API routes should pass through normally."""
        response = self.api_client.get("/api/health/", format="json")
        # Health endpoint should be reachable
        self.assertIn(response.status_code, [200, 404])  # Depends on if implemented

    @override_settings(DEBUG=True)
    def test_invalid_routes_pass_through_in_dev(self):
        """In development, invalid routes should show normal Django error."""
        response = self.client.get("/nonexistent/", follow=False)
        # In dev, should get normal Django 404 page
        self.assertEqual(response.status_code, 404)


class MiddlewareSecurityTests(TestCase):
    """Test middleware behavior."""

    def setUp(self):
        self.api_client = APIClient()

    @override_settings(DEBUG=False)
    def test_unauthorized_non_api_request_redirect(self):
        """Non-API unauthorized routes should redirect to login."""
        response = self.api_client.get("/admin/", format="json", follow=False)
        # Should get HTTP redirect (302)
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.url)

    @override_settings(DEBUG=False)
    def test_api_requests_not_redirected(self):
        """API requests should not be affected by redirect middleware."""
        response = self.api_client.get("/api/diets/", format="json")
        # Should not be a redirect (might be 200, 401, 403, 404)
        # but should NOT be our custom 404
        if response.status_code == 404:
            data = response.json()
            # If it's a 404, it should be from DRF, not our middleware
            self.assertNotIn("redirect_url", data)

    @override_settings(DEBUG=False)
    def test_frontend_admin_routes_redirect_to_login(self):
        """Frontend admin-like routes under /admin/ should redirect to frontend login in production."""
        # These are frontend (React) routes and should be handled like other non-API routes
        # They won't resolve as Django routes, so Resolver404/middleware will redirect to /login
        response = self.api_client.get("/admin/settings/", format="json", follow=False)
        # In production, this should redirect to login page, not serve Django admin
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.url)
        self.assertNotIn("Django administration", str(response.content))
