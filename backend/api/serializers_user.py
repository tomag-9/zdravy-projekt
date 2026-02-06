from django.contrib.auth.models import User
from rest_framework import serializers

from .models import ClientSettings, Diet


class DietSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diet
        fields = ["id", "name", "is_active", "description"]


class ClientSettingsSerializer(serializers.ModelSerializer):
    visible_diets = DietSerializer(many=True, read_only=True)

    class Meta:
        model = ClientSettings
        fields = ["visible_menus", "visible_meals", "visible_diets"]


class UserProfileSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)
    settings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "groups",
            "settings",
            "is_staff",
        ]
        read_only_fields = ["id", "username", "date_joined", "is_staff"]

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_settings(self, obj):
        if hasattr(obj, "settings"):
            return ClientSettingsSerializer(obj.settings).data
        return {"visible_menus": ["A"], "visible_meals": [], "visible_diets": []}


class AdminClientSettingsSerializer(serializers.ModelSerializer):
    visible_diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientSettings
        fields = ["visible_menus", "visible_meals", "visible_diets"]


class AdminUserSerializer(serializers.ModelSerializer):
    settings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "settings",
        ]

    def get_settings(self, obj):
        if hasattr(obj, "settings"):
            return AdminClientSettingsSerializer(obj.settings).data
        return None

    def update(self, instance, validated_data):
        # Settings are not in validated_data because it's a SerializerMethodField (read-only)
        # We access raw data
        settings_data = self.initial_data.get("settings", None)

        instance = super().update(instance, validated_data)

        if settings_data is not None:
            visible_diets = settings_data.get("visible_diets")
            # We don't need to pop visible_diets from settings_data if we are manually assigning fields

            settings_obj, created = ClientSettings.objects.get_or_create(user=instance)

            # Update fields
            if "visible_menus" in settings_data:
                settings_obj.visible_menus = settings_data["visible_menus"]
            if "visible_meals" in settings_data:
                settings_obj.visible_meals = settings_data["visible_meals"]

            settings_obj.save()

            if visible_diets is not None:
                # Expecting list of IDs
                settings_obj.visible_diets.set(visible_diets)

        return instance
