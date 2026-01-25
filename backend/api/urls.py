from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyOrderViewSet

router = DefaultRouter()
router.register(r"orders", DailyOrderViewSet, basename="dailyorder")

urlpatterns = [
    path("", include(router.urls)),
]
