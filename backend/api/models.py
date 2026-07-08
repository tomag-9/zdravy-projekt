import datetime
from typing import Any, List

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class DailyOrder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    date = models.DateField(db_index=True)
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

    @property
    def status(self) -> str:
        return getattr(self, "_response_status", "submitted")

    @status.setter
    def status(self, value: str) -> None:
        self._response_status = value


class Diet(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self) -> str:
        return self.name


def _default_all_meals() -> List[str]:
    return ["breakfast", "lunch", "olovrant"]


def _default_visible_menus() -> List[str]:
    return ["A"]


class ClientSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    # Stores list of allowed menus e.g. ["A", "B", "V"]
    visible_menus = models.JSONField(default=_default_visible_menus, blank=True)
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
    edupage_auto_scrape_enabled = models.BooleanField(
        default=True,
        help_text="When disabled, automatic EduPage scraping periodic tasks are removed.",
    )
    report_email_recipients = models.JSONField(
        default=list,
        blank=True,
        help_text="List of email addresses that receive the daily order report.",
    )
    client_contact_name = models.CharField(max_length=120, blank=True, default="")
    client_contact_role = models.CharField(max_length=120, blank=True, default="")
    client_contact_email = models.EmailField(blank=True, default="")
    client_contact_phone = models.CharField(max_length=40, blank=True, default="")

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.pk and GlobalSettings.objects.exists():
            raise ValueError(
                "GlobalSettings is a singleton; update the existing instance (pk=1) "
                "instead of creating a new one."
            )
        return super(GlobalSettings, self).save(*args, **kwargs)

    def __str__(self) -> str:
        return "Global System Settings"


class UserProfile(models.Model):
    """Extended user profile with company information."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    company_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Interný názov prevádzky (používa sa interne)",
    )
    billing_name = models.CharField(
        max_length=255, blank=True, help_text="Názov spoločnosti pre fakturáciu"
    )
    ico = models.CharField(
        max_length=20, blank=True, help_text="Company registration number (IČO)"
    )
    dic = models.CharField(
        max_length=20, blank=True, help_text="Tax identification number (DIČ)"
    )
    is_edupage = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True for operations that upload orders via Edupage",
    )
    api_identifier = models.CharField(
        max_length=255,
        blank=True,
        help_text="Identifier used to match this operation in Edupage file parsing",
    )
    mealsguest_url = models.CharField(
        max_length=500,
        blank=True,
        help_text="Full mealsGuest URL for HTML scraping, e.g. https://school.edupage.org/menu/mealsGuest?id=TOKEN",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    onboarding_completed = models.BooleanField(
        default=False,
        help_text="True once the client has completed or dismissed the onboarding tour.",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.company_name or self.user.email


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
    BREAKFAST_SNACK = "breakfast_snack", "Raňajky-desiata"
    SOUP = "soup", "Polievka"
    MAIN_COURSE = "main_course", "Hlavný chod"
    AFTERNOON_SNACK = "afternoon_snack", "Olovrant"


class MealTemplate(models.Model):
    """
    Reusable meal template selected when building a daily plan.
    Comes from a fixed catalog of numbered types (e.g. "Hlavný chod 3"),
    each with a weight breakdown per component.
    """

    category = models.CharField(
        max_length=20, choices=MealCategory.choices, db_index=True
    )
    name = models.CharField(max_length=200)
    # Human-readable composition label, e.g. "185g + šalát 25g + syr 10g"
    weight_label = models.CharField(max_length=100, blank=True)
    # Base weight in grams used for calculations (Adult 100% portion).
    # Sum of the gram components below.
    base_weight_grams = models.DecimalField(max_digits=8, decimal_places=2)
    # Structured weight breakdown, e.g.
    # [{"label": "Hlavná zložka", "grams": "110", "unit": "g"}, ...]
    components = models.JSONField(default=list, blank=True)
    # For the two catalog rows where a component is a fixed piece-count per
    # portion type instead of grams × coefficient (vajce / gulička-fašírka):
    # {"component_label": str, "unit": "ks", "counts_by_portion_type": {name: count}}
    unit_exception = models.JSONField(null=True, blank=True)
    # Lunch can have variants A / B / C …
    menu_variant = models.CharField(
        max_length=10,
        blank=True,
        help_text="Leave empty for breakfast/snack. E.g. 'A', 'B', 'C'.",
    )
    diet = models.ForeignKey(
        "Diet",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="meal_templates",
        help_text="Optional diet this template variant is prepared for.",
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
    Seeded with Škôlka/MS as the 1.00 baseline; other groups are multipliers.
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
    diet = models.ForeignKey(
        "Diet",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="meal_plan_items",
        help_text="Optional diet-specific meal plan item. Null means standard/default.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["meal_plan", "category", "menu_variant", "diet"],
                name="uniq_meal_plan_item_slot_diet",
                nulls_distinct=False,
            )
        ]

    def __str__(self) -> str:
        diet = f" {self.diet.name}" if self.diet_id else ""
        return f"{self.meal_plan.date} {self.category} {self.menu_variant}{diet}"


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


class Holiday(models.Model):
    """
    A day on which no orders can be placed.
    Admin can define individual dates or ranges.
    """

    date = models.DateField(unique=True, db_index=True)
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self) -> str:
        suffix = f" ({self.reason})" if self.reason else ""
        return f"Voľný deň {self.date}{suffix}"


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
    user_agent = models.TextField(blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)
    failure_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "endpoint"]
        indexes = [
            models.Index(fields=["user"]),
        ]

    def __str__(self) -> str:
        return f"PushSubscription({self.user.email}, …{self.endpoint[-20:]})"


class PushNotificationAttempt(models.Model):
    """Audit trail for Web Push delivery attempts."""

    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_STALE_REMOVED = "stale_removed"
    STATUS_UNAVAILABLE = "unavailable"

    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_STALE_REMOVED, "Stale removed"),
        (STATUS_UNAVAILABLE, "Unavailable"),
    ]

    subscription = models.ForeignKey(
        PushSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_attempts",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="push_notification_attempts",
    )
    endpoint = models.TextField()
    title = models.CharField(max_length=200)
    body = models.TextField()
    url = models.CharField(max_length=500, default="/home")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    http_status = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    attempt_number = models.PositiveSmallIntegerField(default=1)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "read_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PushNotificationAttempt({self.status}, …{self.endpoint[-20:]})"


# ──────────────────────────────────────────────────────────────────────────────
# Edupage integration
# ──────────────────────────────────────────────────────────────────────────────


class EdupageUpload(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PROCESSED = "processed"
    STATUS_ERROR = "error"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Čaká na spracovanie"),
        (STATUS_PROCESSED, "Spracovaný"),
        (STATUS_ERROR, "Chyba"),
    ]

    operation = models.ForeignKey(
        "UserProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edupage_uploads",
    )
    date = models.DateField(db_index=True, help_text="Date the orders are for")
    filename = models.CharField(max_length=500)
    file = models.FileField(upload_to="edupage_uploads/%Y/%m/")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    error_message = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="edupage_uploads"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["date", "operation"]),
            models.Index(fields=["date", "status"]),
        ]

    def __str__(self) -> str:
        op_name = self.operation.company_name if self.operation else "?"
        return f"EdupageUpload({op_name}, {self.date}, {self.filename})"
