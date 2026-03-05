from django.contrib.auth.models import User
from rest_framework import permissions, viewsets

from ..serializers_user import AdminUserSerializer


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users and their settings.

    Uses prefetch_related to optimize queries for nested serializer access:
    - profile: OneToOne relationship accessed in get_profile() and get_company_name()
    - settings: OneToOne relationship accessed in get_settings()
    - settings__visible_diets: M2M relationship accessed in AdminClientSettingsSerializer

    Query optimization: Without prefetch, listing 10 users would trigger ~31 queries
    (1 users + 10 profiles + 10 settings + 10 M2M visible_diets). With prefetch,
    reduced to 2-3 queries total (>90% reduction).
    """

    queryset = (
        User.objects.all()
        .prefetch_related(
            "profile",
            "settings",
            "settings__visible_diets",
        )
        .order_by("email")
    )
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
