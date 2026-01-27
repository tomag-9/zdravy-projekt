from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import DailyOrderViewSet, UserProfileViewSet

router = DefaultRouter()
router.register(r"orders", DailyOrderViewSet, basename="dailyorder")
router.register(r"user", UserProfileViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
