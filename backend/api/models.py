from django.db import models
from django.contrib.auth.models import User

class DailyOrder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    date = models.DateField(db_index=True)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date}"
