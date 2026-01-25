from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import DailyOrder
from .serializers import DailyOrderSerializer


class DailyOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DailyOrderSerializer
    # TEMPORARY: AllowAny for demo purposes until Auth is implemented
    permission_classes = [permissions.AllowAny]

    def get_user(self):
        # Check against AnonymousUser explicitly just in case
        if self.request.user and self.request.user.is_authenticated:
            return self.request.user
            
        # Fallback for demo: get or create 'demo' user
        from django.contrib.auth.models import User
        # Using get_or_create to avoid race conditions or IntegrityErrors
        user, _ = User.objects.get_or_create(username='demo', defaults={'email': 'demo@example.com'})
        return user

    def get_queryset(self):
        return DailyOrder.objects.filter(user=self.get_user())

    def perform_create(self, serializer):
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.get_user())

    @action(detail=False, methods=["get"], url_path="by-date/(?P<date>[^/.]+)")
    def by_date(self, request, date=None):
        try:
            order = self.get_queryset().get(date=date)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except DailyOrder.DoesNotExist:
            return Response(
                {"data": {}}, status=status.HTTP_200_OK
            )  # Return empty struct if not found
