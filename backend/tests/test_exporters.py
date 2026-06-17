"""Tests for Report Exporters."""

import datetime
from decimal import Decimal
from io import BytesIO

import pytest
from django.contrib.auth.models import User
from openpyxl import load_workbook

from api.exporters import PDFReportExporter, XLSXReportExporter
from api.exporters.gramage_dashboard_xlsx_exporter import GramageDashboardXLSXExporter
from api.models import (
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    PortionType,
)
from api.services.meal_plan_service import MealPlanService


@pytest.mark.django_db
class TestPDFReportExporter:
    """Test PDFReportExporter functionality."""

    def test_pdf_generate_empty_orders(self):
        """Test PDF generation with no orders."""
        exporter = PDFReportExporter([], "2024-01-01")
        pdf_bytes = exporter.generate()

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # Check that PDF contains expected content markers
        assert pdf_bytes.startswith(b"%PDF")

    def test_pdf_generate_with_orders(self):
        """Test PDF generation with orders."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            first_name="John",
            last_name="Doe",
        )
        target_date = datetime.date(2024, 1, 1)
        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}},
            "lunch": {},
            "olovrant": {},
        }
        order = DailyOrder.objects.create(user=user, date=target_date, data=order_data)

        exporter = PDFReportExporter([order], "2024-01-01")
        pdf_bytes = exporter.generate()

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # Check that it's a valid PDF
        assert pdf_bytes.startswith(b"%PDF")

    def test_pdf_font_manager(self):
        """Test PDFFontManager font retrieval."""
        from api.exporters.pdf_exporter import PDFFontManager

        font_regular, font_bold = PDFFontManager.get_fonts()

        assert isinstance(font_regular, str)
        assert isinstance(font_bold, str)
        assert len(font_regular) > 0
        assert len(font_bold) > 0


@pytest.mark.django_db
class TestXLSXReportExporter:
    """Test XLSXReportExporter functionality."""

    def test_xlsx_generate_empty_orders(self):
        """Test XLSX generation with no orders."""
        exporter = XLSXReportExporter([], "2024-01-01")
        xlsx_bytes = exporter.generate()

        assert isinstance(xlsx_bytes, bytes)
        assert len(xlsx_bytes) > 0


@pytest.mark.django_db
class TestGramageDashboardExports:
    def test_dashboard_subtotals_exclude_diets_and_export_to_xlsx(self):
        user = User.objects.create_user(
            username="dashboard@example.com",
            email="dashboard@example.com",
            first_name="Dashboard",
            last_name="Client",
        )
        portion_type = PortionType.objects.create(
            name="Škôlka", coefficient=Decimal("1.0000"), sort_order=1
        )
        plan = DailyMealPlan.objects.create(
            date=datetime.date(2024, 1, 15),
            created_by=user,
        )
        breakfast = MealTemplate.objects.create(
            category="breakfast",
            name="Kaša",
            weight_label="100g",
            base_weight_grams=Decimal("100.00"),
        )
        lunch_a = MealTemplate.objects.create(
            category="lunch",
            name="Menu A",
            weight_label="200g",
            base_weight_grams=Decimal("200.00"),
            menu_variant="A",
        )
        lunch_b = MealTemplate.objects.create(
            category="lunch",
            name="Menu B",
            weight_label="250g",
            base_weight_grams=Decimal("250.00"),
            menu_variant="B",
        )
        snack = MealTemplate.objects.create(
            category="snack",
            name="Ovocie",
            weight_label="50g",
            base_weight_grams=Decimal("50.00"),
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=breakfast, category="breakfast", menu_variant=""
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=lunch_a, category="lunch", menu_variant="A"
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=lunch_b, category="lunch", menu_variant="B"
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=snack, category="snack", menu_variant=""
        )
        plan.enrolled_counts.create(portion_type=portion_type, count=1)

        DailyOrder.objects.create(
            user=user,
            date=plan.date,
            data={
                "breakfast": {
                    "Škôlka": {"menuCounts": {"A": 4}, "diets": {"Vegan": 1}}
                },
                "lunch": {
                    "Škôlka": {
                        "menuCounts": {"A": 5, "B": 2},
                        "diets": {"Bezlepková": 2},
                    }
                },
                "olovrant": {"Škôlka": {"menuCounts": {"A": 3}, "diets": {}}},
            },
        )

        data = MealPlanService.gramage_dashboard(plan.date.isoformat())
        row = data["rows"][0]
        standard_rows = [sr for sr in row["sub_rows"] if sr["type"] == "standard"]

        assert row["standard_total_count"] == 11
        assert sorted(sr["count"] for sr in standard_rows) == [2, 3, 3, 3]
        assert {sr["label"]: sr["count"] for sr in standard_rows} == {
            "Škôlka - Raňajky": 3,
            "Škôlka - Obed Menu A": 3,
            "Škôlka - Obed Menu B": 2,
            "Škôlka - Olovrant": 3,
        }
        assert row["standard_col_grams"] == [
            ["300.00"],
            ["600.00"],
            ["500.00"],
            ["150.00"],
        ]
        assert row["diet_summary_rows"] == [
            {
                "name": "Bezlepková",
                "count": 2,
                "col_grams": [["0.00"], ["400.00"], ["0.00"], ["0.00"]],
            },
            {
                "name": "Vegan",
                "count": 1,
                "col_grams": [["100.00"], ["0.00"], ["0.00"], ["0.00"]],
            },
        ]
        assert data["totals"] == [["300.00"], ["600.00"], ["500.00"], ["150.00"]]

        workbook = load_workbook(BytesIO(GramageDashboardXLSXExporter(data).generate()))
        worksheet = workbook.active
        exported_values = [row for row in worksheet.iter_rows(values_only=True)]

        assert any(
            values[0] == "Súčet bez diét" and values[1] == 11
            for values in exported_values
            if values[0]
        )
        assert any(
            values[0] == "Bezlepková" and values[1] == 2
            for values in exported_values
            if values[0]
        )
        assert any(
            values[0] == "Vegan" and values[1] == 1
            for values in exported_values
            if values[0]
        )

    def test_xlsx_generate_with_orders(self):
        """Test XLSX generation with orders."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            first_name="John",
            last_name="Doe",
        )
        target_date = datetime.date(2024, 1, 1)
        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}},
            "lunch": {},
            "olovrant": {},
        }

        rows_data = [
            {
                "user": user,
                "data": order_data,
                "visible_meals": ["breakfast", "lunch", "olovrant"],
            }
        ]

        exporter = XLSXReportExporter(rows_data, "2024-01-01")
        xlsx_bytes = exporter.generate()

        assert isinstance(xlsx_bytes, bytes)
        assert len(xlsx_bytes) > 0

    def test_xlsx_collect_columns(self):
        """Test column collection from order data."""
        user = User.objects.create_user(username="testuser", email="test@example.com")
        order_data = {
            "breakfast": {
                "Jasle": {
                    "menuCounts": {"Menu A": 1, "Menu B": 2},
                    "diets": {"Vegan": 1},
                },
                "Škôlka": {"menuCounts": {"Menu C": 1}, "diets": {}},
            },
            "lunch": {},
            "olovrant": {},
        }

        rows_data = [{"user": user, "data": order_data, "visible_meals": ["breakfast"]}]

        exporter = XLSXReportExporter(rows_data, "2024-01-01", ["breakfast"])
        sorted_cats = exporter._collect_columns()

        assert "breakfast" in sorted_cats
        assert "Jasle" in sorted_cats["breakfast"]
        assert "Škôlka" in sorted_cats["breakfast"]
        assert "Menu A" in sorted_cats["breakfast"]["Jasle"]["menus"]
        assert "Vegan" in sorted_cats["breakfast"]["Jasle"]["diets"]

    def test_xlsx_build_column_meta(self):
        """Test column metadata building."""
        exporter = XLSXReportExporter([], "2024-01-01")
        sorted_cats = {
            "breakfast": {
                "Jasle": {"menus": ["Menu A"], "diets": ["Vegan"]},
            },
            "lunch": {},
            "olovrant": {},
        }

        col_meta, h1, h2, h3 = exporter._build_column_meta(sorted_cats)

        assert len(col_meta) > 0
        assert len(h1) > 0
        assert len(h2) > 0
        assert len(h3) > 0
        assert h1[0] == "Prevádzka"
        assert "Raňajky" in h1

    def test_xlsx_respects_visible_meals(self):
        """Test that XLSX respects visible_meals settings."""
        user = User.objects.create_user(username="testuser", email="test@example.com")
        order_data = {
            "breakfast": {"Jasle": {"menuCounts": {"Menu A": 1}, "diets": {}}},
            "lunch": {"Jasle": {"menuCounts": {"Menu B": 1}, "diets": {}}},
            "olovrant": {"Jasle": {"menuCounts": {"Menu C": 1}, "diets": {}}},
        }

        # Only show breakfast
        rows_data = [{"user": user, "data": order_data, "visible_meals": ["breakfast"]}]

        exporter = XLSXReportExporter(rows_data, "2024-01-01")
        xlsx_bytes = exporter.generate()

        assert isinstance(xlsx_bytes, bytes)
        assert len(xlsx_bytes) > 0
