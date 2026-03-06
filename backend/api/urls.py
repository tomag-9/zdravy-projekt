from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .health import health_check
from .views import (
    AdminAutoOrderViewSet,
    AdminSummaryViewSet,
    AdminUserViewSet,
    DailyOrderViewSet,
    DietViewSet,
    EmailTokenObtainPairView,
    EmailVerificationView,
    GlobalSettingsViewSet,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PendingRegistrationsViewSet,
    PlannedOrdersViewSet,
    RegistrationView,
    ReportTaskViewSet,
    ResendVerificationEmailView,
    UserProfileViewSet,
)

router = DefaultRouter()
# NOTE: orders/planned MUST be registered before orders to avoid the
# generic `orders/<pk>` pattern matching "planned" as a PK.
router.register(r"orders/planned", PlannedOrdersViewSet, basename="planned-orders")
router.register(r"orders", DailyOrderViewSet, basename="dailyorder")
router.register(r"user", UserProfileViewSet, basename="user")
router.register(r"diets", DietViewSet, basename="diet")
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")
router.register(r"admin/summary", AdminSummaryViewSet, basename="adminsummary")
router.register(
    r"admin/global-settings",
    GlobalSettingsViewSet,
    basename="global-settings",
)
router.register(
    r"admin/trigger-auto-orders",
    AdminAutoOrderViewSet,
    basename="trigger-auto-orders",
)
router.register(
    r"admin/pending-registrations",
    PendingRegistrationsViewSet,
    basename="pending-registrations",
)
router.register(
    r"admin/report-tasks",
    ReportTaskViewSet,
    basename="report-task",
)

urlpatterns = [
    path("", include(router.urls)),
    path("token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("health/", health_check, name="health_check"),
    # Registration and email verification (unauthenticated)
    path("auth/register/", RegistrationView.as_view(), name="register"),
    path(
        "auth/verify-email/",
        EmailVerificationView.as_view(),
        name="verify_email",
    ),
    path(
        "auth/resend-verification/",
        ResendVerificationEmailView.as_view(),
        name="resend_verification",
    ),
    # Password reset (unauthenticated)
    path(
        "auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password_reset_request",
    ),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
]
