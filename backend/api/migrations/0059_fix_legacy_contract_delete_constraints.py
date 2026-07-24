from django.db import migrations

forward_sql = """
ALTER TABLE api_userprofile
    DROP CONSTRAINT api_userprofile_celok_id_8d42dfa6_fk_api_celok_id,
    ADD CONSTRAINT api_userprofile_celok_id_8d42dfa6_fk_api_celok_id
        FOREIGN KEY (celok_id) REFERENCES api_celok(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE api_userprofile_prevadzky
    DROP CONSTRAINT api_userprofile_prev_prevadzka_id_9103a9f6_fk_api_preva,
    ADD CONSTRAINT api_userprofile_prev_prevadzka_id_9103a9f6_fk_api_preva
        FOREIGN KEY (prevadzka_id) REFERENCES api_prevadzka(id)
        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    DROP CONSTRAINT api_userprofile_prev_userprofile_id_94dfae7f_fk_api_userp,
    ADD CONSTRAINT api_userprofile_prev_userprofile_id_94dfae7f_fk_api_userp
        FOREIGN KEY (userprofile_id) REFERENCES api_userprofile(id)
        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE api_clientsettings
    DROP CONSTRAINT api_clientsettings_user_id_070e3596_fk_auth_user_id,
    ADD CONSTRAINT api_clientsettings_user_id_070e3596_fk_auth_user_id
        FOREIGN KEY (user_id) REFERENCES auth_user(id)
        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE api_clientsettings_visible_diets
    DROP CONSTRAINT api_clientsettings_v_clientsettings_id_6ecbc8cc_fk_api_clien,
    ADD CONSTRAINT api_clientsettings_v_clientsettings_id_6ecbc8cc_fk_api_clien
        FOREIGN KEY (clientsettings_id) REFERENCES api_clientsettings(id)
        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    DROP CONSTRAINT api_clientsettings_v_diet_id_0e3eea9e_fk_api_diet_,
    ADD CONSTRAINT api_clientsettings_v_diet_id_0e3eea9e_fk_api_diet_
        FOREIGN KEY (diet_id) REFERENCES api_diet(id)
        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE api_edupageupload
    DROP CONSTRAINT api_edupageupload_connection_id_ea124bb2_fk_api_edupa,
    ADD CONSTRAINT api_edupageupload_connection_id_ea124bb2_fk_api_edupa
        FOREIGN KEY (connection_id) REFERENCES api_edupageconnection(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    DROP CONSTRAINT api_edupageupload_operation_id_bb3bbb1e_fk_api_userprofile_id,
    ADD CONSTRAINT api_edupageupload_operation_id_bb3bbb1e_fk_api_userprofile_id
        FOREIGN KEY (operation_id) REFERENCES api_userprofile(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    DROP CONSTRAINT api_edupageupload_uploaded_by_id_5f969d4f_fk_auth_user_id,
    ADD CONSTRAINT api_edupageupload_uploaded_by_id_5f969d4f_fk_auth_user_id
        FOREIGN KEY (uploaded_by_id) REFERENCES auth_user(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
"""


reverse_sql = forward_sql.replace("ON DELETE SET NULL", "ON DELETE NO ACTION").replace(
    "ON DELETE CASCADE", "ON DELETE NO ACTION"
)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0058_delete_edupageupload"),
    ]

    operations = [
        migrations.RunSQL(forward_sql, reverse_sql=reverse_sql),
    ]
