# Otázky pre klienta — nezrovnalosti app vs. reálne tabuľky

Zoznam vecí, ktoré pri porovnaní výstupu appky s reálnymi tabuľkami (`test/data/real`)
nesedia a **potrebujú potvrdenie od klienta**. Nie sú to nutne chyby appky — často ide
o fakturačné/biznisové špecifiká, ktoré appka nemá odkiaľ vedieť.

Formát: **[STAV]** Prevádzka — čo nesedí → konkrétne čísla → otázka.
Stav: 🔴 čaká na odpoveď · 🟢 vyriešené · ⚪ info (netreba akciu)

---

## 🔴 Edulienka — zlomkové počty porcií (.25) vo vyúčtovaní

Vyúčtovanie Edulienky uvádza **počty porcií v štvrtinách**, kým appka počíta celé objednané porcie.

| Deň | vyúčtovanie „Počet pokrmov" | Súčet (real) | Appka (obed) | Rozdiel |
|-----|------------------------------|--------------|--------------|---------|
| 13.7 | Klasik 8.25 + menu B 4.25 + 1.stupeň 2 | **14.5** | 14 | −0.5 |
| 14.7 | Klasik 4.25 + menu B 7.25 + 1.stupeň 2 | **13.5** | 13 | −0.5 |
| 15.7 | súčet (nová master tabuľka) | **10.5** | 10 | −0.5 |

**Otázka:** Čo znamenajú tie `.25` porcie v Edulienke? Je to dôsledok **dotácie**
(dotovaná časť obeda sa účtuje ako zlomok), alebo deti reálne dostávajú **čiastočné
porcie**? Podľa odpovede buď appka rozdiel len toleruje (fakturačný artefakt), alebo
musí vedieť účtovať zlomky.

---

## 🔴 Fantastická Škôlka — obed 14.7 o 1 menej

- 14.7: appka **8**, reálne **9** (obed). 13.7 pritom sedí presne (8/8).
- 15.7: appka **9**, reálne **10** (obed) → opäť −1. Pattern sa opakuje, nejde o náhodu.

**Otázka:** Bola 14.7 v Fantastickej nejaká porcia doobjednaná/pridaná mimo EduPage
(neskorá objednávka, hosť)? Appka ťahá stav z EduPage, takže porciu pridanú mimo systému
nezachytí.

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

**Info, netreba akciu** — očakávané, nie chyba appky. Ak by to malo byť inak, potvrdiť s klientom.

---

## ⚪ 15.7 — formát tabuľky nezmenený, kľúčové obedy sedia

Vyúčtovanie `15.7.2026_tabuľka_NOVÁ4.xlsx` má **rovnaký formát** ako všetky doterajšie
(stĺpec `Druh pokrmu` s OBED/OLOVRANT, 110 prevádzok, 687 riadkov — identické so 14.7).
Reconcile na 15.7 zlyhal len preto, že v dev DB nebol **meal plán** pre daný deň (DB bola
medzitým vyresetovaná), nie kvôli formátu. Kľúčové obedy (kde sa olovrant fakturuje
samostatne, teda total = obed) sedia presne: Zdravé Bruško (Deutsche schule) 69/69,
Felix 10/10, Filipa Nériho 21/21.
