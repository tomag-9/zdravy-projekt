# Architektura a dolezite flows

Tato sekcia popisuje, ako spolu komunikuju hlavne casti aplikacie Zdravy Projekt. Je pisana ako orientacna mapa pre vyvoj: kde hladat logiku, kadial tecu data, co je synchronne, co bezia Celery tasky a ktore moduly maju na seba najvacsi dopad.

## Rychly mentalny model

Aplikacia je full-stack system pre objednavanie jedal, spravu klientov, jedalnickov, gramaze, reportov a notifikacii.

- Frontend je React/Vite PWA s oddelenou klientskou a adminskou vetvou.
- Backend je Django + Django REST Framework API.
- PostgreSQL je zdroj pravdy pre pouzivatelov, objednavky, nastavenia, jedalnicky, sviatky a push subscriptions.
- Redis sluzi ako Celery broker/cache a na docasne ulozenie vygenerovanych report suborov.
- Celery worker spracovava reporty, auto-objednavky, denne email reporty a push notifikacie.
- Celery Beat planuje ulohy podla `GlobalSettings`; schedule sa synchronizuje cez Django signals.

## Systemovy diagram

```mermaid
flowchart LR
    Client[Klient / Admin v prehliadaci] -->|React Router| Frontend[React PWA<br/>frontend/src]
    Frontend -->|JWT Bearer API calls| API[Django REST API<br/>backend/api/views]
    Frontend -->|Service worker| SW[public/sw.js]
    SW -->|Web Push event| Client

    API -->|ORM| DB[(PostgreSQL)]
    API -->|cache / task result bytes| Redis[(Redis)]
    API -->|enqueue async work| Celery[Celery worker]
    Beat[Celery Beat<br/>django-celery-beat] -->|scheduled tasks| Celery
    Celery -->|ORM| DB
    Celery -->|cache generated files| Redis
    Celery -->|SMTP| Mail[SMTP / Mailhog in dev]
    Celery -->|VAPID Web Push| PushProvider[Browser push service]
    PushProvider --> Client

    API -->|health / metrics hooks| Observability[Observability<br/>Alloy/Sentry/Prometheus]
```

## Runtime a deployment komponenty

```mermaid
flowchart TB
    subgraph DockerCompose[compose/dev.yml]
        FrontendDev[frontend<br/>npm run dev<br/>:3000]
        Backend[backend<br/>Django runserver<br/>:8000]
        DB[(db<br/>postgres:15)]
        Redis[(redis:7)]
        Worker[celery worker]
        Beat[celery-beat<br/>DatabaseScheduler]
        Mailhog[mailhog<br/>SMTP :1026<br/>UI :8026]
    end

    FrontendDev --> Backend
    Backend --> DB
    Backend --> Redis
    Worker --> DB
    Worker --> Redis
    Worker --> Mailhog
    Beat --> Redis
    Beat --> DB
```

V staging/production compose stackoch frontend/backend bezia ako kontajnery za reverse proxy vrstvou. Development stack navyse seeduje data a inicializuje role pri starte backendu.

## Hlavne moduly

```mermaid
flowchart LR
    subgraph FE[Frontend]
        App[App.tsx<br/>routing + providers]
        Auth[context/auth.tsx<br/>JWT, refresh, apiFetch]
        ClientUI[pages/client<br/>objednavky, profil, menu]
        AdminUI[pages/admin<br/>klienti, jedalnicky, reporty, nastavenia]
        PWA[PWAContext + service worker<br/>install/update/push]
    end

    subgraph API[Backend API]
        Urls[api/urls.py<br/>router + endpointy]
        Views[api/views/*<br/>HTTP boundary]
        Serializers[serializers*.py<br/>validation + shape]
        Services[api/services/*<br/>business logic]
        Tasks[api/tasks.py<br/>async jobs]
        Signals[api/signals.py<br/>schedule/cache sync]
        Exporters[api/exporters/*<br/>PDF/XLSX]
        Models[api/models.py<br/>domain model]
    end

    App --> Auth
    App --> ClientUI
    App --> AdminUI
    App --> PWA
    Auth -->|apiFetch| Urls
    ClientUI -->|orders, profile, meal-plans, holidays| Urls
    AdminUI -->|admin endpoints| Urls
    Urls --> Views
    Views --> Serializers
    Views --> Services
    Services --> Models
    Views --> Exporters
    Views --> Tasks
    Tasks --> Services
    Tasks --> Exporters
    Signals --> Tasks
    Signals --> Models
```

Prakticke pravidlo: HTTP detaily patria do `api/views/*`, tvar dat a validacia do serializerov, domenova logika do `api/services/*`, asynchronna praca do `api/tasks.py`.

## API mapa

| Oblast | Frontend pouziva | Backend endpoint / view | Hlavna logika |
| --- | --- | --- | --- |
| Login a refresh | `LoginPage`, `AuthProvider` | `POST /api/token/`, `POST /api/token/refresh/` | `auth_views.EmailTokenObtainPairSerializer`, SimpleJWT |
| Profil klienta | `AuthProvider.fetchUserProfile`, `ProfilePage` | `/api/user/profile/` | `UserProfileViewSet`, `UserProfileSerializer` |
| Objednavky | `useOrder`, `OrderPage` | `/api/orders/`, `/api/orders/by-date/{date}/` | `DailyOrderViewSet`, `DailyOrderSerializer` |
| Planovane objednavky | `HomePage` / klientsky prehlad | `/api/orders/planned/` | `OrderService.get_planned_orders` |
| Mesacny suhrn | klientsky dashboard | `/api/orders/planned/monthly-summary/` | `OrderService.monthly_summary` |
| Admin klienti | admin UI | `/api/admin/users/` | `AdminUserViewSet`, user/settings/profile modely |
| System settings | `SystemSettings`, klientsky deadline read | `/api/admin/global-settings/` | `GlobalSettingsViewSet`, cache, signals |
| Jedalnicky | `MealPlanCalendar`, `MealPlanEditor`, `MenuPage` | `/api/admin/meal-plans/`, `/api/meal-plans/` | `DailyMealPlanViewSet`, `MealPlanService` |
| Template jedal | admin UI | `/api/admin/meal-templates/` | `MealTemplateViewSet` |
| Typy porcii | klient aj admin | `/api/admin/portion-types/` | `PortionTypeViewSet` |
| Sviatky | klient aj admin | `/api/holidays/`, `/api/admin/holidays/` | `HolidayListViewSet`, `AdminHolidayViewSet` |
| Reporty | admin dashboard | `/api/admin/summary/*` | `AdminSummaryViewSet`, `ReportService`, exporters |
| Async reporty | admin report task UI | `/api/admin/report-tasks/` | `ReportTaskViewSet`, Celery tasks |
| Auto orders | admin manual trigger + Beat | `/api/admin/trigger-auto-orders/` | `apply_auto_orders` |
| Push | PWA + admin UI | `/api/push/*`, `/api/admin/push/send/` | `PushNotificationService`, Celery reminders |

## Domenovy model

```mermaid
erDiagram
    User ||--|| UserProfile : has
    User ||--|| ClientSettings : has
    User ||--o{ DailyOrder : places
    User ||--o{ DailyMealPlan : creates
    User ||--o{ PushSubscription : owns

    ClientSettings }o--o{ Diet : visible_diets
    Diet ||--o{ MealTemplate : tags

    DailyMealPlan ||--o{ MealPlanItem : contains
    DailyMealPlan ||--o{ EnrolledCount : has
    MealTemplate ||--o{ MealPlanItem : selected_as
    PortionType ||--o{ EnrolledCount : counted_as

    DailyOrder {
        int id
        int user_id
        date date
        string status
        json data
        bool is_auto
        datetime created_at
        datetime updated_at
    }

    UserProfile {
        int user_id
        string company_name
        string client_type
        string api_identifier
        bool onboarding_completed
    }

    ClientSettings {
        int user_id
        json visible_menus
        json visible_meals
        text admin_order_note
    }

    GlobalSettings {
        time deadline_breakfast
        time deadline_lunch
        time deadline_olovrant
        bool deadline_breakfast_is_day_before
        bool deadline_lunch_is_day_before
        bool deadline_olovrant_is_day_before
        json report_email_recipients
    }

    MealTemplate {
        string category
        string name
        decimal base_weight_grams
        string menu_variant
        bool is_active
    }

    PortionType {
        string name
        decimal coefficient
        int sort_order
        bool is_active
    }

    DailyMealPlan {
        date date
        text notes
        int created_by_id
    }

    MealPlanItem {
        int meal_plan_id
        int template_id
        string category
        string menu_variant
    }

    EnrolledCount {
        int meal_plan_id
        int portion_type_id
        int count
    }

    Holiday {
        date date
        string reason
    }

    PushSubscription {
        int user_id
        text endpoint
        text p256dh
        text auth
    }
```

### Dolezite datove tvary

`DailyOrder.data` je JSON a podporuje dve historicke tvary:

- flat: `{"lunch": {"menuCounts": {"A": 5}}}`
- nested by portion category: `{"lunch": {"Dospely": {"menuCounts": {"A": 5}, "diets": {...}}}}`

Backendove agregacie v `OrderService`, `ReportService` a `auto_order_service` s tym pocitaju. Pri novom kode je vhodne drzat nested tvar, pretoze frontend pracuje cez kategorie/typy porcii.

`DailyOrder` ma `unique_together = ["user", "date"]`. Serializer/API preto funguje ako submit alebo replace objednavky pre jeden den. `is_auto=True` oznacuje objednavku vytvorenu po deadline z poslednej ne-prazdnej objednavky.

## Flow: autentifikacia a nacitanie profilu

```mermaid
sequenceDiagram
    actor User
    participant FE as LoginPage/AuthProvider
    participant API as /api/token/
    participant JWT as SimpleJWT serializer
    participant Profile as /api/user/profile/
    participant DB as PostgreSQL

    User->>FE: zada email + heslo
    FE->>API: POST email/password
    API->>JWT: EmailTokenObtainPairSerializer.validate
    JWT->>DB: najdi aktivneho usera podla emailu
    DB-->>JWT: User
    JWT-->>API: access + refresh token
    API-->>FE: JWT tokeny
    FE->>FE: ulozi tokeny do localStorage
    FE->>Profile: GET /api/user/profile/ s Bearer tokenom
    Profile->>DB: User + UserProfile + ClientSettings
    DB-->>Profile: profil a nastavenia
    Profile-->>FE: user payload
    FE->>FE: cache profilu + route guard
```

`AuthProvider.apiFetch` pridava Bearer token, synchronizuje offset serveroveho casu z HTTP `Date` headera a pri `401/403` sa pokusi refreshnut access token.

## Flow: klient vytvori objednavku

```mermaid
sequenceDiagram
    actor Client
    participant UI as OrderPage/useOrder
    participant Local as localStorage
    participant API as DailyOrderViewSet
    participant Ser as DailyOrderSerializer
    participant DB as DailyOrder

    Client->>UI: vyberie datum a jedla
    UI->>API: GET /api/orders/by-date/{date}/
    API->>DB: order pre usera a datum
    alt objednavka existuje
        DB-->>API: DailyOrder
        API-->>UI: server data
        UI->>Local: ulozi server-authoritative stav
    else neexistuje
        API-->>UI: {"data": {}}
        UI->>Local: pouzije lokalny draft alebo prazdny tvar
    end

    Client->>UI: upravi pocty menu/diet
    UI->>Local: draft `order_YYYY-MM-DD`
    Client->>UI: submit
    UI->>API: POST /api/orders/ {date, status, data}
    API->>Ser: validacia + create/update
    Ser->>DB: update_or_create by user+date
    DB-->>Ser: DailyOrder
    API-->>UI: ulozena objednavka
    UI->>Local: status submitted
```

Dolezite pravidla:

- Drafty sa neautosavuju na backend; preziju refresh v `localStorage`.
- Server je autorita po nacitani existujucej objednavky.
- Frontend kontroluje deadline cez `OrderService.checkDeadline` s casom korigovanym podla servera.
- Backend pri `POST /api/orders/` viaze objednavku na aktualneho usera; staff moze tvorit objednavku za klienta cez `user_id`.

## Flow: planovane objednavky a auto-predikcia

```mermaid
sequenceDiagram
    participant FE as Home/client dashboard
    participant API as PlannedOrdersViewSet
    participant Service as OrderService
    participant Auto as auto_order_service helpers
    participant DB as DailyOrder + Holiday

    FE->>API: GET /api/orders/planned/
    API->>Service: get_planned_orders(user, visible_meals)
    Service->>DB: najblizsie Holidays
    Service->>Service: vypocitaj 5 pracovnych dni
    Service->>DB: existujuce objednavky pre tieto dni
    Service->>Auto: _last_non_empty_order(user, first_day)
    Auto->>DB: posledna neprazdna objednavka pred planom
    loop kazdy pracovny den
        Service->>Service: existuje order? spocitaj totaly
        Service->>Auto: ak chyba, _build_auto_data(template, visible_meals)
    end
    Service-->>API: statusy + predictedData
    API-->>FE: planovany tyzden
```

Tento flow je dolezity, lebo pouziva rovnaku predstavu "poslednej neprazdnej objednavky" ako auto-order mechanizmus.

## Flow: Celery auto-orders po deadline

```mermaid
sequenceDiagram
    participant Settings as GlobalSettings
    participant Signal as api.signals
    participant Beat as Celery Beat
    participant Task as apply_auto_orders_task
    participant Service as apply_auto_orders
    participant DB as PostgreSQL

    Settings->>Signal: post_save
    Signal->>Beat: create/update PeriodicTask auto-order-daily
    Note over Signal,Beat: cas = max(deadline_breakfast, deadline_lunch, deadline_olovrant), Mon-Fri

    Beat->>Task: spusti po poslednom deadline
    Task->>Service: apply_auto_orders(target_date?)
    Service->>DB: aktivni non-staff klienti + ClientSettings
    Service->>DB: kto uz ma objednavku pre target_date
    Service->>DB: posledne neprazdne objednavky pred target_date
    loop kazdy klient
        Service->>Service: respektuj visible_meals
        Service->>DB: atomic get_or_create DailyOrder
    end
    Service-->>Task: created/skipped summary
```

Idempotencia stoji na `unique_together(user, date)`, `transaction.atomic()` a zachyteni `IntegrityError`, takze duplicitne tasky by nemali vytvorit duplicitne objednavky.

## Flow: admin vytvori jedalnicek a gramage report

```mermaid
sequenceDiagram
    actor Admin
    participant UI as MealPlanEditor
    participant API as DailyMealPlanViewSet
    participant Service as MealPlanService
    participant DB as DailyMealPlan + items + counts
    participant Export as PDF/XLSX exporter

    Admin->>UI: vyberie datum
    UI->>API: GET /api/admin/meal-plans/by-date/?date=YYYY-MM-DD
    API->>DB: plan + items + enrolled counts
    DB-->>API: plan alebo exists=false
    API-->>UI: editor state

    Admin->>UI: vyberie template jedal a pocty porcii
    UI->>API: POST/PUT /api/admin/meal-plans/
    API->>Service: create_or_replace_plan(date, items, enrolled, notes, user)
    Service->>DB: atomic upsert planu
    Service->>DB: delete + recreate MealPlanItem
    Service->>DB: delete + recreate EnrolledCount
    DB-->>API: ulozeny plan
    API-->>UI: plan response

    Admin->>UI: gramage/export
    UI->>API: GET gramage-report/export-pdf/export-xlsx
    API->>Service: calculate_gramage(plan)
    Service->>DB: templates + portion coefficients
    Service-->>API: structured gramage
    API->>Export: volitelne PDF/XLSX
    API-->>UI: JSON alebo file download
```

Gramaz sa rata vzorcom:

```text
final_weight = MealTemplate.base_weight_grams * PortionType.coefficient * EnrolledCount.count
```

`MealPlanService.gramage_dashboard` navyse kombinuje objednavky klientov s jedalnickom, menu variantmi, dietami a typmi porcii pre admin dashboard.

## Flow: synchronne a asynchronne reporty

```mermaid
flowchart TB
    AdminUI[Admin dashboard] --> Sync[Sync endpoints<br/>/api/admin/summary/daily-report-pdf<br/>/daily-report-xlsx]
    Sync --> ReportService[ReportService.get_orders_for_export<br/>or direct DailyOrder query]
    ReportService --> Exporters[PDFReportExporter / XLSXReportExporter]
    Exporters --> File[HTTP file response]

    AdminUI --> Async[POST /api/admin/report-tasks/]
    Async --> CeleryTask[generate_report_pdf_task<br/>generate_report_xlsx_task]
    CeleryTask --> Exporters
    CeleryTask --> RedisCache[(Redis cache<br/>report_task:task_id)]
    AdminUI --> Poll[GET /api/admin/report-tasks/{id}/]
    Poll --> CeleryResult[AsyncResult status]
    AdminUI --> Download[GET /api/admin/report-tasks/{id}/download/]
    Download --> RedisCache
    RedisCache --> File2[HTTP file response]
```

Synchronne endpointy su jednoduchsie a vhodne pre mensie reporty. Async report tasky su bezpecnejsie pri vacsich exportoch, pretoze generovanie bezi mimo request threadu a vysledne bytes su docasne ulozene v cache pod klucom konkretneho tasku.

## Flow: denne email reporty

```mermaid
sequenceDiagram
    participant Admin as Admin settings
    participant Settings as GlobalSettings
    participant Signal as api.signals
    participant Beat as Celery Beat
    participant Task as send_daily_report_task
    participant Cmd as management command send_order_report
    participant Email as SMTP

    Admin->>Settings: zmeni deadlines alebo recipients
    Settings->>Signal: post_save
    Signal->>Beat: sync daily-report-breakfast
    Signal->>Beat: sync daily-report-all-meals
    Note over Signal,Beat: tasks vzniknu len ked report_email_recipients nie je prazdne

    Beat->>Task: breakfast deadline -> meals=["breakfast"]
    Beat->>Task: olovrant deadline -> meals=["breakfast","lunch","olovrant"]
    Task->>Cmd: call_command send_order_report --date --meals
    Cmd->>Email: odosle report prijemcom
```

## Flow: push notifikacie

```mermaid
sequenceDiagram
    actor Client
    participant FE as PWA / NotificationGuard
    participant API as push views
    participant DB as PushSubscription
    participant Beat as Celery Beat
    participant Task as push reminder tasks
    participant Service as PushNotificationService
    participant Push as Browser push service

    Client->>FE: povoli notifikacie
    FE->>API: GET /api/push/vapid-public-key/
    API-->>FE: public VAPID key
    FE->>API: POST /api/push/subscribe/ endpoint + keys
    API->>DB: ulozi PushSubscription

    Beat->>Task: 15 min pred deadline alebo nedela 17:00
    Task->>DB: najdi subscribed aktivnych non-staff userov
    Task->>Service: send_to_user(...)
    Service->>DB: subscriptions usera
    Service->>Push: webpush(payload, VAPID)
    alt subscription stale 404/410
        Service->>DB: delete PushSubscription
    else delivered
        Push-->>Client: push event
    end
```

Push reminders sa grupuju podla rovnakeho deadline casu a `is_day_before` flagu, aby pouzivatel nedostal viac duplicitnych notifikacii naraz.

## Komunikacia modulov

```mermaid
graph TD
    AuthProvider -->|apiFetch + token refresh| ApiViews
    UseOrder[useOrder] -->|orders/by-date, orders POST| OrderViews
    UseOrder -->|deadline settings| SettingsViews
    UseOrder -->|portion types| MealPlanViews
    UseOrder -->|holidays| HolidayViews

    AdminMealPlan[Admin meal plan UI] --> MealPlanViews
    AdminReports[Admin report UI] --> ReportViews
    AdminReports --> ReportTaskViews
    AdminSettings[SystemSettings] --> SettingsViews
    AdminPush[PushNotifications admin] --> PushViews

    OrderViews --> OrderService
    OrderViews --> AutoOrderService
    MealPlanViews --> MealPlanService
    ReportViews --> ReportService
    ReportViews --> Exporters
    ReportTaskViews --> Tasks
    Tasks --> ReportService
    Tasks --> AutoOrderService
    Tasks --> PushNotificationService
    SettingsViews --> Signals
    Signals --> CeleryBeat[(django-celery-beat tables)]
```

Najdolezitejsie hranice:

- `OrderService` by mal zostat miestom pre objednavkove vypocty, nie komponenty.
- `MealPlanService` je zdroj pravdy pre gramaz a daily meal plan upsert.
- `ReportService` agreguje objednavkove data pre dashboard/reporty.
- `PushNotificationService` izoluje `pywebpush` a mazanie starych subscriptions.
- `signals.py` je infrastruktura pre schedule/cache sync; nema by obsahovat biznis rozhodnutia, ktore patria do service vrstvy.

## Cache, scheduling a invalidacie

```mermaid
flowchart LR
    GlobalSettingsSave[GlobalSettings save] --> ScheduleSync[_sync_auto_order_schedule<br/>_sync_daily_report_schedule<br/>_sync_push_reminder_schedule<br/>_sync_weekly_reminder_schedule]
    ScheduleSync --> BeatTables[(django_celery_beat<br/>PeriodicTask/CrontabSchedule)]
    GlobalSettingsSave --> ClearGlobalCache[clear_global_settings_cache]

    ClientSettingsSave[ClientSettings save] --> DefaultDiets[set default visible_diets<br/>pri novych settings]
    ClientSettingsSave --> ClearClientCache[clear_client_settings_cache(user_id)]

    DietSaveDelete[Diet save/delete] --> ClearDietCache[clear_diet_list_cache]

    DailyStats[Admin daily-stats] --> StatsCache[5 min cache]
    AsyncReports[Async report tasks] --> ReportCache[Redis cache<br/>1 hodina]
```

## Testovacia mapa

Existuju dve vrstvy backend testov:

- `backend/tests/*`: starsie alebo sirsie backend testy pre views, services, security, reports, orders, push, auto-orders.
- `backend/api/tests/*`: strukturovane unit/integration/e2e testy pre API spravanie.

Frontend testy su vo `frontend/src/__tests__` a pri niektorych komponentoch/pages priamo vedla suboru.

Pre zmeny s vyssim rizikom odporucane testy:

| Zmena | Co spustit |
| --- | --- |
| Order submit, planned orders, auto orders | `pytest api/tests/integration/test_order_api.py api/tests/integration/test_auto_orders.py tests/test_auto_orders.py` |
| Deadline alebo settings | `pytest tests/test_orders.py tests/test_startup_sync.py tests/test_push_notifications.py` |
| Reporty/exporty | `pytest tests/test_report_service.py tests/test_report_email.py tests/test_exporters.py api/tests/integration/test_report_async.py` |
| Auth/reset/tokeny | `pytest api/tests/integration/test_auth_api.py tests/test_auth.py tests/test_password_reset.py tests/test_token_refresh.py` |
| Frontend objednavky | `npm test -- OrderService OrderPage` vo `frontend/` |
| Global frontend sanity | `npm run lint && npm run build` vo `frontend/` |

## Miesta so zvysenou pozornostou

- `DailyOrder.data` ma historicky viac tvarov. Pri refaktoringu treba zachovat podporu flat aj nested shape alebo spravit migraciu.
- `GlobalSettings` je singleton-like model. Zmena fields v settings moze ovplyvnit Celery Beat schedules, cache aj frontend deadline logiku.
- `ReportTaskViewSet.download` zavisi od Celery resultu a cache key. Zmena timeoutu alebo backendu cache moze ovplyvnit dostupnost downloadu.
- Auto-orders sa spustaju po najneskorsom deadline. Ak sa prida novy meal type, treba upravit `signals.py`, `tasks.py`, `OrderService`, frontend `OrderService` a report agregacie.
- Frontend `useOrder` pouziva localStorage ako draft vrstvu. Zmeny v datovom tvare objednavky musia riesit migraciu/normalizaciu cez `OrderService.enforceStructure`.
- Push subscriptions su per-device/per-browser. Chybove statusy 404/410 sa mazu automaticky; ine push chyby su iba logovane.

## Kam pridavat novu logiku

```mermaid
flowchart TD
    Need[Chcem pridat novu funkcionalitu] --> IsHTTP{Je to HTTP endpoint?}
    IsHTTP -->|ano| View[api/views/* + serializer]
    IsHTTP -->|nie| IsBusiness{Je to domenove pravidlo?}
    IsBusiness -->|ano| Service[api/services/*]
    IsBusiness -->|nie| IsAsync{Bezi to mimo requestu?}
    IsAsync -->|ano| Task[api/tasks.py + pripadne signal/schedule]
    IsAsync -->|nie| Utility[utils/cache/exporter podla zodpovednosti]

    View --> CallsService[View vola service]
    Service --> Models[Service pracuje s modelmi]
    Task --> CallsService
    Task --> Exporter[ak generuje subor, vola exporter]
```

## Zhrnutie architektury

System dava zmysel: ma jasne oddelene frontend routy, backend viewsety, service vrstvy a async ulohy. Najsilnejsie moduly su objednavky, jedalnicky/gramaz, reporty a notifikacie. Najvacsi dopad pri zmenach maju `DailyOrder.data`, `GlobalSettings` deadlines a Celery Beat synchronizacia, pretoze prepajaju frontend, API, background joby a reportovanie.
