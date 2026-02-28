"""XLSX Report Generation (Backward Compatibility Wrapper)."""

import datetime

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response

from ..exporters import XLSXReportExporter
from ..services import ReportService


def generate_xlsx_report(request):
    """Generate XLSX report for daily orders."""
    date_str = request.query_params.get("date")
    if not date_str:
        return Response(
            {"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        target_date = datetime.date.fromisoformat(date_str)
    except (TypeError, ValueError):
        return Response(
            {"error": "invalid date format, expected YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    rows_data = ReportService.get_orders_for_export(target_date)
    exporter = XLSXReportExporter(rows_data, date_str)
    xlsx_bytes = exporter.generate()

    filename = f"prehlad_{date_str}.xlsx"
    response = HttpResponse(
        xlsx_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
