from django.db import migrations

KLIENT = "klient"
ADMIN = "admin"
SUPERADMIN = "superadmin"


def backfill_roles(apps, schema_editor):
    """
    Doplní role podľa starých príznakov a dozaloží chýbajúce profily.

    Zámerne backfilluje SMEROM HORE — každý dnešný `is_staff` login dostane
    `superadmin`, nie `admin`. Deploy tejto migrácie tak nikomu neuberá práva;
    degradácia konkrétnych ľudí na `admin` je samostatný vedomý krok po #483.

    Historické modely nespúšťajú signály, takže `on_user_profile_saved` tu
    nefiruje a dozaloženým profilom NEVZNIKNE fantómový Celok/Prevádzka.
    """
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("api", "UserProfile")

    for user in User.objects.filter(profile__isnull=True).iterator():
        UserProfile.objects.create(
            user=user,
            company_name="",
            role=(
                (SUPERADMIN if user.is_superuser else ADMIN)
                if user.is_staff
                else KLIENT
            ),
        )

    UserProfile.objects.filter(user__is_staff=True, user__is_superuser=True).update(
        role=SUPERADMIN
    )
    UserProfile.objects.filter(user__is_staff=True, user__is_superuser=False).update(
        role=ADMIN
    )
    UserProfile.objects.filter(user__is_staff=False).update(role=KLIENT)


def unset_roles(apps, schema_editor):
    """Späť na default. Dozaložené profily sa nemažú — nevieme rozlíšiť,
    ktoré vznikli tu a ktoré medzitým pribudli bežnou cestou."""
    UserProfile = apps.get_model("api", "UserProfile")
    UserProfile.objects.update(role=KLIENT)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0072_userprofile_role"),
    ]

    operations = [
        migrations.RunPython(backfill_roles, unset_roles),
    ]
