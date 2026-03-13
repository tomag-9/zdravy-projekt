"""Services module for business logic extraction."""

from .auto_order_service import (
    _build_auto_data,
    _is_order_empty,
    _last_non_empty_order,
    _next_workday,
    apply_auto_orders,
)
from .meal_plan_service import MealPlanService
from .notification_service import NotificationService
from .order_service import OrderService
from .report_service import ReportService
from .user_service import RegistrationError, UserService

__all__ = [
    # Auto-order helpers (kept at package level for backwards-compat)
    "apply_auto_orders",
    "_is_order_empty",
    "_last_non_empty_order",
    "_next_workday",
    "_build_auto_data",
    # Domain services
    "NotificationService",
    "OrderService",
    "ReportService",
    "RegistrationError",
    "UserService",
    "MealPlanService",
]
