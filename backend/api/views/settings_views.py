from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..serializers_user import UserProfileSerializer


@extend_schema_view(
    profile=extend_schema(tags=["user"]),
)
class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile and settings.
    Endpoint: /api/user/profile
    """

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get", "put", "patch"], url_path="profile")
    def profile(self, request):
        """
        Retrieve or update the authenticated user's profile.

        - ``GET``: Return full profile including settings and company name.
        - ``PUT``: Full update (all writable fields required).
        - ``PATCH``: Partial update (only provided fields are changed).
        """
        if request.method == "GET":
            serializer = UserProfileSerializer(
                request.user, context={"request": request}
            )
            return Response(serializer.data)
        else:
            serializer = UserProfileSerializer(
                request.user,
                data=request.data,
                partial=(request.method == "PATCH"),
                context={"request": request},
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    create=extend_schema(tags=["admin"]),
)
class GlobalSettingsViewSet(viewsets.ViewSet):
    """
    Manage system-wide settings.
    Singleton-like behavior: always returns the first instance.
    """

    def get_permissions(self):
        # Allow authenticated users to list (read) settings
        if self.action == "list":
            return [permissions.IsAuthenticated()]
        # Require admin for creation/updates
        return [permissions.IsAdminUser()]

    def list(self, request):
        """
        Return global application settings.

        Accessible to all authenticated users.  Admin-only fields
        (e.g. ``report_email_recipients``) are stripped for non-staff callers
        by the serializer.
        """
        from ..cached_settings_service import get_global_settings
        from ..serializers import GlobalSettingsSerializer

        settings = get_global_settings()
        serializer = GlobalSettingsSerializer(settings, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        """
        Create or update global application settings (admin only).

        Uses POST/create semantics for a singleton model – always operates on
        the single GlobalSettings row (pk=1).  Accepts partial updates so
        callers can change individual fields.  The cache is automatically
        invalidated via signal handlers when the settings instance is saved.
        """
        from ..models import GlobalSettings
        from ..serializers import GlobalSettingsSerializer

        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(
            settings, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
