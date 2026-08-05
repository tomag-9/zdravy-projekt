import logging

from django.contrib.auth.models import User
from django.db.models import Exists, OuterRef, Q, Subquery
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, serializers, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from ..logging_buffer import get_log_records
from ..models import Celok, EventLog, Prevadzka
from ..serializers_user import AdminUserSerializer

logger = logging.getLogger(__name__)


class AdminEventLogSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(
        source="get_event_type_display", read_only=True
    )
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    target_user_email = serializers.EmailField(
        source="target_user.email", read_only=True
    )

    class Meta:
        model = EventLog
        fields = [
            "id",
            "event_type",
            "event_type_label",
            "actor",
            "actor_email",
            "actor_label",
            "target_user",
            "target_user_email",
            "summary",
            "payload",
            "created_at",
        ]


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

    List načítava profil cez JOIN a kanonické facility údaje cez korelované
    subquery. Prevádzkové nastavenia patria facility endpointu.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        accessible_prevadzky = Prevadzka.objects.filter(
            Q(profile_accesses__profile__user_id=OuterRef("pk"))
            | Q(celok__profile_accesses__profile__user_id=OuterRef("pk"))
        )
        accessible_celky = (
            Celok.objects.filter(
                Q(profile_accesses__profile__user_id=OuterRef("pk"))
                | Q(prevadzky__profile_accesses__profile__user_id=OuterRef("pk"))
            )
            .distinct()
            .order_by("pk")
        )
        connected_prevadzky = accessible_prevadzky.filter(
            edupage_connection__isnull=False
        ).order_by("pk")
        qs = (
            User.objects.all()
            .select_related("profile")
            .annotate(
                _has_access=Exists(accessible_prevadzky),
                _has_app_access=Exists(
                    accessible_prevadzky.exclude(
                        celok__zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE
                    )
                ),
                _first_celok_id=Subquery(accessible_celky.values("pk")[:1]),
                _second_celok_id=Subquery(accessible_celky.values("pk")[1:2]),
                _billing_name=Subquery(accessible_celky.values("billing_name")[:1]),
                _ico=Subquery(accessible_celky.values("ico")[:1]),
                _dic=Subquery(accessible_celky.values("dic")[:1]),
                _api_identifier=Subquery(
                    connected_prevadzky.values("edupage_connection__api_identifier")[:1]
                ),
                _mealsguest_url=Subquery(
                    connected_prevadzky.values("edupage_connection__mealsguest_url")[:1]
                ),
            )
            .order_by("email")
        )
        is_edupage = self.request.query_params.get("is_edupage")
        if is_edupage == "true":
            qs = qs.filter(_has_access=True, _has_app_access=False)
        elif is_edupage == "false":
            qs = qs.filter(_has_app_access=True)
        return qs

    def perform_create(self, serializer):
        user = serializer.save()

        try:
            profile = user.profile
            if not profile.is_edupage_only():
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


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    retrieve=extend_schema(tags=["admin"]),
)
class AdminEventLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminEventLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = EventLog.objects.select_related("actor", "target_user")
        event_type = self.request.query_params.get("event_type", "").strip()
        actor = self.request.query_params.get("actor", "").strip()
        date_from = self.request.query_params.get("date_from", "").strip()
        date_to = self.request.query_params.get("date_to", "").strip()
        ordering = self.request.query_params.get("ordering", "-created_at")

        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if actor:
            try:
                actor_id = int(actor)
            except ValueError as exc:
                raise ValidationError({"actor": "Must be an integer."}) from exc
            queryset = queryset.filter(actor_id=actor_id)
        if date_from:
            parsed_from = parse_date(date_from)
            if parsed_from is None:
                raise ValidationError({"date_from": "Use YYYY-MM-DD format."})
            queryset = queryset.filter(created_at__date__gte=parsed_from)
        if date_to:
            parsed_to = parse_date(date_to)
            if parsed_to is None:
                raise ValidationError({"date_to": "Use YYYY-MM-DD format."})
            queryset = queryset.filter(created_at__date__lte=parsed_to)
        if ordering not in {"created_at", "-created_at"}:
            ordering = "-created_at"
        return queryset.order_by(ordering)
