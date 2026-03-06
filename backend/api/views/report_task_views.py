"""Async report task views – initiate, poll, and download generated reports."""

import datetime
import io
import logging

from celery.result import AsyncResult
from django.core.cache import cache
from django.http import FileResponse, HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.exceptions import (
    InvalidDateFormatError,
    InvalidReportFormatError,
    MissingRequiredFieldError,
)
from api.tasks import generate_report_pdf_task, generate_report_xlsx_task

logger = logging.getLogger(__name__)

_CELERY_STATUS_MAP = {
    "PENDING": "pending",
    "STARTED": "processing",
    "RETRY": "processing",
    "SUCCESS": "complete",
    "FAILURE": "failed",
    "REVOKED": "failed",
}

_VALID_FORMATS = {"pdf", "xlsx"}


class ReportTaskViewSet(viewsets.ViewSet):
    """
    ViewSet for async report generation via Celery.

    POST /api/admin/report-tasks/           → submit a report generation task
    GET  /api/admin/report-tasks/{id}/      → poll task status
    GET  /api/admin/report-tasks/{id}/download/ → download the completed report
    """

    permission_classes = [permissions.IsAdminUser]

    def create(self, request):
        """Submit a background report generation task.

        Query / body params:
            date   (str, required) – YYYY-MM-DD
            format (str, optional) – "pdf" (default) or "xlsx"

        Returns 202 with task_id and a status_url for polling.
        """
        date_str = request.data.get("date") or request.query_params.get("date")

        # Validate format parameter (must be a string)
        fmt_raw = request.data.get("format")
        if fmt_raw is None:
            fmt_raw = request.query_params.get("format", "pdf")
        if not isinstance(fmt_raw, str):
            raise InvalidReportFormatError()
        fmt = fmt_raw.lower()

        if not date_str:
            raise MissingRequiredFieldError("date", detail="date parameter is required")

        # Validate date_str is a string and valid ISO format
        if not isinstance(date_str, str):
            raise InvalidDateFormatError()

        try:
            datetime.date.fromisoformat(date_str)
        except (TypeError, ValueError):
            raise InvalidDateFormatError()

        if fmt not in _VALID_FORMATS:
            raise InvalidReportFormatError(valid_formats=_VALID_FORMATS)

        if fmt == "xlsx":
            task = generate_report_xlsx_task.delay(date_str)
        else:
            task = generate_report_pdf_task.delay(date_str)

        logger.info(
            "Report task %s submitted: format=%s date=%s user=%s",
            task.id,
            fmt,
            date_str,
            request.user.email,
        )
        base_url = f"/api/admin/report-tasks/{task.id}"
        return Response(
            {
                "task_id": task.id,
                "status": "pending",
                "format": fmt,
                "date": date_str,
                "status_url": f"{base_url}/",
                "download_url": f"{base_url}/download/",
            },
            status=status.HTTP_202_ACCEPTED,
        )

    def retrieve(self, request, pk=None):
        """Return current status of a report generation task.

        Possible status values: pending, processing, complete, failed.
        """
        result = AsyncResult(pk)
        task_status = _CELERY_STATUS_MAP.get(result.status, "pending")

        payload = {"task_id": pk, "status": task_status}

        if result.successful():
            payload["result"] = result.result
        elif result.failed():
            payload["error"] = str(result.result)

        return Response(payload)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Download a completed report file.

        Returns the binary file (PDF or XLSX) stored in cache by the task.
        Returns 404 if the report has expired or the task hasn't finished.
        """
        result = AsyncResult(pk)
        if not result.successful():
            task_status = _CELERY_STATUS_MAP.get(result.status, "pending")
            return Response(
                {"error": "Report not ready", "status": task_status},
                status=status.HTTP_404_NOT_FOUND,
            )

        task_result = result.result or {}
        fmt = task_result.get("format", "pdf")
        date_str = task_result.get("date", "")

        # Use a task-identity-based cache key from the Celery task result to ensure
        # we fetch the bytes produced by this specific task (not overwritten by a
        # concurrent request for the same date/format). Fall back to task pk if not present.
        cache_key = task_result.get("cache_key") or f"report_task:{pk}"
        file_bytes = cache.get(cache_key)

        if file_bytes is None:
            return Response(
                {"error": "Report expired. Please generate a new one."},
                status=status.HTTP_404_NOT_FOUND,
            )

        filename = f"prehlad_{date_str}.{fmt}"
        if fmt == "xlsx":
            content_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response = HttpResponse(file_bytes, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        # PDF
        response = FileResponse(io.BytesIO(file_bytes), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
