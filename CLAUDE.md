# CLAUDE.md — zdravy-projekt (Zdravé Brúsko)

Django (backend) + React/TS (frontend)
Slovenský systém objednávania školských jedál.

## Doménový model
- **Celok** (fakturačná jednotka) → **Prevádzka** (výdajné miesto, 1:N) → **Login** (UserProfile).
- Objednávky sa vedú **per prevádzka** (`DailyOrder.prevadzka` je NOT NULL). `DailyOrder.save()`
  prevádzku auto-doplní z profilu, keď je jednoznačná (celok s jednou prevádzkou).
- Nastavenia objednávok (`visible_menus`, `visible_meals`, `visible_diets`, `admin_order_note`)
  žijú na **Prevádzke**. Fakturačné a **EduPage** údaje (identifikátor + mealsGuest URL) na **Celku**.
- Zdravé Brúško = 5 samostatných celkov zdieľajúcich jedno EduPage URL (scrape grupuje podľa URL,
  aby sa nezdvojil; rozdelenie po školách cez `edupage_match` prefix).

## Príkazy
- **Backend testy:** `docker compose -f compose/dev.yml exec -T backend python -m pytest --no-cov -q`
  Bez cesty! `pytest.ini` má dve testpaths (`tests`, `api/tests`) — spustenie len nad
  `api/tests` prehliadne legacy vetvu (stalo sa v PR #501).
- **Backend lint ako v CI:** `black --check .`, `isort --check-only .`,
  `mypy api --ignore-missing-imports` — spúšťaj z `backend/`. Pre-commit hook kontroluje
  len staged súbory, CI celý adresár; verzie v `.pre-commit-config.yaml` musia sedieť
  s `backend/requirements.txt`, inak hook prejde a CI padne.
- **Django check:** `docker compose -f compose/dev.yml exec -T backend python manage.py check`
- **Frontend:** `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run`

## Seedy
Bežia idempotentne v dvoch cestách v **rovnakom poradí**: prod `deploy_bootstrap.py`,
dev inline reťaz v `compose/dev.yml`
(migrate → real_initial_seed_prevadzky → seed_prevadzky_edupage → seed_zdrave_brusko →
seed_real_delivery_layout → seed_merge_celky → sync_periodic_tasks).

## Pravidlá
- **Commit / PR** len na výslovné vyžiadanie. Pred commitom zelený suite.
- Ďalšie pravidla v CLAUDE-LOCAL.md prečítaj si to.
