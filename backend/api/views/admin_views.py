import logging

from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from ..logging_buffer import get_log_records
from ..serializers_user import AdminUserSerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    retrieve=extend_schema(tags=["admin"]),
    create=extend_schema(tags=["admin"]),
    update=extend_schema(tags=["admin"]),
    partial_update=extend_schema(tags=["admin"]),
    destroy=extend_schema(tags=["admin"]),
)
class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users and their settings.

    Uses select_related/prefetch_related to optimize queries for nested serializer access:
    - profile: OneToOne relationship loaded via select_related, accessed in get_profile() and get_company_name()
    - settings: OneToOne relationship loaded via select_related, accessed in get_settings()
    - settings__visible_diets: M2M relationship loaded via prefetch_related, accessed in AdminClientSettingsSerializer

    Query optimization: Without these optimizations, listing 10 users would trigger ~31 queries
    (1 users + 10 profiles + 10 settings + 10 M2M visible_diets). With select_related/prefetch_related,
    reduced to 2-3 queries total (>90% reduction).
    """

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = (
            User.objects.all()
            .select_related("profile", "profile__celok", "settings")
            .prefetch_related("settings__visible_diets")
            .order_by("email")
        )
        is_edupage = self.request.query_params.get("is_edupage")
        if is_edupage == "true":
            qs = qs.filter(profile__is_edupage=True)
        elif is_edupage == "false":
            qs = qs.filter(profile__is_edupage=False)
        return qs

    def perform_create(self, serializer):
        user = serializer.save()

        try:
            profile = user.profile
            if not profile.is_edupage:
                from ..email_utils import send_account_setup_email

                send_account_setup_email(user=user)
        except Exception:
            logger.exception(
                "Failed to send onboarding email for new user %s", user.email
            )


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
)
class AdminLogViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        records = get_log_records()
        levels = {
            level.strip().upper()
            for level in request.query_params.get("level", "").split(",")
            if level.strip()
        }
        logger_filter = request.query_params.get("logger", "").strip().lower()
        search = request.query_params.get("search", "").strip().lower()
        ordering = request.query_params.get("ordering", "-timestamp")

        try:
            limit = min(max(int(request.query_params.get("limit", "200")), 1), 500)
        except ValueError:
            limit = 200

        if levels:
            records = [item for item in records if item["level"].upper() in levels]
        if logger_filter:
            records = [
                item for item in records if logger_filter in item["logger"].lower()
            ]
        if search:
            records = [
                item
                for item in records
                if search in item["message"].lower()
                or (item["traceback"] and search in item["traceback"].lower())
            ]

        reverse = ordering != "timestamp"
        records = sorted(records, key=lambda item: item["id"], reverse=reverse)
        records = records[:limit]

        logger_names = sorted({item["logger"] for item in get_log_records()})

        return Response(
            {
                "results": records,
                "count": len(records),
                "available_loggers": logger_names,
            }
        )
