"""Apply explicit DailyOrder count corrections from JSON."""

from __future__ import annotations

import json
from copy import deepcopy
from datetime import date
from pathlib import Path
from typing import Any

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from api.models import DailyOrder
from api.utils import user_operation_name


def _safe_counts(value: Any, field_name: str) -> dict[str, int]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise CommandError(f"{field_name} must be an object")
    result: dict[str, int] = {}
    for key, raw_count in value.items():
        count = int(raw_count)
        if count < 0:
            raise CommandError(f"{field_name}.{key} cannot be negative")
        result[str(key)] = count
    return result


def _safe_gram_corrections(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise CommandError("gramCorrections must be a list")
    corrections: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            raise CommandError("Each gram correction must be an object")
        if "meal" not in item or "component_index" not in item or "grams" not in item:
            raise CommandError(
                "Each gram correction requires meal, component_index, and grams"
            )
        corrections.append(
            {
                "meal": str(item["meal"]),
                "variant": str(item.get("variant", "")),
                "diet_name": item.get("diet_name"),
                "component_index": int(item["component_index"]),
                "grams": str(item["grams"]),
                "label": str(item.get("label", "Gramážna korekcia")),
            }
        )
    return corrections


def _load_corrections(path: str) -> list[dict[str, Any]]:
    with Path(path).open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise CommandError("Correction file must contain a JSON list.")
    for item in data:
        if not isinstance(item, dict):
            raise CommandError("Each correction must be a JSON object.")
    return data


def _find_user(correction: dict[str, Any]) -> User:
    email = correction.get("email") or correction.get("user_email")
    company_name = correction.get("company_name")
    if email:
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist as exc:
            raise CommandError(f"User with email {email!r} not found") from exc
    if company_name:
        matches = User.objects.filter(profile__company_name=company_name)
        count = matches.count()
        if count == 1:
            return matches.get()
        if count == 0:
            raise CommandError(f"User with company_name {company_name!r} not found")
        raise CommandError(f"Multiple users match company_name {company_name!r}")
    raise CommandError("Correction requires email/user_email or company_name.")


def _merge_counts(target: dict[str, int], correction: dict[str, int]) -> None:
    for key, count in correction.items():
        target[key] = int(target.get(key, 0)) + count


def apply_correction(correction: dict[str, Any], *, dry_run: bool = False) -> str:
    target_date = date.fromisoformat(str(correction["date"]))
    meal = str(correction["meal"])
    portion = str(correction.get("portion") or correction.get("portion_type") or "")

    menu_counts = _safe_counts(correction.get("menuCounts", {}), "menuCounts")
    diets = _safe_counts(correction.get("diets", {}), "diets")
    gram_corrections = _safe_gram_corrections(correction.get("gramCorrections"))
    if not menu_counts and not diets and not gram_corrections:
        raise CommandError(
            "Correction must include menuCounts, diets, or gramCorrections."
        )
    if (menu_counts or diets) and not portion:
        raise CommandError("Correction requires portion or portion_type.")

    user = _find_user(correction)
    category = correction.get("category")
    replace = bool(correction.get("replace", False))

    if dry_run:
        order = DailyOrder.objects.filter(user=user, date=target_date).first()
        data = deepcopy(order.data) if order and isinstance(order.data, dict) else {}
    else:
        order, _ = DailyOrder.objects.get_or_create(user=user, date=target_date)
        data = order.data if isinstance(order.data, dict) else {}
    if menu_counts or diets:
        meal_data = data.setdefault(meal, {})
        if not isinstance(meal_data, dict):
            raise CommandError(f"Existing order meal {meal!r} is not an object.")

        if category:
            category_key = str(category)
            category_data = meal_data.setdefault(category_key, {})
            if not isinstance(category_data, dict):
                raise CommandError(
                    f"Existing order category {category_key!r} is not an object."
                )
            portion_container = category_data
        else:
            portion_container = meal_data

        portion_data = portion_container.setdefault(
            portion,
            {
                "menuCounts": {},
                "diets": {},
            },
        )
        if not isinstance(portion_data, dict):
            raise CommandError(f"Existing order portion {portion!r} is not an object.")

        if replace:
            portion_data["menuCounts"] = menu_counts
            portion_data["diets"] = diets
        else:
            existing_menu_counts = portion_data.setdefault("menuCounts", {})
            existing_diets = portion_data.setdefault("diets", {})
            if not isinstance(existing_menu_counts, dict) or not isinstance(
                existing_diets, dict
            ):
                raise CommandError("Existing menuCounts/diets must be objects.")
            _merge_counts(existing_menu_counts, menu_counts)
            _merge_counts(existing_diets, diets)

    if gram_corrections:
        existing_gram_corrections = data.setdefault("__gram_corrections__", [])
        if not isinstance(existing_gram_corrections, list):
            raise CommandError("Existing __gram_corrections__ must be a list.")
        if correction.get("replaceGramCorrections"):
            data["__gram_corrections__"] = gram_corrections
        else:
            existing_gram_corrections.extend(gram_corrections)

    if not dry_run:
        order.data = data
        order.save(update_fields=["data", "updated_at"])

    return f"{target_date.isoformat()} {user_operation_name(user)} {meal} {portion}"


class Command(BaseCommand):
    help = "Apply explicit DailyOrder count corrections from a JSON file."

    def add_arguments(self, parser):
        parser.add_argument("path", help="JSON correction file path.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and print corrections without saving.",
        )

    def handle(self, *args, **options):
        corrections = _load_corrections(options["path"])
        applied = [
            apply_correction(correction, dry_run=options["dry_run"])
            for correction in corrections
        ]
        verb = "Validated" if options["dry_run"] else "Applied"
        self.stdout.write(self.style.SUCCESS(f"{verb} {len(applied)} corrections."))
        for line in applied:
            self.stdout.write(f"  {line}")
