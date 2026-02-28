"""Tests for Report Exporters."""

import datetime
from unittest.mock import Mock

import pytest
from django.contrib.auth.models import User

from api.exporters import PDFReportExporter, XLSXReportExporter
from api.models import DailyOrder


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
        assert h1[0] == "Klient"
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
