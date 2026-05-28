import { FileCheck, AlertCircle, Eraser } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CategoryData } from "../../services/OrderService";
import { getSlovakPlural } from "../../../../lib/utils";

type MealKey = "breakfast" | "lunch" | "olovrant";

interface OrderSummaryProps {
  onSubmit: () => void;
  onReset?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const OrderSummary = ({
  onSubmit,
  onReset,
  disabled,
  disabledMessage,
}: OrderSummaryProps) => {
  const { currentOrder, activeMeals, selectedDate } = useApp();

  const getMealTotal = (mealKey: MealKey) => {
    if (!activeMeals[mealKey] || !currentOrder[mealKey]) return 0;
    return Object.values(currentOrder[mealKey]).reduce(
      (acc: number, cat: CategoryData) => {
        const counts = cat.menuCounts || {};
        const catTotal = Object.values(counts).reduce((sum: number, val: number) => sum + val, 0);
        return acc + catTotal;
      },
      0,
    );
  };

  const getDietTotal = (mealKey: MealKey) => {
    if (!activeMeals[mealKey] || !currentOrder[mealKey]) return 0;
    return Object.values(currentOrder[mealKey]).reduce(
      (acc: number, cat: CategoryData) => {
        if (!cat.diets) return acc;
        return acc + Object.values(cat.diets).reduce((dAcc: number, d: number) => dAcc + d, 0);
      },
      0,
    );
  };

  const lunchTotal = getMealTotal("lunch");
  const breakfastTotal = getMealTotal("breakfast");
  const olovrantTotal = getMealTotal("olovrant");

  const lunchDiets = getDietTotal("lunch");
  const breakfastDiets = getDietTotal("breakfast");
  const olovrantDiets = getDietTotal("olovrant");

  const totalPortions = lunchTotal + breakfastTotal + olovrantTotal;

  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("sk-SK");

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

      {activeMeals.breakfast && (
        <div className="zp-summary-row">
          <span className="l">Raňajky</span>
          <span className="r">
            {breakfastTotal}
            {breakfastDiets > 0 && (
              <small>
                ({breakfastDiets} {getSlovakPlural(breakfastDiets, "diéta", "diéty", "diét")})
              </small>
            )}
          </span>
        </div>
      )}

      {activeMeals.lunch && (
        <div className="zp-summary-row">
          <span className="l">Obedy</span>
          <span className="r">
            {lunchTotal}
            {lunchDiets > 0 && (
              <small>
                ({lunchDiets} {getSlovakPlural(lunchDiets, "diéta", "diéty", "diét")})
              </small>
            )}
          </span>
        </div>
      )}

      {activeMeals.olovrant && (
        <div className="zp-summary-row">
          <span className="l">Olovranty</span>
          <span className="r">
            {olovrantTotal}
            {olovrantDiets > 0 && (
              <small>
                ({olovrantDiets} {getSlovakPlural(olovrantDiets, "diéta", "diéty", "diét")})
              </small>
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
        Odoslať objednávku
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
