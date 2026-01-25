from rest_framework import serializers

from .models import DailyOrder


class DailyOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyOrder
        fields = ["id", "date", "status", "data", "updated_at"]
        read_only_fields = ["id", "updated_at"]

    def create(self, validated_data):
        # User is passed via serializer.save(user=...) in views.py
        user = validated_data.get("user") or self.context["request"].user
        # Ensure we don't duplicate (though UniqueValidator/unique_together handles
        # this DB side)
        # We want update_or_create behavior usually for "save order"
        order, created = DailyOrder.objects.update_or_create(
            user=user,
            date=validated_data["date"],
            defaults={
                "data": validated_data.get("data", {}),
                "status": validated_data.get("status", "draft"),
            },
        )
        return order
