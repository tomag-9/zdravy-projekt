from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0037_sync_real_portion_coefficients"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="edupage_auto_scrape_enabled",
            field=models.BooleanField(
                default=True,
                help_text=(
                    "When disabled, automatic EduPage scraping periodic tasks "
                    "are removed."
                ),
            ),
        ),
    ]
