import datetime
import logging

from django.db import transaction
from django.db.models import Count, Q
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..edupage_scraper import (
    EdupageScraper,
    build_prevadzka_matches,
    nest_order_data_by_category,
    prevadzky_without_match,
)
from ..models import DailyOrder, EdupageUpload, UserProfile
from ..utils import filter_order_data_for_prevadzka

logger = logging.getLogger(__name__)

EDUPAGE_SCRAPE_ERROR = (
    "Edupage scraping failed. Check the configured URL and try again."
)
EDUPAGE_TEST_URL_ERROR = "URL could not be reached or parsed."


class EdupageUploadSerializer(serializers.ModelSerializer):
    operation_name = serializers.CharField(
        source="operation.company_name", read_only=True, allow_null=True
    )

    class Meta:
        model = EdupageUpload
        fields = [
            "id",
            "operation",
            "operation_name",
            "date",
            "filename",
            "status",
            "error_message",
            "uploaded_at",
        ]
        read_only_fields = ["id", "filename", "status", "error_message", "uploaded_at"]


class AdminEdupageUploadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EdupageUpload.objects.select_related("operation", "uploaded_by").all()
    serializer_class = EdupageUploadSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        return qs

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request: Request) -> Response:
        date = request.data.get("date")
        operation_id = request.data.get("operation_id")
        file = request.FILES.get("file")

        if not date or not file:
            return Response(
                {"error": "date and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed_date = datetime.date.fromisoformat(date)
        except ValueError:
            return Response(
                {"error": "date must be YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        operation = None
        if operation_id:
            try:
                operation = UserProfile.objects.get(pk=operation_id, is_edupage=True)
            except UserProfile.DoesNotExist:
                return Response(
                    {"error": f"Edupage operation {operation_id} not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        upload = EdupageUpload.objects.create(
            operation=operation,
            date=parsed_date,
            filename=file.name,
            file=file,
            status=EdupageUpload.STATUS_PENDING,
            uploaded_by=request.user,
        )

        return Response(
            EdupageUploadSerializer(upload).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"])
    def status_by_date(self, request: Request) -> Response:
        """Returns per-operation upload status for a given date."""
        date = request.query_params.get("date")
        if not date:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        operations = UserProfile.objects.filter(is_edupage=True).annotate(
            upload_count=Count("edupage_uploads", filter=Q(edupage_uploads__date=date))
        )

        result = [
            {
                "id": op.id,
                "name": op.company_name or op.user.email,
                "uploaded": op.upload_count > 0,
                "upload_count": op.upload_count,
            }
            for op in operations
        ]

        total = len(result)
        uploaded = sum(1 for op in result if op["uploaded"])

        return Response(
            {
                "date": date,
                "total_schools": total,
                "uploaded_schools": uploaded,
                "schools": result,
            }
        )

    @action(detail=False, methods=["post"], url_path="scrape")
    def scrape(self, request: Request) -> Response:
        """
        Scrape mealsGuest HTML for one or all Edupage operations for a given date
        and upsert the result as DailyOrder records.

        Body: { "date": "YYYY-MM-DD", "operation_id": <int> (optional) }
        When operation_id is omitted, all is_edupage operations with a mealsguest_url are scraped.
        """
        date_str = request.data.get("date")
        operation_id = request.data.get("operation_id")

        if not date_str:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            target_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response(
                {"error": "date must be YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST
            )

        if operation_id:
            qs = UserProfile.objects.filter(pk=operation_id, is_edupage=True)
        else:
            qs = UserProfile.objects.filter(is_edupage=True).exclude(mealsguest_url="")

        results = []
        scraper = EdupageScraper()

        for profile in qs.select_related("user", "celok").prefetch_related(
            "celok__prevadzky", "prevadzky"
        ):
            if not profile.mealsguest_url:
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "skipped",
                        "reason": "no mealsguest_url",
                    }
                )
                continue

            prevadzky = list(profile.dostupne_prevadzky())
            if not prevadzky:
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "skipped",
                        "reason": "no active prevadzka",
                    }
                )
                continue

            by_nazov = {p.nazov: p for p in prevadzky}
            matches = build_prevadzka_matches(prevadzky)
            bez_matchu = prevadzky_without_match(prevadzky)
            if len(prevadzky) > 1 and bez_matchu:
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "skipped",
                        "reason": (
                            "multi-prevadzka operation is missing edupage_match: "
                            + ", ".join(bez_matchu)
                        ),
                    }
                )
                continue

            try:
                result = scraper.scrape(
                    profile.mealsguest_url,
                    target_date,
                    prevadzka_matches=matches if len(prevadzky) > 1 else None,
                )
            except Exception:
                logger.exception("Scrape failed for operation %s", profile.pk)
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "error",
                        "error": EDUPAGE_SCRAPE_ERROR,
                    }
                )
                continue

            if not result.order_data:
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "empty",
                        "warnings": result.warnings,
                    }
                )
                continue

            if result.warnings or result.unmapped_letters:
                results.append(
                    {
                        "operation_id": profile.pk,
                        "name": str(profile),
                        "status": "skipped",
                        "warnings": result.warnings,
                        "unmapped_letters": result.unmapped_letters,
                    }
                )
                continue

            data_by_nazov = (
                result.order_data_by_prevadzka
                if len(prevadzky) > 1
                else {prevadzky[0].nazov: result.order_data}
            )

            written = []
            with transaction.atomic():
                for nazov, prevadzka in by_nazov.items():
                    order_data = nest_order_data_by_category(
                        data_by_nazov.get(nazov, {}), nazov
                    )
                    order_data = filter_order_data_for_prevadzka(order_data, nazov)
                    order, created = DailyOrder.objects.update_or_create(
                        prevadzka=prevadzka,
                        date=target_date,
                        defaults={"user": profile.user, "data": order_data},
                    )
                    written.append(
                        {
                            "prevadzka": nazov,
                            "status": "created" if created else "updated",
                            "order_id": order.pk,
                        }
                    )

            results.append(
                {
                    "operation_id": profile.pk,
                    "name": str(profile),
                    "status": "updated",
                    "orders": written,
                    "warnings": result.warnings,
                    "unmapped_letters": result.unmapped_letters,
                    "config_notes": result.config_notes,
                    "attention": result.attention,
                }
            )

        return Response({"date": date_str, "results": results})

    @action(detail=False, methods=["post"], url_path="test-url")
    def test_url(self, request: Request) -> Response:
        """
        Diagnostic endpoint: test whether a mealsGuest URL is reachable and parseable.

        Body: { "url": "https://school.edupage.org/menu/mealsGuest?id=TOKEN" }
        Always returns HTTP 200; use the `ok` field to check success.
        """
        url = request.data.get("url", "").strip()
        if not url:
            return Response({"ok": False, "error": "url is required"})
        if not url.startswith("https://"):
            return Response({"ok": False, "error": "url must start with https://"})

        try:
            result = EdupageScraper().scrape(url, datetime.date.today())
        except Exception:
            logger.warning("test_url failed for %s", url, exc_info=True)
            return Response({"ok": False, "error": EDUPAGE_TEST_URL_ERROR})

        total = sum(
            meal.get("menuCounts", {}).get("A", 0)
            for meal in result.order_data.values()
        )
        return Response(
            {
                "ok": True,
                "total_portions": total,
                "meals": list(result.order_data.keys()),
                "warnings": result.warnings,
                "unmapped_letters": result.unmapped_letters,
            }
        )

    @action(detail=True, methods=["delete"])
    def remove(self, request: Request, pk: int | None = None) -> Response:
        upload = self.get_object()
        file_to_delete = upload.file
        upload.delete()
        try:
            file_to_delete.delete(save=False)
        except Exception:
            logger.exception(
                "Failed to delete file %s after DB record removed", file_to_delete.name
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
