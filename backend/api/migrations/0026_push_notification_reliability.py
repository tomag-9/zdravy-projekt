import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0025_remove_dailyorder_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="pushsubscription",
            name="failure_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="last_failure_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="last_seen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="last_success_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="user_agent",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="PushNotificationAttempt",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("endpoint", models.TextField()),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField()),
                ("url", models.CharField(default="/home", max_length=500)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("stale_removed", "Stale removed"),
                            ("unavailable", "Unavailable"),
                        ],
                        max_length=20,
                    ),
                ),
                ("http_status", models.PositiveIntegerField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True)),
                ("attempt_number", models.PositiveSmallIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "subscription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notification_attempts",
                        to="api.pushsubscription",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="push_notification_attempts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="pushnotificationattempt",
            index=models.Index(
                fields=["created_at"], name="api_pushnot_created_34ee7b_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="pushnotificationattempt",
            index=models.Index(
                fields=["status", "created_at"], name="api_pushnot_status_b8cb8b_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="pushnotificationattempt",
            index=models.Index(
                fields=["user", "created_at"], name="api_pushnot_user_id_b07e64_idx"
            ),
        ),
    ]
