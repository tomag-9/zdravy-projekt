import re
from typing import Any, Dict, List, Optional

from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import serializers

from .models import ClientSettings, Diet, UserProfile


class DietSerializer(serializers.ModelSerializer):
    """Read/write serializer for the Diet catalogue model."""

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
            "client_type",
            "api_identifier",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class ClientSettingsSerializer(serializers.ModelSerializer):
    """Serializer for client-specific display settings (visible menus/meals/diets)."""

    visible_diets = DietSerializer(many=True, read_only=True)

    class Meta:
        model = ClientSettings
        fields = [
            "visible_menus",
            "visible_meals",
            "visible_diets",
            "admin_order_note",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)
    settings = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    company_name = serializers.CharField(
        source="profile.company_name", required=False, allow_blank=True, default=""
    )
    ico = serializers.CharField(
        source="profile.ico", required=False, allow_blank=True, allow_null=True
    )
    dic = serializers.CharField(
        source="profile.dic", required=False, allow_blank=True, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "company_name",
            "ico",
            "dic",
            "date_joined",
            "groups",
            "settings",
            "profile",
            "is_staff",
        ]
        read_only_fields = ["id", "date_joined", "is_staff"]

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
        profile_data = validated_data.pop("profile", None)

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

        user = super().update(instance, validated_data)

        if profile_data is not None:
            profile = getattr(user, "profile", None)
            if profile is not None:
                for field in ("company_name", "ico", "dic"):
                    if field in profile_data:
                        setattr(profile, field, profile_data[field])
                profile.save(
                    update_fields=[
                        k for k in ("company_name", "ico", "dic") if k in profile_data
                    ]
                )

        return user

    def get_groups(self, obj: User) -> List[str]:
        return [group.name for group in obj.groups.all()]

    def get_profile(self, obj: User) -> Optional[Dict[str, Any]]:
        """Return profile details if exists."""
        if hasattr(obj, "profile"):
            return UserProfileDetailSerializer(obj.profile).data
        return None

    def get_settings(self, obj: User) -> Dict[str, Any]:
        """Return client settings; use defaults when no settings row exists."""
        if hasattr(obj, "settings"):
            return ClientSettingsSerializer(obj.settings).data
        return {
            "visible_menus": ["A"],
            "visible_meals": ["breakfast", "lunch", "olovrant"],
            "visible_diets": [],
            "admin_order_note": "",
        }


class AdminClientSettingsSerializer(serializers.ModelSerializer):
    """Write serializer for admin-managed client settings (accepts diet PKs)."""

    visible_diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientSettings
        fields = [
            "visible_menus",
            "visible_meals",
            "visible_diets",
            "admin_order_note",
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for admin user management with nested profile and settings.

    **IMPORTANT: Query Optimization**
    This serializer accesses related objects through getter methods:
    - get_profile() → accesses `user.profile`
    - get_company_name() → accesses `user.profile`
    - get_settings() → accesses `user.settings` and `user.settings.visible_diets`

    Without appropriate eager loading in the ViewSet, each user in a list
    operation can trigger separate queries for profile, settings, and the
    M2M `visible_diets` relation (N+1 query pattern).

    The ViewSet should eagerly load these relations using:
            - select_related('profile', 'settings')
                # single-valued (OneToOne) relations
      - prefetch_related('settings__visible_diets')         # M2M relation

    In general, prefer select_related for single-valued relations such as
    `profile` and `settings` because it uses efficient SQL JOINs. Reserve
    prefetch_related for many-to-many relations like `settings__visible_diets`,
    which are fetched in a separate targeted query and assembled in Python.
    Using prefetch_related('profile', 'settings', ...) would add unnecessary
    extra queries for these single-valued relations.
    The key requirement is
    that these relations are eagerly loaded to avoid N+1 queries.
    """

    settings = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)
    client_type = serializers.ChoiceField(
        choices=UserProfile.CLIENT_TYPE_CHOICES,
        required=False,
        write_only=True,
    )
    api_identifier = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
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
            "client_type",
            "api_identifier",
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
        client_type = validated_data.pop("client_type", UserProfile.CLIENT_TYPE_APP)
        api_identifier = validated_data.pop("api_identifier", "")
        # Profile fields sent as top-level keys (not in Meta.fields, so read from initial_data)
        company_name = self.initial_data.get("company_name", "")
        ico = self.initial_data.get("ico") or None
        dic = self.initial_data.get("dic") or None
        # Normalize email and keep username in sync to satisfy uniqueness constraints.
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
        user.set_unusable_password()
        user.save()

        # Create profile with client type and optional company details
        UserProfile.objects.create(
            user=user,
            client_type=client_type,
            api_identifier=api_identifier,
            company_name=company_name or "",
            ico=ico,
            dic=dic,
        )

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
        """Return admin-visible settings including diet PKs, or ``None`` if missing."""
        if hasattr(obj, "settings"):
            return AdminClientSettingsSerializer(obj.settings).data
        return None

    def update(self, instance: User, validated_data: Dict[str, Any]) -> User:
        """
        Update user fields and optionally update nested ClientSettings.

        Settings data is read from ``self.initial_data`` because the
        ``settings`` field is a read-only ``SerializerMethodField``.  It is
        validated explicitly with ``AdminClientSettingsSerializer`` before
        being applied.
        """
        settings_data = self.initial_data.get("settings", None)
        client_type = validated_data.pop("client_type", serializers.empty)
        api_identifier = validated_data.pop("api_identifier", serializers.empty)
        # Profile fields sent as top-level keys (read from initial_data same as settings)
        company_name = self.initial_data.get("company_name", serializers.empty)
        ico = self.initial_data.get("ico", serializers.empty)
        dic = self.initial_data.get("dic", serializers.empty)

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

        profile_needs_update = any(
            v is not serializers.empty
            for v in (client_type, api_identifier, company_name, ico, dic)
        )
        if profile_needs_update:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            if client_type is not serializers.empty:
                profile.client_type = client_type
            if api_identifier is not serializers.empty:
                profile.api_identifier = api_identifier
            if company_name is not serializers.empty:
                profile.company_name = company_name or ""
            if ico is not serializers.empty:
                profile.ico = ico or None
            if dic is not serializers.empty:
                profile.dic = dic or None
            profile.save()

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
            if "admin_order_note" in validated_settings:
                settings_obj.admin_order_note = validated_settings["admin_order_note"]

            settings_obj.save()

            if visible_diets is not None:
                # visible_diets is a list of Diet instances from validated data
                settings_obj.visible_diets.set(visible_diets)

        return instance
