# E2E testy (Playwright)

Testy bežia proti **reálnemu dev stacku** — nie proti mocku a nie proti
samostatnému vite. Potrebujú backend, DB aj naseedované demo prevádzky.

```bash
# 1) stack musí bežať
docker compose -f compose/dev.yml up -d

# 2) prehliadače (stačí raz)
cd frontend && npx playwright install chromium

# 3) testy
npm run test:e2e             # mobil + desktop
npm run test:e2e -- --project=mobile
npm run test:e2e:ui          # interaktívny režim
npm run test:e2e:report      # HTML report po behu
```

Iná adresa aplikácie:

```bash
E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

## Prečo dva projekty

Klientske UI má dve samostatné vetvy renderovania (`useIsPC`), takže mobil a
desktop nie sú tá istá stránka v inej šírke. Chyby v tour sa objavovali práve
na jednej z nich (viď #477: krok „Profil a nastavenia“ nemal na desktope cieľ
vôbec, na mobile ho tooltip prekryl).

## Testovací login

`prevadzka@example.com` / `prevadzka` zo `init_roles` — zámerne celok s
**viacerými** prevádzkami, aby testy prechádzali aj cestou výberu prevádzky,
kde vznikali chyby (objednávky sa vedú per prevádzka).

## Na čo si dať pozor pri písaní testov

- **Mobilné modály.** Po prihlásení sa na mobile otvorí `PWAInstallBanner` a
  prekryje UI. `login()` ho potlačí cez `dismissMobilePrompts()` — rovnakým
  localStorage kľúčom, aký používa tlačidlo „Teraz nie“.
- **Chooser prevádzky sa načíta až po prvom renderi.** OrderPage kým čaká na
  dáta zámerne renderuje plný formulár, a až potom ho vymení za chooser.
  Podmienený klik „ak tam chooser je“ v tom okne nespraví nič. Použi
  `openOrderPage()`.
- **Tour pozicuje tooltip dvojfázovo** (odhad výšky → skutočná). Overlay ho
  drží skrytý, kým nemá finálnu pozíciu, takže `toBeVisible()` je spoľahlivý
  signál. Rámec aj tak meraj až po objavení `.tour-highlight` a cez
  `stableBoundingBox()` — cieľom je nezávisieť na tom, ako je odhalenie
  načasované vnútri komponentu.
- **Dnešok býva po uzávierke.** Na objednávanie použi `firstNextWorkday()`.
