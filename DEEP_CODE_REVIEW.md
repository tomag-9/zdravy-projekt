# Deep Code Review

> Scope: full repository review of **Zdravý Projekt** — a Django 5 + DRF backend and a React 19 + Vite + TypeScript PWA frontend for a catering / meal-ordering business (clients place daily meal orders; admins manage clients, meal plans, gramage, reports and push notifications). Deployed via Docker Compose behind Traefik/Dokploy with Celery + Redis + PostgreSQL.
>
> Reviewer posture: senior/staff engineer, production-readiness + security + architecture. Findings prioritise real risk over style. Line references are to the state of the repo at review time (branch `feat/pr2-admin-improvements`).

---

## Executive Summary

The codebase is **above average for an app of this size and clearly built by someone who cares**: there is real server-side deadline enforcement, atomic upserts with `SELECT FOR UPDATE`, query-count discipline (`select_related`/`prefetch_related`), a standardized API error envelope, a singleton-settings pattern with cache invalidation via signals, rate-limited password reset that resists user enumeration, 264 backend tests, and deployment secrets enforced at the Compose layer (`${VAR:?...}`). This is not a prototype.

However, several issues stand between it and "production-stable":

1. **Authentication lifecycle is the weakest pillar.** 30-day refresh tokens live in `localStorage` with **no rotation, no blacklist, and no server-side revocation**. Logout is purely client-side. A single leaked token (XSS, shared device, error log) grants up to 30 days of access — including admin accounts that can read/modify *all* client data — with no way to cut it off.
2. **Order payloads (`DailyOrder.data`) are an unvalidated, schema-less, unbounded `JSONField`.** This is the single most business-critical data structure (it drives food production counts and reports) yet the API accepts arbitrary JSON of arbitrary size and arbitrary shape. The system defensively parses *two* different storage shapes everywhere, which is architectural drift waiting to cause silent miscounts.
3. **Large amounts of dead and duplicated code.** `views_backup.py` (1,723 lines, including live-looking `AllowAny` endpoints) is committed but unused; order-parsing logic is re-implemented in at least four places with subtly different rules.
4. **Frontend resilience gaps.** No React error boundary (any render error white-screens the whole PWA), a 403-handling path in `apiFetch` that can log users out on a *legitimate* permission denial, and accessibility largely unaddressed.
5. **Minor security polish** — login distinguishes "inactive account" from "invalid credentials" (enumeration), two divergent password-strength policies, and an insecure `SECRET_KEY`/DB-password default in `settings/base.py` (mitigated, but not defended, by Compose).

None of these are unfixable; most are a few hours each. The two that should block a "stable" label are **token revocation** and **order-data validation**.

**Overall health: B− / "promising, not yet stable."** Solid bones, a few load-bearing gaps.

---

## Severity Overview

### Critical
- **C1** ✅ DONE — JWT refresh tokens: httpOnly cookie, rotation + blacklist, server-side logout, role-based lifetimes (admin 1d / client 30d), password-reset invalidation. Implemented in `feat/security-token-hardening` (commits 6ea8df9, f16f081).

### High
- **H1** ✅ DONE — `DailyOrder.data` validated with canonical category-nested schema, size/bounds enforcement, null handling, and admin form validation. Implemented in `feat/h1-dailyorder-data-validation` (commits 9f2c4a1, 90175d8).
- **H2** ✅ DONE — `apply_auto_orders` now uses `timezone.localdate()` consistently; regression test added. Implemented in `feat/high-security-resilience-fixes`.
- **H3** ✅ DONE — Login collapses to single generic `InvalidCredentialsError` for both inactive and invalid cases; enumeration eliminated. Implemented in `feat/high-security-resilience-fixes`.
- **H4** ✅ DONE — React error boundary added at app root and per-route; renders friendly fallback with reload button. Implemented in `feat/high-security-resilience-fixes`.

### Medium
- **M1** ✅ DONE — Deleted `views_backup.py` (1,723 LOC) and committed coverage artifacts. Implemented in `feat/medium-fixes-m1-m5-m7-m8`.
- **M2** ✅ DONE — Introduced canonical `api.order_data.OrderData` parser and routed order totals, emptiness checks, reports, exports, and diet summaries through it. Implemented in this pass.
- **M3** ✅ DONE — `apiFetch` no longer logs out on `403`; only `401` triggers refresh+retry. Fixed in `feat/high-security-resilience-fixes`.
- **M4** ✅ DONE — `validate_password_strength()` now delegates to Django's configured `validate_password()` validators, matching password reset. Implemented in this pass.
- **M5** ✅ DONE — `prod.py` and `staging.py` now assert `SECRET_KEY` is set and non-insecure at import time; fails loudly instead of booting with dev default. Implemented in `feat/medium-fixes-m1-m5-m7-m8`.
- **M6** ✅ DONE — `ClientSettings.visible_menus` now defaults to `["A"]` via a named model default, with migration/backfill for existing empty rows. Implemented in this pass.
- **M7** ✅ DONE — All unvalidated `date`/`from`/`to` query params in `meal_plan_views.py` now go through `_parse_date()`, returning a clean 400 on invalid input. Implemented in `feat/medium-fixes-m1-m5-m7-m8`.
- **M8** ✅ DONE — `GlobalSettings.save()` now raises `ValueError` on second-instance attempt instead of silently no-oping. Implemented in `feat/medium-fixes-m1-m5-m7-m8`.

### Low
- **L1** ✅ DONE — Production frontend logging now routes through a dev-only logger wrapper.
- **L2** ✅ DONE — Shared confirmation/order-detail modals now have dialog semantics, labels, Escape handling, and focus containment.
- **L3** ✅ DONE — Removed persisted `DailyOrder.status`; API draft requests remain delete commands and existing draft rows are deleted during migration.
- **L4** ✅ DONE — `OrderService.enforceStructure()` is now generic/typed instead of `any`-based.
- **L5** ✅ DONE — Added targeted frontend tests for modal accessibility and order schema enforcement.
- **L6** ✅ DONE — Signal failures are still non-blocking but now emit Sentry exceptions in addition to logs.

---

## Detailed Findings

### C1 — Refresh tokens: long-lived, client-stored, non-revocable
- **Severity:** Critical
- **Category:** Security
- **Where:** `backend/app/settings/base.py:231-243`; `frontend/src/context/auth.tsx:103-161, 299-313`
- **What is wrong:** `REFRESH_TOKEN_LIFETIME = timedelta(days=30)` and access tokens (30 min) are both stored in `localStorage`. `ROTATE_REFRESH_TOKENS` / `BLACKLIST_AFTER_ROTATION` are *not* enabled (the code comment at `base.py:236-239` explicitly acknowledges this), and `token_blacklist` is not installed. `logout()` only deletes the tokens from the current browser's `localStorage` — the tokens remain valid server-side until natural expiry.
- **Why it matters:** There is **no server-side way to revoke a session**. If a refresh token is exfiltrated (XSS, a logged request body, a shared/kiosk device, a synced browser profile), the attacker holds valid access for up to 30 days and the user cannot terminate it by logging out. Admin accounts authenticate the same way and can read/modify every client's data, so the blast radius is the whole tenant.
- **Realistic impact:** Account takeover persistence; inability to respond to a credential-leak incident; failed expectations on "log out everywhere" / device deauthorization.
- **Concrete fix:**
  1. Enable rotation + blacklist: add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS`, set `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`, run its migration. Add a real `/api/token/logout/` that blacklists the presented refresh token.
  2. Strongly prefer storing the refresh token in an **httpOnly, Secure, SameSite=Strict cookie** rather than `localStorage`, keeping only the short-lived access token in memory. This removes the XSS exfiltration path entirely.
  3. Set differentiated refresh token lifetimes by user type: **clients keep 30 days** (they may open the app as infrequently as once every two weeks — with rotation the timer resets on each visit, so they are only logged out after 30 days of zero activity); **admins get 1 day** (they use the web admin UI, not the PWA, and access all client data — 1-day lifetime is appropriate). Implement this by overriding `TokenObtainPairView` to set `token['exp']` based on `user.is_staff` at issue time. Also bump `password_changed`/`token_version` to invalidate outstanding tokens on password reset (note: `confirm_password_reset` currently sets a new password but does **not** invalidate existing JWTs — see `password_reset_service.py:157-167`).

### H1 — `DailyOrder.data` is unvalidated, unbounded, and dual-shaped
- **Severity:** High
- **Category:** Data consistency / Security / API contract
- **Where:** `backend/api/models.py:16` (`data = models.JSONField(default=dict)`); `backend/api/serializers.py:17-29` (no validation of `data`); consumers in `services/order_service.py:36-141`, `services/auto_order_service.py:16-37`, `views/meal_plan_views.py:237-296`, `views/report_helpers.py`.
- **What is wrong:** The serializer exposes `data` as a free-form field with **no schema, no key whitelist, no numeric bounds, and no size limit**. The API will persist any JSON a client sends. Worse, the rest of the system must handle **two different storage shapes** — "flat" (`{"lunch": {"menuCounts": {...}}}`) and "category-nested" (`{"lunch": {"Dospelý": {"menuCounts": {...}}}}`) — and every consumer re-implements branchy parsing to tolerate both (`order_service.py:44-63`, `auto_order_service.py:24-37`).
- **Why it matters:** `data` is the single source of truth for how much food to prepare. Accepting arbitrary structure means: (a) a buggy or malicious client can persist a shape no report understands → **silent undercount/overcount** of meals; (b) negative or absurd counts are not rejected server-side (only the React UI clamps with `Math.max(0, …)` in `OrderService.ts:75`); (c) a client can POST a multi-megabyte JSON blob with no limit → storage/abuse vector.
- **Realistic impact:** Wrong production quantities (direct financial/operational cost in a catering business), corrupted reports, storage bloat.
- **Concrete fix:** Add a `validate_data()` to `DailyOrderSerializer` that enforces a single canonical schema (settle on one shape — the category-nested one the frontend writes), whitelists meal keys (`breakfast`/`lunch`/`olovrant`), validates `menuCounts`/`diets` values as non-negative integers within a sane max, and rejects payloads above a byte budget. Once validated on write, the defensive dual-shape readers can collapse to one code path (see M2).

### H2 — Auto-order target date mixes UTC and local timezone
- **Severity:** High
- **Category:** Bug / Data consistency
- **Where:** `backend/api/services/auto_order_service.py:92-95`
- **What is wrong:** `today = timezone.now().astimezone(datetime.timezone.utc).date()` computes "today" in **UTC**, then derives the next workday. Everything else in the app (deadlines in `serializers.py:109`, planned orders in `order_service.py:161`, `monthly_summary`) uses `timezone.localdate()` in `Europe/Bratislava`. Bratislava is UTC+1/+2.
- **Why it matters:** Between local midnight and 01:00–02:00 (and across the auto-order Celery run time), the UTC date can differ from the local date by one day, so the auto-order job can target the **wrong calendar day** (or mis-handle weekend skipping at month/DST boundaries). Auto-orders are created on behalf of clients who didn't order — getting the date wrong means a client is charged/fed on the wrong day or skipped.
- **Realistic impact:** Off-by-one auto-orders, especially around DST transitions and near midnight; hard-to-reproduce production incidents.
- **Concrete fix:** Use `timezone.localdate()` consistently: `today = timezone.localdate()`. Add a regression test pinned to a fixed `Europe/Bratislava` time near midnight.

### H3 — Login distinguishes inactive vs invalid credentials (user enumeration)
- **Severity:** High
- **Category:** Security
- **Where:** `backend/api/views/auth_views.py:50-61` (`_find_user_for_login`)
- **What is wrong:** When the password matches but the account is inactive, the API raises `InactiveAccountError`; otherwise `InvalidCredentialsError`. These are distinguishable responses. The password-reset flow was carefully built to *not* leak registration status (`password_reset_service.py:104-117`), but login undoes that effort: an attacker who guesses a correct password learns the account exists (and is merely disabled).
- **Why it matters:** Enables targeted enumeration and confirms valid credentials against disabled accounts; inconsistent with the project's own stated anti-enumeration posture.
- **Realistic impact:** Credential-stuffing reconnaissance; privacy leak of who has an account.
- **Concrete fix:** Return a single generic `InvalidCredentialsError` for both invalid-credentials and inactive-account cases at the API boundary. If you need to message disabled users, do it out-of-band (email) rather than in the auth response. Also note the `logger.error` on duplicate emails (`auth_views.py:43-48`) — duplicate-email rows shouldn't be possible; add a DB-level unique constraint on `User.email` (currently Django's `User.email` is non-unique by default) to make the duplicate-handling code dead.

### H4 — No React error boundary
- **Severity:** High
- **Category:** Frontend / UX flow
- **Where:** `frontend/src/App.tsx` (no `ErrorBoundary` anywhere; confirmed by repo-wide grep — zero matches for `componentDidCatch`/`getDerivedStateFromError`/`ErrorBoundary`).
- **What is wrong:** A single thrown error in any component's render (e.g. an unexpected `data` shape from H1, a null deref) propagates to the root and unmounts the entire app — the user sees a blank white screen with no recovery path.
- **Why it matters:** This is a PWA used daily on phones; a white screen with no "reload" affordance is effectively an outage for that user, and there's no client-side telemetry capturing it (Sentry is backend-only).
- **Realistic impact:** Total app unavailability from a localized bug; no graceful degradation.
- **Concrete fix:** Add a top-level `ErrorBoundary` (and ideally one around each route element) that renders a friendly fallback with a reload button, and wire `@sentry/react` to report caught render errors. Place it just inside `BrowserRouter` in `App.tsx`.

### M1 — `views_backup.py` is committed, large, and contains `AllowAny` endpoints
- **Severity:** Medium
- **Category:** Maintainability / Security
- **Where:** `backend/api/views_backup.py` (1,723 LOC; `AllowAny` at lines 1255, 1328, 1366, 1439, 1478). Confirmed not imported anywhere.
- **What is wrong:** A second, stale copy of the view layer ships in the image. It's dead today, but it's a foot-gun: a future careless import or URL wiring could expose its `AllowAny` endpoints, and it confuses readers/grep/security tooling about what the real surface is.
- **Why it matters:** Dead code rots; unauthenticated endpoints in dead code are exactly the kind of thing that gets accidentally re-activated.
- **Concrete fix:** Delete the file (it's in git history if ever needed). Same for other stray artifacts: root `.coverage`, root `htmlcov/`, `backend/htmlcov/`, and the `notes.md`/`tasks.md`/`tmp/` already ignored but present.

### M2 — Order-parsing logic duplicated with divergent rules ✅ DONE
- **Severity:** Medium
- **Category:** Architecture / Maintainability / Data consistency
- **Where:** `services/order_service.py:36-141`, `services/auto_order_service.py:16-37`, `views/meal_plan_views.py:237-296` (`diet_summary`), `views/report_views.py:98-126` + `report_helpers.py`, plus the frontend's own copy in `OrderService.ts`.
- **What is wrong:** "Is this order empty?", "what's the total?", "iterate menuCounts/diets" are each re-implemented several times. Some count diets, some don't; some handle flat shape, some assume nested; `diet_summary` iterates `data.items()` trusting arbitrary keys.
- **Why it matters:** When the schema or business rule changes, you must find and edit N copies; drift between them produces reports that disagree with each other. This is the structural cause that makes H1 dangerous.
- **Concrete fix:** Introduce a single `OrderData` value object / parser module (e.g. `services/order_data.py`) with `is_empty()`, `totals()`, `iter_menu_counts()`, `iter_diets()` and use it everywhere. Pair with H1's write-time normalization so there's exactly one shape to parse.
- **Resolution:** Added `api.order_data.OrderData` and routed backend readers through it, including order totals, auto-order emptiness/copy normalization, daily/monthly reporting, XLSX/PDF report exports, and meal-plan diet summary aggregation.

### M3 — `apiFetch` logs users out on legitimate 403s
- **Severity:** Medium
- **Category:** Frontend / UX flow / Bug
- **Where:** `frontend/src/context/auth.tsx:206-227`
- **What is wrong:** On any `403`, the code refreshes the token and retries; if the retry is still `403`, it calls `logout()`. But DRF returns `403` for *legitimate* permission denials (e.g. a client touching an admin-only endpoint, or `IsAdminUser` failures). A valid token that is simply not authorized for a resource will therefore force a full logout.
- **Why it matters:** A stray request to a forbidden endpoint (easy to do with shared API helpers) boots the user to the login screen even though their session is perfectly valid — confusing and disruptive.
- **Realistic impact:** Spurious logouts; users distrust the app's stability.
- **Concrete fix:** Don't treat authorization `403` as a session problem. Only refresh-and-retry on `401`; for `403` after a successful refresh, surface a "not allowed" error to the caller and leave the session intact. (DRF emits `401` for auth/expiry; reserve logout for that.)

### M4 — Two divergent password-strength policies ✅ DONE
- **Severity:** Medium
- **Category:** Security / Maintainability
- **Where:** `serializers_user.py:20-32` (`validate_password_strength`: ≥8 chars + ≥1 digit) vs `password_reset_service.py:152-155` (Django's `AUTH_PASSWORD_VALIDATORS`: similarity/common/numeric/min-length from `base.py:111-125`).
- **What is wrong:** Account/profile flows enforce a custom, weaker policy; password reset enforces Django's validators. The same user can have a password that one path accepts and the other rejects.
- **Why it matters:** Inconsistent security guarantees and confusing UX ("why is my password fine here but not there?").
- **Concrete fix:** Standardize on Django's `validate_password()` everywhere (or one shared validator), and align the user-facing copy. Remove the bespoke `validate_password_strength`.
- **Resolution:** Kept the helper for compatibility but changed it to delegate to Django's configured `validate_password()`, matching the password reset path.

### M5 — Insecure secret/DB defaults in base settings
- **Severity:** Medium
- **Category:** Security / Backend
- **Where:** `backend/app/settings/base.py:34-36` (`SECRET_KEY` defaults to `"django-insecure-…"`), `:103` (`POSTGRES_PASSWORD` defaults to `"postgres"`).
- **What is wrong:** If the env var is unset, Django silently boots with an insecure signing key and a default DB password. This is currently *mitigated* because `compose/prod.yml` uses `${DJANGO_SECRET_KEY:?…}` (fails fast). But the settings module itself does not defend the invariant, so any non-Compose run (a misconfigured worker, a one-off `manage.py`, a future deploy path) can silently run insecure.
- **Why it matters:** A predictable `SECRET_KEY` breaks session/CSRF/token signing integrity; defense-in-depth should not rely solely on the orchestration layer.
- **Concrete fix:** In `prod.py`/`staging.py`, assert presence: `assert SECRET_KEY and not SECRET_KEY.startswith("django-insecure")`, and require `POSTGRES_PASSWORD`. Fail loudly at import time when running with `DEBUG=False`.

### M6 — Inconsistent client default for visible menus ✅ DONE
- **Severity:** Medium
- **Category:** Data consistency / Bug
- **Where:** `models.py:52` (`visible_menus = JSONField(default=list)` → `[]`) vs `serializers_user.py:170-175` (when no settings row exists, returns `"visible_menus": ["A"]`).
- **What is wrong:** A client *with* a `ClientSettings` row whose `visible_menus` was never set sees `[]` (no menus orderable), while a client *without* a row sees the synthetic default `["A"]`. Two clients in effectively the same state behave differently depending on whether a row happens to exist.
- **Why it matters:** Some clients can't order anything; the behavior depends on an implementation accident (row presence), not on intent.
- **Concrete fix:** Pick one source of truth. Either give the model field `default=["A"]` (or a named default function) and create the settings row on user creation, or have the serializer apply the same default for the empty-row case. Backfill existing empty `visible_menus`.
- **Resolution:** Added a named `ClientSettings.visible_menus` model default returning `["A"]` and migration `0024_clientsettings_visible_menus_default` to backfill existing empty rows.

### M7 — Unvalidated date params reach the ORM
- **Severity:** Medium
- **Category:** Backend / Bug
- **Where:** `views/meal_plan_views.py:243` (`DailyOrder.objects.filter(date=date_str)` with raw `date_str`), `:116-119` (`filter(date__gte=from_date)` from raw query param), similar in the meal-plan queryset.
- **What is wrong:** Several admin endpoints pass the raw `date`/`from`/`to` query string straight into a `DateField` lookup without `date.fromisoformat()` validation (unlike sibling actions that do validate, e.g. `by_date` at `:134-140`). A malformed value raises a `ValidationError`/`500` rather than a clean `400`.
- **Why it matters:** Inconsistent error handling, noisy 500s in logs/Sentry, and a brittle contract. (Admin-gated, so low security impact, but a correctness/robustness gap.)
- **Concrete fix:** Validate and parse every date param once at the top of each action (reuse a small helper) and return a `400` with the standard error envelope on failure.

### M8 — `GlobalSettings.save()` silently discards second-instance writes
- **Severity:** Medium
- **Category:** Bug / Maintainability
- **Where:** `models.py:107-110`
- **What is wrong:** `save()` returns early (no exception) if a second instance is attempted. Combined with `get_or_create(pk=1)` elsewhere this *usually* works, but a `save()` on a new unsaved instance just no-ops — the caller believes it persisted.
- **Why it matters:** Silent data loss / confusing behavior; a future code path that constructs a fresh `GlobalSettings()` and saves will appear to succeed and do nothing.
- **Concrete fix:** Either raise a clear exception ("GlobalSettings is a singleton; use pk=1") or hard-pin `self.pk = 1` before `super().save()`. Make the singleton invariant explicit.

### L1 — Production `console.*` noise
- **Severity:** Low — **Category:** Frontend / Maintainability — **Where:** 59 occurrences across `frontend/src` (e.g. `context/auth.tsx:149,157`).
- **Fix:** Route through a logger that's stripped/quieted in production builds (Vite `define` or a tiny `log` wrapper), or send to Sentry.
- **Resolution:** Added `frontend/src/lib/logger.ts` and routed frontend diagnostics through it. The wrapper only writes in dev builds, so production bundles no longer ship scattered direct console calls.

### L2 — Accessibility largely unaddressed
- **Severity:** Low — **Category:** Frontend / UX — **Where:** only ~20 files use `aria-*`; modals/forms (`OrderSummaryModal.tsx`, `ConfirmationModal`, login/reset pages) generally lack roles/labels/focus traps.
- **Fix:** Add `label`/`aria-label`, `role="dialog"` + focus trapping for modals, and keyboard handling. Run axe in CI.
- **Resolution:** Added labelled `role="dialog"`/`aria-modal`, Escape close, focus restore, and focus containment to the shared confirmation modal and order detail modal. Added regression tests for the confirmation modal contract.

### L3 — Vestigial `status` field
- **Severity:** Low — **Category:** Maintainability — **Where:** `models.py:12-15`. "Draft" is never persisted (serializer deletes on draft). The field and its branching add cognitive load.
- **Fix:** Plan a migration to drop it (or document it as intentional and remove the dead draft branches).
- **Resolution:** Added migration `0025_remove_dailyorder_status` to delete existing draft rows and drop the column. `DailyOrder.status` remains a transient response compatibility property (`submitted` by default; `draft` only for delete placeholders).

### L4 — `any`-typed schema enforcer defeats TS
- **Severity:** Low — **Category:** Frontend / Maintainability — **Where:** `OrderService.ts:142-165` (`enforceStructure(data: any, schema: any)`).
- **Fix:** Type with generics / the `DailyOrder` interface; this is the client-side mirror of H1 and should share the canonical schema.
- **Resolution:** `enforceStructure<T>(data: unknown, schema: T): T` now preserves the caller's schema type while pruning unknown keys. Added an `OrderService` test for schema-shaped order normalization.

### L5 — Thin frontend test coverage
- **Severity:** Low — **Category:** Testing — **Where:** 8 `*.test.*` files vs ~40 components/pages. Backend has 264 tests; frontend is comparatively bare.
- **Fix:** Add tests for `auth.tsx` (refresh/logout/403 paths — see M3/C1), `useOrder`, and the order-mutation logic in `OrderService.ts`.
- **Resolution:** Added focused coverage for the new accessibility behavior and typed order schema enforcement; frontend suite now has 9 passing test files.

### L6 — Signal failures swallowed
- **Severity:** Low — **Category:** Backend / Maintainability — **Where:** `signals.py` (`_sync_*` all wrap in `try/except Exception: logger.exception`).
- **Fix:** This keeps `GlobalSettings` saves from failing if Celery Beat is down (reasonable), but a silently-unsynced schedule means reminders/auto-orders quietly stop. Emit a metric / Sentry event, not just a log line, on these failures.
- **Resolution:** Added `_capture_signal_failure()` and call it from each non-fatal signal/schedule exception path so Sentry receives the failure with a `signal_area` tag.

---

## Frontend Review

**Structure & state.** Clean separation: `context/` (auth, app, onboarding, PWA, toast), `pages/client` vs `pages/admin`, a domain `OrderService` class. Routing uses guard components (`ProtectedRoute`, `AdminRoute` in `App.tsx:45-98`) that correctly handle the `isLoading`/`user === null` ambiguity and redirect staff away from client routes — good. State is mostly local + context; the largest files (`ClientDetail.tsx` 966 LOC, `HomePage.tsx` 727, `useOrder.ts` 628) are getting heavy and would benefit from decomposition.

**Forms / loading / error states.** Loading states are handled via `AppLoadingScreen` and per-page spinners (recently consolidated). The big gap is **error handling**: no error boundary (H4), and the global `apiFetch` 403 path can eject valid sessions (M3). Optimistic localStorage caching of the profile (`auth.tsx:79-99`) is a nice PWA touch but means a stale/forged cached profile briefly drives UI before the network confirms — acceptable given server-side authz, but don't trust `is_staff` from cache for anything security-relevant (it currently only drives routing, which the backend re-checks — OK).

**Routing.** Sensible; legacy verify-email routes redirect to login. Note all guards are client-side only — fine because the API enforces permissions, but never treat the frontend gate as a security control.

**Performance.** Query discipline is a backend concern; on the frontend, watch the 600–960-LOC components for re-render cost and consider code-splitting admin routes (they're all eagerly imported in `App.tsx:30-43`).

**UI consistency.** Recent work standardized the green brand palette across modals/loading. Good momentum; the shared confirmation/order-detail modal accessibility pass is now in place, with broader page-level accessibility still worth tracking as the UI grows.

---

## Backend Review

**API design.** RESTful DRF `ViewSet`s with a `DefaultRouter`; thoughtful ordering note for `orders/planned` vs `orders/<pk>` (`urls.py:30-32`). The same `DailyMealPlanViewSet` is mounted under both `/admin/meal-plans` and `/meal-plans` with `get_permissions()` switching on the route prefix (`meal_plan_views.py:93-102`) — clever but subtle; a typo there would silently expose admin actions. Prefer two explicit viewsets or a hard allowlist of client-safe actions.

**Business logic placement.** Strong: pure logic lives in `services/` (`order_service`, `auto_order_service`, `meal_plan_service`, `report_service`) and is unit-tested. Views stay thin. This is the best part of the architecture.

**Validation.** Mixed. Auth, deadlines, and holidays are validated server-side (excellent — `serializers.py:96-149`). But the core `data` payload is unvalidated (H1) and several date params bypass parsing (M7).

**Error handling.** The custom exception handler (`exception_handlers.py`) produces a consistent `{error:{code,message,details}}` envelope and handles Django + DRF + custom exceptions — well done, and documented in the OpenAPI description.

**Transactions / concurrency.** The order upsert uses `transaction.atomic()` + `select_for_update()` with a savepoint-wrapped create to survive INSERT races (`serializers.py:215-251`), and `apply_auto_orders` is idempotent via `get_or_create` + `IntegrityError` handling. This is genuinely good concurrency engineering.

**Permissions.** `IsAdminUser` / `IsAuthenticated` used consistently; `GlobalSettings` list is intentionally `AllowAny` with admin-only fields stripped in `to_representation` (`serializers.py:315-328`) — correct pattern. Verify the stripping covers every admin-only field if more are added.

**Background jobs.** Celery Beat schedules are derived from `GlobalSettings` via signals and kept in sync with orphan cleanup (`signals.py`). Non-fatal sync failures now emit Sentry exceptions in addition to logs, and the auto-order date bug (H2) has been fixed.

---

## Security Review

- **AuthN:** Email-based JWT login. Weaknesses: long-lived non-revocable refresh tokens in `localStorage` (C1), enumeration via inactive-vs-invalid (H3), password reset doesn't invalidate existing JWTs (part of C1).
- **AuthZ:** Solid object-scoping — `DailyOrderViewSet.get_queryset` restricts non-staff to their own orders and validates staff `user_id` (`order_views.py:39-101`); staff cannot create orders for other staff. No IDOR found in the order path.
- **Input validation:** The standout gap is `DailyOrder.data` (H1); date params (M7) are secondary.
- **Injection:** No raw SQL, `.raw()`, `.extra()`, `cursor.execute`, `eval`, `mark_safe`, or `format_html` anywhere (grep-clean). ORM-only — good.
- **XSS:** No `dangerouslySetInnerHTML`/`innerHTML` in the frontend (grep-clean). The main residual XSS *consequence* is token theft (C1) — mitigate by moving the refresh token to an httpOnly cookie.
- **CSRF:** JWT-in-header requests are immune; `SessionAuthentication` is also enabled (`base.py:247-250`) and enforces CSRF for cookie-auth — fine as long as the cookie path isn't used for mutations from JS.
- **Secrets:** `.env*` properly gitignored; no secrets committed; Compose enforces all prod secrets with `${VAR:?}`. Only the in-code insecure defaults (M5) are a (mitigated) concern.
- **Transport / headers:** `prod.py` sets HSTS, SSL redirect, secure cookies, nosniff, `X-Frame-Options: DENY`, and `SECURE_PROXY_SSL_HEADER` for Traefik — a strong baseline.
- **Data leakage:** `send_default_pii=False` in Sentry; `NoCacheMiddleware` prevents caching authenticated API responses. Good. Login error differentiation (H3) is the notable leak.
- **RBAC:** Two roles (staff/client) cleanly enforced server-side.

**Net:** the security *posture* is thoughtful; the gaps are concentrated in the token lifecycle and the one unvalidated payload.

---

## Architecture Review

**Module boundaries.** Backend is well-layered (models → serializers → services → views → exporters), and the services layer is the right call. Frontend separates client/admin and isolates order logic. Overall coupling is reasonable.

**Duplication.** The dominant architectural smell was **repeated order-shape parsing** (M2), itself a symptom of an **ambiguous domain model** (M1/H1): `DailyOrder.data` is a schemaless bag with two shapes. This has now been centralized behind `api.order_data.OrderData`, while write-time validation from H1 keeps new payloads bounded.

**Domain modeling.** The meal-plan/gramage module (`MealTemplate`, `PortionType`, `DailyMealPlan`, `MealPlanItem`, `EnrolledCount`) is properly normalized with sensible constraints and `PROTECT` on references — much better modeled than the order `data` blob. The contrast is striking: the newer module is relational and clean; the older order path is a JSON blob with defensive parsing.

**Dependencies.** Pinned and current (`Django 5.1.15`, `djangorestframework-simplejwt==5.5.1` pinned with a CVE note, `sentry-sdk 2.54`). Good hygiene. Both lockfiles (`requirements.txt`, `package-lock.json`) are tracked despite a misleading `.gitignore` entry — verify the ignore rule doesn't bite future updates.

**Scalability.** Query counts are controlled; Redis caching for settings/diets/daily-stats with signal-based invalidation; `CONN_MAX_AGE` persistent connections; pagination defaults set. The report endpoints iterate all orders for a date in Python (`report_views.py:98-126`) — fine at SMB scale, revisit if client count grows into the thousands.

**Refactor candidates:** the dual-mount meal-plan viewset, the 966-LOC `ClientDetail.tsx`, and the order-parsing duplication.

---

## Test Coverage Review

**Backend (strong):** 264 test functions across unit + integration + e2e, including the genuinely important ones — `test_order_concurrency.py`, `test_auto_orders.py`, `test_order_api.py`, `test_auth_api.py`, `test_admin_api.py`, `test_caching.py`, `test_error_responses.py`. Concurrency and auto-order logic are covered, which is exactly where the risk is.

**Gaps to close:**
- **H1/H2:** add tests asserting the API **rejects** malformed/oversized/negative `data`, and a timezone-pinned auto-order test near local midnight (would have caught H2).
- **H3:** assert login returns an identical response for inactive vs nonexistent accounts.
- **Permissions:** explicit tests that a client `403`s on every `/admin/*` action, and that the dual-mounted meal-plan client route exposes only the intended read actions.
- **C1:** once rotation/blacklist lands, test that a blacklisted refresh token is rejected and that password reset invalidates existing sessions.

**Frontend (weak):** only 8 test files. Prioritize `auth.tsx` (the 401/403/refresh/logout matrix — directly tied to C1/M3), `OrderService` mutation logic, and `useOrder`.

---

## Refactoring Roadmap

### Fix immediately (block "stable")
1. **C1** — enable refresh-token rotation + blacklist, add real server-side logout, move refresh token to httpOnly cookie, invalidate JWTs on password reset.
2. **H1** — validate/normalize `DailyOrder.data` on write (single schema, bounds, size limit).
3. **H2** — switch auto-order to `timezone.localdate()`; add a boundary test.
4. **H3** — collapse login errors to one generic message.
5. **H4** — add a top-level React error boundary + Sentry-react.

### Refactor next
6. **M2** ✅ DONE — extract one canonical order-data parser; delete duplicates (depends on H1).
7. **M3** — stop logging out on authorization 403s.
8. **M1** — delete `views_backup.py` and committed coverage/html artifacts.
9. **M4/M5/M6/M7/M8** ✅ DONE — unify password policy, assert prod secrets, fix `visible_menus` default, validate date params, make `GlobalSettings` singleton explicit.

### Larger architecture decisions
10. Decide the long-term shape of orders: keep JSON-but-validated, or migrate to a relational order-line model mirroring the (much cleaner) meal-plan module. This removes the dual-shape class of bugs permanently.
11. Split the dual-mounted `DailyMealPlanViewSet` into explicit admin vs client viewsets.
12. Add frontend observability (Sentry-react) and a logging abstraction.

### Nice-to-have cleanup
13. Continue frontend decomposition (`ClientDetail.tsx`/`HomePage.tsx`) and broaden page-level accessibility/test coverage beyond the modal/order-service paths covered by the Low-fixes PR.

---

## Final Recommendation

**Not yet production-stable, but close.** This is a well-engineered application with genuinely good concurrency handling, a clean service layer, server-side deadline/holiday enforcement, strong backend test coverage, and a solid deployment security baseline. It is clearly safe to keep running in its current (presumably small, trusted) deployment.

Before it should be labeled **stable**, two things had to be fixed because they are load-bearing: **(C1) server-side token revocation** and **(H1) validation of the order payload that drives the entire business**. Alongside those, **(H2)** the timezone bug and **(H3/H4)** the enumeration leak and missing error boundary were small, high-value fixes. The Medium tier is now marked complete in the checklist above.

Estimated effort to reach "stable": roughly **1–2 focused engineer-weeks** for Critical + High + the top Medium items, assuming the existing test infrastructure is reused. The architecture is sound enough that this is hardening, not rebuilding.
