---
name: compare-real
description: Compare the PRODUCTION app's meal-plan output against real ground-truth data. Pulls the prod gramage dashboard over SSH, reads test/data/real (daily reality per day) and test/data/jedalnicky (current-week menus), reconciles counts → sizes/diets → grams, and prints a fixed-format report. Trigger: /compare-real [YYYY-MM-DD]
trigger: /compare-real
---

# /compare-real

Reconcile what the **app produces in production** against the **real ground truth**
for a given day, and report whether they match and exactly where they differ.
The app side is **always production** — that is the only instance whose numbers the
kitchen actually cooks from. The local dev DB is a fallback for offline work, and a
comparison run against it says nothing about what the client received.

## Usage

```
/compare-real                 # compare today's date (prod)
/compare-real 2026-07-13      # compare a specific day
/compare-real 2026-W29        # no daily data for a day → verify the week's menu instead
/compare-real --local         # reconcile the local dev DB instead of prod
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

## The app side (production)

The app numbers come from `MealPlanService.gramage_dashboard(date)` — on **prod**, where
the orders and the meal plan already are, entered by the people running the kitchen.
Fetch that one read-only call over SSH:

```bash
.claude/skills/compare-real/fetch_prod_dashboard.sh 2026-08-14 > /tmp/prod_dash.json
```

The script SSHes to host `zp` (override with a second argument), finds the Dokploy
backend container, and prints the dashboard JSON. It writes nothing on the server —
never copy workbooks onto prod or run anything there that touches the DB.

**No prerequisites to satisfy on prod.** If `meal_plan_id` is `null` or a facility has
no orders, that *is* the finding — report it, don't fix it. Seeding or scraping into
production to make the numbers line up would be fabricating the thing under test.

### Prod meal plans have no dish names

Prod builds a day from generic gramage templates (`Polievka 1`, `Hlavný chod 10`) whose
components are labelled `Hlavná zložka` / `Príloha` / `Syr`. Nothing there matches the
`Hárok1` header, so `reconcile_real` falls back to aligning columns on **base gramage**:
the workbook's `KLASIK` legend row states one portion of every dish (200 / 90 / 110 / 10
/ … / 75), which is exactly what the app carries as `base_grams`. Both sides list the
day's dishes in serving order, so the alignment is their longest common subsequence.
The report says which strategy ran (`"column_alignment": "dish-name" | "base-gramage"`);
`base-gramage` is normal for prod, and `dish-name` for a hand-entered local plan.

Two consequences worth stating in the report:
- **Raňajky are never comparable.** `Hárok1` has no breakfast columns (they live in the
  separate `_rano` morning table), so `breakfast` is dropped from Tier 1 and listed under
  `meal_types_skipped` — not compared against a fake 0.
- A day where two dishes share a gramage still aligns correctly *because order is
  preserved*; a genuinely ambiguous day would show up as a wrong dish label in Tier 2,
  so sanity-check the first Tier-2 row against row 1 of the workbook before believing a
  long diff list.

## Local dev DB (`--local`, fallback only)

Only for offline work — the result describes your laptop, not what the client got. This
path needs the day's **orders + meal plan** in the local DB.

**Orders.** If all facilities land in `app_only`/`real_only`, orders weren't scraped —
scrape EduPage for that date first, then re-run:

```bash
docker exec compose-db-1 true            # confirm the dev DB container is up
# in backend/ venv, pointed at the docker DB:
POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost python manage.py scrape_edupage_orders --date <YYYY-MM-DD>
```

The local dev DB is `zdravy_projekt_dev` on `localhost:5432` (Django default name is
`zdravy_projekt_db`, so **always pass `POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost`**).

**Meal plan.** If `meal_plan_id` comes back `null`, there's no `DailyMealPlan` for that
date yet — nobody has entered the day's menu. Seed it **from the current week's
jedálniček PDF in `test/data/jedalnicky/`, never from the `real/` workbook.**

- **Do not use `import_real_gram_distributions`** for this. That command exists for a
  different purpose (backfilling historical gram data from the accounting workbook) and
  reads its numbers from the same `Hárok1` sheet the reconciliation is trying to verify —
  seeding the app side from the real side makes the comparison circular and would hide a
  genuine app bug (e.g. a wrong portion-weight config) behind an artificially perfect
  match.
- Instead, find the ISO week (`date.isocalendar()`), locate that diet's PDF —
  `Week <NN>[_]<YYYY>_Klasik.pdf` (exclude the `_AJ` English variant) — and extract it:
  ```bash
  pdftotext -layout "test/data/jedalnicky/Week 31_2026_Klasik.pdf" -
  ```
- Find the target weekday block (`PONDELOK`/`UTOROK`/`STREDA`/`ŠTVRTOK`/`PIATOK`). Its
  `Obed:` line gives the soup (`200ml <name>`) and the next line gives the main course as
  `<total>g (<a>g/<b>g/<c>g) <name A>, <name B>, <name C>`; `Olovrant:` gives the snack,
  either a single `<n>g <name>` or a split like `<n>g (<a>g/<b>g) <name A>, <name B>`.
- The PDF's dish names are descriptive (`Morčacie na smotane s hráškom 7, batátová kaša,
  paprikový šalát`); **Tier-2 matching in `reconcile_real` is exact-string** (ASCII-folded)
  against the `Hárok1` header row, which uses the bare dish noun (`Morčacie na smotane`).
  Strip the trailing qualifier/allergen digits down to that bare form when typing the
  component label — same curation a human operator does when entering the menu in the
  app. If unsure of the exact short form, cross-check row 1 of that day's `real/` workbook
  (read-only, for naming — never for the gram values) rather than guessing.
- Create one `MealTemplate` + `MealPlanItem` per category (`soup`, `main_course`,
  `afternoon_snack`) for the `DailyMealPlan`, each `components` entry as
  `{"label": <bare dish name>, "grams": <str>, "unit": "g"|"ml"}`. `base_weight_grams`
  and `weight_label` come from `_base_weight_grams_from_components`/
  `_weight_label_from_components` in `api/serializers_menu.py` — don't hand-compute them.
  Diet variants and `breakfast_snack` are out of scope unless the day's facilities
  actually order them.

## How to run — day comparison (has a `real/` workbook)

```bash
# 1. the day's real workbook must be in test/data/real (D.M.YYYY_*.xlsx)
# 2. pull prod's numbers for that day
.claude/skills/compare-real/fetch_prod_dashboard.sh 2026-08-14 > /tmp/prod_dash.json
# 3. reconcile (the venv is only needed to run manage.py; no local DB is touched)
cd backend && source .venv/bin/activate
python manage.py reconcile_real --date 2026-08-14 \
  --dashboard /tmp/prod_dash.json \
  --alias-map ../.claude/skills/compare-real/facility_aliases.json
```

Drop `--dashboard` (and add `POSTGRES_DB=zdravy_projekt_dev POSTGRES_HOST=localhost`) to
reconcile the local dev DB instead — the `--local` fallback.

The command auto-resolves the workbook by date, then emits a JSON report on **stdout**
and a one-line summary on **stderr**, which names the app source and the column-alignment
strategy. It runs two tiers:

1. **Tier 1 — counts, PER MEAL TYPE.** App per-facility counts vs the `Hárok1` count
   lines, compared **like-for-like by meal type** (`lunch`, `snack` = olovrant;
   `breakfast` only if the workbook ever grows a column for it). This
   matters: a facility that only orders obed must **not** be faulted against the app's
   lunch+olovrant grand total. Which Hárok1 column is lunch and which is olovrant is
   derived from the app's own `col_groups` through the alignment above, because the
   dishes change daily.
   A `snack` bucket that is genuinely absent means the facility did not order olovrant
   that day — **not** "billed separately". `"olovrant samostatne"` is a literal text note
   in Hárok1 (e.g. Jolly 3), and facilities that do serve olovrant carry it either in the
   pečivo/nátierka columns of their main row (Filipa Nériho) or in an own `OLOVRANT`
   sub-block (Krásnanko). Both are read.
2. **Tier 2 — gramage.** App per-component grams vs the `Hárok1` grams, per facility.
   Only mismatches (and `MISSING_REAL_ROW`) are listed. Columns come from the same
   alignment — dish name where the app has names, base gramage on prod — never from
   position: the workbook's column order differs from the app and has a blank spacer.
   Each facility's grams are the sum
   of its whole **block** (KLASIK header row + diet sub-rows, until the next facility,
   detected by the address line beneath a header). Residual Tier-2 diffs after this are
   usually count-driven (they track a Tier-1 count gap), missing menu-column matches, or
   unresolved facility mapping — not column/aggregation bugs.

Flags: `--dashboard <path>` (app side from a prod dump instead of the DB), `--alias-map
<path>` (facility name dictionary, below), `--workbook <path>` (override auto-resolve),
`--count-tolerance N` (default 0), `--gram-tolerance N` (default 0.01).

**Data-freshness caveat:** prod holds the orders as they stand *now*, so reconciling a
**past** date compares current orders against that day's real workbook and will diverge.
Trust recent dates; for older ones, expect count drift. (Same caveat, different cause, on
the local path: `scrape_edupage_orders` also pulls current EduPage state.)

**The count line is not a per-meal count.** `count × base gramage == row grams` is the
self-check; where it fails, the count line describes the obed headcount and the olovrant
cell is the truth (14.8.: Cvernička count 15 vs 900 g = 12 olovrantov, Felix 9 vs 600 g
= 8). Tier 1 reads count lines, so **before calling an olovrant diff an app bug, check it
against the grams** — Felix's `snack` FAIL that day was the workbook contradicting
itself, and the app was right.

### Name mapping
The app uses EduPage labels (`MŠ Krásnanko`, `Jolly Homeschool – Jolly 1`,
`Škôlka MS – Les`); the workbook uses bare `Zariadenie` names (`krasnanko`, `jolly 1`,
`skolicka les`). The curated dictionary **`facility_aliases.json`** (in this skill dir)
maps them; pass it with `--alias-map`. Matching is ASCII-folded/punctuation-stripped.
A facility still landing in both `app_only` and `real_only` is an unresolved mapping —
**resolve the spelling and add it to `facility_aliases.json`, don't invent a match.** Add
only confident pairings; leave ambiguous ones out and list them as unresolved in the
report (e.g. `SZŠ FAN` — no clear real counterpart). `Zdravé Brúsko` is no longer
an alias for `deutsche schule`; the app should label the split row as `Deutsche schule`
directly.

`Deutsche schule` has a special service rule: even if EduPage contains breakfast/snack
rows for it, the app should ignore those meals. Expected reconciliation is
`breakfast=0`, `snack=0`, and lunch compared normally.

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
# Reconciliation — <date> (<workbook or "week NN — menu only">, <prod | local dev DB>)

## Verdict
<PASS | FAIL>  —  <matched> facilities, obed exact <n>, olovrant exact <n>,
gram diffs <n>, unmatched <app_only>+<real_only>.  Raňajky: neporovnateľné.

## Tier 1 — Counts per meal type (only facilities that differ)
| Facility | Obed app | real | Δ | Olovrant app | real | Δ |
|----------|---------:|-----:|--:|-------------:|-----:|--:|
| …        | 21 | 21 | 0 | 9 | 12 | −3 |
Exact on both meals: <list>
Unmatched — app only: <list or none>
Unmatched — real only: <count + the ones that are app-managed clients>

## Tier 2 — Gramage (only differences shown)
| Facility | Component | App | Real | Diff |
|----------|-----------|----:|-----:|-----:|
| …        | Obed / Hlavné jedlo | 185.0 | 185.0 | 0 |
Missing real rows: <facilities with MISSING_REAL_ROW, or none>

## Notes
- <count-line vs gram self-check failures — which side is actually wrong>
- <name-mapping gaps resolved / still open>
- <closed facilities (0 orders) — expected during holidays>
- <configuration gaps: facility with orders in reality but nothing in the app>
```

Rules for filling it in:
- **Verdict is PASS** only when every **lunch (OBED)** row is OK (within tolerance), and
  every `snack` FAIL and unmatched entry is explained (workbook self-check failure,
  facility closed, or a resolved name mapping). Lunch drift → **FAIL**.
- A prod day covers ~50 facilities, so Tier 1 lists **only rows that differ**, plus the
  names that matched exactly. Show Tier 2 **only** rows that differ.
- Never hand-edit numbers — take them straight from the command's JSON.
- Separate **count drift** (client odhlášky after the scrape; the gram diff tracks the
  count diff exactly) from **structural gaps** (a facility whose olovrant is 0 in the app
  every meal, a facility missing entirely). Only the second kind is actionable.
- If `meal_plan_id` is `null` on prod, that is the headline finding — nobody entered the
  day's menu — not a prerequisite for you to go and fix.
