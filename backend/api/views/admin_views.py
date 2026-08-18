import logging

from django.contrib.auth.models import User
from django.db.models import Exists, OuterRef, Q, Subquery
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import pagination, permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from ..logging_buffer import get_log_records
from ..models import Celok, EventLog, Prevadzka
from ..serializers_user import AdminUserSerializer
from ..services.event_log_service import log_event
from .audit_mixins import AuditedModelViewSetMixin

logger = logging.getLogger(__name__)


class AdminUserPagination(pagination.PageNumberPagination):
    """Allow admin screens to request a larger, bounded user page."""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500


def _display_name(user) -> str:
    """Meno používateľa pre tabuľku udalostí, alebo prázdno keď ho nemá.

    E-mail je identifikátor, nie meno — v audite sa zle číta a pri dlhých
    adresách rozhadzuje stĺpec. Poradie: meno a priezvisko loginu → názov
    prevádzky z profilu (klienti bežne priezvisko vyplnené nemajú). Prázdny
    reťazec necháva rozhodnutie na volajúcom, ktorý spadne späť na e-mail.
    """
    if user is None:
        return ""
    full_name = f"{user.first_name} {user.last_name}".strip()
    if full_name:
        return full_name
    profile = getattr(user, "profile", None)
    return (getattr(profile, "company_name", "") or "").strip()


class AdminEventLogSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(
        source="get_event_type_display", read_only=True
    )
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_name = serializers.SerializerMethodField()
    target_user_email = serializers.EmailField(
        source="target_user.email", read_only=True
    )
    target_user_name = serializers.SerializerMethodField()

    class Meta:
        model = EventLog
        fields = [
            "id",
            "event_type",
            "event_type_label",
            "actor",
            "actor_email",
            "actor_name",
            "actor_label",
            "target_user",
            "target_user_email",
            "target_user_name",
            "summary",
            "payload",
            "created_at",
        ]

    def get_actor_name(self, obj) -> str:
        return _display_name(obj.actor)

    def get_target_user_name(self, obj) -> str:
        return _display_name(obj.target_user)


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    retrieve=extend_schema(tags=["admin"]),
    create=extend_schema(tags=["admin"]),
    update=extend_schema(tags=["admin"]),
    partial_update=extend_schema(tags=["admin"]),
    destroy=extend_schema(tags=["admin"]),
)
class AdminUserViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users and their settings.

    List načítava profil cez JOIN a kanonické facility údaje cez korelované
    subquery. Prevádzkové nastavenia patria facility endpointu.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminUserPagination

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

        is_staff = self.request.query_params.get("is_staff")
        if is_staff == "true":
            qs = qs.filter(is_staff=True)
        elif is_staff == "false":
            qs = qs.filter(is_staff=False)
        return qs

    def perform_create(self, serializer):
        # super() vykoná uloženie a zapíše zmenu do Udalostí (AuditedModelViewSetMixin).
        super().perform_create(serializer)
        user = serializer.instance

        try:
            profile = user.profile
            if not profile.is_edupage_only():
                from ..email_utils import send_account_setup_email

                send_account_setup_email(user=user)
        except Exception:
            logger.exception(
                "Failed to send onboarding email for new user %s", user.email
            )

    def perform_update(self, serializer):
        old_email = serializer.instance.email
        super().perform_update(serializer)
        user = serializer.instance

        # Email zmenený → starý setup/reset odkaz smeruje na účet pod inou
        # adresou a heslo bolo zvolené (alebo naposledy obnovené) s vedomím
        # pôvodného mailu. Radšej vynútime nové heslo a rovno pošleme nový
        # setup e-mail, než aby si to admin musel domýšľať/riešiť ručne
        # (issue #460 — zistené pri onboardingu, keď sa login preklikol na
        # iný mail a pôvodný setup-link zostal mŕtvy).
        if old_email and user.email and old_email.lower() != user.email.lower():
            try:
                profile = user.profile
                if not profile.is_edupage_only():
                    from ..email_utils import send_account_setup_email

                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                    send_account_setup_email(user=user)
            except Exception:
                logger.exception(
                    "Failed to invalidate password / resend setup email after "
                    "email change for user %s",
                    user.email,
                )

    @action(detail=True, methods=["post"], url_path="resend-invite")
    def resend_invite(self, request, pk=None):
        """Znova pošle setup e-mail (nový 7-dňový link) — pre pending/failed login.

        Pre EduPage-only login nemá zmysel (heslo si nikdy sám nenastavuje) —
        vráti 400.
        """
        user = self.get_object()
        profile = getattr(user, "profile", None)
        if profile is not None and profile.is_edupage_only():
            raise ValidationError(
                {
                    "detail": "EduPage login nemá vlastné heslo, pozvánku netreba posielať."
                }
            )

        from ..email_utils import send_account_setup_email

        try:
            send_account_setup_email(user=user)
        except Exception:
            logger.exception("Failed to resend setup email for user %s", user.email)
            return Response(
                {"detail": "Odoslanie e-mailu zlyhalo, skúste to prosím znova."},
                status=502,
            )

        log_event(
            EventLog.EventType.SETTINGS_CHANGE,
            actor=request.user,
            target_user=user,
            summary=f"Admin znova odoslal pozvánku na nastavenie hesla: {user.email}.",
        )
        return Response({"detail": "Pozvánka bola znova odoslaná."})


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
        # Profily sa ťahajú spolu s používateľmi: meno pre tabuľku ich číta pre
        # každý riadok, takže bez toho je to N+1 dotazov na stránku.
        queryset = EventLog.objects.select_related(
            "actor", "actor__profile", "target_user", "target_user__profile"
        )
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
