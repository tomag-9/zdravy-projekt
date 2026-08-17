from django.db import migrations, models


class Migration(migrations.Migration):
    """Pridá `UserProfile.role` (#482).

    Čisto aditívne: stĺpec má default, takže stará verzia kódu beží s novou
    schémou ďalej a revert kódu nevyžaduje revert migrácie.
    """

    dependencies = [
        ("api", "0068_alter_eventlog_event_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("klient", "Klient"),
                    ("admin", "Admin"),
                    ("superadmin", "Superadmin"),
                    ("kuchyna", "Kuchyňa"),
                ],
                db_index=True,
                default="klient",
                help_text=(
                    "Rola loginu (#482). `is_staff` zostáva odvodeným zrkadlom pre "
                    "Django admin — autoritatívna je táto hodnota, čítaj ju cez "
                    "`api.roles.role_of`."
                ),
                max_length=20,
            ),
        ),
    ]
