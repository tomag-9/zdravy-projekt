import datetime
from typing import Any, List

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class DailyOrder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    date = models.DateField(db_index=True)
    # Status removed/deprecated effectively. All orders in DB are considered submitted.
    # We keep the field for now to avoid massive migration breakage but default to 'submitted'  # noqa: E501
    # or we can remove it. Let's start by defaulting to submitted and ignoring draft.
    status = models.CharField(max_length=20, default="submitted")
    data = models.JSONField(default=dict)
    is_auto = models.BooleanField(
        default=False, help_text="True if this order was auto-generated after deadline"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "date"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["is_auto"]),  # For filtering auto-generated orders
            models.Index(fields=["created_at"]),  # For audit and recent order queries
        ]
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.date}"


class Diet(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self) -> str:
        return self.name


def _default_all_meals() -> List[str]:
    return ["breakfast", "lunch", "olovrant"]


class ClientSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    # Stores list of allowed menus e.g. ["A", "B", "V"]
    visible_menus = models.JSONField(default=list, blank=True)
    # Stores list of allowed meals e.g. ["breakfast", "lunch", "olovrant"]
    visible_meals = models.JSONField(default=_default_all_meals, blank=True)
    # ManyToMany to allow dynamic diet selection
    visible_diets = models.ManyToManyField(Diet, blank=True)
    # Admin-only note displayed in admin gramage dashboard after expanding client row.
    admin_order_note = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return f"Settings for {self.user.email}"


class GlobalSettings(models.Model):
    deadline_breakfast = models.TimeField(
        default=datetime.time(10, 0), help_text="Deadline for breakfast orders"
    )
    deadline_lunch = models.TimeField(
        default=datetime.time(10, 0), help_text="Deadline for lunch orders"
    )
    deadline_olovrant = models.TimeField(
        default=datetime.time(10, 0), help_text="Deadline for olovrant orders"
    )
    deadline_breakfast_is_day_before = models.BooleanField(
        default=False,
        help_text=(
            "When enabled, breakfast deadline applies to the day"
            " before the meal date"
        ),
    )
    deadline_lunch_is_day_before = models.BooleanField(
        default=False,
        help_text=(
            "When enabled, lunch deadline applies to the day" " before the meal date"
        ),
    )
    deadline_olovrant_is_day_before = models.BooleanField(
        default=False,
        help_text=(
            "When enabled, olovrant deadline applies to the day" " before the meal date"
        ),
    )
    report_email_recipients = models.JSONField(
        default=list,
        blank=True,
        help_text="List of email addresses that receive the daily order report.",
    )

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.pk and GlobalSettings.objects.exists():
            return
        return super(GlobalSettings, self).save(*args, **kwargs)

    def __str__(self) -> str:
        return "Global System Settings"


class UserProfile(models.Model):
    """
    Extended user profile with company information.
    Users register with company details and must be approved by admin.
    """

    REGISTRATION_PENDING = "pending"
    REGISTRATION_APPROVED = "approved"
    REGISTRATION_DENIED = "denied"

    REGISTRATION_STATUS_CHOICES = [
        (REGISTRATION_PENDING, "Pending approval"),
        (REGISTRATION_APPROVED, "Approved"),
        (REGISTRATION_DENIED, "Denied"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    company_name = models.CharField(
        max_length=255, help_text="Primary company name (required)"
    )
    ico = models.CharField(
        max_length=20, blank=True, help_text="Company registration number (IČO)"
    )
    dic = models.CharField(
        max_length=20, blank=True, help_text="Tax identification number (DIČ)"
    )
    registration_status = models.CharField(
        max_length=20,
        choices=REGISTRATION_STATUS_CHOICES,
        default=REGISTRATION_PENDING,
        db_index=True,
    )
    email_verified = models.BooleanField(default=False)
    registration_date = models.DateTimeField(auto_now_add=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_users",
    )
    denial_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-registration_date"]
        indexes = [
            models.Index(fields=["registration_status", "email_verified"]),
            models.Index(
                fields=["registration_status", "registration_date"],
                name="pending_reg_idx",
            ),  # For efficient pending registration queries
        ]

    def __str__(self) -> str:
        return f"{self.company_name} ({self.user.email})"


class EmailVerificationToken(models.Model):
    """
    Token for email verification during registration.
    Expires after 24 hours and is single-use.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="email_verification_tokens"
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"EmailVerificationToken for {self.user.email}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.used and not self.is_expired


class PasswordResetToken(models.Model):
    """
    Single-use token for password reset via email.
    Expires after TOKEN_EXPIRY_HOURS hours and is invalidated once used.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "used", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"PasswordResetToken for {self.user.email}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.used and not self.is_expired


# ──────────────────────────────────────────────────────────────────────────────
# Jedálniček (Meal Plan) module
# ──────────────────────────────────────────────────────────────────────────────


class MealCategory(models.TextChoices):
    BREAKFAST = "breakfast", "Raňajky"
    LUNCH = "lunch", "Obed"
    SNACK = "snack", "Olovrant"


class MealTemplate(models.Model):
    """
    Reusable meal template selected when building a daily plan.
    E.g. "Mäso + Príloha + Šalát" with base_weight_grams=225 (200+25).
    """

    category = models.CharField(
        max_length=20, choices=MealCategory.choices, db_index=True
    )
    name = models.CharField(max_length=200)
    # Human-readable composition label, e.g. "200g + 25g"
    weight_label = models.CharField(max_length=100, blank=True)
    # Base weight in grams used for calculations (Adult 100% portion)
    base_weight_grams = models.DecimalField(max_digits=8, decimal_places=2)
    # Lunch can have variants A / B / C …
    menu_variant = models.CharField(
        max_length=10,
        blank=True,
        help_text="Leave empty for breakfast/snack. E.g. 'A', 'B', 'C'.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "menu_variant", "name"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self) -> str:
        variant = f" [{self.menu_variant}]" if self.menu_variant else ""
        return f"{self.get_category_display()}{variant}: {self.name}"


class PortionType(models.Model):
    """
    Defines a consumer group and their weight coefficient.
    Seeded with: Škôlka (0.50), Škola (0.75), Dospelý (1.00).
    """

    name = models.CharField(max_length=100, unique=True)
    coefficient = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        help_text="Multiplier applied to template base_weight_grams. 1.0 = 100%.",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        pct = int(self.coefficient * 100)
        return f"{self.name} ({pct}%)"


class DailyMealPlan(models.Model):
    """
    The meal plan for one calendar day.
    Contains the template selections and the enrolled person counts.
    """

    date = models.DateField(unique=True, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="meal_plans_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"Jedálniček {self.date}"


class MealPlanItem(models.Model):
    """
    One meal slot within a DailyMealPlan.
    One item per (meal_plan, category, menu_variant) combination.
    """

    meal_plan = models.ForeignKey(
        DailyMealPlan, on_delete=models.CASCADE, related_name="items"
    )
    template = models.ForeignKey(
        MealTemplate, on_delete=models.PROTECT, related_name="plan_items"
    )
    # Denormalised for query convenience
    category = models.CharField(max_length=20, choices=MealCategory.choices)
    menu_variant = models.CharField(max_length=10, blank=True)

    class Meta:
        unique_together = ["meal_plan", "category", "menu_variant"]

    def __str__(self) -> str:
        return f"{self.meal_plan.date} {self.category} {self.menu_variant}"


class EnrolledCount(models.Model):
    """
    How many persons of a given PortionType are enrolled on a specific DailyMealPlan.
    Used to compute total gramage per day.
    """

    meal_plan = models.ForeignKey(
        DailyMealPlan, on_delete=models.CASCADE, related_name="enrolled_counts"
    )
    portion_type = models.ForeignKey(
        PortionType, on_delete=models.PROTECT, related_name="enrolled_counts"
    )
    count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ["meal_plan", "portion_type"]

    def __str__(self) -> str:
        return f"{self.meal_plan.date} {self.portion_type.name}: {self.count}"


class PushSubscription(models.Model):
    """
    Web Push subscription for a user device/browser.
    Stores the endpoint and ECDH keys needed to send push messages via VAPID.
    One user can have multiple subscriptions (multi-device support).
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="push_subscriptions"
    )
    endpoint = models.TextField()
    p256dh = models.TextField()
    auth = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "endpoint"]
        indexes = [
            models.Index(fields=["user"]),
        ]

    def __str__(self) -> str:
        return f"PushSubscription({self.user.email}, …{self.endpoint[-20:]})"
