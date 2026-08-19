from django.db import migrations, models


def to_profile(apps, schema_editor):
    """Prenesie overridy z vlastnej tabuľky na profil."""
    SectionPermission = apps.get_model("api", "SectionPermission")
    UserProfile = apps.get_model("api", "UserProfile")

    by_profile: dict[int, dict[str, str]] = {}
    for permission in SectionPermission.objects.all().iterator():
        by_profile.setdefault(permission.profile_id, {})[
            permission.section
        ] = permission.level

    for profile_id, overrides in by_profile.items():
        UserProfile.objects.filter(pk=profile_id).update(section_overrides=overrides)


def to_table(apps, schema_editor):
    SectionPermission = apps.get_model("api", "SectionPermission")
    UserProfile = apps.get_model("api", "UserProfile")

    for profile in UserProfile.objects.exclude(section_overrides={}).iterator():
        for section, level in (profile.section_overrides or {}).items():
            SectionPermission.objects.update_or_create(
                profile_id=profile.pk, section=section, defaults={"level": level}
            )


class Migration(migrations.Migration):
    """Overridy sekcií presúva z tabuľky na profil (#484).

    Mapa má pár položiek a číta sa pri každom requeste, kým sa mení zriedka.
    Vo vlastnej tabuľke stála jeden dotaz navyše na každé volanie API; na
    profile príde spolu s ním, lebo ten už načítava `ProfileAwareJWTAuthentication`.
    """

    dependencies = [
        ("api", "0077_prevadzkaclosure"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="section_overrides",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Granulárne oprávnenia per sekcia (#484) ako {sekcia: úroveň}. "
                    'Chýbajúci kľúč znamená „podľa role", nie „bez prístupu". Býva to '
                    "pár položiek a číta sa pri každom requeste, preto sedí na profile "
                    "a nie vo vlastnej tabuľke — príde spolu s ním jedným dotazom."
                ),
            ),
        ),
        migrations.RunPython(to_profile, to_table),
        migrations.AlterUniqueTogether(
            name="sectionpermission",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="sectionpermission",
            name="profile",
        ),
        migrations.DeleteModel(
            name="SectionPermission",
        ),
    ]
