from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0066_alter_eventlog_event_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="daily_report_enabled",
            field=models.BooleanField(
                default=True,
                help_text=(
                    "When disabled, the daily report periodic tasks are removed "
                    "without touching report_email_recipients."
                ),
            ),
        ),
    ]
