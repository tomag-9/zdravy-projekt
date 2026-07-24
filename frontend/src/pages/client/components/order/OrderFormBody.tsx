import type { ComponentType, CSSProperties, ReactNode } from "react";
import { CalendarDays, Minus, PackagePlus, Plus, Trash2 } from "lucide-react";
import type { DailyOrder, MealData } from "../../services/OrderService";
import CategoryRow from "./CategoryRow";
import MealCard from "./MealCard";

type MealKey = "breakfast" | "lunch" | "olovrant";

type VisibleMeal = {
  key: MealKey;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
};

type PackSeparatelyItem = {
  category: string;
  kind: "menus" | "diets";
  keyName: string;
  orderedCount: number;
  count: number;
};

type PackSeparatelySection = {
  meal: MealKey | "fullDay";
  mealLabel: string;
  items: PackSeparatelyItem[];
};

interface OrderFormBodyProps {
  categories: string[];
  visibleMealsList: VisibleMeal[];
  fullDayOrder: boolean;
  onToggleFullDay: () => void;
  fullDayData: MealData;
  fullDayVisibleMenus: string[];
  onFullDayMenuCount: (category: string, menuType: string, value: number) => void;
  onOpenFullDayDiets: (category: string) => void;
  onClearFullDay: () => void;
  fullDayEnabled?: boolean;
  fullDayStatusMessage?: ReactNode;
  order: DailyOrder;
  activeMeals: Record<MealKey, boolean>;
  onToggleMeal: (meal: MealKey) => void;
  onMenuCountChange: (meal: MealKey, category: string, menu: string, value: number) => void;
  onOpenDiets: (meal: MealKey, category: string) => void;
  getVisibleMenusForMeal: (meal: MealKey) => string[];
  getAvailableDiets: (category: string) => string[];
  getOccupiedMenus?: (meal: MealKey) => Set<string>;
  mealActions?: (meal: MealKey) => ReactNode;
  isMealEditable?: (meal: MealKey) => boolean;
  mealStatusMessage?: (meal: MealKey) => ReactNode;
  packSeparatelyEnabled: boolean;
  activePackSeparatelyItems: PackSeparatelySection[];
  onOpenPackSeparately: () => void;
  onUpdatePackSeparately: (
    meal: MealKey | "fullDay",
    category: string,
    kind: "menus" | "diets",
    key: string,
    count: number,
  ) => void;
  showSpecialDietNote: boolean;
  specialDietNote: string;
  onSpecialDietNoteChange: (value: string) => void;
  specialDietNoteInvalid?: boolean;
  dimmed?: boolean;
  tourIds?: boolean;
}

const OrderFormBody = ({
  categories,
  visibleMealsList,
  fullDayOrder,
  onToggleFullDay,
  fullDayData,
  fullDayVisibleMenus,
  onFullDayMenuCount,
  onOpenFullDayDiets,
  onClearFullDay,
  fullDayEnabled = true,
  fullDayStatusMessage,
  order,
  activeMeals,
  onToggleMeal,
  onMenuCountChange,
  onOpenDiets,
  getVisibleMenusForMeal,
  getAvailableDiets,
  getOccupiedMenus = () => new Set<string>(),
  mealActions,
  isMealEditable = () => true,
  mealStatusMessage = () => null,
  packSeparatelyEnabled,
  activePackSeparatelyItems,
  onOpenPackSeparately,
  onUpdatePackSeparately,
  showSpecialDietNote,
  specialDietNote,
  onSpecialDietNoteChange,
  specialDietNoteInvalid = false,
  dimmed = false,
  tourIds = false,
}: OrderFormBodyProps) => {
  const fullDayMealLabels = visibleMealsList.map((meal) => meal.label).join(" · ");
  const fullDayBlocked = fullDayOrder && fullDayEnabled;

  return (
    <>
      <div
        style={dimmed ? { opacity: 0.4, pointerEvents: "none" } : {}}
        aria-disabled={dimmed ? true : undefined}
      >
        <MealCard
          title="Celodenná objednávka"
          icon={CalendarDays}
          tourId={tourIds ? "tour-fullday-card" : undefined}
          isActive={fullDayBlocked}
          onToggle={() => fullDayEnabled && onToggleFullDay()}
          statusMessage={fullDayStatusMessage}
          copyAction={fullDayOrder ? (
            <button
              className="zp-btn zp-btn--danger zp-btn--sm"
              style={{ flex: 1 }}
              onClick={() => onClearFullDay()}
            >
              <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
            </button>
          ) : null}
        >
          <div>
            <div className="zp-fullday-info">
              Bude objednané: <strong>{fullDayMealLabels}</strong>
            </div>
            {categories.map((category) => {
              const data = fullDayData[category];
              if (!data) return null;
              const dietCount = (Object.values(data.diets || {}) as number[]).reduce((a, b) => a + b, 0);
              const availableDiets = getAvailableDiets(category);
              return (
                <CategoryRow
                  key={category}
                  label={category}
                  menuCounts={data.menuCounts}
                  onMenuCountChange={(menuType, val) => onFullDayMenuCount(category, menuType, val)}
                  hasDietsEnabled={availableDiets.length > 0}
                  dietCount={dietCount}
                  onOpenDiets={() => onOpenFullDayDiets(category)}
                  disabled={false}
                  visibleMenus={fullDayVisibleMenus}
                />
              );
            })}
          </div>
        </MealCard>

        {visibleMealsList.map((mealItem, mealIndex) => {
          const { key, label, icon } = mealItem;
          const editable = isMealEditable(key);
          return (
            <MealCard
              key={key}
              title={label}
              icon={icon}
              isActive={!fullDayBlocked && editable && activeMeals[key]}
              onToggle={() => !fullDayBlocked && editable && onToggleMeal(key)}
              copyAction={!fullDayBlocked && editable ? mealActions?.(key) : null}
              tourId={tourIds && mealIndex === 0 ? "tour-meal-card" : undefined}
              statusMessage={mealStatusMessage(key)}
            >
              <div>
                {categories.map((category, catIndex) => {
                  const data = order[key]?.[category];
                  if (!data) return null;
                  const dietCount = (Object.values(data.diets || {}) as number[]).reduce((a, b) => a + b, 0);
                  const availableDiets = getAvailableDiets(category);
                  return (
                    <CategoryRow
                      key={category}
                      label={category}
                      menuCounts={data.menuCounts}
                      onMenuCountChange={(menuType, val) =>
                        editable && onMenuCountChange(key, category, menuType, val)
                      }
                      hasDietsEnabled={availableDiets.length > 0}
                      dietCount={dietCount}
                      onOpenDiets={() => editable && onOpenDiets(key, category)}
                      disabled={!editable}
                      visibleMenus={getVisibleMenusForMeal(key)}
                      occupiedMenus={getOccupiedMenus(key)}
                      tourId={tourIds && mealIndex === 0 && catIndex === 0 ? "tour-category-row" : undefined}
                    />
                  );
                })}
              </div>
            </MealCard>
          );
        })}
      </div>

      {packSeparatelyEnabled && (
        <MealCard
          title="Zabaliť zvlášť"
          icon={PackagePlus}
          isActive={activePackSeparatelyItems.length > 0}
          onToggle={() => onOpenPackSeparately()}
          copyAction={
            <button
              className="zp-btn zp-btn--secondary zp-btn--sm"
              style={{ flex: 1 }}
              onClick={() => onOpenPackSeparately()}
            >
              <PackagePlus style={{ width: 12, height: 12 }} /> Pridať výnimku
            </button>
          }
          statusMessage={null}
        >
          <div>
            {activePackSeparatelyItems.length === 0 ? (
              <div className="zp-empty" style={{ margin: "8px 0 0" }}>
                <p>Zatiaľ nemáte nič označené na balenie zvlášť.</p>
              </div>
            ) : (
              activePackSeparatelyItems.map((section) => (
                <div key={section.meal} style={{ marginBottom: 12 }}>
                  {activePackSeparatelyItems.length > 1 && (
                    <div className="zp-cat-head" style={{ marginBottom: 8 }}>{section.mealLabel}</div>
                  )}
                  {section.items.map((item) => (
                    <div
                      key={`${section.meal}-${item.category}-${item.kind}-${item.keyName}`}
                      className={`zp-diet-row${item.count > 0 ? " active" : ""}`}
                    >
                      <div>
                        <span className="zp-diet-label">
                          {item.category} · {item.kind === "menus" ? `Menu ${item.keyName}` : item.keyName}
                        </span>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                          Limit objednávky: {item.orderedCount}
                        </div>
                      </div>
                      <div className="zp-counter">
                        <button
                          disabled={item.count <= 0}
                          aria-label="−"
                          onClick={() => onUpdatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count - 1)}
                        >
                          <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                        </button>
                        <span className={`count${item.count <= 0 ? " zero" : ""}`}>{item.count}</span>
                        <button
                          className="plus"
                          disabled={item.count >= item.orderedCount}
                          aria-label="+"
                          onClick={() => onUpdatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count + 1)}
                        >
                          <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </MealCard>
      )}

      {showSpecialDietNote && (
        <div className="zp-special-diet-note-box">
          <label className="zp-special-diet-note-label">
            Špecifikujte špeciálnu diétu <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <textarea
            className={`zp-input zp-special-diet-textarea${specialDietNoteInvalid ? " zp-input--error" : ""}`}
            placeholder="Popíšte vašu špeciálnu diétu"
            value={specialDietNote}
            rows={3}
            onChange={(e) => onSpecialDietNoteChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
};

export default OrderFormBody;
