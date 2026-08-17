from django.db import migrations

# Cieľový stav dohodnutý pri návrhu rolového systému: najvyššie práva drží
# jediný login. Ostatní správcovia sú `admin` — bez správy prístupov, logov
# a systémových nastavení (#483).
SUPERADMIN_EMAILS = {"zp_dev@tomag.xyz"}

ADMIN = "admin"
SUPERADMIN = "superadmin"


def demote(apps, schema_editor):
    """Zosúladí role reálnych správcov s dohodnutým stavom.

    Migrácia 0070 backfillovala všetkých staff na `superadmin` zámerne, aby
    nasadenie nikomu neuberalo práva. Toto je ten vedomý druhý krok — beží až
    tu, aby sa dal nasadiť a overiť samostatne.

    Nikoho nepovyšuje ani nezakladá: dotýka sa len loginov, ktoré už majú
    `superadmin`. V prostrediach bez týchto e-mailov (dev, staging seed)
    neurobí nič.
    """
    UserProfile = apps.get_model("api", "UserProfile")

    UserProfile.objects.filter(role=SUPERADMIN).exclude(
        user__email__in=SUPERADMIN_EMAILS
    ).update(role=ADMIN)


def restore(apps, schema_editor):
    """Späť na superadmina — návrat k stavu po 0070.

    Zámerne vracia práva všetkým staff loginom: rollback nesmie nikoho nechať
    bez prístupu.
    """
    UserProfile = apps.get_model("api", "UserProfile")
    UserProfile.objects.filter(role=ADMIN, user__is_staff=True).update(role=SUPERADMIN)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0072_section_permission"),
    ]

    operations = [
        migrations.RunPython(demote, restore),
    ]
