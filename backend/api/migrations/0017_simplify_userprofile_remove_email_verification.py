import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_pushsubscription"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Drop indexes that reference removed fields
        migrations.RemoveIndex(
            model_name="userprofile",
            name="api_userpro_registr_be9578_idx",
        ),
        migrations.RemoveIndex(
            model_name="userprofile",
            name="pending_reg_idx",
        ),
        # 2. Remove old UserProfile fields
        migrations.RemoveField(model_name="userprofile", name="approved_by"),
        migrations.RemoveField(model_name="userprofile", name="approval_date"),
        migrations.RemoveField(model_name="userprofile", name="denial_reason"),
        migrations.RemoveField(model_name="userprofile", name="email_verified"),
        migrations.RemoveField(model_name="userprofile", name="registration_status"),
        migrations.RemoveField(model_name="userprofile", name="registration_date"),
        # 3. Add new UserProfile fields
        migrations.AddField(
            model_name="userprofile",
            name="client_type",
            field=models.CharField(
                choices=[
                    ("app", "Používateľ aplikácie"),
                    ("api", "API používateľ"),
                ],
                db_index=True,
                default="app",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="api_identifier",
            field=models.CharField(
                blank=True,
                help_text="API key/identifier used for data pairing (API users only)",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        # 4. Allow company_name to be blank (previously required)
        migrations.AlterField(
            model_name="userprofile",
            name="company_name",
            field=models.CharField(
                blank=True,
                help_text="Primary company name",
                max_length=255,
            ),
        ),
        # 5. Update ordering meta
        migrations.AlterModelOptions(
            name="userprofile",
            options={"ordering": ["-created_at"]},
        ),
        # 6. Drop EmailVerificationToken model
        migrations.DeleteModel(name="EmailVerificationToken"),
    ]
