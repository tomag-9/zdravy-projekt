# Otázky pre klienta — nezrovnalosti app vs. reálne tabuľky

Zoznam vecí, ktoré pri porovnaní výstupu appky s reálnymi tabuľkami (`test/data/real`)
nesedia a **potrebujú potvrdenie od klienta**. Nie sú to nutne chyby appky — často ide
o fakturačné/biznisové špecifiká, ktoré appka nemá odkiaľ vedieť.

Formát: **[STAV]** Prevádzka — čo nesedí → konkrétne čísla → otázka.
Stav: 🔴 čaká na odpoveď · 🟢 vyriešené · ⚪ info (netreba akciu)

---

## 🟢 Edulienka — zlomkové počty porcií (.25) vo vyúčtovaní

Vyúčtovanie Edulienky uvádza **počty porcií v štvrtinách**, kým appka počíta celé objednané porcie.

| Deň | vyúčtovanie „Počet pokrmov" | Súčet (real) | Appka (obed) | Rozdiel |
|-----|------------------------------|--------------|--------------|---------|
| 13.7 | Klasik 8.25 + menu B 4.25 + 1.stupeň 2 | **14.5** | 14 | −0.5 |
| 14.7 | Klasik 4.25 + menu B 7.25 + 1.stupeň 2 | **13.5** | 13 | −0.5 |
| 15.7 | súčet (nová master tabuľka) | **10.5** | 10 | −0.5 |

**Odpoveď klienta (16.7.):** V tabuľke sú zlúčené **MŠ porcie a predškoláci**; predškolák
má u Edulienky **1,25 porcie**. Klient to dnes prepočítava a pripočítava **manuálne**.

**Zistenie (16.7.):** Predškoláci sú v EduPage vlastné platiteľské skupiny
(`Klasik - predškoláci`, `noMilk - predškoláci`, …), ale **zdieľajú `porcia=1`
s naozajstným 1. stupňom** (`Klasik - ZŠ ročník 1-3`). Scraper preto oboch zlieval do
`ZŠ 1.stupeň` a rozlíšiť sa nedali.

Reálna tabuľka 13.7 to potvrdzuje — štvrtiny **nie sú** na riadku 1. stupňa (ten má celé
`2`), ale sú zamiešané v MŠ riadkoch: `Klasik 8.25` = 7 MŠ + 1 predškolák à 1,25.

**Gramáž bola celý čas správne:** MŠ 200 g, predškolák 250 g → `7×200 + 1×250 = 1650`,
presne ako v tabuľke. Rozdiel bol len v **počte porcií**.

**Vyriešené v appke:**
- Scraper rozpadá `porcia=1` na `Predškolák` / `ZŠ 1.stupeň` podľa názvu skupiny.
- Nový PortionType `Predškolák` má **rovnaký gramážový koeficient** (1,25 = 250 g) ako
  `ZŠ 1.stupeň` — gramy sa nemenia, ide len o rozpad kvôli fakturácii.
- `Prevadzka.billing_portion_coefficients` = koeficient fakturovanej porcie, oddelený od
  gramážového. Nastavený **len Edulienke** (`{"Predškolák": "1.25"}`).
- V gramážovej tabuľke sa predškolák **zlúči do MŠ riadku** ako 1,25 porcie — presne ako
  to klient píše ručne (`Klasik 8.25`, 1650 g). Prevádzky bez koeficientu sa nemenia.

**Pozor:** Libellus a Krásňanko hlásia predškolákov ako `porcia=0` (MŠ, 200 g) — sú
zámerne mimo tohto pravidla, aby sa im porcia neposunula na 250 g.

---

## 🟢 Fantastická Škôlka — obed 14.7 o 1 menej

- 14.7: appka **8**, reálne **9** (obed). 13.7 pritom sedí presne (8/8).
- 15.7: appka **9**, reálne **10** (obed) → opäť −1. Pattern sa opakuje, nejde o náhodu.

**Odpoveď klienta (16.7.):** Fantastická má **na tento týždeň špeciálnu prosbu** — každý
deň prirátať **+1 porciu** navyše. Vyúčtuje sa im to na základe tabuľky.

**Dôsledok:** Očakávaný rozdiel, dočasný (len tento týždeň), rieši sa mimo appky.
Netreba opravovať.

---

## ⚪ Krásňanko — obed vždy o 1 viac (KZD = zamestnanec, detská porcia)

- Konzistentne appka **+1** oproti vyúčtovaniu (26 vs 25, resp. 25 vs 24).
- Príčina známa: skratka **KZD** = zamestnanec s detskou porciou. Appka ju ráta ako
  bežnú detskú porciu (potvrdené 7/13, berieme to tak).

**Info, netreba akciu** — ponechané ako legitímny rozdiel. Uvedené len pre úplnosť,
keby sa klient pýtal, prečo Krásňanko „nesedí" o 1.

---

## ⚪ Olovrant sa u niektorých prevádzok účtuje samostatne (real = 0)

Vo `vyúčtovaní` majú tieto prevádzky olovrant **0**, hoci appka olovrant objednáva —
olovrant sa u nich fakturuje mimo tejto tabuľky („olovrant samostatne"):
Zdravé Bruško, Edulienka, Fantastická, Felix, Filipáneriho, Prameň.

**Vysvetlenie klienta (16.7.):** Veľa škôlok má **rozdielne počty obedov a olovrantov**,
preto dostanú v tabuľke **olovranty ako samostatný riadok** a nie sú spojené s obedmi.
Teda „olovrant samostatne" = samostatný riadok, nie fakturácia mimo tabuľky.

**Info, netreba akciu** — očakávané, nie chyba appky.

---

## ⚪ Uzávierky objednávok (potvrdené klientom 16.7.)

| Jedlo | Uzávierka |
|-------|-----------|
| Raňajky | **20:00 deň vopred** |
| Obed / olovrant | **7:30 v daný deň** |

**Otvorené:** Klient zvažuje posun obeda/olovrantu na **7:40**, lebo veľa škôlok začína
7:30 a nestíhajú nahlásiť počty načas. Čaká sa na rozhodnutie.

---

## ⚪ 15.7 — formát tabuľky nezmenený, kľúčové obedy sedia

Vyúčtovanie `15.7.2026_tabuľka_NOVÁ4.xlsx` má **rovnaký formát** ako všetky doterajšie
(stĺpec `Druh pokrmu` s OBED/OLOVRANT, 110 prevádzok, 687 riadkov — identické so 14.7).
Reconcile na 15.7 zlyhal len preto, že v dev DB nebol **meal plán** pre daný deň (DB bola
medzitým vyresetovaná), nie kvôli formátu. Kľúčové obedy (kde sa olovrant fakturuje
samostatne, teda total = obed) sedia presne: Zdravé Bruško (Deutsche schule) 69/69,
Felix 10/10, Filipa Nériho 21/21.
