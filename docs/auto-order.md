# Automatické objednávanie (Auto-Order)

## Účel

Systém automaticky vytvorí a potvrdí objednávku pre klienta na **nasledujúci pracovný deň**, ak klient do deadlinu neodovzdá vlastnú objednávku. Ako šablóna sa použije **posledná nenulová objednávka** daného klienta.

---

## Rozhodnutia a vstupné požiadavky

| Parameter                       | Hodnota                                                  |
| ------------------------------- | -------------------------------------------------------- |
| Timezone                        | **CET/CEST** (`Europe/Bratislava`)                       |
| Víkendy                         | **Žiadne objednávky** – sobota/nedeľa sú vynechané       |
| Navigácia cez víkend v `/order` | DaySelector preskakuje víkendy ✅ funguje                |
| Default dátum v `/order`        | Prvý nasledujúci **pracovný** deň (nie nutne dnes)       |
| Scheduled engine                | **Celery + Celery Beat** (zdôvodnenie nižšie)            |
| Audit v HomePage                | Sekcia „Plánované objednávky" – 5 pracovných dní dopredu |
| Badge auto-objednávka           | Ikonka ⚙ / badge „Auto" na karte                         |
| Badge prázdna objednávka        | Červená ikonka na karte (explicitná 0-objednávka)        |
| Budúce potreby                  | Emaily klientom, PDF generovanie na pozadí               |

---

## Prečo Celery (a nie jednoduchý cron)

Celery je správna voľba pretože projekt **v budúcnosti bude potrebovať**:

- Posielanie emailov (notifikácie o auto-objednávke, denné reporty)
- Generovanie PDF súhrnov na pozadí
- Ďalšie async operácie (importy, exporty)

Jednoduchý `cron` service v Dockeri by fungoval len pre auto-order, ale:

- Bez retry logiky (ak task zlyhá, nikto nevie)
- Bez monitoringu stavu taskov
- Neumožňuje dynamické plánenie (deadlines sa menia v DB)
- Nevie posielať emaily asynchrónne

**Záver:** Management command `apply_auto_orders` implementujeme (Celery ho bude volať + funguje aj manuálne). Redis ako broker.

### Celery stack

- `celery[redis]`
- Redis ako broker (nový Docker service)
- `django-celery-beat` pre dynamický schedule z DB
- `flower` (voliteľné) pre monitoring

---

## Pravidlá

### 1. Spustenie

- Každý deň presne **v čase deadlinu** (per-meal, z `GlobalSettings`) sa spustí scheduled job.
- Deadline je nakonfigurovaný zvlášť pre každé jedlo: `deadline_breakfast`, `deadline_lunch`, `deadline_olovrant`.
- Prakticky stačí jeden job spúšťaný v čase **najneskoršieho deadline-u** (alebo tri samostatné).

### 2. Podmienky pre automatickú objednávku

Klient **dostane** automatickú objednávku na deň `D+1`, ak:

- Na deň `D+1` **neexistuje** žiadny záznam `DailyOrder` v databáze pre daného klienta.
- Existuje aspoň jedna **nenulová** objednávka v histórii (hocikedy v minulosti).

Klient **nedostane** automatickú objednávku, ak:

- Má na `D+1` už vytvorenú objednávku (status `submitted` alebo `draft`).
- Žiadna historická nenulová objednávka neexistuje (nový klient bez histórie).
- Klient odovzdal prázdnu (nulovú) objednávku na `D+1` – to je explicitné odmietnutie.

### 3. Šablóna – posledná nenulová objednávka

- Prehľadávajú sa záznamy `DailyOrder` zoradené od najnovšieho: `DailyOrder.objects.filter(user=client).order_by('-date')`.
- Prvý záznam, ktorého **data nie je prázdne** (aspoň jeden porcion > 0), sa použije ako šablóna.
- „Nenulový" = aspoň jedno jedlo obsahuje počet porcií > 0.

### 4. Rešpektovanie nastavení klienta (`ClientSettings.visible_meals`)

- Ak má klient v `visible_meals` napr. `["lunch"]`, automaticky sa objedná **iba obed**.
- Raňajky a olovrant z šablóny sa **ignorujú** – skopírujú sa iba aktívne jedlá.
- Ak je `visible_meals` prázdne zoznam, použijú sa všetky tri.

### 5. Príklady

| Objednávky v histórii                 | Deň D+1                 | Výsledok D+1                               |
| ------------------------------------- | ----------------------- | ------------------------------------------ |
| Pon: 15R+16O+13Ol                     | Utorok: nič             | Auto: 15R+16O+13Ol                         |
| Pon: 15R+16O+13Ol, Str: 20R+18O       | Utorok: nič             | Auto: 15R+16O+13Ol (posledná pred utorkom) |
| Pon: 15R+16O+13Ol                     | Utorok: nič             | Auto z Pon                                 |
| Pon: 15R+16O+13Ol, Uto: (ručná 0-0-0) | Streda: nič             | Auto z Pon (Uto bola nulová)               |
| Pon: 15R+16O+13Ol                     | Utorok: ručne odovzdaná | Bez zmeny – ručná má prednosť              |
| žiadna história                       | Utorok: nič             | Žiadna auto-objednávka                     |

> **Príklad z požiadavky:** Klient objednal v Pon 15+16+13, do Utorkového deadlinu nič nezmenil → v momente deadlinu sa automaticky vytvorí objednávka na Utorok: 15+16+13. Na Stredu si ručne nastavil iné čísla → auto na Štvrtok použije Stredajšie čísla.

---

## Implementácia – čo je potrebné

### Backend (Django)

#### A. Migrácia – pole `is_auto` na `DailyOrder`

```python
is_auto = models.BooleanField(default=False)
```

#### B. Service funkcia `apply_auto_orders`

`backend/api/services.py` – čistá logika bez I/O, ľahko testovateľná:

```
Vstup: target_date (date, default = nasledujúci pracovný deň v CET)
Logika:
  1. Pre každého aktívneho klienta (is_staff=False, is_active=True):
     a. Existuje DailyOrder pre target_date? → skip
     b. Nájdi poslednú nenulovú objednávku (date < target_date)
     c. Žiadna? → skip
     d. Skopíruj iba visible_meals, ostatné = prázdne
     e. DailyOrder.objects.create(..., is_auto=True)
  2. Return: zoznam vytvorených objednávok
```

#### C. Management command `apply_auto_orders`

`backend/api/management/commands/apply_auto_orders.py`

- Argument `--date YYYY-MM-DD` (default: nasledujúci pracovný deň)
- Volá service funkciu, loguje výsledok
- Použiteľný manuálne aj z Celery tasku

#### D. Celery task

`backend/api/tasks.py`

```python
@shared_task
def apply_auto_orders_task(date_str=None):
    from api.services import apply_auto_orders
    return apply_auto_orders(date_str)
```

#### E. Celery Beat schedule

Dynamicky z DB (`django-celery-beat`) – task sa spustí 1 min po najneskoršom deadline-e každý pracovný deň.

#### F. API endpoint `GET /api/orders/planned/`

Vráti 5 najbližších pracovných dní s ich stavom:

```json
[
  {
    "date": "2026-02-23",
    "exists": true,
    "is_auto": false,
    "is_empty": false,
    "totalPortions": 44,
    "mealCount": { "breakfast": 15, "lunch": 16, "olovrant": 13 }
  },
  {
    "date": "2026-02-24",
    "exists": false,
    "is_auto": null,
    "is_empty": null,
    "totalPortions": 0,
    "mealCount": { "breakfast": 0, "lunch": 0, "olovrant": 0 }
  }
]
```

#### G. Admin trigger endpoint

`POST /api/admin/trigger-auto-orders/` – manuálne spustenie pre konkrétny dátum.

### Frontend (React)

#### A. HomePage – sekcia „Plánované objednávky"

Nahradí „Aktuálne objednávky". Zdroj dát: `/api/orders/planned/`.

| Stav karty                   | Vizuál                                     |
| ---------------------------- | ------------------------------------------ |
| `exists=true, is_auto=false` | Modrý badge „Potvrdená"                    |
| `exists=true, is_auto=true`  | Badge „⚙ Auto" (indigo/šedý)               |
| `exists=true, is_empty=true` | Červená ikonka / badge „Bez objednávky"    |
| `exists=false`               | Sivá karta „Zatiaľ nezadané" – kliknuteľná |

#### B. Default dátum v „Nová objednávka"

- Tlačidlo naviguje na **prvý nasledujúci pracovný deň** (nie fixne na `today`).
- Ak je víkend alebo po deadline → nasledujúci pracovný deň.

### Docker infraštruktúra

Nové services v `docker-compose.dev.yml` (a prod/staging):

```yaml
redis:
  image: redis:7-alpine

celery:
  build: ./backend
  command: celery -A app worker -l info
  depends_on: [db, redis]

celery-beat:
  build: ./backend
  command: celery -A app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
  depends_on: [db, redis]
```

---

## Stav implementácie

| Časť                                | Stav        | Poznámka                                 |
| ----------------------------------- | ----------- | ---------------------------------------- |
| `GlobalSettings` (deadlines)        | ✅ Existuje | `deadline_breakfast/lunch/olovrant` v DB |
| `ClientSettings.visible_meals`      | ✅ Existuje | JSON pole na modeli                      |
| `DailyOrder` model                  | ✅ Existuje | Treba pridať `is_auto` pole              |
| DaySelector preskakuje víkendy      | ✅ Existuje | Funguje správne                          |
| Migrácia `is_auto`                  | ❌ Chýba    |                                          |
| Service funkcia `apply_auto_orders` | ❌ Chýba    |                                          |
| Management command                  | ❌ Chýba    |                                          |
| Celery + Redis setup                | ❌ Chýba    |                                          |
| Celery Beat dynamický schedule      | ❌ Chýba    |                                          |
| API endpoint `/orders/planned/`     | ❌ Chýba    |                                          |
| HomePage – sekcia „Plánované"       | ❌ Chýba    |                                          |
| UI badge auto / prázdna objednávka  | ❌ Chýba    |                                          |
| Default dátum = prvý pracovný deň   | ❌ Chýba    |                                          |
| Testy                               | ❌ Chýba    |                                          |

---

## Testy (požiadavky)

```python
# backend/tests/test_auto_orders.py
# - klient bez histórie → žiadna auto-objednávka
# - klient s históriou, bez objednávky na D+1 → auto sa vytvorí s is_auto=True
# - klient s ručnou objednávkou na D+1 → auto sa nevytvorí
# - klient s nulovou objednávkou na D+1 → auto sa nevytvorí (explicitné odmietnutie)
# - visible_meals=["lunch"] → auto skopíruje iba lunch, ostatné prázdne
# - posledná nenulová = správne vybraná (nie posledná celková)
# - idempotencia: dvojité spustenie nevytvorí duplikát
# - víkend: ak D+1 je sobota/nedeľa → target = nasledujúci pondelok
# - timezone: deadline sa vyhodnocuje v CET/CEST
# - /api/orders/planned/ vracia správne 5 pracovných dní
# - is_staff klient nedostane auto-objednávku
```

---

## Vyriešené otázky

| Otázka              | Odpoveď                                           |
| ------------------- | ------------------------------------------------- |
| Timezone            | CET/CEST (`Europe/Bratislava`)                    |
| Víkendy             | Žiadne objednávky, žiadny auto-order              |
| Audit trail         | Áno – pole `is_auto=True` + UI badge              |
| Notifikácia emailom | Áno – v budúcnosti cez Celery (email task)        |
| PDF generovanie     | Áno – v budúcnosti cez Celery                     |
| Cron vs Celery      | Celery – kvôli budúcim emailom/PDF a retry logike |
