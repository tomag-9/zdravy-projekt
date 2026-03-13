import datetime
import logging
import time
from typing import Any, Dict

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .cached_settings_service import get_global_settings
from .exceptions import OrderDeadlinePassedError
from .models import DailyOrder

logger = logging.getLogger(__name__)


class DailyOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the DailyOrder model.

    Handles create/update with idempotent upsert semantics:
    - Submitting a ``draft`` status deletes any existing order for that date.
    - Any other status performs an atomic upsert (update or create) guarded
      against concurrent writes using ``SELECT FOR UPDATE``.
    """

    class Meta:
        model = DailyOrder
        fields = ["id", "date", "status", "data", "is_auto", "updated_at"]
        read_only_fields = ["id", "is_auto", "updated_at"]

    MEAL_FIELD_CONFIG = {
        "breakfast": ("deadline_breakfast", "deadline_breakfast_is_day_before"),
        "lunch": ("deadline_lunch", "deadline_lunch_is_day_before"),
        "olovrant": ("deadline_olovrant", "deadline_olovrant_is_day_before"),
    }

    MEAL_LABELS = {
        "breakfast": "raňajky",
        "lunch": "obed",
        "olovrant": "olovrant",
    }

    @staticmethod
    def _is_positive(value: Any) -> bool:
        try:
            return int(value) > 0
        except (TypeError, ValueError):
            return bool(value)

    @classmethod
    def _meal_has_content(cls, meal_data: Any) -> bool:
        if not isinstance(meal_data, dict) or not meal_data:
            return False

        if "menuCounts" in meal_data:
            menu_counts = meal_data.get("menuCounts") or {}
            diets = meal_data.get("diets") or {}
            return any(cls._is_positive(v) for v in menu_counts.values()) or any(
                cls._is_positive(v) for v in diets.values()
            )

        for details in meal_data.values():
            if not isinstance(details, dict):
                continue
            menu_counts = details.get("menuCounts") or {}
            diets = details.get("diets") or {}
            if any(cls._is_positive(v) for v in menu_counts.values()) or any(
                cls._is_positive(v) for v in diets.values()
            ):
                return True
        return False

    @classmethod
    def _changed_meals(
        cls,
        new_data: Dict[str, Any],
        existing_data: Dict[str, Any] | None = None,
        input_status: str = "submitted",
    ) -> list[str]:
        existing_data = existing_data or {}
        changed: list[str] = []
        for meal_key in cls.MEAL_FIELD_CONFIG:
            previous = existing_data.get(meal_key, {}) or {}
            current = new_data.get(meal_key, {}) or {}
            if input_status == "draft":
                if cls._meal_has_content(previous) or cls._meal_has_content(current):
                    changed.append(meal_key)
                continue
            if previous != current and (
                cls._meal_has_content(previous) or cls._meal_has_content(current)
            ):
                changed.append(meal_key)
        return changed

    @classmethod
    def _validate_deadlines(
        cls,
        target_date: datetime.date,
        new_data: Dict[str, Any],
        input_status: str,
        existing_data: Dict[str, Any] | None = None,
    ) -> None:
        changed_meals = cls._changed_meals(new_data, existing_data, input_status)
        if not changed_meals:
            return

        settings = get_global_settings()
        current_dt = timezone.localtime()
        current_tz = timezone.get_current_timezone()

        for meal_key in changed_meals:
            deadline_field, day_before_field = cls.MEAL_FIELD_CONFIG[meal_key]
            deadline_time = getattr(settings, deadline_field)
            deadline_date = (
                target_date - datetime.timedelta(days=1)
                if getattr(settings, day_before_field)
                else target_date
            )
            deadline_dt = timezone.make_aware(
                datetime.datetime.combine(deadline_date, deadline_time),
                current_tz,
            )
            if current_dt > deadline_dt:
                label = cls.MEAL_LABELS[meal_key]
                raise OrderDeadlinePassedError(
                    deadline_time=deadline_dt.strftime("%d.%m.%Y %H:%M"),
                    current_time=current_dt.strftime("%d.%m.%Y %H:%M"),
                    detail=(
                        f"Objednávku pre {label} už nie je možné meniť. "
                        f"Termín: {deadline_dt.strftime('%d.%m.%Y %H:%M')}"
                    ),
                )

    def create(self, validated_data: Dict[str, Any]) -> DailyOrder:
        """
        Upsert a DailyOrder for (user, date).

        - ``status='draft'`` → delete any existing order and return an
          unsaved placeholder (drafts are never persisted).
        - Any other status → update or create the order using a
          ``SELECT FOR UPDATE`` lock to prevent concurrent-write races.

        Args:
            validated_data: Validated fields from the serializer.

        Returns:
            The saved (or placeholder) DailyOrder instance.
        """
        user = validated_data.get("user") or self.context["request"].user
        input_status = validated_data.get("status", "submitted")

        # If status is passed as 'draft', we treat it as a deletion request
        # because we do not persist drafts.
        if input_status == "draft":
            existing_order = DailyOrder.objects.filter(
                user=user, date=validated_data["date"]
            ).first()
            self._validate_deadlines(
                validated_data["date"],
                validated_data.get("data", {}),
                input_status,
                existing_order.data if existing_order else None,
            )
            DailyOrder.objects.filter(user=user, date=validated_data["date"]).delete()
            # Return an unsaved instance for the response
            return DailyOrder(
                user=user, date=validated_data["date"], status="draft", data={}
            )

        new_data = validated_data.get("data", {})
        existing_order = (
            DailyOrder.objects.filter(user=user, date=validated_data["date"])
            .only("data")
            .first()
        )
        self._validate_deadlines(
            validated_data["date"],
            new_data,
            input_status,
            existing_order.data if existing_order else None,
        )

        # Use select_for_update inside an atomic block to prevent race conditions
        # when multiple concurrent requests submit an order for the same (user, date).
        # The SELECT ... FOR UPDATE acquires a row lock so only one writer proceeds
        # at a time; the outer transaction.atomic() ensures the lock is held for the
        # full read-modify-write cycle.
        with transaction.atomic():
            try:
                t0 = time.monotonic()
                order = DailyOrder.objects.select_for_update(nowait=False).get(
                    user=user, date=validated_data["date"]
                )
                wait_ms = (time.monotonic() - t0) * 1000
                if wait_ms > 100:
                    logger.warning(
                        "select_for_update lock wait %.1f ms for user=%s date=%s",
                        wait_ms,
                        user.pk,
                        validated_data["date"],
                    )
                order.data = new_data
                order.status = "submitted"
                order.save(update_fields=["data", "status", "updated_at"])
            except DailyOrder.DoesNotExist:
                # Wrap create() in its own savepoint so that if IntegrityError is
                # raised (another request raced us to INSERT), only this savepoint
                # is rolled back and the outer atomic block remains usable.
                try:
                    with transaction.atomic():
                        order = DailyOrder.objects.create(
                            user=user,
                            date=validated_data["date"],
                            data=new_data,
                            status="submitted",
                        )
                except IntegrityError:
                    # Another request won the INSERT race; retry with a lock.
                    order = DailyOrder.objects.select_for_update(nowait=False).get(
                        user=user, date=validated_data["date"]
                    )
                    order.data = new_data
                    order.status = "submitted"
                    order.save(update_fields=["data", "status", "updated_at"])

        return order

    def update(
        self, instance: DailyOrder, validated_data: Dict[str, Any]
    ) -> DailyOrder:
        input_status = validated_data.get("status", instance.status)
        new_data = validated_data.get("data", instance.data)

        self._validate_deadlines(instance.date, new_data, input_status, instance.data)

        if input_status == "draft":
            instance.delete()
            return DailyOrder(
                user=instance.user, date=instance.date, status="draft", data={}
            )

        instance.data = new_data
        instance.status = input_status
        instance.save(update_fields=["data", "status", "updated_at"])
        return instance


class GlobalSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for GlobalSettings (singleton model).

    Non-admin users receive the response without the
    ``report_email_recipients`` field (stripped in ``to_representation``).
    """

    report_email_recipients = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True,
    )

    class Meta:
        from .models import GlobalSettings

        model = GlobalSettings
        fields = [
            "deadline_breakfast",
            "deadline_breakfast_is_day_before",
            "deadline_lunch",
            "deadline_lunch_is_day_before",
            "deadline_olovrant",
            "deadline_olovrant_is_day_before",
            "report_email_recipients",
        ]

    def to_representation(self, instance: Any) -> Dict[str, Any]:
        """Strip ``report_email_recipients`` for non-admin callers."""
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_admin = bool(
            user is not None
            and (
                getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)
            )
        )
        if not is_admin:
            data.pop("report_email_recipients", None)
        return data
