import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_edupage_schools"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="JedalnicekUpload",
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
                    "week_start",
                    models.DateField(
                        db_index=True, help_text="Monday of the week this plan covers"
                    ),
                ),
                ("filename", models.CharField(max_length=500)),
                ("file", models.FileField(upload_to="jedalnicek_uploads/%Y/%m/")),
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
                        related_name="jedalnicek_uploads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-uploaded_at"],
                "indexes": [
                    models.Index(
                        fields=["week_start", "status"],
                        name="api_jedal_upload_week_status_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="JedalnicekEntry",
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
                    "upload",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="entries",
                        to="api.jedalnicekupload",
                    ),
                ),
                ("date", models.DateField(db_index=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("breakfast", "Raňajky"),
                            ("lunch", "Obed"),
                            ("snack", "Olovrant"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "menu_variant",
                    models.CharField(
                        blank=True,
                        max_length=10,
                        help_text="Leave blank for breakfast/snack. E.g. 'A', 'B'.",
                    ),
                ),
                (
                    "diet",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="jedalnicek_entries",
                        to="api.diet",
                        help_text="Null means the entry applies to all diets / is the default.",
                    ),
                ),
                (
                    "name",
                    models.CharField(max_length=500, help_text="Name of the meal"),
                ),
                (
                    "weight_grams",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=8,
                        null=True,
                        help_text="Gram weight for this diet (replaces base_weight × coefficient)",
                    ),
                ),
            ],
            options={
                "ordering": ["date", "category", "menu_variant", "diet__name"],
                "indexes": [
                    models.Index(
                        fields=["date", "category", "menu_variant"],
                        name="api_jedal_entry_date_cat_var_idx",
                    ),
                    models.Index(
                        fields=["date", "diet"], name="api_jedal_entry_date_diet_idx"
                    ),
                ],
            },
        ),
    ]
