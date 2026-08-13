"""Audit trail for `GlobalSettings` changes (issue #472).

The deadlines on `GlobalSettings` decide when orders close *and* when the
EduPage scrape and the daily reports fire (see `api/signals.py`). Moving one is
a production-visible change, so it must leave a record of who moved it, when,
and from what to what — previously such a change vanished without a trace.

Both write paths go through here: the admin API (`GlobalSettingsViewSet`) and
the Django admin (`GlobalSettingsAdmin.save_model`).
"""

from __future__ import annotations

from typing import Any

from ..models import EventLog, GlobalSettings
from .event_log_service import log_event

#: Fields whose change is worth a human-readable summary line. Everything else
#: still lands in the payload, just without being named in the summary.
DEADLINE_FIELDS = (
    "deadline_breakfast",
    "deadline_breakfast_is_day_before",
    "deadline_lunch",
    "deadline_lunch_is_day_before",
    "deadline_olovrant",
    "deadline_olovrant_is_day_before",
)


def _summarize(changes: dict[str, dict[str, Any]]) -> str:
    """Name the changed deadlines in the summary, count the rest."""
    deadline_changes = [name for name in DEADLINE_FIELDS if name in changes]
    other_count = len(changes) - len(deadline_changes)

    parts = []
    if deadline_changes:
        parts.append("uzávierky: " + ", ".join(deadline_changes))
    if other_count:
        parts.append(f"+{other_count} ďalších polí")
    if not parts:
        parts.append("žiadne polia")

    return f"Admin upravil systémové nastavenia ({'; '.join(parts)})."


def log_global_settings_change(
    changes: dict[str, dict[str, Any]], actor=None
) -> EventLog | None:
    """Write one audit event for a set of `GlobalSettings` field changes.

    ``changes`` is the ``{field: {"from": ..., "to": ...}}`` shape produced by
    :func:`api.services.event_log_service.build_model_diff`. A no-op save
    (empty diff) is not logged.
    """
    if not changes:
        return None

    return log_event(
        EventLog.EventType.SETTINGS_CHANGE,
        actor=actor,
        summary=_summarize(changes),
        payload={
            "model": GlobalSettings._meta.label_lower,
            "object_id": 1,
            "changes": changes,
        },
    )
