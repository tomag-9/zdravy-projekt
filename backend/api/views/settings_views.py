from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..serializers_user import UserProfileSerializer


class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile and settings.
    Endpoint: /api/user/profile
    """

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get", "put", "patch"], url_path="profile")
    def profile(self, request):
        if request.method == "GET":
            serializer = UserProfileSerializer(
                request.user, context={"request": request}
            )
            return Response(serializer.data)
        else:
            serializer = UserProfileSerializer(
                request.user,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        from ..models import GlobalSettings
        from ..serializers import GlobalSettingsSerializer

        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        """
        Using create/post to update settings for simplicity or
        standard REST conventions.
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
