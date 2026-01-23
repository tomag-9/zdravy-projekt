from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import DailyOrder
from .serializers import DailyOrderSerializer

class DailyOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DailyOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DailyOrder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='by-date/(?P<date>[^/.]+)')
    def by_date(self, request, date=None):
        try:
            order = self.get_queryset().get(date=date)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except DailyOrder.DoesNotExist:
            return Response({'data': {}}, status=status.HTTP_200_OK) # Return empty struct if not found
