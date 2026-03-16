import logging

from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, viewsets

from ..models import UserProfile
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

    queryset = (
        User.objects.all()
        .select_related("profile", "settings")
        .prefetch_related("settings__visible_diets")
        .order_by("email")
    )
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        user = serializer.save()

        try:
            profile = user.profile
            if profile.client_type == UserProfile.CLIENT_TYPE_APP:
                from ..email_utils import send_account_setup_email

                send_account_setup_email(user=user)
            else:
                from ..services.notification_service import NotificationService

                NotificationService.send_api_user_registered_email(user=user)
        except Exception:
            logger.exception(
                "Failed to send onboarding email for new user %s", user.email
            )
