"""
Unit tests for views.
"""

import pytest
from django.test import Client, TestCase


class ExampleViewTestCase(TestCase):
    """Example test case for views."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_example_view(self):
        """Test example view."""
        # response = self.client.get(reverse('view-name'))
        # self.assertEqual(response.status_code, 200)
        pass


@pytest.mark.django_db
class TestExampleView:
    """Example pytest-style view test."""

    def test_view_response(self, client):
        """Test view returns correct response."""
        # response = client.get(reverse('view-name'))
        # assert response.status_code == 200
        pass
