from django.db import migrations, models


class Migration(migrations.Migration):
    """Len `help_text`: `scrape_flags` odteraz nesie aj `uncertain_diets`."""

    dependencies = [
        ("api", "0079_alter_deliveryroute_vydaj"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dailyorder",
            name="scrape_flags",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Poznámky z posledného EduPage scrapu tejto objednávky, napr. "
                    "{'attention': [...], 'config_notes': [...], "
                    "'unmapped_diets': [...], 'uncertain_diets': [...]}. "
                    "Prázdne pri ručných objednávkach a pri scrape bez upozornení."
                ),
            ),
        ),
    ]
