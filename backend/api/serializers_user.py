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
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "groups",
            "settings",
            "is_staff",
        ]
        read_only_fields = ["id", "date_joined", "is_staff"]

    def update(self, instance, validated_data):
        # Keep internal username in sync with email
        if "email" in validated_data:
            new_email = validated_data["email"].lower()
            validated_data["email"] = new_email
            if (
                User.objects.filter(username__iexact=new_email)
                .exclude(pk=instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"email": "A user with that email already exists."}
                )
            validated_data["username"] = new_email
        return super().update(instance, validated_data)

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_settings(self, obj):
        if hasattr(obj, "settings"):
            return ClientSettingsSerializer(obj.settings).data
        return {
            "visible_menus": ["A"],
            "visible_meals": ["breakfast", "lunch", "olovrant"],
            "visible_diets": [],
        }


class AdminClientSettingsSerializer(serializers.ModelSerializer):
    visible_diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientSettings
        fields = ["visible_menus", "visible_meals", "visible_diets"]


class AdminUserSerializer(serializers.ModelSerializer):
    settings = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "settings",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        # Normalize and use email as internal username so Django's unique constraint is satisfied
        normalized_email = validated_data["email"].lower()
        validated_data["email"] = normalized_email
        validated_data["username"] = normalized_email
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def get_settings(self, obj):
        if hasattr(obj, "settings"):
            return AdminClientSettingsSerializer(obj.settings).data
        return None

    def update(self, instance, validated_data):
        # Settings are not in validated_data because it's a SerializerMethodField (read-only).
        # We access raw data but validate it explicitly using AdminClientSettingsSerializer.
        settings_data = self.initial_data.get("settings", None)

        # Keep internal username in sync with email, ensuring uniqueness
        if "email" in validated_data:
            new_email = validated_data["email"].lower()
            validated_data["email"] = new_email
            if (
                User.objects.filter(username__iexact=new_email)
                .exclude(pk=instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"email": "A user with that email already exists."}
                )
            validated_data["username"] = new_email

        instance = super().update(instance, validated_data)

        if settings_data is not None:
            settings_serializer = AdminClientSettingsSerializer(data=settings_data)
            settings_serializer.is_valid(raise_exception=True)
            validated_settings = settings_serializer.validated_data

            visible_diets = validated_settings.get("visible_diets")

            settings_obj, created = ClientSettings.objects.get_or_create(user=instance)

            # Update fields using validated data
            if "visible_menus" in validated_settings:
                settings_obj.visible_menus = validated_settings["visible_menus"]
            if "visible_meals" in validated_settings:
                settings_obj.visible_meals = validated_settings["visible_meals"]

            settings_obj.save()

            if visible_diets is not None:
                # visible_diets is a list of Diet instances from validated data
                settings_obj.visible_diets.set(visible_diets)

        return instance
