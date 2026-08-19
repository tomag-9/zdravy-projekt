"""
Migrácie rolí na dátach, aké sú v produkcii (#482, #483).

Nasadenie rolí je jednorazová operácia nad ostrými dátami — keď zle prejde,
niekto stratí prístup a systém nemá kto obsluhovať. Preto sa tu migračné
funkcie volajú priamo nad reprezentatívnou vzorkou stavov, ktoré prod naozaj
obsahuje: superuser bez profilu, staff bez profilu, klient s profilom aj
neaktívny login.

Funkcie berú `apps` a používajú `apps.get_model`, takže im dá poslať skutočný
register — testuje sa tým presne tá logika, ktorá pobeží pri deployi.

Pozor na jeden rozdiel: skutočná migrácia dostane historický register, kde sa
NEspúšťajú signály. Vlastnosti, ktoré od toho závisia (napr. že dozaložený
profil neprinesie celok), sa preto overujú cez `MigrationExecutor`
v `test_role_migration_executor.py`, nie tu.
"""

from __future__ import annotations

import pytest
from django.apps import apps as real_apps
from django.contrib.auth.models import User

from api import roles

pytestmark = pytest.mark.django_db


def _load(name):
    import importlib

    return importlib.import_module(f"api.migrations.{name}")


backfill_mod = _load("0073_backfill_user_roles")
demote_mod = _load("0076_demote_admins_to_admin_role")
overrides_mod = _load("0078_section_overrides_on_profile")


def _mk(email, *, staff=False, superuser=False, active=True, profile=True):
    """Login v takom stave, v akom sa reálne vyskytuje v produkčnej DB."""
    user = User.objects.create_user(
        username=email,
        email=email,
        password="x",
        is_staff=staff,
        is_superuser=superuser,
        is_active=active,
    )
    if profile:
        from api.models import UserProfile

        p = UserProfile(user=user)
        p._skip_default_facility = True
        p.save()
    return user


class TestBackfill:
    """0073 — nikto nesmie prísť o prístup."""

    def test_superuser_becomes_superadmin(self):
        user = _mk("su@x.sk", staff=True, superuser=True, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        user.refresh_from_db()
        assert roles.role_of(user) == roles.SUPERADMIN

    def test_plain_staff_becomes_admin(self):
        user = _mk("st@x.sk", staff=True, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        assert roles.role_of(User.objects.get(pk=user.pk)) == roles.ADMIN

    def test_client_stays_client(self):
        user = _mk("kl@x.sk")
        backfill_mod.backfill_roles(real_apps, None)
        assert roles.role_of(User.objects.get(pk=user.pk)) == roles.KLIENT

    def test_missing_profiles_are_created(self):
        """Prod má loginy bez profilu — bez neho by nemali kde mať rolu."""
        _mk("bez@x.sk", staff=True, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        assert User.objects.get(email="bez@x.sk").profile is not None

    def test_inactive_login_is_handled_too(self):
        _mk("off@x.sk", staff=True, active=False, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        assert roles.role_of(User.objects.get(email="off@x.sk")) == roles.ADMIN

    def test_running_twice_changes_nothing(self):
        """Deploy sa môže zopakovať; migrácia musí byť idempotentná."""
        _mk("idem@x.sk", staff=True, superuser=True, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        first = User.objects.get(email="idem@x.sk").profile.role
        backfill_mod.backfill_roles(real_apps, None)
        assert User.objects.get(email="idem@x.sk").profile.role == first

    def test_nobody_ends_up_without_access(self):
        """Súhrnná poistka: žiadny staff login nesmie po backfille byť klient."""
        for i in range(3):
            _mk(f"s{i}@x.sk", staff=True, superuser=i == 0, profile=i == 2)
        backfill_mod.backfill_roles(real_apps, None)
        for user in User.objects.filter(is_staff=True):
            assert roles.role_of(user) in roles.STAFF_ROLES, user.email


class TestDemotion:
    """0076 — degradácia sa smie dotknúť len tých, ktorých má."""

    def _prepare(self):
        _mk("zp_dev@tomag.xyz", staff=True, superuser=True, profile=False)
        _mk("iny@spravca.sk", staff=True, superuser=True, profile=False)
        _mk("klient@x.sk")
        backfill_mod.backfill_roles(real_apps, None)

    def test_named_login_keeps_superadmin(self):
        self._prepare()
        demote_mod.demote(real_apps, None)
        assert roles.role_of(User.objects.get(email="zp_dev@tomag.xyz")) == (
            roles.SUPERADMIN
        )

    def test_other_admins_are_demoted(self):
        self._prepare()
        demote_mod.demote(real_apps, None)
        assert roles.role_of(User.objects.get(email="iny@spravca.sk")) == roles.ADMIN

    def test_demoted_admin_keeps_admin_access(self):
        """Degradácia nesmie zhodiť až na klienta — stále musí spravovať systém."""
        self._prepare()
        demote_mod.demote(real_apps, None)
        user = User.objects.get(email="iny@spravca.sk")
        assert roles.is_admin_or_above(user)

    def test_clients_are_untouched(self):
        self._prepare()
        demote_mod.demote(real_apps, None)
        assert roles.role_of(User.objects.get(email="klient@x.sk")) == roles.KLIENT

    def test_nobody_is_promoted(self):
        self._prepare()
        demote_mod.demote(real_apps, None)
        assert not User.objects.filter(
            profile__role=roles.SUPERADMIN, is_staff=False
        ).exists()

    def test_rollback_gives_access_back(self):
        """Návrat nesmie nikoho nechať bez prístupu."""
        self._prepare()
        demote_mod.demote(real_apps, None)
        demote_mod.restore(real_apps, None)
        for email in ("zp_dev@tomag.xyz", "iny@spravca.sk"):
            assert roles.role_of(User.objects.get(email=email)) == roles.SUPERADMIN

    def test_running_twice_changes_nothing(self):
        self._prepare()
        demote_mod.demote(real_apps, None)
        snapshot = dict(User.objects.values_list("email", "profile__role"))
        demote_mod.demote(real_apps, None)
        assert dict(User.objects.values_list("email", "profile__role")) == snapshot

    def test_environment_without_those_emails_is_a_noop(self):
        """Dev a staging tie loginy nemajú — migrácia tam nesmie nič pokaziť."""
        _mk("dev@lokal.sk", staff=True, superuser=True, profile=False)
        backfill_mod.backfill_roles(real_apps, None)
        demote_mod.demote(real_apps, None)
        # Jediný staff login je degradovaný na admina, nie zmazaný ani zhodený.
        assert roles.role_of(User.objects.get(email="dev@lokal.sk")) == roles.ADMIN


class TestMigrationsUseHistoricalModels:
    """
    Migrácie sa musia držať `apps.get_model`, nie importu z `api.models`.

    Historický model nespúšťa signály. Keby niekto migráciu „opravil" priamym
    importom, `on_user_profile_saved` by pri každom dozaloženom profile založil
    celok s prevádzkou — a systém by adminom začal generovať auto-objednávky.
    Toto je lacná poistka proti presne tej zmene; správanie samo je overené
    nasadením celého reťazca na dev databázu s produkčným seedom.
    """

    MIGRATIONS = [
        "0072_userprofile_role",
        "0073_backfill_user_roles",
        "0076_demote_admins_to_admin_role",
        "0078_section_overrides_on_profile",
    ]

    @pytest.mark.parametrize("name", MIGRATIONS)
    def test_no_direct_model_import(self, name):
        import inspect

        source = inspect.getsource(_load(name))
        assert "from api.models import" not in source, name
        assert "from ..models import" not in source, name

    @pytest.mark.parametrize(
        "name", ["0073_backfill_user_roles", "0076_demote_admins_to_admin_role"]
    )
    def test_data_migrations_read_models_from_apps(self, name):
        import inspect

        source = inspect.getsource(_load(name))
        assert "apps.get_model" in source, name

    @pytest.mark.parametrize("name", MIGRATIONS)
    def test_data_migrations_are_reversible(self, name):
        """Bez spätného chodu niet cesty naspäť, keď sa niečo pokazí."""
        module = _load(name)
        for operation in module.Migration.operations:
            if operation.__class__.__name__ == "RunPython":
                assert operation.reverse_code is not None, name
