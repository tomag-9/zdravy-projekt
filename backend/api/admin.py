"""
Django admin configuration for API models.
"""

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.auth.models import User

from .models import (
    DailyOrder,
    Diet,
    EventLog,
    GlobalSettings,
    PasswordResetToken,
    UserProfile,
)


class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile."""

    model = UserProfile
    can_delete = False
    fk_name = "user"
    verbose_name_plural = "Company Profile"
    fields = (
        "company_name",
        "onboarding_completed",
        "created_at",
    )
    readonly_fields = ("created_at",)


class UniqueEmailUserCreationForm(UserCreationForm):
    """Admin add-user form enforcing one account per email (case-insensitive)."""

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email",)  # username auto-synced from email

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if not email:
            return email
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Používateľ s týmto emailom už existuje.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        # Sync username with normalized email to maintain consistency
        user.username = self.cleaned_data["email"].lower()
        if commit:
            user.save()
        return user


class UniqueEmailUserChangeForm(UserChangeForm):
    """Admin edit-user form enforcing one account per email (case-insensitive)."""

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if not email:
            return email
        if (
            User.objects.filter(email__iexact=email)
            .exclude(pk=self.instance.pk)
            .exists()
        ):
            raise forms.ValidationError("Používateľ s týmto emailom už existuje.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        # Sync username with normalized email to maintain consistency
        if "email" in self.cleaned_data:
            user.username = self.cleaned_data["email"].lower()
        if commit:
            user.save()
        return user


class UserAdmin(BaseUserAdmin):
    """Extended User admin with profile inline."""

    form = UniqueEmailUserChangeForm
    add_form = UniqueEmailUserCreationForm
    inlines = (UserProfileInline,)
    list_display = (
        "username",
        "email",
        "get_company_name",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_staff", "is_active", "date_joined")
    search_fields = ("username", "email", "profile__company_name")

    def get_company_name(self, obj):
        """Display company name from profile."""
        if hasattr(obj, "profile"):
            return obj.profile.company_name
        return "-"

    get_company_name.short_description = "Company Name"


# Re-register User with our custom admin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(EventLog)
class EventLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "event_type",
        "actor_label",
        "target_user",
        "summary",
    )
    list_filter = ("event_type", "created_at")
    search_fields = ("summary", "actor_label")
    readonly_fields = (
        "event_type",
        "actor",
        "actor_label",
        "target_user",
        "summary",
        "payload",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model."""

    list_display = (
        "company_name",
        "user_email",
        "onboarding_completed",
        "created_at",
    )
    list_filter = ("onboarding_completed", "created_at")
    search_fields = ("company_name", "user__email")
    readonly_fields = ("created_at",)

    fieldsets = (
        (
            "Company Information",
            {
                "fields": (
                    "user",
                    "company_name",
                    "onboarding_completed",
                    "created_at",
                ),
            },
        ),
    )

    def user_email(self, obj):
        """Display user email."""
        return obj.user.email

    user_email.short_description = "Email"


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin for PasswordResetToken model."""

    list_display = ("user", "token_preview", "created_at", "expires_at", "used")
    list_filter = ("used", "created_at")
    search_fields = ("user__email", "token")
    readonly_fields = ("created_at",)

    def token_preview(self, obj):
        """Display token preview."""
        return f"{obj.token[:20]}..."

    token_preview.short_description = "Token"


class DailyOrderAdminForm(forms.ModelForm):
    class Meta:
        model = DailyOrder
        fields = "__all__"

    def clean_data(self):
        from .serializers import DailyOrderSerializer

        serializer = DailyOrderSerializer()
        return serializer.validate_data(self.cleaned_data.get("data") or {})


@admin.register(DailyOrder)
class DailyOrderAdmin(admin.ModelAdmin):
    """Admin for DailyOrder model."""

    form = DailyOrderAdminForm
    list_display = ("user", "date", "status", "is_auto", "created_at")
    list_filter = ("is_auto", "date", "created_at")
    search_fields = ("user__email", "user__profile__company_name")
    date_hierarchy = "date"


@admin.register(Diet)
class DietAdmin(admin.ModelAdmin):
    """Admin for Diet model."""

    list_display = ("name", "is_active", "description")
    list_filter = ("is_active",)
    search_fields = ("name", "description")


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    """Admin for GlobalSettings model."""

    list_display = (
        "deadline_breakfast",
        "deadline_lunch",
        "deadline_olovrant",
        "edupage_auto_scrape_enabled",
        "daily_report_enabled",
    )
    readonly_fields = ("change_history",)

    def has_add_permission(self, request):
        """Only allow one GlobalSettings instance."""
        return not GlobalSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of GlobalSettings."""
        return False

    def save_model(self, request, obj, form, change):
        """Persist the change and record who moved which setting (issue #472)."""
        from .services.event_log_service import build_model_diff
        from .services.global_settings_audit import log_global_settings_change

        changes = {}
        if change and form.changed_data:
            previous = GlobalSettings.objects.filter(pk=obj.pk).first()
            if previous is not None:
                changes = build_model_diff(
                    previous,
                    {name: getattr(obj, name) for name in form.changed_data},
                )

        super().save_model(request, obj, form, change)
        log_global_settings_change(changes, actor=request.user)

    @admin.display(description="História zmien")
    def change_history(self, obj):
        """Last 20 audited changes, newest first."""
        from django.utils.html import format_html, format_html_join

        events = EventLog.objects.filter(
            event_type=EventLog.EventType.SETTINGS_CHANGE,
            payload__model=GlobalSettings._meta.label_lower,
        )[:20]
        if not events:
            return "Zatiaľ žiadne zaznamenané zmeny."

        rows = format_html_join(
            "",
            "<li><strong>{}</strong> — {} <br><code>{}</code></li>",
            (
                (
                    event.created_at.strftime("%d.%m.%Y %H:%M"),
                    event.actor_label or "system",
                    event.payload.get("changes", {}),
                )
                for event in events
            ),
        )
        return format_html("<ul style='margin:0;padding-left:1em'>{}</ul>", rows)
