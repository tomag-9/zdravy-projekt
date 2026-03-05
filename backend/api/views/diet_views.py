from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import permissions, viewsets

from ..models import Diet
from ..serializers_user import DietSerializer


class DietViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Diet model (CRUD).

    List action is cached for 24 hours since diet data is static.
    Cache is automatically invalidated when Diet instances are created/updated/deleted
    via signal handlers.
    """

    queryset = Diet.objects.all()
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    @method_decorator(cache_page(60 * 60 * 24))  # Cache for 24 hours
    def list(self, request, *args, **kwargs):
        """Cache the Diet list since it's rarely modified."""
        return super().list(request, *args, **kwargs)
