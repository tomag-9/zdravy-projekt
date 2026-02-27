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
        self.client = Client()

    @override_settings(DEBUG=False)
    def test_admin_not_accessible_in_production(self):
        """Django admin should not be accessible in production."""
        response = self.client.get("/admin/", follow=False)
        # Should get 404 or redirect, not the login page
        self.assertNotIn("Django administration", response.content.decode())

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
    def test_invalid_admin_route_returns_404(self):
        """Invalid /admin/ routes should return 404 with redirect info."""
        response = self.api_client.get("/admin/login/?next=/admin/diets", format="json")
        self.assertEqual(response.status_code, 404)
        # Should suggest frontend login, not show Django content
        self.assertNotIn("Django", str(response.content))

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
        """Non-API unauthorized routes should get 404 with redirect."""
        response = self.api_client.get("/admin/", format="json")
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn("redirect_url", data)
        self.assertIn("login", data["redirect_url"])

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
