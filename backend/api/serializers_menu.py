"""Serializers for portion types (used by gramage dashboard)."""

from rest_framework import serializers

from .models import PortionType


class PortionTypeSerializer(serializers.ModelSerializer):
    coefficient_pct = serializers.SerializerMethodField()

    class Meta:
        model = PortionType
        fields = ["id", "name", "coefficient", "coefficient_pct", "is_active"]

    def get_coefficient_pct(self, obj):
        return int(obj.coefficient * 100)
