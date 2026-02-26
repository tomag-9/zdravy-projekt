from rest_framework import serializers

from .models import DailyOrder


class DailyOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyOrder
        fields = ["id", "date", "status", "data", "is_auto", "updated_at"]
        read_only_fields = ["id", "is_auto", "updated_at"]

    def create(self, validated_data):
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

        status_val = "submitted"  # Always confirmed

        order, created = DailyOrder.objects.update_or_create(
            user=user,
            date=validated_data["date"],
            defaults={
                "data": validated_data.get("data", {}),
                "status": status_val,
            },
        )
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
