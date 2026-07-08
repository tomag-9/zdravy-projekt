# Real Workbook Fixtures

Week 28/2026 uses the accounting XLSX files as the source of truth for gram
splits and late count corrections.

Regenerate the local verification state from a dev DB with:

```bash
DJANGO_SETTINGS_MODULE=app.settings.dev \
POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_DB=zdravy_projekt_dev \
POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
backend/.venv/bin/python backend/manage.py import_real_gram_distributions \
test/data/real/6.7.2026_tabuľka_NOVÁ4.xlsx \
test/data/real/7.7.2026_tabuľka_NOVÁ4.xlsx \
test/data/real/8.7.2026_tabuľka_NOVÁ4.xlsx

DJANGO_SETTINGS_MODULE=app.settings.dev \
POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_DB=zdravy_projekt_dev \
POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
backend/.venv/bin/python backend/manage.py apply_order_count_corrections \
backend/api/fixtures/real_order_count_corrections_week_28_2026.json
```

Then write verifier CSVs for review:

```bash
for day in 06 07 08; do
  DJANGO_SETTINGS_MODULE=app.settings.dev \
  POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_DB=zdravy_projekt_dev \
  POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
  backend/.venv/bin/python backend/manage.py verify_real_gramage_workbook \
  --date=2026-07-$day \
  --workbook=test/data/real/${day#0}.7.2026_tabuľka_NOVÁ4.xlsx \
  --output-csv=test/data/output/verification_2026-07-$day.csv || true
done
```

`test/data/output/` is intentionally ignored; keep generated CSV/Markdown files
there for local review, and keep reusable correction inputs in this directory.
