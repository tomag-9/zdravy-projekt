"""Import helpers for weekly Jedalnicek XLSX uploads."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import BinaryIO

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction

from ..models import Diet, JedalnicekEntry, JedalnicekUpload
from ..parsers.jedalnicek_xlsx_parser import JedalnicekXlsxParser, ParseResult

DIET_SHEET_ALIASES = {
    "Vege": "VEGGIE",
    "No Gluten": "NO GLUTEN",
    "No Milk": "NO MILK",
    "No Milk - No Gluten": "NO MILK/NO GLUTEN",
    "No Milk – No Gluten": "NO MILK/NO GLUTEN",
    "No No No": "NONONO",
}

STANDARD_SHEETS = {"Klasik"}


@dataclass(frozen=True)
class JedalnicekImportSummary:
    upload: JedalnicekUpload
    result: ParseResult
    entries_count: int
    replaced_uploads: int


def import_jedalnicek_xlsx(
    file: UploadedFile | BinaryIO,
    *,
    filename: str,
    uploaded_by,
) -> JedalnicekImportSummary:
    """Parse and persist a weekly Jedalnicek XLSX file.

    A successful import replaces previous uploads for the same week. This keeps
    `/meal-plans/by-date/` deterministic after admins upload a corrected file.
    """

    result = JedalnicekXlsxParser().parse(file)
    if not result.ok:
        raise JedalnicekImportError(result.errors, result.warnings)

    if hasattr(file, "seek"):
        file.seek(0)

    with transaction.atomic():
        previous_uploads = list(
            JedalnicekUpload.objects.filter(week_start=result.week_start)
        )
        replaced_uploads = len(previous_uploads)
        for previous in previous_uploads:
            if previous.file:
                previous.file.delete(save=False)
        if previous_uploads:
            JedalnicekUpload.objects.filter(
                id__in=[upload.id for upload in previous_uploads]
            ).delete()

        upload = JedalnicekUpload.objects.create(
            week_start=result.week_start,
            filename=filename,
            file=file,
            status=JedalnicekUpload.STATUS_PROCESSED,
            uploaded_by=uploaded_by,
        )

        entries = [
            JedalnicekEntry(
                upload=upload,
                date=row.date,
                category=row.category,
                menu_variant=row.menu_variant,
                diet=_resolve_diet(row.diet_sheet),
                name=row.component_name,
                weight_grams=_entry_weight(row.amount, row.unit),
                unit=row.unit,
                portion_weights={
                    portion_name: str(amount.quantize(Decimal("0.01")))
                    for portion_name, amount in row.portion_amounts.items()
                },
            )
            for row in result.rows
        ]
        JedalnicekEntry.objects.bulk_create(entries, batch_size=500)

    return JedalnicekImportSummary(
        upload=upload,
        result=result,
        entries_count=len(entries),
        replaced_uploads=replaced_uploads,
    )


class JedalnicekImportError(ValueError):
    def __init__(self, errors: list[str], warnings: list[str] | None = None) -> None:
        super().__init__("Jedalnicek XLSX import failed")
        self.errors = errors
        self.warnings = warnings or []


def _resolve_diet(sheet_name: str) -> Diet | None:
    if sheet_name in STANDARD_SHEETS:
        return None

    diet_name = DIET_SHEET_ALIASES.get(sheet_name, sheet_name)
    diet, _created = Diet.objects.get_or_create(
        name=diet_name,
        defaults={
            "is_active": True,
            "description": f"Vytvorené automaticky z XLSX listu {sheet_name}.",
        },
    )
    return diet


def _entry_weight(amount: Decimal | None, unit: str) -> Decimal | None:
    if amount is None or unit != "g":
        return None
    return amount.quantize(Decimal("0.01"))
