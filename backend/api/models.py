from django.contrib.auth.models import User
from django.db import models


class DailyOrder(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "date"]
        indexes = [
            models.Index(fields=["user", "date"]),
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user.username} - {self.date}"


class Diet(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class ClientSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    # Stores list of allowed menus e.g. ["A", "B", "V"]
    visible_menus = models.JSONField(default=list, blank=True)
    # Stores list of allowed meals e.g. ["breakfast", "lunch", "olovrant"]
    visible_meals = models.JSONField(default=list, blank=True)
    # ManyToMany to allow dynamic diet selection
    visible_diets = models.ManyToManyField(Diet, blank=True)

    def __str__(self):
        return f"Settings for {self.user.username}"
