from datetime import date

import pytest
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from api.models import DailyOrder

pytestmark = pytest.mark.integration


class DailyOrderAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser@example.com",
            password="testpassword",
            email="testuser@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.today = date.today()

    def test_create_order(self):
        url = reverse("dailyorder-list")
        data = {"date": self.today, "data": {"breakfast": {"menuCounts": {"A": 1}}}}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DailyOrder.objects.count(), 1)
        # Status check removed or checked as default
        self.assertEqual(DailyOrder.objects.get().status, "submitted")
        self.assertEqual(
            DailyOrder.objects.get().data["breakfast"]["menuCounts"]["A"], 1
        )

    def test_update_order(self):
        # Create initial order
        DailyOrder.objects.create(user=self.user, date=self.today, data={})

        # Update via list POST (using update_or_create logic in serializer)
        url = reverse("dailyorder-list")
        data = {"date": self.today, "data": {"lunch": {"menuCounts": {"A": 2}}}}
        response = self.client.post(url, data, format="json")
        # DRF generic create returns 201 even if updated internally via serializer logic
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED]
        )
        # Should still be 1 order
        self.assertEqual(DailyOrder.objects.count(), 1)
        self.assertEqual(DailyOrder.objects.get().data["lunch"]["menuCounts"]["A"], 2)

    def test_get_by_date(self):
        # Create order
        DailyOrder.objects.create(
            user=self.user, date=self.today, data={"key": "value"}
        )

        url = reverse("dailyorder-by-date", args=[self.today])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check raw data, or specific field. The view returns serializer.data
        self.assertEqual(response.data["data"]["key"], "value")

    def test_get_by_date_empty(self):
        tomorrow = date(2100, 1, 1)
        url = reverse("dailyorder-by-date", args=[tomorrow])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"], {})
