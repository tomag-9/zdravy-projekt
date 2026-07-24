# Facility model contract

Facility data has one owner per concern:

| Concern | Canonical model |
| --- | --- |
| Login identity and onboarding | `UserProfile` |
| Billing identity and order source | `Celok` |
| Delivery point and order visibility | `Prevadzka` |
| EduPage URL and external identifier | `EdupageConnection` |
| Whole-facility login access | `ProfileCelokAccess` |
| Single-operation login access | `ProfilePrevadzkaAccess` |
| Order history | `DailyOrder` |

## Invariants

- A profile uses either whole-`Celok` access or specific-`Prevadzka` access.
  Mixed scope is invalid and is reported by `audit_model_consistency`.
- `Celok.zdroj_objednavok` decides whether orders come from the app or EduPage.
- Every active EduPage `Prevadzka` has an `EdupageConnection`; app prevadzky do not.
- Billing fields live only on `Celok`.
- Visibility, diets, packing, and order notes live only on `Prevadzka`.
- `DailyOrder` belongs to a `Prevadzka`. Deleting its login preserves history;
  deleting its facility is protected.

Run `python manage.py audit_model_consistency --fail-on-issues` after data imports
or facility restructuring.
