from rest_framework import permissions, viewsets

from ..models import Diet
from ..serializers_user import DietSerializer


class DietViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Diet model (CRUD).
    """

    queryset = Diet.objects.all()
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        return super().get_permissions()
