# EduPage → diéty, per prevádzka

Živý zoznam: pre každú EduPage prevádzku (má riadok v `backend/api/edupage/registry.py`)
zapisuje, **čo appka v EduPage vidí** (skratka menu písmena, `nazov`, alebo payer/platiteľský
label) a **na akú našu diétu (`Diet.name`) to mapuje**. Cieľ: keď príde nová/sporná skratka,
najprv sa pozrieť sem, či už nie je vyriešená; keď sa vyrieši, zapísať sem.

Zdroje:
- **Explicitné pravidlá** (`letter_hook`/`payer_hook`) — `backend/api/edupage/overrides/*.py`,
  registrované v `backend/api/edupage/registry.py`. Toto je istá, potvrdená mapa — user ju
  odsúhlasil ku konkrétnemu dátumu (v kóde pri každom pravidle je aj dátum/dôvod).
- **Generický engine** (fallback, keď žiadny hook neexistuje/nevráti pravidlo) —
  `_SKRATKA_MAP`/`_NAZOV_KEYWORD_MAP` v `backend/api/edupage_scraper.py`, fuzzy-match na
  substring. Menej spoľahlivý pri zložených skratkách (viď poznámky nižšie).
- **Realita v appke** — čo je aktuálne (14.9.2026 – najbližšie naplánované dni, do 18.9.2026)
  reálne v `DailyOrder.data` v produkcii (read-only SSH dump, `zp`), na krížovú kontrolu, že
  zoznam nižšie sedí s tým, čo sa fakticky objednáva.

> Aktualizuj priebežne — keď pribudne nový `letter_hook`/`payer_hook` riadok alebo sa objaví
> nová skratka v `unmapped_diets`/`uncertain_diets`, dopíš ju do príslušnej sekcie.

---

## Obsah

1. [ABC Club](#abc-club-abcclub)
2. [Pramienok](#pramienok-skolkapramienok)
3. [Montessori (Borínska)](#montessori-borínska-montessorisk)
4. [Jolly Homeschool](#jolly-homeschool-jollyhomeschool)
5. [ZŠ Ivanka pri Dunaji](#zš-ivanka-pri-dunaji-zsivanka)
6. [Fantastická Škola](#fantastická-škola-szsfan)
7. [MŠ Edulienka](#mš-edulienka-edulienka)
8. [Zdravé Brúško (MIX)](#zdravé-brúško-mix-zdravebrusko)
9. [CMŠ Pezinok](#cmš-pezinok-cmspezinok)
10. [EMŠ Strečnianska 15](#emš-strečnianska-15-emsmelanchtona)
11. [Dobrodružstvo](#dobrodružstvo-dobrodruzstvo)
12. [MŠ Filipa Nériho](#mš-filipa-nériho-msfilipaneriho)
13. [Cvernička](#cvernička-skolkacvernicka)
14. [MŠ Fantastická (škôlka)](#mš-fantastická-škôlka-fantastickaskolka)
15. [MŠ Libellus (+ Stromček)](#mš-libellus--stromček-mslibellus)
16. [Rozmanitá](#rozmanitá-rozmanita)
17. [Školička MŠ (Lúka/Les)](#školička-mš-lúkales-skolickams)
18. [Školička ZŠ](#školička-zš-skolicka)
19. [Klubík (MŠ Dobrého Pastiera)](#klubík-mš-dobrého-pastiera-msdobrehopastiera)
20. [MŠ Felix Karlovská](#mš-felix-karlovská-msfelixkarloveska)
21. [MŠ Krasňanko](#mš-krasňanko-krasnanko)
22. [British School](#british-school-zdravyprojekt)
23. [Generický fallback engine (keď žiadny hook nesedí)](#generický-fallback-engine)

---

## ABC Club (`abcclub`)

Onboarding 9/2026. Payer skupina bez skratky/názvu, z ktorého sa dá diéta odvodiť.

| V EduPage vidíme | Je to diéta |
|---|---|
| payer label „NoNo dieťa s dotáciou" | **NONO** |

Zdroj: `abcclub_payer_hook`. Realita (14.–18.9.2026): NONO × 15 — sedí presne.

---

## Pramienok (`skolkapramienok`)

Len jid=2 (obed) — raňajky aj olovrant sa odvodzujú z obeda (`ranajky_z_obedu=True`,
`OlovrantMode.ODVODIT_Z_OBEDU`), žiadny vlastný letter/payer hook pre diétu. Ide cez
[generický fallback](#generický-fallback-engine) (napr. „bezglutenove"/„nogluten" → NO GLUTEN).

| V EduPage vidíme (fragment v `nazov`) | Je to diéta |
|---|---|
| „nohovadzietelacie" (napr. „Klasik bez hovädzie/teľacie") | **No Hovädzie/Teľacie, Bravčové mäso** |

Zdroj: `_NAZOV_KEYWORD_MAP["nohovadzietelacie"]` v `edupage_scraper.py` — je to fallback-mapa,
ale kľúč bol pridaný špecificky kvôli Pramienku (EduPage `nazov` obsahuje aj slovo „Klasik", bez
tohto fragmentu by `resolve_menu_variant()` celý riadok vyhodnotil ako obyčajné Menu A a diéta
by sa stratila potichu, bez ohlásenia).

Realita (14.–18.9.2026): NO GLUTEN × 15. „No Hovädzie/Teľacie, Bravčové mäso" sa v tomto okne
neobjavuje (0 objednávok práve teraz) — mapovanie je aj tak zapísané vyššie, nech sa vie, že
existuje, keď sa dieťa nabudúce objedná.

---

## Montessori (Borínska) (`montessorisk`)

**Pravidlo nie je „ignoruj zamestnancov" — je to „Bežná" vs. „Iná" podľa skratky, nič iné.**
`montessori_letter_hook` sa pozerá len na to, či skratka začína prefixom `INÁ` (po normalizácii
bodiek/medzier): ak áno, riadok sa **berie** (nech nesie diétu, porciu, alebo je to
zamestnanec); ak nie (t.j. je to variant „Bežná"), riadok sa **skipne**, nech je to čokoľvek —
dieťa, zamestnanec, s diétou aj bez. `skip=True` teda nerozlišuje diéty od ničoho iného, rieši
sa tým celý riadok (porcia, počet, aj prípadná diéta na ňom).

Živé písmená (overené naživo 4.8.2026): A=„Iná"/„MŠ/ZŠ Iná", B=„MŠ"/„MŠ Bežná",
C=„ZŠ"/„ZŠ Bežná", D=„Iná NmNo"/„Iná NOmilk,NOgluten", F=„ZŠ 1."/„.ZS 1 stupeň",
G=„ZŠ FK 2."/„ZŠ FoodKut 2.", H=„ZŠ zam."/„**Zamestnanec Bežná**", I=„FK zam."/„**Zamestnanec
FoodKut**", J=„FK MŠ bezl."/„MŠ FoodKut bezlepková" — H aj I sú *zamestnanecké*, ale skratka je
„Bežná" variant, nie „Iná", takže sa aj napriek tomu, že ide o zamestnanca, **skipnú**. Keby na
tomto feede pribudla skratka „ZŠ Iná zamestnanec" (Iná variant pre zamestnanca), podľa tej istej
logiky by sa **zobrala** — prefix `INÁ` rozhoduje, nie to, či ide o dieťa alebo zamestnanca.

| V EduPage vidíme (skratka, po normalizácii bodiek/medzier) | Je to diéta |
|---|---|
| `Iná` / `MŠ/ZŠ Iná` (menu A, bez ďalšej skratky) | necháva engine (žiadna diétna prípona) |
| `Iná NmNgNe` | **NO MILK – NO GLUTEN – NO EGG** |
| `Iná NmNg` | **NO MILK/NO GLUTEN** |
| ľubovoľná skratka **nezačínajúca** na „Iná" (B/C/F/G/H/I/J, vrátane „Zamestnanec Bežná"/„Zamestnanec FoodKut") | **preskočené celé** — appka to z EduPage vôbec nepočíta (nielen diétu, celý riadok) |
| (hypoteticky) skratka **začínajúca** na „Iná" pre zamestnanca | **berie sa** rovnako ako dieťa — rozhoduje prefix, nie kto objednáva |

Zdroj: `montessori_letter_hook`. Prevádzky na tomto configu: „Montesori škôlka" a „montesori
škola" (celodenná dochádzka len pre škôlku — `ranajky_z_obedu_prevadzky`/
`olovrant_z_obedu_prevadzky` obmedzené na „Montesori škôlka").

Realita: „Montesori škôlka" NO MILK–NO GLUTEN × 10; „montesori škola" NO MILK–NO GLUTEN × 32,
NO MILK–NO GLUTEN–NO EGG × 7 — sedí s pravidlami.

---

## Jolly Homeschool (`jollyhomeschool`)

Žiadny letter/payer hook — 3 samostatné účty (Jolly 1/2/3), olovrant `MIMO_APPKY`. Ide cez
[generický fallback](#generický-fallback-engine).

Realita (14.–18.9.2026): NO MILK, NO GLUTEN, VEGGIE naprieč Jolly 1/2/3 — bežné diéty, žiadny
unmapped/uncertain záznam.

---

## ZŠ Ivanka pri Dunaji (`zsivanka`)

| V EduPage vidíme (skratka) | `nazov` (celý, rozhoduje) | Je to diéta |
|---|---|---|
| `NGNF` | „NoGluten/NoFish" | **NO GLUTEN – NO FISH** |
| `NMNE` | „NoMilk/NoEgg" | **NO MILK/NO EGG** |
| `MŠ NMNG bez ARAS` | „MŠ NoMilk/NoGluten bez Arašidov" | **NO MILK – NO GLUTEN – NO ARASIDY** |
| `Ng+Olo` | — | **NO GLUTEN** |
| `NMNGnORECH`, `nazov` obsahuje „orech" | „NoMilk/NoGluten/NoOrech" | **NO MILK – NO GLUTEN – NO ORECH** |
| `NMNGnORECH`, `nazov` bez „orech" | „NoMilk/NoGluten" | necháva engine → NO MILK/NO GLUTEN |

Zdroj: `ivanka_letter_hook`. Pozor: **Menu A = NM** (no milk), nie klasik.

**`cms` prefix patrí sem, nie Edulienke** — na zdieľanom ZŠ Ivanka feede objednáva aj **CMŠ
Ivanka** (vlastný subjekt na tom istom EduPage, vlastný prefix skratky). Predchádzajúca verzia
tohto dokumentu mala `cmsNM`/`cmsNMNE`/`cmsNMNG` chybne pod MŠ Edulienka — overené s userom
15.9.2026 (Edulienka v EduPage žiadne „cms" skratky nemá). Oprava (`CMSNMNE` presunuté do
`ivanka_letter_hook`) je pripravená v `backend/api/edupage/overrides/ivanka.py`, zatiaľ ako
necommitnutá zmena:

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `cmsNMNE` | **NO MILK/NO EGG** |

> ⚠️ **Ešte doplniť/skontrolovať**: len `cmsNMNE` je zatiaľ v `ivanka.py` vyriešené. Ak sa u
> CMŠ Ivanka objavia aj `cmsNM`/`cmsNMNG` (analogicky k pôvodným, mylne umiestneným pravidlám v
> `edulienka.py`), treba ich sem pridať s rovnakým overením ako `cmsNMNE`. Zároveň skontroluj,
> že `edulienka.py`/`edulienka_letter_hook` po tejto oprave už žiadne `cms`-pravidlá neobsahuje
> (mŕtvy/chybný kód, viď sekcia MŠ Edulienka nižšie).

Realita (14.–18.9.2026): NO EGG×9, NO GLUTEN×18, NO GLUTEN–NO FISH×2, NO MILK×23,
NO MILK–NO GLUTEN×9, NO MILK–NO GLUTEN–NO ORECH×9 — sedí.

---

## Fantastická Škola (`szsfan`)

Samostatné EduPage pripojenie od MŠ Fantastická (nižšie) — len meno je spoločné.

| V EduPage vidíme (skratka) | `nazov` | Je to diéta |
|---|---|---|
| `HITNMNGnSnKnFC` | „HITnomilk/noGlu/noSoja/noKuk/noRafcukor" | **NO MILK – NO GLUTEN – HISTAMIN – NO SOJA – NO CUKOR – NO KUKURICA** |
| payer „2.stupeň DIABETI" | — | porcia sa force-uje na **ZŠ 2.stupeň** (EduPage má preklep, `porcia=1`) |

Zdroj: `fantasticka_letter_hook` / `fantasticka_payer_hook`. Olovrant `MIMO_APPKY` (škola ho
cez EduPage nikdy neobjednáva).

Realita (14.–18.9.2026): DIA×5, NO MILK×10, NO MILK–NO GLUTEN–HISTAMIN–NO SOJA–NO CUKOR–NO
KUKURICA×4 — sedí (DIA ide cez generický fallback, `_SKRATKA_MAP["DIA"]`).

---

## MŠ Edulienka (`edulienka`)

Dva účty na jednom feede — split podľa menu prefixu P (Palisády) / S (Stupava), sčítava sa +
dotácia (nededup).

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `HISTAMIN, NO GLUTEN` (presný `nazov`) | **NO GLUTEN – HISTAMIN** |

Zdroj: `edulienka_letter_hook`.

> 🔴 **Chyba v kóde, nie v tomto dokumente**: `edulienka_letter_hook` (`edulienka.py`, commit
> `df85b03`) má aktuálne v `_RULES` aj `cmsNM`/`cmsNMNE`/`cmsNMNG` → NO MILK / NO MILK–NO EGG /
> NO MILK–NO GLUTEN. **Overené s userom 15.9.2026: MŠ Edulienka v EduPage žiadne skratky s
> prefixom `cms` nemá** — `cms` patrí **CMŠ Ivanka** (samostatný subjekt na zdieľanom ZŠ Ivanka
> feede, viď [sekcia Ivanka](#zš-ivanka-pri-dunaji-zsivanka)), boli sem priradené omylom pri
> zakladaní `edulienka.py`. Potvrdzujú to aj produkčné `scrape_flags.uncertain_diets` — `cms`
> skratky sa objavujú zavesené na prevádzke „ZŠ Ivanka pri Dunaji", nie na „MŠ Edulienka". Tieto
> tri riadky v `edulienka.py` treba pri najbližšej úprave vymazať ako mŕtvy/chybný kód (fix pre
> CMŠ Ivanka sa medzičasom rieši priamo v `ivanka.py`, zatiaľ necommitnuté).

Realita (14.–18.9.2026), prevádzka „MŠ Edulienka": NO GLUTEN×10, NO GLUTEN–HISTAMIN×5,
NO MILK×36, NO MILK–NO GLUTEN×9, NONONO×4, VEGGIE×6 — NO MILK/NO MILK–NO GLUTEN tu reálne
vznikajú (36×, 9×), no keďže mylné `cms` pravidlá v `edulienka.py` v produkcii bežia, nedá sa z
tohto súčtu spoľahlivo overiť, či ich generuje mŕtvy `cms` kód alebo generický fallback (bežné
`_SKRATKA_MAP`/`_NAZOV_KEYWORD_MAP` fragmenty „nomilk"/„nogluten" by na tieto diéty trafili aj
bez neho) — over pri odstraňovaní `cms` riadkov, že sa tieto počty nezmenia. V `unmapped_diets`
visí `J:HISTAMIN, NO GLUTEN` — **skratka `J` nie je v `_RULES` mapovaná priamo, len presný
`nazov` reťazec**; over, či EduPage posiela `nazov` konzistentne aj pre písmeno J, alebo treba
doplniť kľúč do `_RULES` podľa skratky.

---

## Zdravé Brúško (MIX) (`zdravebrusko`)

5 celkov zdieľajúcich jedno EduPage URL (scrape grupuje podľa URL; split po školách cez
`edupage_match`, viď [[CLAUDE.md]] doménový model): Deutsche Schule (`dsb`), MŠ Heyrovského 4
(`mšHey.`), MŠ Malokarpatké nám. 6 (`mšMal.`), ZŠ Malokarpatská (`zšla`).

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `dsbNMNE` | **NO MILK/NO EGG** |
| `dsbNM` | **NO MILK** |
| `dsbNNN SJ` | **NO MILK – NO GLUTEN – NO EGG – NO SOJA – NO JABLKO – NO TELACIE** |
| `dsbNGNM` | **NO MILK – NO GLUTEN** |
| `dsbNO` | **NO ORECH** |
| `mšHey. NG` | **NO GLUTEN** |
| `mšMal. NM` | **NO MILK** |
| `mšMal. NG` | **NO GLUTEN** |
| `zšlaNG` | **NO GLUTEN** |
| `zšlaNMnEnOnJ` | **NO MILK – NO EGG – NO ORECH – NO JABLKO** |
| `zšlaNM` | **NO MILK** |
| `zšlaNM B` | **NO MILK – NO BANÁN** |
| `sšvV` (payer skupina SŠ Veterinárna) | vlastné **Menu V** (nie diéta VEGGIE!) |
| payer „MŠ NoNoNo Bez Sóje a Jablka" (na zdieľanom `dsb`-písmene) | **NO MILK – NO GLUTEN – NO EGG – NO SOJA – NO JABLKO – NO TELACIE** |
| payer „MŠ Mal.*"/„MŠ Hey.*" (raňajky/olovrant, zdieľajú `dsbNMNE` písmeno s Deutsche Schule) | diéta sa odvodí z payer mena (NoMilk/NoGluten/NoBanán fragmenty), `force_match` ju priradí správnej MŠ, nie Deutsche Schule |

Zdroj: `zdravebrusko_letter_hook` / `zdravebrusko_payer_hook`. ZŠ Malokarpatská nemá na tomto
feede raňajky/olovrant vôbec (`olovrant_missing_ok`).

Realita (14.–18.9.2026): Deutsche Schule NO MILK×4, NO MILK–NO GLUTEN×1, plná kombinácia×4,
NO ORECH×4; MŠ Heyrovského 4 NO GLUTEN×12; MŠ Malokarpatké nám. 6 NO GLUTEN×18, NO MILK×12;
ZŠ Malokarpatská Lamač NO GLUTEN×24, NO MILK×4, NO MILK–NO BANÁN×4.

> ℹ️ **Overené 15.9.2026 (živý fetch surového EduPage JSON), false-positive, nie chýbajúca
> diéta**: obom prevádzkam (Heyrovského, Malokarpatké nám. 6) sa v `unmapped_diets` hlási
> `C:Diéta Lamač`. Nie je to nová/premenovaná diétna skratka — je to len **názov, ktorý EduPage
> dáva samotnému písmenu C na raňajkovom/olovrantovom jide** (`skratka="mšMal,Hey"`,
> `nazov="Diéta Lamač"`; na obedovom jide má tá istá litera C iný, už mapovaný obsah —
> `dsbNMNE`/„NoMilk/NoEgg"). Deti pod týmto písmenom sú platiteľské skupiny „MŠ Mal. NoMilk"
> (payer 17) a „MŠ Hey. NoGluten" (payer 21) — presne tie, čo už rieši `force_match` v
> `zdravebrusko_payer_hook` vyššie, takže **diéty aj počty sa priraďujú správne** (NO MILK →
> mšMal, NO GLUTEN → mšHey). `unmapped_label` sa ale počíta z `nazov` písmena C ešte pred touto
> payer-úrovňovou logikou a pridá sa do `scrape_flags` bez ohľadu na to, že payer_hook diétu
> napokon doriešil — je to kozmetický šum v logu, nie zle/nepriradená diéta. Nič tu netreba
> mapovať.

---

## CMŠ Pezinok (`cmspezinok`)

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `H` | **nič — skip** (= „Hlavná budova", administratívna skupina, cena 0; NIE Histamín napriek exaktnej zhode s generickým `_SKRATKA_MAP["H"]`) |

Zdroj: `cmspezinok_letter_hook`. Ostatné skratky idú cez [generický fallback](#generický-fallback-engine).

Realita (14.–18.9.2026): NO GLUTEN×12.

---

## EMŠ Strečnianska 15 (`emsmelanchtona`)

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `nGnS` | **NO GLUTEN – NO SOJA** |

Zdroj: `strecnianska_letter_hook`.

Realita (14.–18.9.2026): NO GLUTEN×15, NO MILK–NO GLUTEN×15 (NO MILK–NO GLUTEN ide cez
generický fallback, nie je v `_RULES` explicitne — over, či treba zapísať aj tento riadok).

---

## Dobrodružstvo (`dobrodruzstvo`)

MŠ a ZŠ Dobrodružstvo na jednom feede.

| V EduPage vidíme | Je to diéta |
|---|---|
| skratka `nPAR` | **NO PARADAJKA** |
| generický fragment „bezlep" | NO GLUTEN (generický engine, OK) |
| payer label obsahuje „bezlak" | **NO MILK** (bez laktózy — nebolo v generickej keyword mape, doplnené hookom) |
| payer label „1.st.*" / „2.st.*" | porcia sa force-uje na ZŠ 1./2. stupeň podľa payer labelu (EduPage `porcia` kód je pre 4 z 5 skupín nesprávny) |

Zdroj: `dobrodruzstvo_letter_hook` / `dobrodruzstvo_payer_hook`. ZŠ Dobrodružstvo (starší žiaci)
olovrant cez EduPage nikdy neobjednáva (`olovrant_missing_ok`).

Realita (14.–18.9.2026): MŠ Dobrodružstvo VEGGIE×14; ZŠ Dobrodružstvo HISTAMIN×3, NO GLUTEN×3,
NO MILK×1, NO PARADAJKA×10, VEGGIE×3 — sedí.

---

## MŠ Filipa Nériho (`msfilipaneriho`)

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `No med,mak,orechy` | **NO MED, MAK, ORECH** |
| `No zemiak` | **NO ZEMIAK** |
| `No orech` | **NO ORECH** |
| `NG hríb` (aj „NoGlutenNoHríb") | **NO GLUTEN, HRÍBY** |
| `NNNO` (aj „NoNoNo orech") | **NONONO, NO ORECH** |

Zdroj: `filipaneriho_letter_hook`.

Realita (14.–18.9.2026): NO GLUTEN×1, NO GLUTEN–NO HUBY×2 (pozor: „NO GLUTEN – NO HUBY" ≠
„NO GLUTEN, HRÍBY" v tabuľke vyššie — over, či ide o ten istý Diet záznam pod iným
formátovaním, alebo o skutočne inú diétu), NO MILK×9, NO ORECH×12, NO ZEMIAK×9.

---

## Cvernička (`skolkacvernicka`)

| V EduPage vidíme (skratka) | `nazov` | Je to diéta |
|---|---|---|
| `nMnČnJ` | „NMnKako,nJahody" | **NO MILK/NO KAKAO/NO JAHODA** |
| `nMnOnJnPnČnŠnZEL` | „nMOREnPARnJAHnKAKnŠKOnZELER" | **NO MILK/NO ORECH/NO PARADAJKA/NO JAHODA/NO KAKAO/NO SKORICA/NO ZELER** |
| `AnHorčica` | „Klasik/noHorčica" | **NO HORCICA** |

Zdroj: `cvernicka_letter_hook`.

Realita (14.–18.9.2026): NO HORCICA×10, VEGAN×10 (generický fallback), a **NO MILK – No
Čokoláda – NO JAHODA × 6** — nový tvar, ktorý sa nezhoduje presne so žiadnym z troch riadkov
vyššie (podobný `nMnČnJ`, ale „No Čokoláda" namiesto „No Kakao" a iný oddeľovač). ⚠️ **Over** či
ide o rovnaké dieťa/diétu premenovanú v appke, alebo novú diétu, ktorú treba dopísať do
`_RULES`.

---

## MŠ Fantastická (škôlka) (`fantastickaskolka`)

| V EduPage vidíme (skratka) | `nazov` | Je to diéta |
|---|---|---|
| `B` | „MŠ nM/nG" | **NO MILK/NO GLUTEN** |

Zdroj: `fantastickaskolka_letter_hook`.

Realita (14.–18.9.2026): NO MILK–NO GLUTEN×15 — sedí.

---

## MŠ Libellus (+ Stromček) (`mslibellus`)

| V EduPage vidíme (skratka) | `nazov` | Je to diéta |
|---|---|---|
| `NENO` | „NoEgg/NoOrech" | **NO EGG – NO ORECH** |
| `NMNE` | „NoMilk/NoEgg" | **NO MILK/NO EGG** |
| `NENOnPARnMAK` | — | **NO EGG – NO PARADAJKA – NO ORECH – NO MAK** |
| `sA` | „Stomček Klasik" (preklep za Stromček) | **patrí Stromčeku** — nie diéta, len Menu A; zapíše sa ako samostatný externý snapshot Stromčeka (`external_order_prevadzka`), nesčíta sa do Libellusu |

Zdroj: `libellus_letter_hook`. Libellus a Stromček zdieľajú jeden EduPage feed.

Realita (14.–18.9.2026), MŠ Libellus: NO EGG–NO PARADAJKA–NO ORECH–NO MAK×12, NO MILK×23,
NO MILK–NO EGG×5, a **„Klasik STROMČEK" × 15** — pravdepodobne zobrazenie `sA` relay riadku v
appke (nie skutočná Libellus diéta), over že sa nesčítava duplicitne s vlastným Stromček
snapshotom.

---

## Rozmanitá (`rozmanita`)

Split MŠ (Rozmanitá Škôlka) / ZŠ (Rozmanitá Škola).

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `NoMO` | **NO MILK – NO ORECH** |
| `NNNO` (aj „NoNoNo bezO") | **NONONO, NO ORECH** |

Zdroj: `rozmanita_letter_hook`. Rozmanitá Škola (ZŠ) olovrant cez EduPage nikdy neobjednáva
(`olovrant_missing_ok`).

Realita (14.–18.9.2026): MŠ Rozmanitá NO MILK–NO GLUTEN–NO EGG–NO ORECH×7, NO MILK–NO
ORECH×9, VEGGIE×25; Rozmanitá Škola NO GLUTEN×7, NO MILK×29, NO MILK–NO GLUTEN×5, NONONO×4,
VEGGIE×21 — sedí (NONONO samostatne aj v kombinácii, `NNNO`→„NONONO, NO ORECH" tu vidno len
nepriamo, keďže tabuľka ukazuje čisté NONONO aj — over že sa neduplikuje s explicitným
pravidlom).

---

## Školička MŠ (Lúka/Les) (`skolickams`)

Payer prefix `B`/`BM` (aj nový `nM`, škola premenovala 3.9.2026) = **dodávateľ** (Bruško /
Bruško Milk), NIE výdajňa — pred matchom sa strihne.

| V EduPage vidíme | Je to diéta |
|---|---|
| prefix `BM -` / `nM -` (pred názvom výdajne) | **NO MILK** |
| prefix `B -` (bez M) | klasik, bez diéty |
| payer/skratka `ŠPECI - Lúka` (aj samotné menu písmeno `ŠPECI`) | **NO GLUTEN – NO ORECH – NO STRUKOVINY – NO PARADAJKA – NO PAPRIKA – NO POHANKA – NO SOJA – NO QUINOA** (jedno konkrétne dieťa, p. Berlak/Kohút, potvrdené 1.–2.9.2026) |
| payer „Hosť" (bez výdajne) | ráta sa k **Lúke** (rozhodnutie usera) |

Zdroj: `skolickams_payer_hook` / `skolickams_letter_hook`.

Realita (14.–18.9.2026): „Lúka" NO GLUTEN–NO ORECH–NO STRUKOVINY–NO PARADAJKA–NO PAPRIKA–NO
POHANKA–NO SOJA–NO QUINOA×11, NO MILK×12 — sedí; „Les" žiadne diéty v tomto okne.

---

## Školička ZŠ (`skolicka`)

Diéta je zakódovaná v **payer labeli**, tvar `{1.stupeň|2.stupeň} - {variant}`.

| V EduPage vidíme (payer variant po pomlčke) | Je to diéta |
|---|---|
| `klasik` | bez diéty |
| `vege` / `histamín` (celé slovo) | generický fragment-match → VEGGIE / HISTAMIN |
| `H` (samostatné písmeno) | **HISTAMIN** |
| `BM`/`NM` (a kombinácie) | **NO MILK** |
| `BG`/`NG` | **NO GLUTEN** |
| `BM,BG` / `BMBG` / `nMnG` | **NO MILK/NO GLUTEN** |
| menu písmeno B alebo „Učiteľské menu" (skratka C) | prebíja diétu z payera — dieťa/učiteľ s diétou si podľa EduPage smie objednať klasické menu B/C namiesto svojej diéty (ich zodpovednosť) |

Zdroj: `skolicka_zs_payer_hook` / `skolicka_zs_letter_hook`. Prefix `B`/`N` („bez"/„no") sa
nerozlišuje, len druhé písmeno (M/G) rozhoduje.

Realita (14.–18.9.2026): Školička 1.stupeň HISTAMIN×4, NO MILK×11, NO MILK–NO GLUTEN×4;
Školička 2. stupeň NO MILK×5, NO MILK–NO GLUTEN×4 — sedí.

---

## Klubík (MŠ Dobrého Pastiera) (`msdobrehopastiera`)

Žiadny letter/payer hook — 3 payery (MŠ/Učiteľ/Hosť), bez date-range. Ide cez
[generický fallback](#generický-fallback-engine); `_SKRATKA_MAP["NOGLUTEN"]` má explicitnú
poznámku „MŠ Dobrého Pastiera píše skratku vypísanú celú".

Realita (14.–18.9.2026): žiadne diéty v okne (prázdne `diets`) — over, či je to očakávané
(žiadne dieťa s diétou práve teraz), alebo scrape niečo nevidí.

---

## MŠ Felix Karlovská (`msfelixkarloveska`)

| V EduPage vidíme (skratka) | Je to diéta |
|---|---|
| `NE bez O,A,S,S` | **NO EGG/NO ORECH/NO ARASIDY/NO SOJA/NO SEZAM** (EpiPen úroveň) |
| `NMNO` (aj „NoMilk no orech") | **NO MILK – NO ORECH** |

Zdroj: `felixkarloveska_letter_hook`. Referenčne čistá kategória — sedí s reálnou tabuľkou
presne.

Realita (14.–18.9.2026): NO GLUTEN×12, NO MILK–NO ORECH×15, „No Arašídy – NO EGG – NO SOJA –
NO ORECH – NO SEZAM"×9 (rozšírená EpiPen kombinácia — mierne iný tvar než tabuľka vyššie,
zrejme viac zložiek pridaných po potvrdení pravidla; over či treba `_RULES` aktualizovať na
plný aktuálny reťazec).

---

## MŠ Krasňanko (`krasnanko`)

Jediná prevádzka s vlastným `override_hook` namiesto len configu — zamestnanecký status a
porcia sú zakódované priamo v skratke. **Škola premenovala skratky 3.9.2026** — staré aj nové
kľúče sú v mape zároveň.

### Pôvodná schéma (do ~2.9.2026)

| Skratka | Porcia | Diéta |
|---|---|---|
| `K` / `K-D` | Škôlka | klasik |
| `NM` | Škôlka | **NO MILK** |
| `NG` | Škôlka | **NO GLUTEN** |
| `KZ` | Dospelý (SŠ) | klasik |
| `NMZ` | Dospelý (SŠ) | **NO MILK** |
| `KZD` | Škôlka | klasik |
| `NMZD` | Škôlka | **NO MILK** |
| `DIA` | Škôlka | **DIA** |
| `PDNM` | Predškolák | **NO MILK** |
| `Z1/2NM` | Škôlka | **NO MILK** |
| `Z1/2K` | Škôlka | klasik |

### Nová schéma (od 3.9.2026 — „D"=Dieťa, nie Dospelý!)

| Skratka | Porcia | Diéta |
|---|---|---|
| `DK` | Škôlka | klasik |
| `DNM` | Škôlka | **NO MILK** |
| `DNG` | Škôlka | **NO GLUTEN** |
| `ZK` | Dospelý (SŠ) | klasik |
| `ZNM` | Dospelý (SŠ) | **NO MILK** |
| `ZNG` | Dospelý (SŠ) | **NO GLUTEN** |
| `PDK` | Predškolák | klasik |
| `PDNG` | Predškolák | **NO GLUTEN** |

Zdroj: `krasnanko_letter_hook` (aj `override_hook` v registry). Realita (14.–18.9.2026, prevádzka
„MŠ Krasňanko"): NO MILK×32.

---

## British School (`zdravyprojekt`)

4 denné okná (raňajky, desiata, obed, olovrant — vlastné `meal_hour_thresholds`). Skratky s
koncovým „+" nesú len prvú diétu, zvyšok je v payer mene → rozhoduje `payer_hook`.

| V EduPage vidíme (payer label) | Je to diéta |
|---|---|
| „1.st. noMushroom" | **NO HUBY** |
| „1.st. noMilk+reflux" / „MŠ noMilk+reflux" | **NO MILK/REFLUX** |
| „Učiteľ noMilk/VEGE" | **NO MILK/VEGGIE** |
| „1.st. noNuts/noFish" | **NO ORECH/NO FISH** |
| „1.st. noNuts/noKiwi" | **NO ORECH/NO KIWI** |
| „2.st. noNuts/noAPP/noStr" | **NO ORECH/NO JABLKO/NO JAHODA** |
| „3.st. noNuts/sezam" | **NO ORECH/NO SEZAM** |
| „MŠ nonono+pork+berr" | **NONONO/NO BRAVCOVINA/NO BOBULE** |
| „MŠ nonononANAnLEG HIT" | **NONONO/NO ANANAS/NO STRUKOVINY/HISTAMIN** |
| menu skratka `VEGE` | vlastné **Menu V** (nie diéta VEGGIE) |
| menu skratka `VEGE1` | vlastné **Menu V1** |

Zdroj: `british_school_letter_hook` / `british_school_payer_hook`. Nová kombinácia na tom istom
„+"-sufixe bez záznamu v `_PAYER_RULES` sa nahlási ako `unmapped_diets`, nie ticho zle priradí.

Realita (14.–18.9.2026): HISTAMIN×1, NO BRAVCOVINA×30, NO CUKOR×26, NO GLUTEN×1, NO MILK×31,
NO MILK–NO GLUTEN×4, NO MILK–NO GLUTEN–NO EGG–HISTAMIN–NO STRUKOVINY–NO ANANÁS×15, NO
MILK–NO GLUTEN–NO EGG–NO BOBULE–NO BRAVCOVINA×15, NO MILK–REFLUX×15, NO ORECH×10, NO ORECH–NO
JABLKO–NO JAHODA×1, NO ORECH–NO KIWI×5, NONONO×2, VEGAN×2, VEGGIE×44 — širšie kombinácie než
tabuľka vyššie (viac než 2 zložky na viacero riadkov) naznačujú, že `_PAYER_RULES` odvtedy
narástol/aktualizoval sa priamo v `britishschool.py` nad rámec pôvodne zdokumentovaných 10
labelov — over pri ďalšej úprave, že si tabuľka vyššie a `_PAYER_RULES` v kóde sedia 1:1.

---

## Generický fallback engine

Keď žiadny `letter_hook`/`payer_hook` pre danú prevádzku/skratku nevráti pravidlo, prevezme
generický engine (`backend/api/edupage_scraper.py`):

1. **Exaktná skratka** (`_SKRATKA_MAP`) — napr. `BM`→NO MILK, `NG`→NO GLUTEN, `V`/`VEG`/`VEGE`→
   VEGGIE, `HIS`/`H`→HISTAMIN, `NNN`→NONONO, `DIA`→DIA, `VEGAN`→VEGAN (British), …
   (plný zoznam: `_SKRATKA_MAP` v `edupage_scraper.py`).
2. **Keyword fragment v `nazov`** (`_NAZOV_KEYWORD_MAP`, substring-match po ASCII-foldovaní) —
   napr. „nomilk"/„bezmliecne"→NO MILK, „nogluten"/„bezlep"→NO GLUTEN, „histamin"→HISTAMIN,
   „vege"/„veggie"/„vegetar"→VEGGIE, „citrus"→NO CITRUS, atď.
3. Fallback: vráti `nazov` ako-je (uloží sa pod tým názvom, appka to nahlási ako
   `unmapped_diets`, nie ticho zahodí).

**Riziko**: fragment-match berie prvý sadnúci fragment, takže zložené skratky
(`nMnOnJnPnČnŠnZEL`, `HITNMNGnSnKnFC`, …) sa bez explicitného `letter_hook` orežú na jednu
zložku — presne preto vznikla väčšina hookov vyššie (nájdené a opravené postupne od 8/2026).
Nová prevádzka/nová skratka bez hooku → skontroluj, či generický fallback naozaj chytá celú
kombináciu, nie len prvý fragment.
