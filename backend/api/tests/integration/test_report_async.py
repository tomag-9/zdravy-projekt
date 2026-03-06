"""Integration tests for async report generation via Celery tasks."""

from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from api.models import DailyOrder


@pytest.fixture
def today_str():
    return date.today().isoformat()


@pytest.fixture
def daily_order(db, user, today_str):
    return DailyOrder.objects.create(
        user=user,
        date=date.fromisoformat(today_str),
        status="submitted",
        data={
            "breakfast": {"Dospelý": {"menuCounts": {"A": 2}, "diets": {}}},
            "lunch": {"ZŠ": {"menuCounts": {"B": 3}, "diets": {}}},
            "olovrant": {},
        },
    )


# ---------------------------------------------------------------------------
# Task submission (POST /api/admin/report-tasks/)
# ---------------------------------------------------------------------------


class TestReportTaskCreate:
    URL = "/api/admin/report-tasks/"

    def test_submit_pdf_task_returns_202(self, admin_client, today_str):
        with patch("api.views.report_task_views.generate_report_pdf_task") as mock_task:
            mock_task.delay.return_value = MagicMock(id="task-pdf-001")
            res = admin_client.post(
                self.URL, {"date": today_str, "format": "pdf"}, format="json"
            )

        assert res.status_code == status.HTTP_202_ACCEPTED
        data = res.json()
        assert data["task_id"] == "task-pdf-001"
        assert data["status"] == "pending"
        assert data["format"] == "pdf"
        assert data["date"] == today_str
        assert "status_url" in data
        assert "download_url" in data

    def test_submit_xlsx_task_returns_202(self, admin_client, today_str):
        with patch(
            "api.views.report_task_views.generate_report_xlsx_task"
        ) as mock_task:
            mock_task.delay.return_value = MagicMock(id="task-xlsx-001")
            res = admin_client.post(
                self.URL, {"date": today_str, "format": "xlsx"}, format="json"
            )

        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.json()["format"] == "xlsx"
        assert res.json()["task_id"] == "task-xlsx-001"

    def test_default_format_is_pdf(self, admin_client, today_str):
        with patch("api.views.report_task_views.generate_report_pdf_task") as mock_task:
            mock_task.delay.return_value = MagicMock(id="task-default-001")
            res = admin_client.post(self.URL, {"date": today_str}, format="json")

        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.json()["format"] == "pdf"

    def test_missing_date_returns_400(self, admin_client):
        res = admin_client.post(self.URL, {}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "date" in res.json()["error"]

    def test_invalid_date_returns_400(self, admin_client):
        res = admin_client.post(self.URL, {"date": "not-a-date"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_format_returns_400(self, admin_client, today_str):
        res = admin_client.post(
            self.URL, {"date": today_str, "format": "docx"}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "format" in res.json()["error"]

    def test_non_admin_is_forbidden(self, authenticated_client, today_str):
        res = authenticated_client.post(self.URL, {"date": today_str}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_is_rejected(self, today_str):
        res = APIClient().post(self.URL, {"date": today_str}, format="json")
        assert res.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


# ---------------------------------------------------------------------------
# Task status polling (GET /api/admin/report-tasks/{id}/)
# ---------------------------------------------------------------------------


class TestReportTaskRetrieve:
    def _url(self, task_id):
        return f"/api/admin/report-tasks/{task_id}/"

    def test_pending_task_status(self, admin_client):
        with patch("api.views.report_task_views.AsyncResult") as MockResult:
            MockResult.return_value = MagicMock(
                status="PENDING", successful=lambda: False, failed=lambda: False
            )
            res = admin_client.get(self._url("abc-pending"))

        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "pending"
        assert res.json()["task_id"] == "abc-pending"

    def test_processing_task_status(self, admin_client):
        with patch("api.views.report_task_views.AsyncResult") as MockResult:
            MockResult.return_value = MagicMock(
                status="STARTED", successful=lambda: False, failed=lambda: False
            )
            res = admin_client.get(self._url("abc-started"))

        assert res.json()["status"] == "processing"

    def test_complete_task_status(self, admin_client):
        task_result = {"status": "complete", "format": "pdf", "date": "2026-01-15"}
        with patch("api.views.report_task_views.AsyncResult") as MockResult:
            MockResult.return_value = MagicMock(
                status="SUCCESS",
                successful=lambda: True,
                failed=lambda: False,
                result=task_result,
            )
            res = admin_client.get(self._url("abc-success"))

        data = res.json()
        assert data["status"] == "complete"
        assert data["result"] == task_result

    def test_failed_task_status(self, admin_client):
        with patch("api.views.report_task_views.AsyncResult") as MockResult:
            mock_result = MagicMock(
                status="FAILURE",
                successful=lambda: False,
                failed=lambda: True,
            )
            mock_result.result = Exception("worker crashed")
            MockResult.return_value = mock_result
            res = admin_client.get(self._url("abc-failed"))

        data = res.json()
        assert data["status"] == "failed"
        assert "error" in data

    def test_non_admin_is_forbidden(self, authenticated_client):
        res = authenticated_client.get(self._url("any-id"))
        assert res.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# File download (GET /api/admin/report-tasks/{id}/download/)
# ---------------------------------------------------------------------------


class TestReportTaskDownload:
    def _url(self, task_id):
        return f"/api/admin/report-tasks/{task_id}/download/"

    def test_download_pdf_when_complete(self, admin_client):
        fake_pdf = b"%PDF-1.4 fake content"
        task_result = {"format": "pdf", "date": "2026-01-15"}
        with (
            patch("api.views.report_task_views.AsyncResult") as MockResult,
            patch("api.views.report_task_views.cache") as mock_cache,
        ):
            MockResult.return_value = MagicMock(
                successful=lambda: True,
                result=task_result,
            )
            mock_cache.get.return_value = fake_pdf
            res = admin_client.get(self._url("pdf-task-ok"))

        assert res.status_code == status.HTTP_200_OK
        assert res["Content-Type"] == "application/pdf"
        assert 'filename="prehlad_2026-01-15.pdf"' in res["Content-Disposition"]
        # FileResponse uses streaming_content, collect it into bytes
        content = b"".join(res.streaming_content)
        assert content == fake_pdf

    def test_download_xlsx_when_complete(self, admin_client):
        fake_xlsx = b"PK\x03\x04fake-xlsx-content"
        task_result = {"format": "xlsx", "date": "2026-01-15"}
        with (
            patch("api.views.report_task_views.AsyncResult") as MockResult,
            patch("api.views.report_task_views.cache") as mock_cache,
        ):
            MockResult.return_value = MagicMock(
                successful=lambda: True,
                result=task_result,
            )
            mock_cache.get.return_value = fake_xlsx
            res = admin_client.get(self._url("xlsx-task-ok"))

        assert res.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in res["Content-Type"]
        assert 'filename="prehlad_2026-01-15.xlsx"' in res["Content-Disposition"]

    def test_download_returns_404_when_task_not_complete(self, admin_client):
        with patch("api.views.report_task_views.AsyncResult") as MockResult:
            MockResult.return_value = MagicMock(
                successful=lambda: False,
                status="PENDING",
            )
            res = admin_client.get(self._url("not-done"))

        assert res.status_code == status.HTTP_404_NOT_FOUND
        assert "status" in res.json()

    def test_download_returns_404_when_cache_expired(self, admin_client):
        task_result = {"format": "pdf", "date": "2026-01-01"}
        with (
            patch("api.views.report_task_views.AsyncResult") as MockResult,
            patch("api.views.report_task_views.cache") as mock_cache,
        ):
            MockResult.return_value = MagicMock(
                successful=lambda: True,
                result=task_result,
            )
            mock_cache.get.return_value = None  # expired
            res = admin_client.get(self._url("expired-task"))

        assert res.status_code == status.HTTP_404_NOT_FOUND
        assert "expired" in res.json()["error"].lower()

    def test_non_admin_is_forbidden(self, authenticated_client):
        res = authenticated_client.get(self._url("any-id"))
        assert res.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# Celery tasks (unit level – no real Celery worker)
# ---------------------------------------------------------------------------


class TestGenerateReportTasks:
    @pytest.mark.django_db
    def test_generate_pdf_task_stores_in_cache(self, daily_order, today_str):
        from unittest.mock import patch

        with (
            patch("api.exporters.PDFReportExporter") as MockPDF,
            patch("django.core.cache.cache") as mock_cache,
        ):
            MockPDF.return_value.generate.return_value = b"%PDF fake"

            from api.tasks import generate_report_pdf_task

            result = generate_report_pdf_task(today_str)

        assert result["status"] == "complete"
        assert result["format"] == "pdf"
        assert result["date"] == today_str
        assert "cache_key" in result
        mock_cache.set.assert_called_once()
        cache_key = mock_cache.set.call_args[0][0]
        # Cache key now uses task_id instead of date/format
        assert cache_key.startswith("report_task:")

    @pytest.mark.django_db
    def test_generate_xlsx_task_stores_in_cache(self, daily_order, today_str):
        with (
            patch("api.exporters.XLSXReportExporter") as MockXLSX,
            patch("api.services.report_service.ReportService") as MockService,
            patch("django.core.cache.cache") as mock_cache,
        ):
            MockService.get_orders_for_export.return_value = []
            MockXLSX.return_value.generate.return_value = b"PK xlsx"

            from api.tasks import generate_report_xlsx_task

            result = generate_report_xlsx_task(today_str)

        assert result["status"] == "complete"
        assert result["format"] == "xlsx"
        assert "cache_key" in result
        mock_cache.set.assert_called_once()
        cache_key = mock_cache.set.call_args[0][0]
        # Cache key now uses task_id instead of date/format
        assert cache_key.startswith("report_task:")

    @pytest.mark.django_db
    def test_pdf_task_uses_correct_cache_timeout(self, daily_order, today_str):
        with (
            patch("api.exporters.PDFReportExporter") as MockPDF,
            patch("django.core.cache.cache") as mock_cache,
        ):
            MockPDF.return_value.generate.return_value = b"%PDF"

            from api.tasks import REPORT_CACHE_TIMEOUT, generate_report_pdf_task

            generate_report_pdf_task(today_str)

        assert mock_cache.set.call_args[1].get("timeout") == REPORT_CACHE_TIMEOUT
