"""Serializers for the Jedálniček (Meal Plan) module."""

import re
from decimal import Decimal

from rest_framework import serializers

from .models import (
    DailyMealPlan,
    EnrolledCount,
    MealPlanItem,
    MealTemplate,
    PortionType,
)

INVALID_WEIGHT_LABEL_MESSAGE = (
    "Nepodarilo sa rozpoznať gramáž. "
    "Použite formát s 'g' hodnotami, napr.: 200g + 25g + 50g"
)


def parse_composition_grams(composition: str) -> Decimal:
    """
    Parse total grams from a composition string like "200g + 25g + 50g".
    Only gram values (g) are summed; ml values are ignored.
    Raises ValueError with a Slovak message if nothing parseable is found.

    Examples:
        "200g + 25g"       → Decimal("225.00")
        "120g + 80g + 50g" → Decimal("250.00")
        "250ml + 50g"      → Decimal("50.00")   (only grams counted)
    """
    # Match numbers followed by 'g' but NOT 'gl', 'gr', 'gal', 'g/…'
    # (avoid false matches)
    matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*g(?![a-z/])", composition, re.IGNORECASE)
    if not matches:
        raise ValueError(INVALID_WEIGHT_LABEL_MESSAGE)
    total = sum((Decimal(m.replace(",", ".")) for m in matches), Decimal(0))
    return total.quantize(Decimal("0.01"))


class PortionTypeSerializer(serializers.ModelSerializer):
    coefficient_pct = serializers.SerializerMethodField()

    class Meta:
        model = PortionType
        fields = ["id", "name", "coefficient", "coefficient_pct", "is_active"]

    def get_coefficient_pct(self, obj):
        return int(obj.coefficient * 100)


_COMPONENT_NUMERIC_UNITS = ("g", "ml")


def _weight_label_from_components(
    components: list, unit_exception: dict | None = None
) -> str:
    label = " + ".join(
        (
            str(c["grams"])
            if c.get("unit") == "text"
            else f"{c['grams']}{c.get('unit', 'g')}"
        )
        for c in components
        if c.get("grams") not in (None, "")
    )
    if unit_exception:
        label += f" + {unit_exception['component_label']} (ks podľa vekovej skupiny)"
    return label


def _base_weight_grams_from_components(components: list) -> Decimal:
    total = sum(
        (
            Decimal(str(c["grams"]))
            for c in components
            if c.get("unit", "g") in _COMPONENT_NUMERIC_UNITS
            and c.get("grams") not in (None, "")
        ),
        Decimal("0"),
    )
    return total.quantize(Decimal("0.01"))


class MealTemplateSerializer(serializers.ModelSerializer):
    # base_weight_grams is auto-computed — read-only from the API consumer's perspective  # noqa: E501
    base_weight_grams = serializers.DecimalField(
        max_digits=8, decimal_places=2, read_only=True
    )
    weight_label = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )

    diet_name = serializers.SerializerMethodField()

    class Meta:
        model = MealTemplate
        fields = [
            "id",
            "category",
            "name",
            "weight_label",
            "base_weight_grams",
            "components",
            "unit_exception",
            "menu_variant",
            "diet",
            "diet_name",
            "is_active",
        ]

    def get_diet_name(self, obj) -> str | None:
        return obj.diet.name if obj.diet_id else None

    def validate(self, attrs: dict) -> dict:
        # A weight description is required from either the structured
        # `components` list (preferred — supports g/ml/text units) or a
        # manually-typed `weight_label` string (legacy, "g" values only).
        components = attrs.get("components") or getattr(
            self.instance, "components", None
        )
        unit_exception = attrs.get("unit_exception")
        if "unit_exception" not in attrs:
            unit_exception = getattr(self.instance, "unit_exception", None)
        weight_label = attrs.get("weight_label")
        if components:
            attrs["weight_label"] = weight_label or _weight_label_from_components(
                components, unit_exception
            )
            attrs["base_weight_grams"] = _base_weight_grams_from_components(components)
        elif weight_label:
            try:
                attrs["base_weight_grams"] = parse_composition_grams(weight_label)
            except ValueError as exc:
                raise serializers.ValidationError(
                    {"weight_label": INVALID_WEIGHT_LABEL_MESSAGE}
                ) from exc
        elif self.instance is None:
            raise serializers.ValidationError(
                {"components": "Zadajte aspoň jednu zložku alebo gramáž."}
            )
        return attrs


class MealPlanItemWriteSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    menu_variant = serializers.CharField(max_length=10, allow_blank=True, default="")

    def validate_template_id(self, value: int) -> int:
        if not MealTemplate.objects.filter(id=value).exists():
            raise serializers.ValidationError("Zadaná šablóna jedla neexistuje.")
        return value


class MealPlanItemSerializer(serializers.ModelSerializer):
    template_detail = MealTemplateSerializer(source="template", read_only=True)
    diet_name = serializers.SerializerMethodField()

    class Meta:
        model = MealPlanItem
        fields = [
            "id",
            "template",
            "template_detail",
            "category",
            "menu_variant",
            "diet",
            "diet_name",
        ]

    def get_diet_name(self, obj) -> str | None:
        return obj.diet.name if obj.diet_id else None


class EnrolledCountWriteSerializer(serializers.Serializer):
    portion_type_id = serializers.IntegerField()
    count = serializers.IntegerField(min_value=0)


class EnrolledCountSerializer(serializers.ModelSerializer):
    portion_type_detail = PortionTypeSerializer(source="portion_type", read_only=True)

    class Meta:
        model = EnrolledCount
        fields = ["id", "portion_type", "portion_type_detail", "count"]


class DailyMealPlanSerializer(serializers.ModelSerializer):
    items = MealPlanItemSerializer(many=True, read_only=True)
    enrolled_counts = EnrolledCountSerializer(many=True, read_only=True)
    # Explicitly declared (without the auto-generated UniqueValidator DRF would
    # otherwise attach because DailyMealPlan.date has unique=True): create()
    # below is an idempotent upsert by date (get_or_create), so POSTing the
    # same date twice to update an existing day's plan must not 400.
    date = serializers.DateField()
    # Write-only fields for nested creation
    items_write = MealPlanItemWriteSerializer(
        many=True, write_only=True, required=False
    )
    enrolled_counts_write = EnrolledCountWriteSerializer(
        many=True, write_only=True, required=False
    )

    class Meta:
        model = DailyMealPlan
        fields = [
            "id",
            "date",
            "notes",
            "items",
            "enrolled_counts",
            "items_write",
            "enrolled_counts_write",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        from .services.meal_plan_service import MealPlanService

        items_data = validated_data.pop("items_write", None)
        enrolled_data = validated_data.pop("enrolled_counts_write", None)
        request = self.context.get("request")
        user = request.user if request else None
        return MealPlanService.create_or_replace_plan(
            date=validated_data["date"],
            items_data=items_data,
            enrolled_data=enrolled_data,
            notes=validated_data.get("notes", ""),
            user=user,
        )

    def update(self, instance, validated_data):
        from .services.meal_plan_service import MealPlanService

        items_data = validated_data.pop("items_write", None)
        enrolled_data = validated_data.pop("enrolled_counts_write", None)
        request = self.context.get("request")
        user = request.user if request else None
        return MealPlanService.create_or_replace_plan(
            date=instance.date,
            items_data=items_data,
            enrolled_data=enrolled_data,
            notes=validated_data.get("notes", instance.notes),
            user=user,
        )
