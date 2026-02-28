"""Shared helpers for report export modules.

For backward compatibility, these are imported from api.utils.
"""

from ..utils import build_user_meal_row, merge_meal_totals, safe_int

__all__ = ["safe_int", "build_user_meal_row", "merge_meal_totals"]
