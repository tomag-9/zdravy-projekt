# Generated manually — follow-up to 0095.

from django.db import migrations


def _table_exists(schema_editor, table_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass(%s)", [f"public.{table_name}"])
        (existing,) = cursor.fetchone()
        return bool(existing)


def drop_old_visible_diets_table(apps, schema_editor):
    """0095 converted `visible_diets` from an implicit M2M to an explicit
    `PrevadzkaDiet` through model and copied the data across, but left the
    old auto-generated table (`api_prevadzka_visible_diets`) in place —
    Django no longer manages it, yet Postgres still enforces its FK to
    `api_prevadzka(id)`. That orphaned constraint then blocks deleting any
    Prevádzka that ever had a diet assigned (`ForeignKeyViolation`), which
    broke `seed_merge_celky`'s retirement of old prevádzky and crashed the
    backend container on startup. Drop it now that 0095 has verified data
    lives in `api_prevadzkadiet`.
    """
    if schema_editor.connection.vendor != "postgresql":
        return
    if not _table_exists(schema_editor, "api_prevadzka_visible_diets"):
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP TABLE api_prevadzka_visible_diets")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0095_prevadzkadiet_alter_prevadzka_visible_diets_and_more"),
    ]

    operations = [
        migrations.RunPython(drop_old_visible_diets_table, migrations.RunPython.noop),
    ]
