"""
Views package - Re-exports all ViewSets and Views from domain-specific modules.

This allows imports to work the same way as before:
    from api.views import DailyOrderViewSet, ...
"""

# Admin views
from .admin_views import AdminUserViewSet

# Authentication views
from .auth_views import (
    EmailTokenObtainPairSerializer,
    EmailTokenObtainPairView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
)

# Diet views
from .diet_views import DietViewSet

# Email verification views
from .email_verification_views import EmailVerificationView, ResendVerificationEmailView

# Meal plan views
from .meal_plan_views import (
    DailyMealPlanViewSet,
    MealTemplateViewSet,
    PortionTypeViewSet,
)

# Order views
from .order_views import AdminAutoOrderViewSet, DailyOrderViewSet, PlannedOrdersViewSet

# Pending registrations views
from .pending_registrations_views import PendingRegistrationsViewSet

# Push notification views
from .push_views import AdminSendPushView, PushSubscribeView, VapidPublicKeyView

# Registration views
from .registration_views import RegistrationView

# Report views
from .report_task_views import ReportTaskViewSet
from .report_views import AdminSummaryViewSet

# Settings views
from .settings_views import GlobalSettingsViewSet, UserProfileViewSet

__all__ = [
    # Authentication
    "EmailTokenObtainPairSerializer",
    "EmailTokenObtainPairView",
    "PasswordResetRequestView",
    "PasswordResetConfirmView",
    "RegistrationView",
    "EmailVerificationView",
    "ResendVerificationEmailView",
    "PendingRegistrationsViewSet",
    # Orders
    "DailyOrderViewSet",
    "PlannedOrdersViewSet",
    "AdminAutoOrderViewSet",
    # Admin
    "AdminUserViewSet",
    # Reports
    "AdminSummaryViewSet",
    "ReportTaskViewSet",
    # Settings
    "UserProfileViewSet",
    "GlobalSettingsViewSet",
    # Diet
    "DietViewSet",
    # Meal plan
    "MealTemplateViewSet",
    "PortionTypeViewSet",
    "DailyMealPlanViewSet",
    # Push notifications
    "VapidPublicKeyView",
    "PushSubscribeView",
    "AdminSendPushView",
]
