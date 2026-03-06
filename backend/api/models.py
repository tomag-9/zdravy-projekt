import datetime
from typing import Any, List

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class DailyOrder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    date = models.DateField(db_index=True)
    # Status removed/deprecated effectively. All orders in DB are considered submitted.
    # We keep the field for now to avoid massive migration breakage but default to 'submitted'
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
