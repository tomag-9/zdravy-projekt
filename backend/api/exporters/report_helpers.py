"""Shared helpers for exporter modules."""


def safe_int(v) -> int:
    """Coerce a stored count value to int, returning 0 on any error."""
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0
