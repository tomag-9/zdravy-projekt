# BACKLOG

## Poznamka k checkboxom

- [] TODO = navrhnuta uloha, este nepotvrdena
- [x] = accepted as a todo

## Rychle zistenia z aktualnej implementacie

- Klient si dnes stale vie manualne prepinat "Povolene porcie" v `frontend/src/pages/client/pages/Settings.tsx`.
- Historia poslednych 5 objednavok uz existuje v `frontend/src/pages/client/pages/HomePage.tsx`.
- Po odoslani objednavky sa dnes iba scrolluje hore v `frontend/src/pages/client/pages/OrderPage.tsx`, nepresmeruje sa na homescreen.
- Dieta ma backend pole `description`, ale admin UI ho zatial nepouziva.
- Koeficienty su seednute ako Skolka `0.5`, ZS `0.65/0.75`, Dospely `1.0`, nie podla noveho pravidla MS/Skolka = `1.0`.

## P0

- [x] TODO P0: Vypnut klientovi manualne nastavovanie porcii, vyber dostupnych porcii ma riadit admin. 
- (UI)[x] Klientska obrazovka "Povolene porcie" ma byt read-only;
- [x] TODO P0: Upravit klientsku objednavku tak, aby zobrazovala iba adminom povolene typy porcii, nie lokalne `enabledCategories`. Overene: klient cita aktivne typy porcii z backendu.
- [x] TODO P0: Doplnit do klientskych nastaveni read-only prehlad dostupnych porcii aj s popisom porcie.
- [x] TODO P0: Pridat info pri porciach: pri zmene alebo rozsireni moznosti kontaktovat zodpovednu osobu. Text/mena daj do admin settings niekde ze kontaktna informacie pre klientov a budeme to odtial tahat. Napojene na admin global settings.
- (UI)[x] TODO P0: Po uspesnom odoslani objednavky presmerovat klienta na `/home` namiesto `window.scrollTo`, predtym by ale mala vybehnut taka obrazovka taka fajka ze Objednanie prebehlo uspesne dakujeme aza objednavku alebo daco take.
- (UI)[x] TODO P0: Do detailu objednavky hore doplnit text "Na {datum} mate objednane".
- (UI)[x] TODO P0: Do detailu objednavky dole doplnit "Dakujeme za Vasu objednavku".
- (UI)[x] TODO P0: Pod tlacidlo "Nova objednavka" na homescreen doplnit disclaimer: "Objednavky sa automaticky preklapaju na dalsi den, pokial ich manualne needitujete."
- [x] TODO P0: Opravit koeficienty typov porcii: zaklad je MS/Skolka = `1.0`, ostatne typy su nasobky, napr. ZS = MS x `1.15`.
- [x] TODO P0: Spravit migraciu alebo idempotentny update existujucich koeficientov v referencnych datach.
- [x] TODO P0:Zmenit seed default diety: `NO MILK`, `NO GLUTEN`, `NO MILK/NO GLUTEN`, `VEGGIE`, `HISTAMIN`, `NONONO`, `NO ORECH`, `NO PARADAJKA`, `NO FISH`, `NO EGG`, `NO ZEMIAK`, `NO SOJA`, `NO ZELER`.
- [x] TODO P0: Admin sprava diet ma podporovat aj editaciu `description`, nie iba nazov.
- (UI)[x] TODO P0: Klientovi zobrazit popisy povolenych diet v settings rovnako ako ma readonly porcie. 

## P1

- (UI)[x] TODO P1: Pridat mesacny suhrn pod "Planovane objednavky" na homescreene.
- (UI)[x] TODO P1: Mesacny suhrn ma ukazat pocitadla odobranych poloziek za aktualny mesiac, napr. `34x Menu A`, `25x Ranajky`.
- [x] TODO P1: Rozsirit historiu objednavok z poslednych 5 na infinite scroll alebo strankovany zoznam, pricom nahlad poslednych 5 ostane zachovany.
- [x] TODO P1: Pridat backend endpoint pre mesacny suhrn objednavok klienta, aby sa to nepocitalo iba z prvej stranky `/orders/`. Overene cez `/api/orders/planned/monthly-summary/`.
- [x] TODO P1: Push reminder v nedelu: "Nezabudnite vyplnit objednavku na nasledujuci tyzden", Nedelny push reminder podmienit tym, ze klient este nema odoslanu objednavku na nasledujuci tyzden.
- [x] TODO P1: V admine pridat suhrnne pocty na konci dna: napr. `Klasik MS 35x`, `Klasik ZS 25x`, plus menu/dospely suhrny podla reportu, akoze vramci dashbordu jak je, tak vsetko ostava ako je akurat ako je posledny riadok ze celkom tak to bude iba nazov odstavca, kde bude ze pre kazde jedno vlastny podblok akoze ranajky obed, olovrant, pre kazde jedlo kazda porcia kazde menu, a to iste pre diety a pre kazde jedlo. Takisto toto pretavit aj do pdf a excel.
- [x] V PDF a EXCEL exportoch sumaru denneho chybaju gramaze konkretnych casti jedal na zaciatku hore.
- [x] TODO P1: Sablony jedal maju mat priradenu dietu, respektive menu
- (FUTURE FEATURE)[] TODO P1: Pripravit strukturovany import jedalnicka z Excel/CSV podla realneho formatu, v ktorom sa jedalnicek pripravuje.

## P2

- (UI)[x] TODO P2: Na login/registraciu doplnit informaciu, ze registraciu vykonava poskytovatel ak pre informaciu nech napisu na kontaktny email. Route `/register` dnes iba redirectuje na login, takze staci text na login., zmazat rout register bo ho netreba.
- (FUTURE FEATURE)[] TODO P2: Pripravit import EduPage, samostatne od importu jedalnicka.
- [x] TODO P2: Pripravit zobrazenie aktualneho jedalnicka pre klienta. Data zo systemu.
- (UI)[x] DONE P2: Zladit vizual aplikacie s logom a prezentaciou Zdraveho Projektu po dodani podkladov.
- (UI)[x] DONE P2: Pouzit podkladovu farbu z prezentacie pre celu aplikaciu po dodani brand podkladov.
- (UI)[] TODO P2: Rozhodnut umiestnenie marketingovej sekcie "News Flash"/blog, pravdepodobne admin/klient home podla cielovej skupiny skolok.

## P3 / Docs

- [] TODO P3: Vytvorit kratky 1-2 stranovy PDF manual ako doplnok k integrovanemu sprievodcovi.
- [] TODO P3: Vyhladovo pripravit videomanual.
- [] TODO P3: Push notifikacie ponechat defaultne zapnute len po povoleni pouzivatelom/browserom; dokumentovat mobile-only spravanie.
