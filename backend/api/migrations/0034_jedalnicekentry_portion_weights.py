from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_userprofile_mealsguest_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="jedalnicekentry",
            name="unit",
            field=models.CharField(default="g", max_length=10),
        ),
        migrations.AddField(
            model_name="jedalnicekentry",
            name="portion_weights",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Per-portion quantities from XLSX, e.g. {'Škôlka': '120.00'}",
            ),
        ),
    ]
