import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """Sledovanie naloženia pre kuchyňu (#487). Čisto aditívne."""

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0073_backfill_user_roles"),
    ]

    operations = [
        migrations.CreateModel(
            name="LoadingStatus",
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
                ("date", models.DateField(db_index=True)),
                (
                    "item_key",
                    models.CharField(
                        help_text="Kľúč stĺpcovej skupiny z gramážového prehľadu.",
                        max_length=100,
                    ),
                ),
                ("is_loaded", models.BooleanField(default=True)),
                ("marked_at", models.DateTimeField(auto_now=True)),
                (
                    "marked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="loading_marks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "prevadzka",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="loading_statuses",
                        to="api.prevadzka",
                    ),
                ),
            ],
            options={
                "ordering": ["date", "prevadzka_id", "item_key"],
            },
        ),
        migrations.CreateModel(
            name="PrevadzkaLoadingConfirmation",
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
                ("date", models.DateField(db_index=True)),
                ("confirmed_at", models.DateTimeField(auto_now_add=True)),
                (
                    "confirmed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="loading_confirmations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "prevadzka",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="loading_confirmations",
                        to="api.prevadzka",
                    ),
                ),
            ],
            options={
                "ordering": ["-confirmed_at"],
            },
        ),
        migrations.AddIndex(
            model_name="loadingstatus",
            index=models.Index(
                fields=["date", "prevadzka"], name="api_loading_date_8e362f_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="loadingstatus",
            unique_together={("date", "prevadzka", "item_key")},
        ),
        migrations.AlterUniqueTogether(
            name="prevadzkaloadingconfirmation",
            unique_together={("date", "prevadzka")},
        ),
    ]
