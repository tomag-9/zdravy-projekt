from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .health import health_check
from .views import (
    AdminSummaryViewSet,
    AdminUserViewSet,
    DailyOrderViewSet,
    DietViewSet,
    UserProfileViewSet,
)

router = DefaultRouter()
router.register(r"orders", DailyOrderViewSet, basename="dailyorder")
router.register(r"user", UserProfileViewSet, basename="user")
router.register(r"diets", DietViewSet, basename="diet")
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")
router.register(r"admin/summary", AdminSummaryViewSet, basename="adminsummary")

urlpatterns = [
    path("", include(router.urls)),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("health/", health_check, name="health_check"),
]
