from datetime import date

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import DailyOrder


class AdminSummaryTest(APITestCase):
    def setUp(self):
        # Create Admin
        self.admin = User.objects.create_user(
            username="admin", password="password", is_staff=True
        )
        # Create Client
        self.client_user = User.objects.create_user(
            username="client", password="password", is_staff=False
        )

        self.today = date.today().isoformat()

        # Create complex Detailed Order 1
        DailyOrder.objects.create(
            user=self.client_user,
            date=self.today,
            status="submitted",
            data={
                "breakfast": {
                    "Dospelý (SŠ)": {"menuCounts": {"A": 2}, "diets": {"Bez lepku": 1}}
                },
                "lunch": {
                    "ZŠ 1.stupeň": {"menuCounts": {"A": 5, "B": 2}, "diets": {}},
                    "Dospelý (SŠ)": {
                        "menuCounts": {"A": 1},
                        "diets": {"Bez laktózy": 1},
                    },
                },
                "olovrant": {"Jasle": {"menuCounts": {"A": 3}, "diets": {}}},
            },
        )

        # Create second client/order
        self.client2 = User.objects.create_user(username="client2", password="password")
        DailyOrder.objects.create(
            user=self.client2,
            date=self.today,
            status="draft",
            data={"lunch": {"ZŠ 1.stupeň": {"menuCounts": {"A": 3}, "diets": {}}}},
        )

    def test_admin_can_access_summary(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/admin/summary/daily-stats/?date={self.today}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["total_orders"], 2)

        # Check Breakfast - Dospelý
        # Expecting: 2xA, 1x Gluten
        bf_stats = data["meals"]["breakfast"]["Dospelý (SŠ)"]
        self.assertEqual(bf_stats["menus"]["A"], 2)
        self.assertEqual(bf_stats["diets"]["Bez lepku"], 1)
        self.assertEqual(bf_stats["total"], 2)

        # Check Lunch - ZŠ 1.stupeň
        # Order 1: 5xA, 2xB. Order 2: 3xA. Total: 8xA, 2xB
        lunch_zs = data["meals"]["lunch"]["ZŠ 1.stupeň"]
        self.assertEqual(lunch_zs["menus"]["A"], 8)
        self.assertEqual(lunch_zs["menus"]["B"], 2)
        self.assertEqual(lunch_zs["total"], 10)

        # Check Lunch - Dospelý
        lunch_adult = data["meals"]["lunch"]["Dospelý (SŠ)"]
        self.assertEqual(lunch_adult["menus"]["A"], 1)
        self.assertEqual(lunch_adult["diets"]["Bez laktózy"], 1)

        # Check Olovrant
        olovrant_jasle = data["meals"]["olovrant"]["Jasle"]
        self.assertEqual(olovrant_jasle["menus"]["A"], 3)

    def test_client_cannot_access_summary(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f"/api/admin/summary/daily-stats/?date={self.today}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminDailyReportTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin2", password="password", is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="clientA",
            password="password",
            first_name="Anna",
            last_name="Novák",
            email="anna@test.sk",
            is_staff=False,
        )
        self.today = date.today().isoformat()
        DailyOrder.objects.create(
            user=self.client_user,
            date=self.today,
            status="submitted",
            data={
                "breakfast": {
                    "Dospelý": {"menuCounts": {"A": 2}, "diets": {"No Milk": 1}}
                },
                "lunch": {"ZŠ": {"menuCounts": {"A": 5, "B": 1}, "diets": {}}},
                "olovrant": {},
            },
        )

    def test_daily_report_returns_rows(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            f"/api/admin/summary/daily-report/?date={self.today}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["date"], self.today)
        self.assertEqual(len(data["rows"]), 1)

        row = data["rows"][0]
        self.assertEqual(row["username"], "clientA")
        self.assertEqual(row["breakfast"]["total"], 2)
        self.assertEqual(row["lunch"]["total"], 6)
        self.assertEqual(row["olovrant"]["total"], 0)
        self.assertEqual(row["total"], 8)

        self.assertEqual(data["totals"]["grand"], 8)
        self.assertEqual(data["totals"]["breakfast"]["total"], 2)
        self.assertEqual(data["totals"]["breakfast"]["diets"]["No Milk"], 1)

    def test_daily_report_requires_date(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/admin/summary/daily-report/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_daily_report_invalid_date_format(self):
        self.client.force_authenticate(user=self.admin)
        for bad_date in ["not-a-date", "2024/01/01", "01-01-2024", "<script>"]:
            response = self.client.get(
                f"/api/admin/summary/daily-report/?date={bad_date}"
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                msg=f"Expected 400 for bad date: {bad_date!r}",
            )

    def test_daily_report_client_forbidden(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(
            f"/api/admin/summary/daily-report/?date={self.today}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_daily_report_xlsx_returns_file(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            f"/api/admin/summary/daily-report-xlsx/?date={self.today}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("prehlad_", response["Content-Disposition"])
        self.assertGreater(len(response.content), 100)

    def test_daily_report_xlsx_client_forbidden(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(
            f"/api/admin/summary/daily-report-xlsx/?date={self.today}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_daily_report_xlsx_invalid_date_format(self):
        self.client.force_authenticate(user=self.admin)
        for bad_date in ["not-a-date", "2024/01/01", "01-01-2024"]:
            response = self.client.get(
                f"/api/admin/summary/daily-report-xlsx/?date={bad_date}"
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                msg=f"Expected 400 for bad date: {bad_date!r}",
            )
