# Spätná väzba z prevádzky — 17. 8. 2026 (Stanislav Šulc, ZP)

Zdroj: WhatsApp konverzácia Stano Šulc ↔ Tomáš Magula, 17. 8. 2026.

## Stav
- Manuálne zadávanie počtov cez appku išlo **všetkým prevádzkam bez problémov**.
- Jediný problém dňa: **Cvernička** — nová diéta z EduPage sa nenačítala, lebo v appke
  nebola zadaná.
- Stano pripravuje **zoznam škôlok na pozvanie do ďalšieho kola testovania** (čaká sa naň).

## Požiadavky

### 1. Rozdelenie tabuľky na 2 clustre (najväčšia vec)
Kuchyňa teraz vydáva stravu **z dvoch výdajných bodov súčasne** — Cluster 1 a Cluster 2.
Jedna veľká tabuľka sa má rozdeliť na dve samostatné tabuľky:
- každý cluster má **svoje trasy vo vlastnom poradí**,
- poradie škôlok v rámci clustera sa má dať nastaviť **manuálne**.

**Ujasnené (Stano, 16:51):** existujúca trasa **„Extra“ = Cluster 2**. Čiže clustre sa
mapujú na trasy, nie je to nová nezávislá dimenzia — treba len skupinu trás priradiť
clusteru a tlačiť/zobrazovať per cluster.

Poznámka Tomáša: karta na úpravu trás a poradia už existuje — otázka je, či stačí nad ňou
postaviť priradenie do clusterov.

### 2. Čitateľnosť tabuľky
- Jasnejšie oddelenie trás: **väčšie písmo, celý riadok hlavičky trasy červený**.
- Jasnejšie označiť/oddeliť **raňajky / obed / olovrant**.

### 3. Tlač — výber čo sa tlačí
Možnosť vybrať, čo ide do tlače: iba raňajky / iba obed / iba olovrant / iba menu B, …
**Funkcia už existuje** (vyfiltruj v tabuľke → tlač vytlačí len to), ale treba ju spraviť
**intuitívnejšou / viditeľnejšou** v UI.

### 4. Konfigurovateľné názvy
Možnosť **premenovať „hlavná zložka“** a podobné popisky stĺpcov/zložiek.

### 5. Prázdny stĺpec „Poznámka“
Pridať do tabuľky ešte jeden prázdny stĺpec „Poznámka“ (na ručné dopísanie pri tlači).

### 6. Nové diéty z EduPage
Cvernička načítala z EduPage diétu, ktorú appka nepozná.
- Dnešný stav: **úpravy v EduPage sa musia dorobiť manuálne** → zmeny treba hlásiť čo najskôr.
- Otvorená otázka od Stana: „ako to upravíme?“ → zvážiť aspoň **detekciu neznámej diéty
  pri scrape + upozornenie**, aby to nezapadlo, namiesto tichého vynechania.

## Stav riešenia (vetva `feat/edupage-neznama-dieta`)

| Požiadavka | Stav |
| --- | --- |
| Neznáma diéta z EduPage | hotové — porcie sa započítajú, diéta sa flagne v admin prehľade, whitelist berie diéty z DB |
| Rozdelenie na clustre (výdajné body) | hotové — **výdaj je vlastnosť prevádzky** (radio v jej nastaveniach: Výdaj A / B / C). Tabuľka sa podľa neho delí, v PDF ide každý výdaj na vlastný list. Migrácia hodila prevádzky z Trasy extra do Výdaja B. |
| Výber clustra v prehľade a v trasách | hotové — dropdown „Výdaj" v Prehľade (platí aj pre tlač) a v karte Rozvoz (filter + prepnutie výdaja priamo pri prevádzke) |
| Premenovanie blokov / presun trás medzi blokmi | hotové — v karte Rozvoz (bloky ostávajú organizačná vec rozvozu) |
| Poradie trás a škôlok | už existovalo v karte Rozvoz |
| Zvýraznenie trasy | hotové — jemný červený pás s pilulkou (prvá verzia bola príliš krikľavá, stlmené) |
| Oddelenie raňajky / obed / olovrant | hotové — nadradený pás jedál v hlavičke + hrubší predel stĺpcov |
| Výber čo tlačiť | hotové — filter je jedna karta (Jedlá / Výdajný bod) s vetou, čo pôjde do PDF |
| Premenovanie „hlavná zložka" | hotové — Katalóg jedál → Upraviť |
| Stĺpec „Poznámka" | hotové — prázdny stĺpec na konci tabuľky |

## Otvorené / na doriešenie
- Presná definícia clustra: stačí príznak na trase (cluster 1/2) + samostatná tlač?
- Ako riešiť neznáme diéty z EduPage (upozornenie vs. auto-založenie).
- Zoznam škôlok do ďalšieho testovania — čaká sa na Stana.
