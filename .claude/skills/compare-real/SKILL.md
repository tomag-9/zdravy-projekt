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
  (non-zero-padded day/month, e.g. `9.7.2026_...`). Two sheets, but only one is data:
  - **`Hárok1`** — **the authority for BOTH counts and grams.** The only sheet the
    client actually sees and maintains. Layout:
    - Row 1 = the day's dishes (soup, main, …, pečivo, nátierka). Order changes daily.
    - Rows 2–6 = base gramage per portion type (KLASIK 200 / JASLE 150 / 1.STUPEŇ 250 /
      2.STUPEŇ 300 / DOSPELÁ 400).
    - Then one block per facility: a **gram row** (col A = label, cols B+ = grams), an
      optional address line, then a **count line** (col A = headcount), followed by
      diet rows in the same gram-row / count-line pairs.
    - A row serves whichever meals its non-zero columns belong to — one count can be a
      lunch *and* an olovrant. Facilities with differing counts get an own `OLOVRANT`
      sub-block, whose row is empty in the lunch columns.
    - Self-checking: `count × base gramage == row grams` holds for every block. If it
      doesn't, the workbook is wrong — say so rather than reporting an app diff.
  - **`vyúčtovanie`** — **NOT a data source. Never read counts from it.** It is
    `veryHidden` (the client cannot even see it), every count cell is just a
    `=Hárok1!A856` reference, and some have rotted to `#REF!` — silently dropping real
    portions. It also copies olovrant from obed and omits olovrant for facilities that
    do serve it. Every phantom diff we chased (Krásnanko "+1", Filipa Nériho "no
    olovrant", Rozmanitá) came from trusting it.
- **`test/data/jedalnicky/`** — the **current-week menus** as PDFs, one per diet:
  `Week <NN>_<YYYY>_<Diet>.pdf` (Klasik, Vege, NoMilk, NoGluten, NoNoNo, Učiteľ,
  Histamin, MenuB, Benjamin, Monte…). Each PDF lists, per weekday, every meal with
  its grams, e.g. `210g (185g/25g) Zemiakový prívarok …`. Use these when there is **no
  daily `real/` workbook** for the requested day (verify the menu/gram recipe only).

## Accepted file formats

Reconciliation reads only the **`.xlsx`** form (the `Hárok1` sheet).
All daily workbooks share one identical layout — there is no format variant to special-case.
Apple **`.numbers`** exports can't be parsed reliably (current files are written by a Numbers
version no Python decoder handles, and LibreOffice won't import them) and the `_rano.pdf`
files are a separate desiata/gramage table, so `reconcile_real` **does not** parse either.
If a day arrives only as `.numbers`/`.pdf`, the command stops with an actionable message —
export it in Numbers via **File → Export To → Excel**, drop the `.xlsx` into `test/data/real`,
and re-run.

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

1. **Tier 1 — counts, PER MEAL TYPE.** App per-facility counts vs the `Hárok1` count
   lines, compared **like-for-like by meal type** (`lunch`, `snack`, `breakfast`). This
   matters: a facility that only orders obed must **not** be faulted against the app's
   lunch+olovrant grand total. Which Hárok1 column is lunch and which is olovrant is
   derived from the app's own `col_groups` (matched by dish name), because the dishes
   change daily.
   A `snack` bucket that is genuinely absent means the facility did not order olovrant
   that day — **not** "billed separately". `"olovrant samostatne"` is a literal text note
   in Hárok1 (e.g. Jolly 3), and facilities that do serve olovrant carry it either in the
   pečivo/nátierka columns of their main row (Filipa Nériho) or in an own `OLOVRANT`
   sub-block (Krásnanko). Both are read.
2. **Tier 2 — gramage.** App per-component grams vs the `Hárok1` grams, per facility.
   Only mismatches (and `MISSING_REAL_ROW`) are listed. Columns are matched **by dish
   name** (Hárok1 header row 1) — the workbook's column order differs from the app and
   has a blank spacer, so positional reads are wrong. Each facility's grams are the sum
   of its whole **block** (KLASIK header row + diet sub-rows, until the next facility,
   detected by the address line beneath a header). Residual Tier-2 diffs after this are
   count-driven (they track a Tier-1 count gap) or olovrant billed separately (real=0),
   not column/aggregation bugs.

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
