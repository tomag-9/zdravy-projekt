export interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  page: "/home" | "/order";
  /**
   * Steps that only make sense for some logins. A step whose requirement is not
   * met is dropped from the tour entirely — showing a tooltip pointing at an
   * element that does not exist would just stall the tour on a blank overlay.
   */
  requires?: "multiplePrevadzky";
}

export interface TourContext {
  /** The celok has more than one prevádzka, so the switcher is on screen. */
  hasMultiplePrevadzky: boolean;
}

const ALL_TOUR_STEPS: TourStep[] = [
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

  // ── Order page ───────────────────────────────────────────────────────────
  {
    targetId: "tour-prevadzka-switch",
    title: "Za ktorú prevádzku objednávate",
    body: "Váš login má na starosti viac prevádzok. Tu vidíte, za ktorú z nich práve objednávate — tlačidlom „Zmeniť“ sa prepnete na inú. Objednávky sa vedú zvlášť pre každú prevádzku, takže si tento riadok pred zadávaním porcií vždy skontrolujte.",
    placement: "bottom",
    page: "/order",
    requires: "multiplePrevadzky",
  },
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
    body: "Pre každú vekovú skupinu (napr. Škôlka, ZŠ 1. stupeň) nastavte počet porcií pomocou tlačidiel + a –. Menu A/B sú varianty obeda. Diétne porcie zadávate osobitne: kliknite na riadok „Diéty“ hneď pod Menu A, vyberte diétu a počet. Diéty sú samostatná položka – k počtu Menu A sa pripočítavajú, neuberajú sa z neho.",
    placement: "bottom",
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

/** The steps that apply to this login, in order. */
export function getTourSteps(context: TourContext): TourStep[] {
  return ALL_TOUR_STEPS.filter((step) => {
    if (step.requires === "multiplePrevadzky") {
      return context.hasMultiplePrevadzky;
    }
    return true;
  });
}

/** Base tour: single-prevádzka login. Prefer `getTourSteps` where context exists. */
export const TOUR_STEPS: TourStep[] = getTourSteps({
  hasMultiplePrevadzky: false,
});
