from django.contrib.auth.models import User
from rest_framework import permissions, viewsets

from ..serializers_user import AdminUserSerializer


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
