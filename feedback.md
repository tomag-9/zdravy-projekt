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
