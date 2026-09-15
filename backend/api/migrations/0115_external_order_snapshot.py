import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0114_fix_meal_routes_pointing_at_lunch_route")]

    operations = [
        migrations.CreateModel(
            name="ExternalOrderSnapshot",
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
                    "source",
                    models.CharField(
                        choices=[("edupage_sa", "EduPage sA")], max_length=32
                    ),
                ),
                ("data", models.JSONField(default=dict)),
                ("scraped_at", models.DateTimeField(auto_now=True)),
                (
                    "prevadzka",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="external_order_snapshots",
                        to="api.prevadzka",
                    ),
                ),
            ],
            options={"ordering": ["-date"]},
        ),
        migrations.AddConstraint(
            model_name="externalordersnapshot",
            constraint=models.UniqueConstraint(
                fields=("prevadzka", "date", "source"),
                name="unique_external_order_snapshot",
            ),
        ),
        migrations.AddIndex(
            model_name="externalordersnapshot",
            index=models.Index(
                fields=["prevadzka", "date"], name="api_externa_prevadz_49d051_idx"
            ),
        ),
    ]
