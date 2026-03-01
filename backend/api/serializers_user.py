import re
from typing import Any, Dict, List, Optional

from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import serializers

from .models import ClientSettings, Diet, UserProfile


class DietSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diet
        fields = ["id", "name", "is_active", "description"]


def validate_password_strength(password: str) -> str:
    """
    Validate password meets strength requirements:
    - At least 8 characters
    - At least one number
    """
    if len(password) < 8:
        raise serializers.ValidationError("Heslo musí obsahovať aspoň 8 znakov.")

    if not re.search(r"\d", password):
        raise serializers.ValidationError("Heslo musí obsahovať aspoň jedno číslo.")

    return password


class UserProfileDetailSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile details."""

    class Meta:
        model = UserProfile
        fields = [
            "company_name",
            "ico",
            "dic",
            "registration_status",
            "email_verified",
            "registration_date",
        ]
        read_only_fields = [
            "registration_status",
            "email_verified",
            "registration_date",
        ]


class RegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration with company details.
    Creates user with pending status awaiting admin approval.
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        validators=[validate_password_strength],
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    company_name = serializers.CharField(required=True, max_length=255)
    ico = serializers.CharField(required=False, allow_blank=True, max_length=20)
    dic = serializers.CharField(required=False, allow_blank=True, max_length=20)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "company_name",
            "ico",
            "dic",
        ]

    def validate_email(self, value: str) -> str:
        """Check that email is unique."""
        normalized_email = value.lower()
        if (
            User.objects.filter(username__iexact=normalized_email).exists()
            or User.objects.filter(email__iexact=normalized_email).exists()
        ):
            raise serializers.ValidationError("Používateľ s týmto emailom už existuje.")
        return normalized_email

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate passwords match."""
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Heslá sa nezhodujú."}
            )
        return data

    def create(self, validated_data: Dict[str, Any]) -> User:
        """Create user and profile with pending status."""
        # Remove fields not for User model
        password = validated_data.pop("password")
        validated_data.pop("password_confirm")
        company_name = validated_data.pop("company_name")
        ico = validated_data.pop("ico", "")
        dic = validated_data.pop("dic", "")

        # Create user (inactive until approved)
        email = validated_data["email"]
        validated_data["username"] = email
        validated_data["is_active"] = False  # Inactive until admin approves

        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        # Create profile
        UserProfile.objects.create(
            user=user,
            company_name=company_name,
            ico=ico,
            dic=dic,
            registration_status=UserProfile.REGISTRATION_PENDING,
            email_verified=False,
        )

        return user


class ClientSettingsSerializer(serializers.ModelSerializer):
    visible_diets = DietSerializer(many=True, read_only=True)

    class Meta:
        model = ClientSettings
        fields = ["visible_menus", "visible_meals", "visible_diets"]


class UserProfileSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)
    settings = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "company_name",
            "date_joined",
            "groups",
            "settings",
            "profile",
            "is_staff",
        ]
        read_only_fields = ["id", "date_joined", "is_staff", "company_name"]

    def validate_email(self, value: str) -> str:
        """Enforce unique email for profile updates."""
        normalized_email = value.lower()
        if (
            User.objects.filter(email__iexact=normalized_email)
            .exclude(pk=self.instance.pk if self.instance else None)
            .exists()
        ):
            raise serializers.ValidationError("Používateľ s týmto emailom už existuje.")
        return normalized_email

    def update(self, instance: User, validated_data: Dict[str, Any]) -> User:
        # Keep internal username in sync with email
        if "email" in validated_data:
            new_email = validated_data["email"].lower()
            validated_data["email"] = new_email
            if (
                User.objects.filter(username__iexact=new_email)
                .exclude(pk=instance.pk)
                .exists()
                or User.objects.filter(email__iexact=new_email)
                .exclude(pk=instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"email": "Používateľ s týmto emailom už existuje."}
                )
            validated_data["username"] = new_email
        return super().update(instance, validated_data)

    def get_groups(self, obj: User) -> List[str]:
        return [group.name for group in obj.groups.all()]

    def get_company_name(self, obj: User) -> str:
        """Return company name from profile, primary identifier."""
        if hasattr(obj, "profile"):
            return obj.profile.company_name
        return ""

    def get_profile(self, obj: User) -> Optional[Dict[str, Any]]:
        """Return profile details if exists."""
        if hasattr(obj, "profile"):
            return UserProfileDetailSerializer(obj.profile).data
        return None

    def get_settings(self, obj: User) -> Dict[str, Any]:
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
    profile = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
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
            "company_name",
            "is_active",
            "is_staff",
            "settings",
            "profile",
            "password",
        ]

    def validate_email(self, value: str) -> str:
        """Enforce unique email for admin create/update."""
        normalized_email = value.lower()
        if (
            User.objects.filter(email__iexact=normalized_email)
            .exclude(pk=self.instance.pk if self.instance else None)
            .exists()
        ):
            raise serializers.ValidationError("Používateľ s týmto emailom už existuje.")
        return normalized_email

    def create(self, validated_data: Dict[str, Any]) -> User:
        password = validated_data.pop("password", None)
        # Normalize and use email as internal username so Django's unique constraint is satisfied
        normalized_email = validated_data["email"].lower()
        # Check both email and username to prevent IntegrityError on save
        if User.objects.filter(
            Q(email__iexact=normalized_email) | Q(username__iexact=normalized_email)
        ).exists():
            raise serializers.ValidationError(
                {"email": "Používateľ s týmto emailom už existuje."}
            )
        validated_data["email"] = normalized_email
        validated_data["username"] = normalized_email
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def get_company_name(self, obj: User) -> str:
        """Return company name from profile."""
        if hasattr(obj, "profile"):
            return obj.profile.company_name
        return ""

    def get_profile(self, obj: User) -> Optional[Dict[str, Any]]:
        """Return profile details if exists."""
        if hasattr(obj, "profile"):
            return UserProfileDetailSerializer(obj.profile).data
        return None

    def get_settings(self, obj: User) -> Optional[Dict[str, Any]]:
        if hasattr(obj, "settings"):
            return AdminClientSettingsSerializer(obj.settings).data
        return None

    def update(self, instance: User, validated_data: Dict[str, Any]) -> User:
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
                or User.objects.filter(email__iexact=new_email)
                .exclude(pk=instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"email": "Používateľ s týmto emailom už existuje."}
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


class PendingRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for pending user registrations (admin view)."""

    profile = UserProfileDetailSerializer(read_only=True)
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "company_name",
            "profile",
            "date_joined",
        ]
        read_only_fields = fields

    def get_company_name(self, obj: User) -> str:
        """Return company name from profile."""
        if hasattr(obj, "profile"):
            return obj.profile.company_name
        return ""
