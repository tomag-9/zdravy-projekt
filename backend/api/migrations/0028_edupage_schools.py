import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_inbox_read_at"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="School",
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
                ("name", models.CharField(max_length=200, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="EdupageUpload",
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
                (
                    "school",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="uploads",
                        to="api.school",
                    ),
                ),
                (
                    "date",
                    models.DateField(
                        db_index=True, help_text="Date the orders are for"
                    ),
                ),
                ("filename", models.CharField(max_length=500)),
                ("file", models.FileField(upload_to="edupage_uploads/%Y/%m/")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Čaká na spracovanie"),
                            ("processed", "Spracovaný"),
                            ("error", "Chyba"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("error_message", models.TextField(blank=True)),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="edupage_uploads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-uploaded_at"],
                "indexes": [
                    models.Index(
                        fields=["date", "school"], name="api_edupage_date_school_idx"
                    ),
                    models.Index(
                        fields=["date", "status"], name="api_edupage_date_status_idx"
                    ),
                ],
            },
        ),
    ]
