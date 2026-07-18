import datetime
import json
import logging
import time
from typing import Any, Dict

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .cached_settings_service import get_global_settings
from .exceptions import HolidayOrderNotAllowedError, OrderDeadlinePassedError
from .models import DailyOrder, Holiday, Prevadzka
from .order_data import OrderData, safe_count
from .services.prevadzka_service import (
    PrevadzkaNedostupna,
    PrevadzkaNejednoznacna,
    vyber_prevadzku,
)

logger = logging.getLogger(__name__)


class DailyOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the DailyOrder model.

    Handles create/update with idempotent upsert semantics:
    - Submitting a ``draft`` status deletes any existing order for that date.
    - Any other status performs an atomic upsert (update or create) guarded
      against concurrent writes using ``SELECT FOR UPDATE``.
    """

    status = serializers.ChoiceField(
        choices=("draft", "submitted"), required=False, default="submitted"
    )
    prevadzka = serializers.PrimaryKeyRelatedField(
        queryset=Prevadzka.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = DailyOrder
        fields = ["id", "date", "status", "data", "is_auto", "updated_at", "prevadzka"]
        read_only_fields = ["id", "is_auto", "updated_at"]
        # DRF by z UniqueConstraint(prevadzka, date) odvodil UniqueTogetherValidator,
        # ktorý spraví `prevadzka` povinným poľom — lenže pri jedno-prevádzkovom
        # celku ho klient neposiela a dopĺňame ho my. Unikátnosť aj tak vynucuje
        # DB constraint + IntegrityError retry v `create()`.
        validators: list = []

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

    _ALLOWED_MEAL_KEYS = frozenset({"breakfast", "lunch", "olovrant"})
    _MAX_DATA_BYTES = 10 * 1024  # 10 KB
    _MAX_COUNT = 9999

    def validate_data(self, data: Any) -> Dict[str, Any]:
        """Enforce meal keys, count bounds, and size limits for supported shapes."""
        if not isinstance(data, dict):
            raise serializers.ValidationError("Order data must be an object.")

        unknown_keys = set(data) - self._ALLOWED_MEAL_KEYS
        if unknown_keys:
            allowed = ", ".join(sorted(self._ALLOWED_MEAL_KEYS))
            raise serializers.ValidationError(
                f"Unknown meal keys: {sorted(unknown_keys)}. Allowed keys are: {allowed}."
            )

        raw_size = len(
            json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        )
        if raw_size > self._MAX_DATA_BYTES:
            raise serializers.ValidationError(
                f"Order data exceeds the {self._MAX_DATA_BYTES // 1024} KB size limit."
            )

        for meal_key, meal in data.items():
            if not isinstance(meal, dict):
                raise serializers.ValidationError(f"'{meal_key}' must be an object.")
            if "menuCounts" in meal or "diets" in meal:
                for sub_key in ("menuCounts", "diets"):
                    if sub_key in meal:
                        self._validate_count_map(meal[sub_key], f"{meal_key}.{sub_key}")
                continue
            for cat_name, cat_data in meal.items():
                if not isinstance(cat_data, dict):
                    raise serializers.ValidationError(
                        f"'{meal_key}.{cat_name}' must be an object."
                    )
                for sub_key in ("menuCounts", "diets"):
                    if sub_key in cat_data:
                        self._validate_count_map(
                            cat_data[sub_key], f"{meal_key}.{cat_name}.{sub_key}"
                        )

        return data

    @staticmethod
    def _validate_count_map(count_map: Any, field_path: str) -> None:
        """Validate that a counts dict contains only non-negative integers within bounds."""
        if not isinstance(count_map, dict):
            raise serializers.ValidationError(f"'{field_path}' must be an object.")
        for key, value in count_map.items():
            if not isinstance(value, int) or isinstance(value, bool):
                raise serializers.ValidationError(
                    f"'{field_path}.{key}' must be an integer, got {type(value).__name__}."
                )
            if value < 0 or value > DailyOrderSerializer._MAX_COUNT:
                raise serializers.ValidationError(
                    f"'{field_path}.{key}' must be between 0 and {DailyOrderSerializer._MAX_COUNT}."
                )

    @classmethod
    def _meal_has_content(cls, meal_data: Any) -> bool:
        od = OrderData({"_": meal_data})
        return any(
            any(safe_count(c) > 0 for c in cat.menu_counts.values())
            or any(safe_count(c) > 0 for c in cat.diets.values())
            for cat in od.iter_categories("_")
        )

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
            if current_dt >= deadline_dt:
                label = cls.MEAL_LABELS[meal_key]
                raise OrderDeadlinePassedError(
                    deadline_time=deadline_dt.strftime("%d.%m.%Y %H:%M"),
                    current_time=current_dt.strftime("%d.%m.%Y %H:%M"),
                    detail=(
                        f"Objednávku pre {label} už nie je možné meniť. "
                        f"Termín: {deadline_dt.strftime('%d.%m.%Y %H:%M')}"
                    ),
                )

    def _enforce_holiday_restriction(
        self, user: Any, status: str, date: datetime.date
    ) -> None:
        """Disallow non-staff, non-draft orders on holidays.

        Staff bypass is keyed off the authenticated actor (request.user) so
        that staff acting on behalf of a client can still submit on holidays.
        Falls back to the order owner's is_staff if no request context exists.
        """
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        is_staff = getattr(actor, "is_staff", False) or getattr(user, "is_staff", False)
        if not is_staff and status != "draft":
            if Holiday.objects.filter(date=date).exists():
                raise HolidayOrderNotAllowedError()

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
        request = self.context.get("request")
        user = validated_data.get("user") or (request and request.user)
        if user is None:
            raise serializers.ValidationError(
                {"user": "User must be provided in request context or validated data."}
            )
        input_status = validated_data.get("status", "submitted")
        is_staff = getattr(getattr(request, "user", None), "is_staff", False)

        self._enforce_holiday_restriction(user, input_status, validated_data["date"])

        prevadzka = self._resolve_prevadzka(user, validated_data)

        # If status is passed as 'draft', we treat it as a deletion request
        # because we do not persist drafts.
        if input_status == "draft":
            existing_order = DailyOrder.objects.filter(
                prevadzka=prevadzka, date=validated_data["date"]
            ).first()
            if not is_staff:
                self._validate_deadlines(
                    validated_data["date"],
                    validated_data.get("data", {}),
                    input_status,
                    existing_order.data if existing_order else None,
                )
            DailyOrder.objects.filter(
                prevadzka=prevadzka, date=validated_data["date"]
            ).delete()
            # Return an unsaved instance for the response
            return DailyOrder(
                user=user,
                prevadzka=prevadzka,
                date=validated_data["date"],
                status="draft",
                data={},
            )

        new_data = validated_data.get("data", {})
        existing_order = (
            DailyOrder.objects.filter(prevadzka=prevadzka, date=validated_data["date"])
            .only("data")
            .first()
        )
        if not is_staff:
            self._validate_deadlines(
                validated_data["date"],
                new_data,
                input_status,
                existing_order.data if existing_order else None,
            )

        # Use select_for_update inside an atomic block to prevent race conditions
        # when concurrent requests submit an order for the same (prevadzka, date).
        # The SELECT ... FOR UPDATE acquires a row lock so only one writer proceeds
        # at a time; the outer transaction.atomic() ensures the lock is held for the
        # full read-modify-write cycle.
        with transaction.atomic():
            try:
                t0 = time.monotonic()
                order = DailyOrder.objects.select_for_update(nowait=False).get(
                    prevadzka=prevadzka, date=validated_data["date"]
                )
                wait_ms = (time.monotonic() - t0) * 1000
                if wait_ms > 100:
                    logger.warning(
                        "select_for_update lock wait %.1f ms for prevadzka=%s date=%s",
                        wait_ms,
                        prevadzka.pk,
                        validated_data["date"],
                    )
                order.data = new_data
                order.save(update_fields=["data", "updated_at"])
            except DailyOrder.DoesNotExist:
                # Wrap create() in its own savepoint so that if IntegrityError is
                # raised (another request raced us to INSERT), only this savepoint
                # is rolled back and the outer atomic block remains usable.
                try:
                    with transaction.atomic():
                        order = DailyOrder.objects.create(
                            user=user,
                            prevadzka=prevadzka,
                            date=validated_data["date"],
                            data=new_data,
                        )
                except IntegrityError:
                    # Another request won the INSERT race; retry with a lock.
                    order = DailyOrder.objects.select_for_update(nowait=False).get(
                        prevadzka=prevadzka, date=validated_data["date"]
                    )
                    order.data = new_data
                    order.save(update_fields=["data", "updated_at"])

        return order

    @staticmethod
    def _resolve_prevadzka(user, validated_data: Dict[str, Any]) -> Prevadzka:
        """Za ktorú prevádzku sa objednáva. Pri viacerých ju musí klient poslať."""
        explicit = validated_data.pop("prevadzka", None)
        if explicit is not None and getattr(user, "is_staff", False):
            return explicit
        try:
            return vyber_prevadzku(user, explicit.pk if explicit else None)
        except PrevadzkaNejednoznacna as exc:
            raise serializers.ValidationError({"prevadzka": str(exc)}) from exc
        except PrevadzkaNedostupna as exc:
            raise serializers.ValidationError({"prevadzka": str(exc)}) from exc

    def update(
        self, instance: DailyOrder, validated_data: Dict[str, Any]
    ) -> DailyOrder:
        input_status = validated_data.get("status", instance.status)
        new_data = validated_data.get("data", instance.data)
        request = self.context.get("request")
        user = validated_data.get("user") or instance.user
        is_staff = getattr(getattr(request, "user", None), "is_staff", False)

        self._enforce_holiday_restriction(user, input_status, instance.date)

        if not is_staff:
            self._validate_deadlines(
                instance.date, new_data, input_status, instance.data
            )

        if input_status == "draft":
            instance.delete()
            return DailyOrder(
                user=instance.user, date=instance.date, status="draft", data={}
            )

        instance.data = new_data
        instance.save(update_fields=["data", "updated_at"])
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
            "edupage_auto_scrape_enabled",
            "report_email_recipients",
            "client_contact_name",
            "client_contact_role",
            "client_contact_email",
            "client_contact_phone",
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


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ["id", "date", "reason"]


class PrevadzkaSerializer(serializers.ModelSerializer):
    celok = serializers.CharField(source="celok.nazov", read_only=True)

    class Meta:
        model = Prevadzka
        fields = ["id", "nazov", "adresa", "celok"]
        read_only_fields = fields
