from django.contrib.auth.models import User
from rest_framework import permissions, viewsets

from ..serializers_user import AdminUserSerializer


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users and their settings.
    """

    queryset = User.objects.all().order_by("email")
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
