import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_jedalnicek_upload"),
    ]

    operations = [
        # 1. Add is_edupage to UserProfile
        migrations.AddField(
            model_name="userprofile",
            name="is_edupage",
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text="True for operations that upload orders via Edupage",
            ),
        ),
        # 2. Remove client_type from UserProfile
        migrations.RemoveField(
            model_name="userprofile",
            name="client_type",
        ),
        # 3. Change EdupageUpload.school FK → UserProfile (as "operation")
        migrations.RemoveField(
            model_name="edupageupload",
            name="school",
        ),
        migrations.AddField(
            model_name="edupageupload",
            name="operation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="edupage_uploads",
                to="api.userprofile",
            ),
        ),
        # 4. Remove School model
        migrations.DeleteModel(
            name="School",
        ),
    ]
