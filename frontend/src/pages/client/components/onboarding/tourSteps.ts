export interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  page: "/home" | "/order";
}

export const TOUR_STEPS: TourStep[] = [
  // ── Home page (steps 0–4) ────────────────────────────────────────────────
  {
    targetId: "tour-new-order-btn",
    title: "Nová objednávka",
    body: "Kliknutím sem vytvoríte objednávku na nasledujúci pracovný deň. Môžete si vybrať raňajky, obed a olovrant.",
    placement: "bottom",
    page: "/home",
  },
  {
    targetId: "tour-today-section",
    title: "Dnešná objednávka",
    body: "Prehľad vašej dnešnej objednávky. Ak je termín stále aktívny, môžete ju ešte upraviť kliknutím na kartu.",
    placement: "bottom",
    page: "/home",
  },
  {
    targetId: "tour-planned-section",
    title: "Plánované objednávky",
    body: "Objednávky na najbližšie pracovné dni. Kliknutím na kartu zobrazíte detail alebo ju upravíte.",
    placement: "top",
    page: "/home",
  },
  {
    targetId: "tour-history-section",
    title: "História",
    body: "Posledných 5 odovzdaných objednávok. Kliknutím na deň zobrazíte detail s rozpisom porcií.",
    placement: "top",
    page: "/home",
  },
  {
    targetId: "tour-profile-btn",
    title: "Profil a nastavenia",
    body: "Tu nájdete váš profil, nastavenia aplikácie, inštaláciu PWA a push notifikácie.",
    placement: "bottom",
    page: "/home",
  },

  // ── Order page (steps 5–9) ───────────────────────────────────────────────
  {
    targetId: "tour-day-selector",
    title: "Výber dátumu",
    body: "Pomocou šípok prechádzajte medzi pracovnými dňami. Objednávku môžete vytvoriť vopred na viaceré dni.",
    placement: "bottom",
    page: "/order",
  },
  {
    targetId: "tour-fullday-card",
    title: "Celodenná objednávka",
    body: "Ak chcete naraz objednať všetky jedlá (raňajky, obed aj olovrant), zapnite túto kartu a nastavte porcie len raz. Kým je zapnutá, jednotlivé jedlá nižšie sú uzamknuté – vypnutím ju znova odomknete.",
    placement: "bottom",
    page: "/order",
  },
  {
    targetId: "tour-meal-card",
    title: "Prepínač jedla",
    body: "Každé jedlo (raňajky, obed, olovrant) môžete zapnúť alebo vypnúť prepínačom. Ak je zapnuté, zobrazí sa zadávanie porcií.",
    placement: "bottom",
    page: "/order",
  },
  {
    targetId: "tour-category-row",
    title: "Počet porcií a diéty",
    body: "Pre každú vekovú skupinu (napr. Škôlka, ZŠ 1. stupeň) nastavte počet porcií pomocou tlačidiel + a –. Menu A/B sú varianty obeda. Ak dieťa potrebuje diétu, kliknite na tlačidlo „Diéty“ pri Menu A a vyberte konkrétnu diétu a počet porcií (diéty sa dajú priradiť len v rámci porcií Menu A).",
    placement: "right",
    page: "/order",
  },
  {
    targetId: "tour-order-summary",
    title: "Odoslanie objednávky",
    body: "Tu vidíte celkový súhrn porcií. Po kontrole kliknite na Odoslať objednávku – objednávka bude zaznamenaná.",
    placement: "top",
    page: "/order",
  },
];
