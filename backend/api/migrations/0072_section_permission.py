import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Granulárne oprávnenia per sekcia (#484). Čisto aditívne."""

    dependencies = [
        ("api", "0071_loading_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="SectionPermission",
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
                ("section", models.CharField(max_length=40)),
                ("level", models.CharField(max_length=10)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="section_permissions",
                        to="api.userprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["profile_id", "section"],
                "unique_together": {("profile", "section")},
            },
        ),
    ]
