from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DailyOrder
from .serializers import DailyOrderSerializer
from .serializers_user import UserProfileSerializer


class DailyOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DailyOrderSerializer
    # Authenticated users only
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DailyOrder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        print(f"DEBUG: User: {self.request.user}")
        print(f"DEBUG: Auth: {self.request.auth}")
        print(f"DEBUG: Headers: {self.request.headers}")
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.request.user)

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


class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile management.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get", "patch"], url_path="profile")
    def profile(self, request):
        """Get or update current user's profile"""
        if request.method == "GET":
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)
        
        elif request.method == "PATCH":
            serializer = UserProfileSerializer(
                request.user, 
                data=request.data, 
                partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
