from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_userprofile_mealsguest_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="diet",
            name="docx_tag",
            field=models.CharField(
                blank=True,
                help_text="Filename tag used to auto-detect this diet from uploaded DOCX files, e.g. 'NoGluten'",
                max_length=100,
                null=True,
                unique=True,
            ),
        ),
    ]
