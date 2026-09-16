import { FileCheck, AlertCircle, Eraser } from "lucide-react";
import { CategoryData, DailyOrder } from "../../services/OrderService";
import { getSlovakPlural } from "../../../../lib/utils";

type MealKey = "breakfast" | "lunch" | "olovrant";

const ALL_MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "olovrant"];

interface OrderSummaryProps {
  order: DailyOrder;
  activeMeals: Record<MealKey, boolean>;
  /** Ktoré jedlá má táto prevádzka vôbec vypnuté/zapnuté v nastaveniach —
   * riadok v zhrnutí sa ukáže pre KAŽDÉ z nich bez ohľadu na to, či je práve
   * teraz zbalené/aktívne (chýbalo predtým: zbalený chod nemal riadok vôbec,
   * takže "Automatická" stavová informácia nemala kde byť vidieť). Bez tohto
   * propu sa použije `activeMeals` ako predtým (spätná kompatibilita).
   */
  visibleMeals?: MealKey[];
  /** Ktoré jedlá boli v tejto session skutočne rozhodnuté (viď
   * `DailyOrder.touched_meals`) — riadi štítok vedľa počtu: "Manuálna"
   * (touched, nenulové), "Manuálna nulová" (touched, nula — napr. cez
   * „Vymazať“) alebo "Automatická – z predošlého dňa" (netouched — auto-order
   * cron ho ešte môže doplniť podľa predošlého dňa). Bez tohto propu sa štítok
   * nezobrazí.
   */
  touchedMeals?: Set<string>;
  date: string;
  onSubmit: () => void;
  onReset?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  submitLabel?: string;
}

const OrderSummary = ({
  order,
  activeMeals,
  visibleMeals,
  touchedMeals,
  date,
  onSubmit,
  onReset,
  disabled,
  disabledMessage,
  submitLabel = "Odoslať objednávku",
}: OrderSummaryProps) => {
  // Bez `visibleMeals` (staré volanie) sa zachová pôvodné správanie — riadok
  // len pre práve aktívny chod.
  const shownMeals = visibleMeals ?? ALL_MEAL_KEYS.filter((key) => activeMeals[key]);

  const getMealTotal = (mealKey: MealKey) => {
    if (!activeMeals[mealKey] || !order[mealKey]) return 0;
    return Object.values(order[mealKey]).reduce(
      (acc: number, cat: CategoryData) => {
        const counts = cat.menuCounts || {};
        const catTotal = Object.values(counts).reduce((sum: number, val: number) => sum + val, 0);
        return acc + catTotal;
      },
      0,
    );
  };

  const getDietTotal = (mealKey: MealKey) => {
    if (!activeMeals[mealKey] || !order[mealKey]) return 0;
    return Object.values(order[mealKey]).reduce(
      (acc: number, cat: CategoryData) => {
        if (!cat.diets) return acc;
        return acc + Object.values(cat.diets).reduce((dAcc: number, d: number) => dAcc + d, 0);
      },
      0,
    );
  };

  const getMealTag = (mealKey: MealKey): { label: string } | null => {
    if (!touchedMeals) return null;
    if (!touchedMeals.has(mealKey)) return { label: "Automatická – z predošlého dňa" };
    return getMealTotal(mealKey) > 0 ? { label: "Manuálna" } : { label: "Manuálna nulová" };
  };

  const lunchTotal = getMealTotal("lunch");
  const breakfastTotal = getMealTotal("breakfast");
  const olovrantTotal = getMealTotal("olovrant");

  const lunchDiets = getDietTotal("lunch");
  const breakfastDiets = getDietTotal("breakfast");
  const olovrantDiets = getDietTotal("olovrant");

  const totalPortions = lunchTotal + breakfastTotal + olovrantTotal;

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("sk-SK");

  return (
    <div className="zp-summary">
      <h3>
        <FileCheck style={{ width: 16, height: 16 }} />
        Rýchle zhrnutie
      </h3>

      <div className="zp-summary-row">
        <span className="l">Dátum</span>
        <span className="r" style={{ textTransform: "capitalize" }}>{dateLabel}</span>
      </div>

      {shownMeals.includes("breakfast") && (
        <div className="zp-summary-row">
          <span className="l">Raňajky</span>
          <span className="r">
            {breakfastTotal}
            {breakfastDiets > 0 && (
              <small>
                ({breakfastDiets} {getSlovakPlural(breakfastDiets, "diéta", "diéty", "diét")})
              </small>
            )}
            {getMealTag("breakfast") && (
              <small className="zp-summary-tag">{getMealTag("breakfast")!.label}</small>
            )}
          </span>
        </div>
      )}

      {shownMeals.includes("lunch") && (
        <div className="zp-summary-row">
          <span className="l">Obedy</span>
          <span className="r">
            {lunchTotal}
            {lunchDiets > 0 && (
              <small>
                ({lunchDiets} {getSlovakPlural(lunchDiets, "diéta", "diéty", "diét")})
              </small>
            )}
            {getMealTag("lunch") && (
              <small className="zp-summary-tag">{getMealTag("lunch")!.label}</small>
            )}
          </span>
        </div>
      )}

      {shownMeals.includes("olovrant") && (
        <div className="zp-summary-row">
          <span className="l">Olovranty</span>
          <span className="r">
            {olovrantTotal}
            {olovrantDiets > 0 && (
              <small>
                ({olovrantDiets} {getSlovakPlural(olovrantDiets, "diéta", "diéty", "diét")})
              </small>
            )}
            {getMealTag("olovrant") && (
              <small className="zp-summary-tag">{getMealTag("olovrant")!.label}</small>
            )}
          </span>
        </div>
      )}

      <div className="zp-summary-total">
        <span className="l">Spolu porcií</span>
        <span className="r">{totalPortions}<small>ks</small></span>
      </div>

      <button
        className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
        disabled={!!disabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>

      {!disabled && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="zp-btn zp-btn--danger zp-btn--block"
          style={{ marginTop: 8 }}
        >
          <Eraser style={{ width: 14, height: 14 }} />
          Vynulovať objednávku
        </button>
      )}

      {disabled && disabledMessage && (
        <div className="zp-banner" style={{ marginTop: 12, marginLeft: 0, marginRight: 0, width: "100%" }}>
          <AlertCircle style={{ width: 14, height: 14 }} />
          {disabledMessage}
        </div>
      )}
    </div>
  );
};

export default OrderSummary;
