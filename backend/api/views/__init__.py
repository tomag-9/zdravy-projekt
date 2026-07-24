"""
Views package - Re-exports all ViewSets and Views from domain-specific modules.

This allows imports to work the same way as before:
    from api.views import DailyOrderViewSet, ...
"""

# Admin views
from .admin_views import AdminLogViewSet, AdminUserViewSet

# Authentication views
from .auth_views import (
    EmailTokenObtainPairSerializer,
    EmailTokenObtainPairView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SafeTokenRefreshView,
)

# Delivery layout views
from .delivery_views import (
    AdminPrevadzkaDeliveryViewSet,
    DeliveryBlockViewSet,
    DeliveryRouteViewSet,
)

# Diet views
from .diet_views import DietViewSet

# Edupage views
from .edupage_views import AdminEdupageConnectionViewSet

# Facility (celok + prevadzka) admin views
from .facility_views import AdminCelokViewSet, AdminFacilityPrevadzkaViewSet

# Holiday views
from .holiday_views import AdminHolidayViewSet, HolidayListViewSet

# Inbox views
from .inbox_views import InboxViewSet

# Meal plan views
from .meal_plan_views import (
    DailyMealPlanViewSet,
    MealTemplateViewSet,
    PortionTypeViewSet,
)

# Order views
from .order_views import (
    AdminAutoOrderViewSet,
    DailyOrderViewSet,
    PlannedOrdersViewSet,
    PrevadzkaViewSet,
)

# Push notification views
from .push_views import AdminSendPushView, PushSubscribeView, VapidPublicKeyView

# Report views
from .report_task_views import ReportTaskViewSet
from .report_views import AdminSummaryViewSet

# Settings views
from .settings_views import GlobalSettingsViewSet, UserProfileViewSet

__all__ = [
    # Authentication
    "EmailTokenObtainPairSerializer",
    # Holidays
    "AdminHolidayViewSet",
    "HolidayListViewSet",
    "EmailTokenObtainPairView",
    "LogoutView",
    "PasswordResetRequestView",
    "PasswordResetConfirmView",
    "SafeTokenRefreshView",
    # Orders
    "DailyOrderViewSet",
    "PlannedOrdersViewSet",
    "PrevadzkaViewSet",
    "AdminAutoOrderViewSet",
    # Admin
    "AdminLogViewSet",
    "AdminUserViewSet",
    # Edupage
    "AdminEdupageConnectionViewSet",
    # Reports
    "AdminSummaryViewSet",
    "ReportTaskViewSet",
    # Settings
    "UserProfileViewSet",
    "GlobalSettingsViewSet",
    # Facility (celok + prevadzka)
    "AdminCelokViewSet",
    "AdminFacilityPrevadzkaViewSet",
    # Diet
    "DietViewSet",
    # Delivery layout
    "AdminPrevadzkaDeliveryViewSet",
    "DeliveryBlockViewSet",
    "DeliveryRouteViewSet",
    # Meal plan
    "DailyMealPlanViewSet",
    "PortionTypeViewSet",
    "MealTemplateViewSet",
    # Push notifications
    "VapidPublicKeyView",
    "PushSubscribeView",
    "AdminSendPushView",
    # Inbox
    "InboxViewSet",
]
