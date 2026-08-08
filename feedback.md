# Otázky pre klienta — nezrovnalosti app vs. reálne tabuľky

Zoznam vecí, ktoré pri porovnaní výstupu appky s reálnymi tabuľkami (`test/data/real`)
nesedia a **potrebujú potvrdenie od klienta**. Nie sú to nutne chyby appky — často ide
o fakturačné/biznisové špecifiká, ktoré appka nemá odkiaľ vedieť.

Formát: **[STAV]** Prevádzka — čo nesedí → konkrétne čísla → otázka.
Stav: 🔴 čaká na odpoveď · 🟢 vyriešené · ⚪ info (netreba akciu)

---

## 🔴 Reconcile 20.–22.7.2026 — Tier2 gramáž: 3 konkrétne nálezy (nie chyby appky)

Prešiel som všetkých 58 gram diffov (16+23+19). Žiadny nie je výpočtová chyba appky —
rozkladajú sa na: (a) count drift zo scrapu (±1 obed → celý gram blok posunutý, lebo
scrape ťahá aktuálny EduPage stav), (b) 3 nálezy nižšie.

**1. Filipa Nériho — typo v pečive (20.7).** Sub-riadok „bez orechov EPIPEN" (2 osoby)
má v stĺpci *Grahamové pečivo* hodnotu **100** namiesto **2** (ostatné stĺpce sedia na
2 porcie: 400/180/220/50). Reconcile preto číta pečivo 18+1+100 = **119** vs app **20**.
→ Klient nech opraví bunku (100 → 2). Ak fakturuje pečivo z tabuľky, je o 98 ks vyššie.

**2. Školička lúka — šalát 1,25× base (20.7 aj 22.7).** *Uhorkový/Ľadový šalát* má u
Lúky **31,25 g/porcia** (156,25/5 aj 187,5/6; nomilk 31,25/62,5 → 31,25/os), kým polievka
a hlavný chod sú base ×1,0 a Školička **les** má šalát **25 g**. Appka počíta 25 g
(katalóg). → Otázka: je 31,25 g šalátu pre Lúku zámer (väčšia porcia), alebo chyba
tabuľky? Ak zámer, appka to dnes nevie vyjadriť (per-prevádzka per-zložka gramáž).

**3. Libellus — appka a tabuľka si odporujú (22.7).** EduPage má Libellus **obed** (4
porcie), ktorý v tabuľke chýba (obed 0); tabuľka má **olovrant** (bublanina 675 = 9
porcií), ktorý v EduPage nie je (scrape hlásil config drift). Libellus sa nahadzuje
ručne. → Klient nech potvrdí: má sa Libellus obed z EduPage (4) fakturovať/doplniť do
tabuľky? A odkiaľ berie olovrant, keď v EduPage nie je?

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

## ⚪ Krásňanko KZ — zamestnanec: zdvojenie SKÚSENÉ a ZRUŠENÉ (22.7.)

**Odpoveď klienta (21.7.):** *„KZ je klasik zamestnanec — počítame ho z dvojitú
detskú porciu v našej tabuľke a pripočítavame k detským olovrantom."*

**Skúsené 21.7.:** `KZ → 2 detské porcie` (nové pole `LetterRule.qty=2`), na obed aj
olovrant. **Reconcile 20.–22.7 to vyvrátil pri obede:** appka +2/+2/+3 nad reál
(30/24/31 vs 28/22/28) — reál ráta KZ pri obede ako **1**. Bez zdvojenia obed sedí
presne (28/28, 22/22).

**Zrušené 22.7.:** KZ späť na 1 dospelú porciu, `qty` mechanizmus odstránený.
Dôsledok: olovrant Krásňanka je teraz −1 (reál 24/18 > app 23/17) = presne ten 1 KZ
zamestnanec, ktorého klient **ručne** pridáva k detským olovrantom. Necháme mimo appky
(rovnaká kategória ako ostatné ručné olovrant úpravy). Keby sa to niekedy chcelo
dorovnať, muselo by to byť pravidlo **len na olovrant**, nikdy nie na obed.

---

## 🔴 Krásňanko — obed „o 1 viac" = rozbitý vzorec v tabuľke

**Pôvodná domnienka (KZD = zamestnanec s detskou porciou) bola nesprávna.** KZD je
klasik detská porcia zlúčená z KZ a appka ju ráta správne.

Skutočná príčina: v skrytom hárku `vyúčtovanie` má Krásňanko na riadku `nogluten`
rozbitý odkaz — **každý deň 13., 14., 15. aj 16.7.**:

```
(None, 'nogluten', 5.6, '=Hárok1!#REF!')          ← OBED
(None, 'NOGLUTEN DOSPELÁ', 0.3, '=Hárok1!#REF!')  ← OLOVRANT (od 14.7.)
```

Bunka vracia `#REF!` namiesto počtu, takže zhltla presne 1 dieťa (DIA).

V `Hárok1` sú dáta **úplne v poriadku** — obed 18 (Klasik) + 2 (noMilk) + 1 (Diabetik)
+ 2 (dospelá) = **23**, presne ako appka. Rozdiel bol len v tom, že sme počty čítali
zo skrytého hárku namiesto z Hárok1.

**Akcia:** appka opravená (číta Hárok1). Klientovi treba dať vedieť, že v jeho
tabuľke je rozbitý vzorec — pre nás už neškodí, ale ak podľa `vyúčtovania` fakturuje,
účtuje o 1 porciu menej.

---

## 🔴 Rozmanitá — 1 dospelý Menu B obed chýba v tabuľke

Rozmanitá je v tabuľke rozdelená na dva bloky: `Rozmanita Škôlka` a `Rozmanita Škola`.

- **Obed**: škôlka 26 + škola 4 = **30**, appka **31**.
- Rozdiel: EduPage má `Dospelý Menu B = 1`, v tabuľke je `dospelá Menu B` = **0**.

**Otázka na klienta:** má ten obed (dospelý, Menu B) byť vyúčtovaný? V EduPage
objednaný je.

---

## ⚪ Filipa Nériho — olovrant JE, len nemá vlastný riadok

Overené: v `Hárok1` má Filipa Nériho olovrant v stĺpcoch pečivo/nátierka
(`17 ks + 425 g` = 17 ľudí) — rovnaký počet ako obed (17). Preto mu klient nedáva
samostatný olovrantový riadok; ten robí len tam, kde sa počty obeda a olovrantu líšia.
Diéty majú v olovrantových stĺpcoch nuly.

**Info, netreba akciu.** Skoršie hlásenie „Filipáneriho olovrant = 0" bola chyba
nášho parsera, nie realita.

---

## ⚪ „Olovrant samostatne" — vyriešené, bola to chyba nášho parsera

Skoršie hlásenie, že Zdravé Bruško, Edulienka, Fantastická, Felix, Filipáneriho a Prameň
majú olovrant **0**, bolo **nesprávne** — vzniklo tým, že sme počty čítali zo skrytého
hárku `vyúčtovanie`, ktorý olovrant u týchto prevádzok vynecháva.

**Vysvetlenie klienta (16.7.):** Veľa škôlok má **rozdielne počty obedov a olovrantov**,
preto dostanú v tabuľke **olovranty ako samostatný riadok** a nie sú spojené s obedmi.

V `Hárok1` je olovrant vždy prítomný, v jednej z dvoch podôb:
- **rovnaký počet ako obed** → je v stĺpcoch pečivo/nátierka hlavného riadku (Filipa Nériho),
- **iný počet ako obed** → má vlastný `OLOVRANT` sub-blok (Krásňanko).

`„olovrant samostatne"` je navyše doslovná textová poznámka priamo v Hárok1 (napr. Jolly 3).

**Info, netreba akciu** — appka teraz číta obe podoby.

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

---

## ❗ Zdravé Brúsko — MŠ Malokarpatské a MŠ Heyrovského zdieľajú stĺpec (desiata + olovrant)

`zdravebrusko.edupage.org` nie je škola, je to spoločný EduPage piatich **samostatných
subjektov**, ktoré fakturujú každý zvlášť (spoločný EduPage nie je príznak celku).
Rozdelenie ide cez skratku menu (`nazovMenu`), nie cez payer label — payer je jediný
(`Škôlka`) a nerozlišuje nič.

Overené naživo proti EduPage (17.7.2026):

| Chod | Písmená menu → škola |
|------|----------------------|
| Desiata | `A`=dsbA · `B`=sšvA · **`C`=mšMal,Hey** |
| Obed | `A`–`F`,`J`=dsb · `G`–`I`=sšv · `K`,`L`,`R`=zšla · `M`–`O`=mšMal · `P`,`Q`=mšHey |
| Olovrant | `A`=dsbA · `B`=sšvA · **`C`=mšMal,Hey** |

**Špeciálne pravidlo:** `Deutsche schule` síce v EduPage vie niesť skratky pri desiate
alebo olovrante, ale reálne sa pre ňu tieto chody nevydávajú ani nefakturujú. Pri
importe sa preto pre `Deutsche schule` ponecháva iba obed; raňajky/desiata a olovrant
sa ignorujú.

**❗ Otvorené — treba rozhodnutie klienta:** menu `C` (`mšMal,Hey`) zlučuje **MŠ
Malokarpatské námestie 6** a **MŠ Heyrovského 4** do jedného stĺpca pri **desiate a
olovrante**. Z dát sa nedá zistiť, koľko z toho počtu patrí ktorej škôlke — a keďže
fakturujú samostatne, nedá sa to ani odhadnúť. Pri obede sú rozlíšené (`M`/`N`/`O` vs
`P`/`Q`), problém je len desiata + olovrant.

**Dočasné riešenie:** desiatu a olovrant z menu `C` zapisujeme **naplno obom** škôlkam
(nie delené na polovicu). Znamená to, že súčet porcií cez celý EduPage bude o tento
počet vyšší než realita a **fakturácia oboch škôlok je nadhodnotená**, kým klient
nerozdelí `C` na dve menu v EduPage konfigu. Toto je vedomý dočasný stav, nie chyba.

**Poznámka:** veterinárna sa tohto netýka — `sšv*` má vlastné skratky vo všetkých
troch chodoch.

---

## 🔁 Reconcile 17.7.2026 — čo sa zmenilo oproti predošlému behu

**1. Edulienka predškolák 1,25 — regresia (opravené).**
Koeficient *predškolák = 1,25* žil len v jednorazovej migrácii `0045_edulienka_billing_coefficients`.
Dnešný **reseed/rozdelenie prevádzok** ho ticho prepísal na `{}`, takže sa predškolák
zrazu účtoval ako 1 (obed aj olovrant vychádzali 10 namiesto 10,5). Preto „minule to šlo,
teraz nie". Opravené: koeficient je odteraz **idempotentne** nastavovaný v
`seed_prevadzky_edupage` (nová mapa `COEFFICIENTS`), takže prežije každý reseed.
Bonus: seed hľadal celok `"Edulienka"`, ale volá sa `"MŠ Edulienka"` — kvôli tomuto
mismatchu sa koeficient nikdy neobnovil.

**2. Škôlka MS – Les/Lúka mali 0 objednaných (opravené).**
Profil `Škôlka MS` ukazoval na celok `Škôlka MS`, ktorý mal len neaktívnu placeholder
prevádzku (M2M profilu prázdne), a skutočné Les/Lúka viseli pod osamotenými celkami
`Les`/`Lúka` bez napojenia na profil. Scrape preto celý profil preskočil
(`Škôlka MS nemá žiadnu prevádzku`). Opravené: Les/Lúka naseedované pod celok `Škôlka MS`
cez `seed_prevadzky_edupage`, orphan celky `Les`/`Lúka` (0 objednávok) zmazané. Po oprave
scrape 17.7: `skipped=0` (predtým 2), Les obed 11/11 ✓, Lúka obed 10/10 ✓. To isté
odblokovalo aj Jolly Homeschool (predtým tiež skipnutý).

**3. Olovrant (snack) — EduPage ≠ realita (na potvrdenie klientom).**
Appka počíta olovrant správne — sčíta presne to, čo je objednané v EduPage. Klient si však
v reálnom hárku počty olovrantov ručne upravuje, preto nesedia. Za 17.7.2026:

| Prevádzka | App (EduPage) | Reál | Δ |
|-----------|--------------:|-----:|--:|
| Filipa Nériho | 13 | 15 | +2 |
| Krásnanko | 15 | 16 | +1 |
| Libellus | 9 | 10 | +1 |
| Les | 11 | 10 | −1 |
| Lúka | 6 | 10 | +4 |
| Pramienok | 27 | 25 | −2 |

Nie je to výpočtová chyba — je to data mismatch EduPage ↔ hárok.

**Rozhodnuté (21.7.) — odpovede klienta:**
- **Filipa Nériho:** *„kvôli ušetreniu času neriešime pár porcií olovrantu, hlavne im
  nemôže prísť menej."* → ručná úprava klienta, appka počíta z EduPage správne. ⚪
- **Krásňanko (±1):** KZ zamestnanec = 2 detské olovranty. Zdvojenie skúsené a
  **zrušené** (rozbíjalo obed) — teraz olovrant −1, ručná úprava klienta ostáva mimo
  appky (viď vyššie „Krásňanko KZ"). ⚪
- **Libellus (+1):** *„nahadzujeme manuálne, ak tam je chyba tak je moja."* → ľudská
  chyba klienta, nie appka. ⚪
- **Pramienok (−2):** *„celodenka, počíta sa automaticky."* → appka odvodzuje olovrant
  z obeda (`ODVODIT_Z_OBEDU`); **spevnené 21.7.**: olovrant sa teraz VŽDY vynúti = obed,
  aj keď EduPage nesie vlastný olovrant. 🟢
- Les/Lúka: ostávajú z EduPage (obed 11/11, 10/10 sedia); olovrant delta je real-side.

**4. Ranajky + menu B/C/V sa vôbec neporovnávajú (slepé miesto).**
`import_real_gram_distributions` z princípu číta len riadok `KLASIK` (obed: polievka +
hlavný chod + olovrant). Do denného plánu sa teda nedostane `breakfast_snack` ani varianty
B/C/V — na ranajky (`_rano.pdf`) ani na menu varianty neexistuje importér. Dôsledok:
reálne objednané ranajky (Edulienka 10, Filipa 16, Krásnanko 19, Rozmanitá 24…) sú v
reconcile neviditeľné a riadky „breakfast 0 vs 0 OK" sú slepé miesto, nie zhoda.

**5. Alias mapa aktualizovaná na „nový update" pomenovaní.**
Reál premenoval prevádzky s prefixom `ms ` (napr. `ms edulienka`, `ms krasnanko`,
`skolka ms – les`) a appka zhodila prefix `MŠ` (emituje `Edulienka`, `Krasňanko`, `Les`).
Staré `MŠ …` kľúče prestali sadať a navyše aktívne rozbíjali párovanie. `facility_aliases.json`
prepísaný na aktuálne app labely s list-hodnotami nesúcimi staré aj nové pravopisy.

**Fantastická +1** (obed aj olovrant 8→9) je pre tento týždeň **akceptované** (potvrdené klientom).

---

## 🔴 Jolly Homeschool / Škôlka MS — EduPage split znova rozbité (regresia, CHYBA APPKY)

**Toto JE chyba appky** — na rozdiel od všetkého ostatného v tomto súbore. Presne ten istý
problém bol raz už opravený (viď „17.7.2026 — bod 2" vyššie: „Škôlka MS – Les/Lúka mali 0
objednaných"), ale vrátil sa — niekedy medzi 17.7. a 4.8. sa `seed_prevadzky_edupage.py`
alebo nadväzujúci seed znova rozbehol do rovnakého stavu.

**Zistené 5.8.2026 pri reconcile 3.–5.8.:** scrape hlási pri každom behu (každý deň v týždni)

```
Jolly Homeschool nemá žiadnu prevádzku — preskakujem
Škôlka MS nemá žiadnu prevádzku — preskakujem
```

**Príčina (overené v DB):** `seed_prevadzky_edupage.py` rozdelí celok na aktívne
sub-prevádzky (`Jolly 1/2/3` s `edupage_match='J1'/'J2'/'J3'`; `Les`/`Lúka` s vlastným
matchom) a starú "default" prevádzku **deaktivuje** (`is_active=False`) — ale
**nepresunie na sub-prevádzky jej `edupage_connection`**. Tá ostáva visieť na
deaktivovanej default prevádzke:

```
'Jolly Homeschool' active=False edupage_connection=6   edupage_match=''
'Jolly 1'           active=True  edupage_connection=None edupage_match='J1'
'Jolly 2'           active=True  edupage_connection=None edupage_match='J2'
'Jolly 3'           active=True  edupage_connection=None edupage_match='J3'

'Škôlka MS' active=False edupage_connection=12  edupage_match=''
'Lúka'      active=True  edupage_connection=None edupage_match='Lúka'
'Les'       active=True  edupage_connection=None edupage_match='Les'
```

`edupage_operations()` (`api/services/edupage_connection_service.py`) berie z pripojenia
len **aktívne** prevádzky (`Prevadzka.objects.filter(is_active=True)`) — keďže pripojenie
visí na neaktívnom placeholderi, vyjde pre neho prázdny zoznam prevádzok → scraper
zariadenie preskočí. **Dôsledok: Jolly 1/2/3 aj Les/Lúka sa nescrapujú vôbec, každý deň,
odkedy sa split takto rozbil znova** (presný dátum regresie neznámy — treba pozrieť git
históriu `seed_prevadzky_edupage.py`).

**Fix (navrhnutý, ešte NEaplikovaný):** v tej istej sekcii kde sa dnes dedí
`billing_portion_coefficients` zo starej default prevádzky (komentár „Fakturačný
koeficient visí na prevádzke..."), treba rovnako zdediť `edupage_connection` a priradiť
ho každej novej sub-prevádzke — presne ako to dnes robí `real_initial_seed_prevadzky.py`
pri Rozmanite (opačným smerom: tam sa connection naopak **odoberá** zo `školy`, tu sa má
**preniesť** na sub-prevádzky).

**Stav: 🔴 čaká na implementáciu.** (Návrh: Codex cez `codex:rescue`, tak ako
`reconcile_real.py` Tier2 zmena.)

---

## 🟢 `facility_aliases.json` — stará alias skladala Rozmanitá Škôlka + Škola dokopy (opravené)

Alias `"Rozmanita Škôlka": [..., "rozmanita skola"]` (skill `compare-real`, nie appka)
ešte z čias pred splitom `Rozmanita Škôlka` / `Rozmanita Škola` (commit `d589201`,
4.8.2026) sčítaval real-riadok školy do škôlky. Po splite má škola vlastnú `Prevadzka`
(`edupage_connection=None`, app-managed) aj vlastný real riadok — starý alias by ju ticho
vynuloval z `app_only`/`real_only` porovnania a napumpoval jej počty do škôlky.

**Opravené 5.8.2026:** `"rozmanita skola"` odstránené zo zoznamu, doplnená poznámka do
komentára súboru. Netýka sa produkčnej appky, len reconcile tooling.

---

## 🔴 Reconcile 3.–5.8.2026 (Po/Ut/St) — nič z tohto nie je chyba appky, potrebuje odpoveď klienta

Meal plan doseedovaný z Week 32 Klasik PDF (predtým chýbal, appka mala pre celý týždeň
`meal_plan_id=null`). Po doseedovaní: counts sedia takmer všade (Po 10/12, Ut 11/12, St
8/9); zvyšné nezrovnalosti sú tieto štyri, opakujúce sa/konzistentné cez viac dní:

**1. „Kuracie v krémovej" — rozpor v receptúre, streda 5.8.** Week 32 Klasik PDF: hlavný
chod `225g (90g/110g/25g)` → Kuracie=90g. Real tabuľka má vo svojom base-gramáž riadku
(KLASIK, row 2) `Kuracie v krémovej = 185g` (Ryža 110g aj Šalát 25g sedia s PDF). Real
sheet je self-consistent (počet × base gramáž = riadkové gramy sedí presne na
Cvernička/Deutsche schule/MŠ Heyrovského 4 — 9×185=1665, 75×185=13875, 2×185=370).
Appka počítala presne to, čo je v PDF menu. → **Otázka: ktoré číslo je správne, 90 alebo
185g?**

**2. MŠ Heyrovského 4 — olovrant chýba v appke, KAŽDÝ deň (Po/Ut/St).** Real tabuľka: 1–2
olovranty denne. Appka: vždy 0. `visible_meals` má olovrant povolený (nie je to appkové
nastavenie), takže títo ľudia sa objednávajú **mimo appky**. → **Otázka: kade, nech to
vieme dohľadať/pokryť appkou.**

**3. Fantastická — 1 obed v appke, real tabuľka celý blok nula, streda 5.8.** Appka len
zobrazila objednávku, ktorú má; real tabuľka hovorí že zariadenie ten deň neobjednávalo
vôbec (možno zatvorené). → **Otázka: prišlo dieťa?**

**4. „Grahamové pečivo" base gramáž = 1g namiesto 50g, pondelok 3.8.** V real tabuľke
(KLASIK base row) — zjavný preklep, spôsobuje umelo veľký gram-diff pre
Cvernička/Fantastická (real vychádza rádovo nižšie, lebo sa násobí 1g namiesto 50g). →
**Otázka: môže klient bunku opraviť?**

**Stav: 🔴 čaká na odpoveď klienta** (všetky 4 body).

---

## Reconciliation findings — 2026-08-08

Reconcile spustený na posledných 2 týždňoch so skutočnými real-tabuľkami:
27.–30.7. a 3.,4.,5.,7.8.2026 (31.7.–2.8. a 6.8. nemajú `.xlsx`, 8.8. je dnes bez
tabuľky). Meal plan doseedovaný z Week 31/32 Klasik PDF (predtým `meal_plan_id=null`
pre všetky). Nový nález oproti predošlým behom:

### 🟢 MŠ Edulienka — chýba `edupage_match`, orders sa nescrapujú NIKDY (vyriešené)

Pri scrape každého z 8 dní (27.7.–7.8.) sa opakuje presne táto chyba:

```
scrape_edupage_orders_task: MŠ Edulienka má 3 prevádzok, ale MŠ Edulienka
nemá edupage_match — preskakujem, aby sa objem nezapísal nesprávne
```

Celok „MŠ Edulienka" má 3 prevádzky (default placeholder + Palisády + Stupava), ale
placeholder prevádzka „MŠ Edulienka" nemá `edupage_match`, takže scraper celú skupinu
z bezpečnostných dôvodov preskočí.

**Príčina bola už opravená v `#435`** (`seed_prevadzky_edupage.py`: `SPLITS` bol kľúčovaný
na holé `"Edulienka"`, nie na skutočný `Celok.nazov` `"MŠ Edulienka"`, takže split na
Palisády/Stupava sa pri reseede ticho preskakoval) — commit je v `develop`, len lokálna
dev DB nebola po ňom pretiahnutá cez `seed_prevadzky_edupage`. Spustené `--dry-run` aj
naostro proti dev DB: placeholder „MŠ Edulienka" teraz `is_active=False`, Palisády/
Stupava majú `edupage_match` aj zdedený `edupage_connection`/koeficient. Overené
rescrapom 7.8.2026: `scraped` 25→27, `skipped`/`errors` 0.

**Stav: 🟢 vyriešené (kód mal fix už na developi, dev DB doseedovaná).**

### 🟡 Montessori — obed skoro opravený, olovrant a facility-alias stále chýbajú (čiastočne vyriešené)

27.–30.7.: appka pre „Montesori škôlka" ukazovala 1–2 obedy/deň, real tabuľka 19–24.
Scrape log za tieto 4 dni hlásil:

```
scrape_edupage_orders_task: empty result for Montessori/montesori škola on <date>
meals=[] (warnings=[], unmapped=['A:MŠ/ZŠ Iná'])
```

**Príčina (opravené):** `resolve_menu_variant` v `edupage_scraper.py` rozpoznávala
len `"klasik"`/`"classic"` ako bežné menu; EduPage nazýva Montessori kombinovanú
MŠ/ZŠ triedu `"MŠ/ZŠ Iná"`, ktorá sa preto vyhodnotila ako neznáma diéta a celá sa
zahodila (`unmapped`). Pridaný normalizovaný literál `"mszsina"` do
`_CLASSIC_MENU_NAMES` (over, že nekoliduje so žiadnym diet keywordom —
skontrolované) + regresný test. Rescrape po fixe, 4/4 dni (27.–30.7.), lunch
(vrátane diét) presne sedí s real tabuľkou (`Montesori škôlka` riadok samotný,
20/20/20/17 base + diety) — malé jednotkové odchýlky v tier1 reporte sú tým, že
report tam nesčítava diety do lunch total, nie appková chyba.

**Olovrant (opravené, + bonus nález):** appka nescrapovala olovrant vôbec
(`nastavenia` je pre Montessori prázdny zoznam — EduPage nedodáva `vydaj_normal`
časy, niet z čoho odvodiť samostatný olovrant jid). Overil som 4/4 dni (27.–30.7.):
real workbook snack/olovrant riadok `Montesori škôlka` **presne sedí** s appkiným
lunch `menuCounts` súčtom. Rovnaký vzor ako existujúci `OlovrantMode.ODVODIT_Z_OBEDU`
(Pramienok — "olovrant = obed", zdokumentované v `registry.py`). Pridaný
`PrevadzkaConfig(subdomena="montessorisk", ..., olovrant_mode=ODVODIT_Z_OBEDU)`.

Pri overovaní sa našiel **samostatný, všeobecnejší bug**: `apply_config`
(`api/edupage/base.py`) upravovala len `result.order_data` (súhrn za celý feed),
ale `tasks.py` pre KAŽDÝ celok rozdelený na viac prevádzok (napr. Montessori
Škôlka+Škola na jednom feede) zapisuje do DB `result.order_data_by_prevadzka`,
ktoré `apply_config` nikdy neupravila — `ODVODIT_Z_OBEDU`/`MIMO_APPKY`/`NEZNAMY`
logika sa v praxi aplikovala len na jedno-prevádzkové celky. Opravené: `base.py`
teraz aplikuje olovrant pravidlo na `order_data` aj na každú položku
`order_data_by_prevadzka` samostatne (`config_notes` sa pridáva len raz, za celok,
nie duplicitne). Regresný test pridaný, 629/629 zelených. Overené reconcile behom
4/4 dní: **snack diff 0/0/0/0** (predtým 22/-21/-21/-18).

**Čo zostáva otvorené — genuinná onboarding medzera, nie mapping bug:**
Real tabuľka má okrem `Montesori škôlka`/`montesori škola` (appkine 2 prevádzky)
**3 ĎALŠIE samostatné riadky** s vlastnou dodávkou/adresou, nie preklepy:
```
Montessori pod lesom - Škôlka - Hranie     (Škôlka pod Lesom)   ~17–19 porcií/deň
Montessori pod lesom - Škôločka - Hranie   (Pizza box/Kocka)    ~7–8 porcií/deň, "bez olovrantu"
Montessori pod lesom - ŠKOLA - Hranie      (len piatok, Menu B) 0 väčšinu dní
```
(`montesori škola` appkina ZŠ prevádzka je v reáli **nulová** každý deň — poznámka
„Nakladanie:" — appkine 1–2 objednávky pre ňu nemajú v real tabuľke žiadny
náprotivok, malý objem.) „Pod lesom" skupiny vyzerajú ako samostatná fyzická
pobočka (iná adresa/box, iný dodávateľský kanál pre olovrant), nie duplicitný
zápis toho istého — appka pre ne nemá žiadnu `Prevadzka` ani `edupage_match`.
Nechcel som vytvárať nové prevádzky/aliasy bez potvrdenia, ide o ~25 porcií/deň
(reálne peniaze), treba klientovo rozhodnutie, či a ako tieto 3 skupiny zaviesť.
→ **Otázka na klienta**: sú „Montessori pod lesom" skupiny osobitná pobočka, ktorá
sa má v appke zaviesť ako nová/é `Prevadzka` (s vlastným `edupage_match`), a čo je
zdroj ich olovrantu/counts, keď EduPage `nastavenia` pre celú Montessori doménu nič
nedodáva?

**Stav: 🟢 obed aj olovrant appkinej existujúcej prevádzky opravené a overené (4/4 dní).
🔴 „pod lesom" pobočky čakajú na klienta — nová onboarding práca, nie bug.**

### 🟡 Deutsche schule — obed konzistentne −3, tri dni za sebou (3.–5.8., nízka istota)

```
3.8.: app 79 vs real 82   4.8.: app 77 vs real 80   5.8.: app 72 vs real 75
```

Presne −3 každý deň, čo sa premieta aj do Tier2 gramáže polievky (−600g = 3×200ml).
Filipa Nériho/Cvernička/Rozmanita Škôlka majú v tomto behu podobné konzistentné
rozdiely (viď nižšie), ale pre tie už máme z minulých reconcile behov potvrdené od
klienta, že ide o jeho ručné úpravy mimo EduPage (viď sekcie vyššie: Filipa Nériho
„nemôže prísť menej", Rozmanitá manuálne dopĺňanie). Pre Deutsche schule takéto
vysvetlenie zatiaľ nemáme a −3 obedy je dosť veľký & pravidelný objem na to, aby to
bola náhoda. → **Otázka na klienta**, či má Deutsche schule podobnú manuálnu úpravu,
alebo treba appku preveriť.

**Stav: 🔴 čaká na odpoveď klienta / vyšetrenie.**

### ⚪ Fantastická — obed v appke, real tabuľka 0 (5.8. aj 7.8., pravdepodobne nie appková chyba)

Appka ukazuje 5 obedov (1000g polievky), real tabuľka má pre Fantastickú za tieto dva
dni riadok s nulou (celý blok chýba/0). Vyzerá to na zatvorené zariadenie tie dni,
kde appka nedostala/nespracovala info o zatvorení — v súlade s precedentom vyššie
(„Fantastická +1" bola dohodnutá dočasná úprava tento týždeň predtým, klient si
podľa všetkého mení počty ad-hoc). Nízka istota, treba sa spýtať klienta, či
Fantastická tieto dni skutočne neobjednávala.

### ⚪ Receptúra PDF vs. real tabuľka — 2 nové rozpory (nie appková chyba)

- **5.8. (streda), hlavný chod:** Week 32 Klasik PDF delí `225g (90g/110g/25g)` na
  Kuracie/ryžu/šalát. Real tabuľka (Hárok1 base-gramáž riadok KLASIK) má namiesto 90g
  **185g** pre „Kuracie v krémovej" (rovnaká hodnota ako už zdokumentovaný nález č.1
  v sekcii „Reconcile 3.–5.8.2026" vyššie — potvrdzuje sa aj pri tomto behu,
  self-check v tabuľke sedí, PDF a real si odporujú).
- **7.8. (piatok), hlavný chod:** PDF opisuje jedno kombinované jedlo `185g (Cestoviny
  v krémovej omáčke)`, real tabuľka ho ale rozpisuje na dva samostatné stĺpce
  „Krémová omáčka" (90g) + „Cestoviny" (100g) — súčet 190g, nie 185g, a PDF nedáva
  žiadny podklad na to, ako presne tento súčet rozdeliť medzi dva stĺpce. Appka bola
  preto naseedovaná len s jedným kombinovaným komponentom (185g „Cestoviny"), čo
  spôsobí očakávaný Tier2 diff — nejde o appkovú chybu, len o chýbajúci recept-split
  v PDF menu.

**Stav: ⚪ info pre kuchyňu/klienta, netýka sa appky.**

