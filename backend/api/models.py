from django.db import models
from django.contrib.auth.models import User


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
