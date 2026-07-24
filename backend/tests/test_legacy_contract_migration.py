import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.migration
@pytest.mark.django_db(transaction=True)
def test_contract_migration_preserves_latest_legacy_facility_data():
    migrate_from = [("api", "0056_explicit_profile_access")]
    migrate_to = [("api", "0058_delete_edupageupload")]
    executor = MigrationExecutor(connection)

    try:
        executor.migrate(migrate_from)
        old_apps = executor.loader.project_state(migrate_from).apps
        User = old_apps.get_model("auth", "User")
        Celok = old_apps.get_model("api", "Celok")
        ClientSettings = old_apps.get_model("api", "ClientSettings")
        Diet = old_apps.get_model("api", "Diet")
        EdupageUpload = old_apps.get_model("api", "EdupageUpload")
        Prevadzka = old_apps.get_model("api", "Prevadzka")
        UserProfile = old_apps.get_model("api", "UserProfile")

        user = User.objects.create(username="legacy", email="legacy@example.com")
        celok = Celok.objects.create(
            nazov="Legacy celok",
            billing_name="Stale billing",
            ico="STALE",
            dic="STALE",
        )
        prevadzka = Prevadzka.objects.create(
            celok=celok,
            nazov="Legacy prevadzka",
            visible_menus=["A"],
            visible_meals=["lunch"],
            admin_order_note="Stale note",
        )
        profile = UserProfile.objects.create(
            user=user,
            company_name="Legacy login",
            billing_name="Fresh billing",
            ico="12345678",
            dic="2020123456",
            celok=celok,
        )
        profile.prevadzky.add(prevadzka)
        diet = Diet.objects.create(name="Legacy diet")
        settings = ClientSettings.objects.create(
            user=user,
            visible_menus=["B", "V"],
            visible_meals=["breakfast", "olovrant"],
            admin_order_note="Fresh note",
        )
        settings.visible_diets.add(diet)
        EdupageUpload.objects.create(
            date="2026-07-24",
            filename="legacy.xlsx",
            file="edupage_uploads/legacy.xlsx",
            uploaded_by=user,
        )

        executor = MigrationExecutor(connection)
        executor.migrate(migrate_to)
        new_apps = executor.loader.project_state(migrate_to).apps
        migrated_celok = new_apps.get_model("api", "Celok").objects.get(pk=celok.pk)
        migrated_prevadzka = new_apps.get_model("api", "Prevadzka").objects.get(
            pk=prevadzka.pk
        )
        migrated_user = new_apps.get_model("auth", "User").objects.create(
            username="post-contract",
            email="post-contract@example.com",
        )
        migrated_profile = new_apps.get_model("api", "UserProfile").objects.create(
            user=migrated_user,
            company_name="Post-contract login",
        )
        post_contract_celok = new_apps.get_model("api", "Celok").objects.create(
            nazov="Post-contract celok",
        )

        assert migrated_celok.billing_name == "Fresh billing"
        assert migrated_celok.ico == "12345678"
        assert migrated_celok.dic == "2020123456"
        assert migrated_prevadzka.visible_menus == ["B", "V"]
        assert migrated_prevadzka.visible_meals == ["breakfast", "olovrant"]
        assert migrated_prevadzka.admin_order_note == "Fresh note"
        assert list(
            migrated_prevadzka.visible_diets.values_list("name", flat=True)
        ) == ["Legacy diet"]
        assert migrated_profile.pk is not None
        assert post_contract_celok.pk is not None
        with pytest.raises(LookupError):
            new_apps.get_model("api", "EdupageUpload")

        table_names = connection.introspection.table_names()
        assert "api_clientsettings" in table_names
        assert "api_edupageupload" in table_names

        with connection.cursor() as cursor:
            profile_columns = {
                column.name
                for column in connection.introspection.get_table_description(
                    cursor,
                    "api_userprofile",
                )
            }
            celok_columns = {
                column.name
                for column in connection.introspection.get_table_description(
                    cursor,
                    "api_celok",
                )
            }
            upload_columns = {
                column.name
                for column in connection.introspection.get_table_description(
                    cursor,
                    "api_edupageupload",
                )
            }
            cursor.execute(
                """
                SELECT api_identifier, billing_name, dic, ico, is_edupage,
                       mealsguest_url
                FROM api_userprofile
                WHERE id = %s
                """,
                [migrated_profile.pk],
            )
            profile_legacy_values = cursor.fetchone()
            cursor.execute(
                """
                SELECT edupage_api_identifier, mealsguest_url
                FROM api_celok
                WHERE id = %s
                """,
                [post_contract_celok.pk],
            )
            celok_legacy_values = cursor.fetchone()

        assert {
            "api_identifier",
            "billing_name",
            "celok_id",
            "dic",
            "ico",
            "is_edupage",
            "mealsguest_url",
        } <= profile_columns
        assert {"edupage_api_identifier", "mealsguest_url"} <= celok_columns
        assert "operation_id" in upload_columns
        assert profile_legacy_values == ("", "", "", "", False, "")
        assert celok_legacy_values == ("", "")
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        cleanup_sql = """
            DROP TABLE IF EXISTS api_edupageupload CASCADE;
            DROP TABLE IF EXISTS api_clientsettings_visible_diets CASCADE;
            DROP TABLE IF EXISTS api_clientsettings CASCADE;
            DROP TABLE IF EXISTS api_userprofile_prevadzky CASCADE;
        """
        with connection.cursor() as cursor:
            cursor.execute(cleanup_sql)
