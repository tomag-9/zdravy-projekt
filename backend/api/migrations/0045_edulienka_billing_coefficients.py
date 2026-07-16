from django.db import migrations

# Predškolák je gramážovo zhodný so `ZŠ 1.stupeň` (250 g) — v EduPage zdieľajú
# `porcia=1`. Oddelený PortionType existuje kvôli fakturácii: Edulienka účtuje
# predškoláka ako 1,25 porcie, prvostupniara ako 1.
PORTION_TYPES = [
    ("Jasle", "0.7500", 1),
    ("Škôlka", "1.0000", 2),
    ("Predškolák", "1.2500", 3),
    ("ZŠ 1.stupeň", "1.2500", 4),
    ("ZŠ 2.stupeň", "1.5000", 5),
    ("Dospelý (SŠ)", "2.0000", 6),
]

EDULIENKA_COEFFICIENTS = {"Predškolák": "1.25"}


def sync_portion_types(apps, schema_editor):
    PortionType = apps.get_model("api", "PortionType")
    for name, coefficient, sort_order in PORTION_TYPES:
        PortionType.objects.update_or_create(
            name=name,
            defaults={"coefficient": coefficient, "sort_order": sort_order},
        )


def set_edulienka_coefficients(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    Prevadzka.objects.filter(celok__nazov__icontains="Edulienka").update(
        billing_portion_coefficients=EDULIENKA_COEFFICIENTS
    )


def unset_edulienka_coefficients(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    Prevadzka.objects.filter(celok__nazov__icontains="Edulienka").update(
        billing_portion_coefficients={}
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0044_prevadzka_billing_portion_coefficients"),
    ]

    operations = [
        migrations.RunPython(sync_portion_types, migrations.RunPython.noop),
        migrations.RunPython(set_edulienka_coefficients, unset_edulienka_coefficients),
    ]
