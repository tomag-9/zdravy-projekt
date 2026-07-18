# CLAUDE.md — zdravy-projekt (Zdravé Brúsko)

Django (backend) + React/TS (frontend), beží cez `docker compose -f compose/dev.yml`.
Slovenský systém objednávania školských jedál.

> Pracovný režim **Claude = mozog / Codex = robotník** je v globálnom `~/.claude/CLAUDE.md`
> (platí, keď je Codex funkčný). Tu sú len projektové špecifiká.

## Doménový model
- **Celok** (fakturačná jednotka) → **Prevádzka** (výdajné miesto, 1:N) → **Login** (UserProfile).
- Objednávky sa vedú **per prevádzka** (`DailyOrder.prevadzka` je NOT NULL). `DailyOrder.save()`
  prevádzku auto-doplní z profilu, keď je jednoznačná (celok s jednou prevádzkou).
- Nastavenia objednávok (`visible_menus`, `visible_meals`, `visible_diets`, `admin_order_note`)
  žijú na **Prevádzke**. Fakturačné a **EduPage** údaje (identifikátor + mealsGuest URL) na **Celku**.
- Zdravé Brúško = 5 samostatných celkov zdieľajúcich jedno EduPage URL (scrape grupuje podľa URL,
  aby sa nezdvojil; rozdelenie po školách cez `edupage_match` prefix).

## Príkazy
- **Backend testy:** `docker compose -f compose/dev.yml exec -T backend python -m pytest <path> --no-cov -q`
- **Django check:** `docker compose -f compose/dev.yml exec -T backend python manage.py check`
- **Frontend:** `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run`

## Seedy
Bežia idempotentne v dvoch cestách v **rovnakom poradí**: prod `deploy_bootstrap.py`,
dev inline reťaz v `compose/dev.yml`
(migrate → real_initial_seed_prevadzky → seed_prevadzky_edupage → seed_zdrave_brusko →
seed_real_delivery_layout → seed_merge_celky → sync_periodic_tasks).

## Pravidlá
- **Commit / PR** len na výslovné vyžiadanie. Pred commitom zelený suite.
- Test-fixtures pre objednávky: klient potrebuje `UserProfile` (signál mu dá celok + default
  prevádzku), inak `DailyOrder` padne na NOT NULL. Viac objednávok pre rovnaký deň/používateľa
  alebo staff bez profilu → vytvor explicitný `Celok`+`Prevadzka` a odovzdaj `prevadzka=`.
