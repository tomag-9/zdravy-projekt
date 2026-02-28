"""PDF Report Generation (Backward Compatibility Wrapper)."""

import datetime
import io

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from ..exporters import PDFReportExporter
from ..models import DailyOrder


def generate_pdf_report(request):
    """Generate PDF report for daily orders."""
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

    orders = (
        DailyOrder.objects.filter(date=target_date)
        .select_related("user", "user__settings")
        .order_by("user__email")
    )

    exporter = PDFReportExporter(orders, date_str)
    pdf_bytes = exporter.generate()

    filename = f"prehlad_{date_str}.pdf"
    response = FileResponse(io.BytesIO(pdf_bytes), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
