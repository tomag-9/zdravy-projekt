from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_remove_globalsettings_deadline_time_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailyorder",
            name="is_auto",
            field=models.BooleanField(
                default=False,
                help_text="True if this order was auto-generated after deadline",
            ),
        ),
    ]
