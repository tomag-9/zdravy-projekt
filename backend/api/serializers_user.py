from typing import Any, Dict, List, Optional

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers

from .default_visibility import DEFAULT_VISIBLE_MENUS
from .models import Celok, ClientSettings, Diet, Prevadzka, UserProfile
from .reference_data import DEFAULT_DIET_NAMES


class DietSerializer(serializers.ModelSerializer):
    """Read/write serializer for the Diet catalogue model."""

    class Meta:
        model = Diet
        fields = ["id", "name", "sort_order", "is_active", "description", "color"]


def validate_password_strength(password: str, user: User | None = None) -> str:
    """Validate passwords with Django's configured AUTH_PASSWORD_VALIDATORS."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages) from exc
    return password


class UserProfileDetailSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile details."""

    class Meta:
        model = UserProfile
        fields = [
            "company_name",
            "billing_name",
            "ico",
            "dic",
            "is_edupage",
            "api_identifier",
            "mealsguest_url",
            "created_at",
            "onboarding_completed",
        ]
        read_only_fields = ["created_at"]


class ClientUserProfileDetailSerializer(serializers.ModelSerializer):
    """Profile details visible to the operation itself."""

    class Meta:
        model = UserProfile
        fields = [
            "billing_name",
            "ico",
            "dic",
            "is_edupage",
            "api_identifier",
            "created_at",
            "onboarding_completed",
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
    billing_name = serializers.CharField(
        source="profile.billing_name", required=False, allow_blank=True, default=""
    )
    ico = serializers.CharField(
        source="profile.ico", required=False, allow_blank=True, allow_null=True
    )
    dic = serializers.CharField(
        source="profile.dic", required=False, allow_blank=True, allow_null=True
    )
    onboarding_completed = serializers.BooleanField(
        source="profile.onboarding_completed", required=False
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "billing_name",
            "ico",
            "dic",
            "onboarding_completed",
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
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile_fields = (
                "billing_name",
                "ico",
                "dic",
                "onboarding_completed",
            )
            update_fields = [field for field in profile_fields if field in profile_data]
            for field in update_fields:
                setattr(profile, field, profile_data[field])
            if update_fields:
                profile.save(update_fields=update_fields)

        return user

    def get_groups(self, obj: User) -> List[str]:
        return [group.name for group in obj.groups.all()]

    def get_profile(self, obj: User) -> Optional[Dict[str, Any]]:
        """Return profile details if exists."""
        if hasattr(obj, "profile"):
            return ClientUserProfileDetailSerializer(obj.profile).data
        return None

    def get_settings(self, obj: User) -> Dict[str, Any]:
        """Return client settings; use defaults when no settings row exists."""
        if hasattr(obj, "settings"):
            return ClientSettingsSerializer(obj.settings).data
        default_diets = Diet.objects.filter(
            name__in=DEFAULT_DIET_NAMES,
            is_active=True,
        )
        return {
            "visible_menus": DEFAULT_VISIBLE_MENUS,
            "visible_meals": ["breakfast", "lunch", "olovrant"],
            "visible_diets": DietSerializer(default_diets, many=True).data,
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
    email = serializers.EmailField(required=True)
    company_name = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
    # Voliteľné napojenie nového loginu: na existujúci celok, prípadne obmedzené len
    # na vybrané prevádzky (login „na prevádzku"). Bez `celok` sa správa ako doteraz —
    # signál profilu vytvorí vlastný celok podľa company_name.
    celok = serializers.PrimaryKeyRelatedField(
        queryset=Celok.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    prevadzky = serializers.PrimaryKeyRelatedField(
        queryset=Prevadzka.objects.all(),
        many=True,
        required=False,
        write_only=True,
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
            "profile",
            "company_name",
            "celok",
            "prevadzky",
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
        company_name = validated_data.pop("company_name", "") or ""
        celok = validated_data.pop("celok", None)
        prevadzky = validated_data.pop("prevadzky", None)
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

        # Ak je zadaný celok, nastavíme ho hneď pri vytvorení — tým sa vypne
        # auto-vytvorenie vlastného celku v `on_user_profile_saved` signáli.
        profile = UserProfile.objects.create(
            user=user,
            company_name=company_name,
            celok=celok,
        )
        # Login „na prevádzku": obmedz rozsah na vybrané prevádzky (M2M). Prázdne =
        # celý celok. Validujeme, že prevádzky patria zadanému celku.
        if prevadzky:
            if celok is not None:
                cudzie = [p for p in prevadzky if p.celok_id != celok.id]
                if cudzie:
                    raise serializers.ValidationError(
                        {"prevadzky": "Prevádzky musia patriť zadanému celku."}
                    )
            profile.prevadzky.set(prevadzky)
        ClientSettings.objects.get_or_create(user=user)

        return user

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
        company_name = validated_data.pop("company_name", serializers.empty)

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

        profile_needs_update = company_name is not serializers.empty
        if profile_needs_update:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            if company_name is not serializers.empty:
                profile.company_name = company_name or ""
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
