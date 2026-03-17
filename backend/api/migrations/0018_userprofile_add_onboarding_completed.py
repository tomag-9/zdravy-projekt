from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0017_simplify_userprofile_remove_email_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="onboarding_completed",
            field=models.BooleanField(
                default=False,
                help_text="True once the client has completed or dismissed the onboarding tour.",
            ),
        ),
    ]
