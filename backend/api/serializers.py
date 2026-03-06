import logging
import time
from typing import Any, Dict, Optional

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import DailyOrder

logger = logging.getLogger(__name__)


class DailyOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyOrder
        fields = ["id", "date", "status", "data", "is_auto", "updated_at"]
        read_only_fields = ["id", "is_auto", "updated_at"]

    def create(self, validated_data: Dict[str, Any]) -> DailyOrder:
        # User is passed via serializer.save(user=...) in views.py
        user = validated_data.get("user") or self.context["request"].user
        input_status = validated_data.get("status", "submitted")

        # If status is passed as 'draft', we treat it as a deletion request
        # because we do not persist drafts.
        if input_status == "draft":
            DailyOrder.objects.filter(user=user, date=validated_data["date"]).delete()
            # Return an unsaved instance for the response
            return DailyOrder(
                user=user, date=validated_data["date"], status="draft", data={}
            )

        new_data = validated_data.get("data", {})

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


class GlobalSettingsSerializer(serializers.ModelSerializer):
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
            "deadline_lunch",
            "deadline_olovrant",
            "report_email_recipients",
        ]

    def to_representation(self, instance: Any) -> Dict[str, Any]:
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
