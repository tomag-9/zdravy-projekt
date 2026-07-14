---
name: compare-real
description: Compare the app's meal-plan output against real ground-truth data. Reads test/data/real (daily reality per day) and test/data/jedalnicky (current-week menus), reconciles counts → sizes/diets → grams, and prints a fixed-format report. Trigger: /compare-real [YYYY-MM-DD]
trigger: /compare-real
---

# /compare-real

Reconcile what the **app produces** against the **real ground truth** for a given
day, and report whether they match and exactly where they differ.

## Usage

```
/compare-real                 # compare today's date
/compare-real 2026-07-13      # compare a specific day
/compare-real 2026-W29        # no daily data for a day → verify the week's menu instead
```

## The two data sources

- **`test/data/real/`** — reality **per day**. Files named `D.M.YYYY_tabuľka_NOVÁ4.xlsx`
  (non-zero-padded day/month, e.g. `9.7.2026_...`). Two sheets:
  - **`vyúčtovanie`** — billing sheet. Column `Zariadenie` (facility) + `Druh pokrmu`
    (meal kind) + **`Počet pokrmov` (col 4) = the ground truth for portion COUNTS.**
    This is the count authority — never use Hárok1 numbers as counts.
  - **`Hárok1`** — the per-portion-type **gramage** table. Row 1 = menu (soup, main,
    snack…); rows below give grams per portion type (KLASIK / JASLE / 1.STUPEŇ /
    2.STUPEŇ / DOSPELÁ) and per diet. Column A = label, columns B+ = component grams.
- **`test/data/jedalnicky/`** — the **current-week menus** as PDFs, one per diet:
  `Week <NN>_<YYYY>_<Diet>.pdf` (Klasik, Vege, NoMilk, NoGluten, NoNoNo, Učiteľ,
  Histamin, MenuB, Benjamin, Monte…). Each PDF lists, per weekday, every meal with
  its grams, e.g. `210g (185g/25g) Zemiakový prívarok …`. Use these when there is **no
  daily `real/` workbook** for the requested day (verify the menu/gram recipe only).

## Prerequisites (app side)

The app numbers come from `MealPlanService.gramage_dashboard(date)`, which needs the
day's **orders + meal plan** in the local DB. If `meal_plan_id` comes back `null` or all
facilities land in `app_only`/`real_only`, the day was not scraped/seeded yet — scrape
EduPage for that date first, then re-run:

```bash
docker exec compose-db-1 true            # confirm the dev DB container is up
# in backend/ venv, pointed at the docker DB:
POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost python manage.py scrape_edupage_orders --date <YYYY-MM-DD>
```

The local dev DB is `zdravy_projekt_dev` on `localhost:5432` (Django default name is
`zdravy_projekt_db`, so **always pass `POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost`**).

## How to run — day comparison (has a `real/` workbook)

```bash
cd backend && source .venv/bin/activate
POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost \
  python manage.py reconcile_real --date 2026-07-13 \
    --alias-map ../.claude/skills/compare-real/facility_aliases.json
```

The command auto-resolves the workbook by date, then emits a JSON report on **stdout**
and a one-line summary on **stderr**. It runs two tiers:

1. **Tier 1 — counts, PER MEAL TYPE.** App per-facility counts vs the `vyúčtovanie`
   `Počet pokrmov`, compared **like-for-like by meal type** (`lunch` ↔ OBED,
   `snack` ↔ OLOVRANT, `breakfast` ↔ RAŇAJKY/DESIATA). This matters: a facility that
   only bills OBED must **not** be faulted against the app's lunch+olovrant grand total.
   **OBED (lunch) is the reliable signal** — it ties out across facilities. OLOVRANT
   often reads `real=0` because many providers bill olovrant separately ("olovrant
   samostatne"), not in this sheet — call that out as a billing-scope note, not an app bug.
2. **Tier 2 — gramage.** App per-component grams vs the `Hárok1` grams, per facility.
   Only mismatches (and `MISSING_REAL_ROW`) are listed. Component-order can differ between
   the app col_groups and the workbook columns, so treat single-component swaps skeptically.

Flags: `--alias-map <path>` (facility name dictionary, below), `--workbook <path>`
(override auto-resolve), `--count-tolerance N` (default 0), `--gram-tolerance N`
(default 0.01).

**Data-freshness caveat:** `scrape_edupage_orders` pulls the *current* EduPage state, so
reconciling a **past** date compares today's orders against that day's real workbook and
will diverge. Trust recent dates; for older ones, expect count drift.

### Name mapping
The app uses EduPage labels (`MŠ Krásnanko`, `Jolly Homeschool – Jolly 1`,
`Škôlka MS – Les`); the workbook uses bare `Zariadenie` names (`krasnanko`, `jolly 1`,
`skolicka les`). The curated dictionary **`facility_aliases.json`** (in this skill dir)
maps them; pass it with `--alias-map`. Matching is ASCII-folded/punctuation-stripped.
A facility still landing in both `app_only` and `real_only` is an unresolved mapping —
**resolve the spelling and add it to `facility_aliases.json`, don't invent a match.** Add
only confident pairings; leave ambiguous ones out and list them as unresolved in the
report (e.g. `SZŠ FAN` — no clear real counterpart; `Zdravé Bruško ↔ deutsche schule`
was confirmed via count match).

## How to run — week comparison (no daily `real/` workbook)

When there is no `real/` file for the day, verify the **menu recipe** against the week's
jedálniček PDFs instead (counts can't be checked — there's no reality file):

```bash
pdftotext -layout "test/data/jedalnicky/Week 29_2026_Klasik.pdf" -   # → grams per meal per weekday
```

Compare the app's meal-plan template grams for that day against the `(<total>g (<a>g/<b>g) …`
figures in the PDF for the matching diet. Report only the gram tier.

## Report format (always output exactly this)

```
# Reconciliation — <date> (<workbook or "week NN — menu only">)

## Verdict
<PASS | FAIL>  —  counts OK <n>/<matched>, gram diffs <n>, unmatched <n>

## Tier 1 — Counts per meal type
| Facility | Meal | App | Real | Diff | Status |
|----------|------|----:|-----:|-----:|--------|
| …        | lunch | 21 | 21 |  0 | OK   |
| …        | snack |  9 |  0 | +9 | FAIL (olovrant billed separately) |
Unmatched — app only: <list or none>
Unmatched — real only: <count — these are facilities with no EduPage orders today>

## Tier 2 — Gramage (only differences shown)
| Facility | Component | App | Real | Diff |
|----------|-----------|----:|-----:|-----:|
| …        | Obed / Hlavné jedlo | 185.0 | 185.0 | 0 |
Missing real rows: <facilities with MISSING_REAL_ROW, or none>

## Notes
- <name-mapping gaps resolved / still open>
- <closed facilities (0 orders) — expected during holidays>
- <any prerequisite that was missing, e.g. day not scraped>
```

Rules for filling it in:
- **Verdict is PASS** only when every **lunch (OBED)** row is OK (within tolerance), and
  every `snack`/`breakfast` FAIL and unmatched entry is explained (olovrant billed
  separately, facility closed, or a resolved name mapping). Lunch drift → **FAIL**.
- Show Tier 1 fully (all matched facilities). Show Tier 2 **only** rows that differ.
- Never hand-edit numbers — take them straight from the command's JSON.
- If `meal_plan_id` is `null`, stop and report the missing-scrape prerequisite instead
  of a false FAIL.
```
