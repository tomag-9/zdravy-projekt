"""Helpers for writing structured audit events."""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Any

from django.db.models import Model

from ..models import EventLog


def _json_value(value: Any) -> Any:
    if isinstance(value, Model):
        return value.pk
    if isinstance(value, (datetime.date, datetime.datetime, datetime.time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        values = [_json_value(item) for item in value]
        try:
            return sorted(values)
        except TypeError:
            return values
    return value


def build_model_diff(instance: Model | None, validated_data: dict[str, Any]) -> dict:
    """Return JSON-safe ``from``/``to`` values for serializer changes."""
    changes = {}
    for field_name, new_value in validated_data.items():
        if instance is None:
            old_value = None
        else:
            field = instance._meta.get_field(field_name)
            if field.many_to_many:
                old_value = list(
                    getattr(instance, field_name).values_list("pk", flat=True)
                )
            elif field.is_relation:
                old_value = getattr(instance, field.attname)
            else:
                old_value = getattr(instance, field_name)
        old_json = _json_value(old_value)
        new_json = _json_value(new_value)
        if old_json != new_json:
            changes[field_name] = {"from": old_json, "to": new_json}
    return changes


def build_nested_dict_diff(
    previous: dict[str, Any], current: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Return leaf-level changes between nested dictionaries using dotted paths."""
    changes: dict[str, dict[str, Any]] = {}

    def visit(old_value: Any, new_value: Any, path: str) -> None:
        if old_value is None and isinstance(new_value, dict):
            old_value = {}
        if new_value is None and isinstance(old_value, dict):
            new_value = {}
        if isinstance(old_value, dict) and isinstance(new_value, dict):
            for key in sorted(set(old_value) | set(new_value)):
                child_path = f"{path}.{key}" if path else key
                visit(old_value.get(key), new_value.get(key), child_path)
            return

        old_json = _json_value(old_value)
        new_json = _json_value(new_value)
        if old_json != new_json:
            changes[path] = {"from": old_json, "to": new_json}

    visit(previous, current, "")
    return changes


def log_event(
    event_type: Any,
    actor=None,
    target_user=None,
    summary: str = "",
    payload: dict | None = None,
    actor_label: str | None = None,
) -> EventLog:
    """Persist one audit event with an actor email snapshot when available."""
    if actor_label is None:
        actor_label = getattr(actor, "email", "") if actor is not None else "system"
    return EventLog.objects.create(
        event_type=event_type,
        actor=actor,
        actor_label=actor_label,
        target_user=target_user,
        summary=summary,
        payload=_json_value(payload or {}),
    )
