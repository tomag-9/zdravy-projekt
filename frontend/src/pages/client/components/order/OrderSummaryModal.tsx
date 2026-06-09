import { createPortal } from "react-dom";
import {
  X,
  FileCheck,
  AlertCircle,
  Edit,
  Trash2,
  Eraser,
  Bot,
  ChevronDown,
} from "lucide-react";
import { useScrollLock } from "../../../../hooks/useScrollLock";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import OrderService, { DailyOrder } from "../../services/OrderService";

import ConfirmationModal from "../ui/ConfirmationModal";
import { useEffect, useId, useRef, useState } from "react";

type MealKey = "breakfast" | "lunch" | "olovrant";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDate: string;
  orderData?: DailyOrder;
  globalDeadlines: { breakfast: string; breakfast_day_before?: boolean; lunch: string; lunch_day_before?: boolean; olovrant: string; olovrant_day_before?: boolean };
  onDelete?: () => void;
  /** When true the order is not yet in DB – it's an auto-prediction */
  isPredicted?: boolean;
  /** When true the order was created automatically – Delete is disabled */
  isAuto?: boolean;
  /** Meal counts for the auto-prediction preview */
  predictedMealCount?: { breakfast: number; lunch: number; olovrant: number };
  /** Called when user chooses to zero out a predicted order */
  onZero?: () => void;
}

const OrderSummaryModal = ({
  isOpen,
  onClose,
  orderDate,
  orderData,
  globalDeadlines,
  onDelete,
  isPredicted = false,
  isAuto = false,
  predictedMealCount,
  onZero,
}: OrderSummaryModalProps) => {
  const navigate = useNavigate();
  const { setSelectedDate, deleteOrder } = useApp();
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [activeMealPanel, setActiveMealPanel] = useState<MealKey | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setActiveMealPanel(null);
    }
  }, [isOpen, orderDate, isPredicted]);

  useEffect(() => {
    if (!isOpen || deleteConfirmation) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const previous = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previous && document.contains(previous)) {
        window.setTimeout(() => previous.focus(), 0);
      }
    };
  }, [isOpen, deleteConfirmation, onClose]);

  if (!isOpen || (!orderData && !isPredicted)) return null;

  const isEditable = (mealKey: string) =>
    OrderService.checkDeadline(orderDate, mealKey, globalDeadlines);

  const anyMealEditable = (["breakfast", "lunch", "olovrant"] as const).some(
    (meal) => OrderService.checkDeadline(orderDate, meal, globalDeadlines),
  );
  const canDelete = !isPredicted && !isAuto && anyMealEditable;

  const mealMeta: Record<
    MealKey,
    {
      label: string;
      boxClass: string;
      textClass: string;
      badgeClass: string;
      accentClass: string;
      chipClass: string;
      chipTextClass: string;
    }
  > = {
    breakfast: {
      label: "Raňajky",
      boxClass: "zp-meal-box--breakfast",
      textClass: "zp-meal-text--breakfast",
      badgeClass: "zp-meal-badge--breakfast",
      accentClass: "zp-meal-accent--breakfast",
      chipClass: "zp-meal-chip--breakfast",
      chipTextClass: "zp-meal-chiptext--breakfast",
    },
    lunch: {
      label: "Obed",
      boxClass: "zp-meal-box--lunch",
      textClass: "zp-meal-text--lunch",
      badgeClass: "zp-meal-badge--lunch",
      accentClass: "zp-meal-accent--lunch",
      chipClass: "zp-meal-chip--lunch",
      chipTextClass: "zp-meal-chiptext--lunch",
    },
    olovrant: {
      label: "Olovrant",
      boxClass: "zp-meal-box--olovrant",
      textClass: "zp-meal-text--olovrant",
      badgeClass: "zp-meal-badge--olovrant",
      accentClass: "zp-meal-accent--olovrant",
      chipClass: "zp-meal-chip--olovrant",
      chipTextClass: "zp-meal-chiptext--olovrant",
    },
  };

  const getMealSummary = (mealKey: MealKey) => {
    interface CategorySummary {
      category: string;
      total: number;
      menuEntries: Array<[string, number]>;
      dietEntries: Array<[string, number]>;
    }

    const key = mealKey;
    const mealData = orderData?.[key];
    if (!mealData) return null;

    let total = 0;
    const categories: CategorySummary[] = [];

    Object.entries(mealData).forEach(([categoryName, categoryData]) => {
      const menuEntries = Object.entries(categoryData?.menuCounts || {}).filter(
        (entry) => (entry[1] as number) > 0,
      ) as Array<[string, number]>;
      const dietEntries = Object.entries(categoryData?.diets || {}).filter(
        (entry) => (entry[1] as number) > 0,
      ) as Array<[string, number]>;

      const catTotal = menuEntries.reduce(
        (a, b) => a + b[1],
        0,
      );
      if (catTotal > 0 || dietEntries.length > 0) {
        total += catTotal;
        categories.push({
          category: categoryName,
          total: catTotal,
          menuEntries,
          dietEntries,
        });
      }
    });

    if (total === 0 && categories.length === 0) return null;

    categories.sort((a, b) => a.category.localeCompare(b.category, "sk"));

    return { total, categories };
  };

  const summaries = {
    breakfast: getMealSummary("breakfast"),
    lunch: getMealSummary("lunch"),
    olovrant: getMealSummary("olovrant"),
  };

  const hasAnyOrder = Object.values(summaries).some((s) => s !== null);
  const canDeleteOrder = canDelete && hasAnyOrder;

  const handleEdit = () => {
    setSelectedDate(orderDate);
    navigate(`/order?date=${orderDate}`);
    onClose();
  };

  // Note: Deleting individual meals or the whole order could be implemented here.
  // For now, we just redirect to edit page for granular control.

  return createPortal(
    <div
      className="zp-centered-modal z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "var(--bg-cream)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ background: "var(--bg-cream-warm)", borderColor: "var(--line-soft)" }}>
          <h3 id={titleId} className="font-bold text-lg flex items-center gap-2" style={{ color: "var(--ink-1)" }}>
            <FileCheck className="w-5 h-5" style={{ color: "var(--green-700)" }} aria-hidden="true" />
            Detail objednávky
          </h3>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Zavrieť detail objednávky"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-sm text-slate-500 uppercase tracking-wider font-medium">
              Dátum
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {new Date(orderDate).toLocaleDateString("sk-SK", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          {/* ── Predicted-mode body ── */}
          {isPredicted && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl p-4 text-sm" style={{ background: "rgba(74,124,63,0.06)", border: "1px solid rgba(74,124,63,0.15)", color: "var(--green-700)" }}>
                <Bot className="w-4 h-4 shrink-0" />
                <span>
                  Táto objednávka ešte{" "}
                  <strong>nebola manuálne vytvorená</strong>. Systém ju zapíše
                  podľa predošlej objednávky.
                </span>
              </div>
              {hasAnyOrder ? (
                <div className="space-y-4">
                  {(["breakfast", "lunch", "olovrant"] as const).map(
                    (mealKey) => {
                      const summary = summaries[mealKey];
                      if (!summary) return null;

                      const mealStyle = mealMeta[mealKey];
                      const isOpen = activeMealPanel === mealKey;

                      return (
                        <div
                          key={`predicted-${mealKey}`}
                          className={`group ${mealStyle.boxClass} p-4 rounded-xl border`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMealPanel((prev) =>
                                prev === mealKey ? null : mealKey,
                              )
                            }
                            className="w-full"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${mealStyle.textClass}`}>
                                  {mealStyle.label}
                                </span>
                                <span className="text-[11px] text-slate-500 uppercase tracking-wide">
                                  {isOpen ? "Klikni pre zbalenie" : "Rozklikni detail"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`${mealStyle.badgeClass} text-xs font-bold px-2 py-1 rounded-full`}
                                >
                                  {summary.total} ks
                                </span>
                                <ChevronDown
                                  className={[
                                    "w-4 h-4 text-slate-500 transition-transform duration-200",
                                    isOpen ? "rotate-180" : "",
                                  ].join(" ")}
                                />
                              </div>
                            </div>
                          </button>

                          <div
                            className={[
                              "grid transition-all duration-300 ease-out",
                              isOpen
                                ? "[grid-template-rows:1fr] opacity-100 mt-3"
                                : "[grid-template-rows:0fr] opacity-0 mt-0",
                            ].join(" ")}
                          >
                            <div className="space-y-3 overflow-hidden min-h-0">
                              {summary.categories.map((category) => (
                                <div
                                  key={`${mealKey}-${category.category}`}
                                  className={[
                                    "bg-white border rounded-lg p-3 shadow-sm",
                                    mealStyle.accentClass,
                                  ].join(" ")}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={[
                                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                                        mealStyle.chipClass,
                                        mealStyle.chipTextClass,
                                      ].join(" ")}
                                    >
                                      {category.category}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                      {category.total} ks
                                    </span>
                                  </div>

                                  {category.menuEntries.length > 1 ? (
                                    <div className="mt-2">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                        Menu
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {category.menuEntries.map(([menu, count]) => (
                                          <span
                                            key={`${mealKey}-${category.category}-menu-${menu}`}
                                            className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700"
                                          >
                                            {menu}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                        Počet
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {category.total} ks
                                      </p>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                      Diéty
                                    </p>
                                    {category.dietEntries.length > 0 ? (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {category.dietEntries.map(([diet, count]) => (
                                          <span
                                            key={`${mealKey}-${category.category}-diet-${diet}`}
                                            className="text-xs px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700"
                                          >
                                            {diet}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-xs text-slate-400">
                                        Bez diét
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {!isEditable(mealKey) && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>
                                    Po deadline ({globalDeadlines[mealKey]})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                predictedMealCount && (
                  <div className="space-y-3">
                    {(["breakfast", "lunch", "olovrant"] as const)
                      .filter((mealKey) => predictedMealCount[mealKey] > 0)
                      .map((mealKey) => {
                        const mealStyle = mealMeta[mealKey];
                        const isOpen = activeMealPanel === mealKey;

                        return (
                          <div
                            key={`predicted-${mealKey}`}
                            className={`group ${mealStyle.boxClass} p-4 rounded-xl border`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMealPanel((prev) =>
                                  prev === mealKey ? null : mealKey,
                                )
                              }
                              className="w-full"
                            >
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${mealStyle.textClass}`}>
                                    {mealStyle.label}
                                  </span>
                                  <span className="text-[11px] text-slate-500 uppercase tracking-wide">
                                    {isOpen
                                      ? "Klikni pre zbalenie"
                                      : "Rozklikni detail"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`${mealStyle.badgeClass} text-xs font-bold px-2 py-1 rounded-full`}
                                  >
                                    {predictedMealCount[mealKey]} ks
                                  </span>
                                  <ChevronDown
                                    className={[
                                      "w-4 h-4 text-slate-500 transition-transform duration-200",
                                      isOpen ? "rotate-180" : "",
                                    ].join(" ")}
                                  />
                                </div>
                              </div>
                            </button>

                            <div
                              className={[
                                "grid transition-all duration-300 ease-out",
                                isOpen
                                  ? "[grid-template-rows:1fr] opacity-100 mt-3"
                                  : "[grid-template-rows:0fr] opacity-0 mt-0",
                              ].join(" ")}
                            >
                              <div className="overflow-hidden min-h-0">
                                <div
                                  className={[
                                    "bg-white border rounded-lg p-3 shadow-sm",
                                    mealStyle.accentClass,
                                  ].join(" ")}
                                >
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                    Počet
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {predictedMealCount[mealKey]} ks
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Real-order body ── */}
          {!isPredicted && (
            <>
              {!hasAnyOrder ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Žiadne objednané jedlá pre tento deň.
                </div>
              ) : (
                <div className="space-y-4">
                  {(["breakfast", "lunch", "olovrant"] as const).map(
                    (mealKey) => {
                      const summary = summaries[mealKey];
                      if (!summary) return null;

                      const mealStyle = mealMeta[mealKey];
                      const isOpen = activeMealPanel === mealKey;

                      return (
                        <div
                          key={mealKey}
                          className={`group ${mealStyle.boxClass} p-4 rounded-xl border`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMealPanel((prev) =>
                                prev === mealKey ? null : mealKey,
                              )
                            }
                            className="w-full"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${mealStyle.textClass}`}>
                                  {mealStyle.label}
                                </span>
                                <span className="text-[11px] text-slate-500 uppercase tracking-wide">
                                  {isOpen ? "Klikni pre zbalenie" : "Rozklikni detail"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`${mealStyle.badgeClass} text-xs font-bold px-2 py-1 rounded-full`}
                                >
                                  {summary.total} ks
                                </span>
                                <ChevronDown
                                  className={[
                                    "w-4 h-4 text-slate-500 transition-transform duration-200",
                                    isOpen ? "rotate-180" : "",
                                  ].join(" ")}
                                />
                              </div>
                            </div>
                          </button>

                          <div
                            className={[
                              "grid transition-all duration-300 ease-out",
                              isOpen
                                ? "[grid-template-rows:1fr] opacity-100 mt-3"
                                : "[grid-template-rows:0fr] opacity-0 mt-0",
                            ].join(" ")}
                          >
                            <div className="space-y-3 overflow-hidden min-h-0">
                              {summary.categories.map((category) => (
                                <div
                                  key={`${mealKey}-${category.category}`}
                                  className={[
                                    "bg-white border rounded-lg p-3 shadow-sm",
                                    mealStyle.accentClass,
                                  ].join(" ")}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={[
                                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                                        mealStyle.chipClass,
                                        mealStyle.chipTextClass,
                                      ].join(" ")}
                                    >
                                      {category.category}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                      {category.total} ks
                                    </span>
                                  </div>

                                  {category.menuEntries.length > 1 ? (
                                    <div className="mt-2">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                        Menu
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {category.menuEntries.map(([menu, count]) => (
                                          <span
                                            key={`${mealKey}-${category.category}-menu-${menu}`}
                                            className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700"
                                          >
                                            {menu}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                        Počet
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {category.total} ks
                                      </p>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                      Diéty
                                    </p>
                                    {category.dietEntries.length > 0 ? (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {category.dietEntries.map(([diet, count]) => (
                                          <span
                                            key={`${mealKey}-${category.category}-diet-${diet}`}
                                            className="text-xs px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700"
                                          >
                                            {diet}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-xs text-slate-400">
                                        Bez diét
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {!isEditable(mealKey) && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>
                                    Po deadline ({globalDeadlines[mealKey]})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Footer buttons: Edit | Erase | Delete ── */}
          <div className="pt-3 sm:pt-4 flex gap-2">
            <Button
              className="flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm"
              onClick={handleEdit}
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Upraviť
            </Button>
            <Button
              className={[
                "flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm border shadow-sm",
                onZero
                  ? "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60",
              ].join(" ")}
              onClick={onZero ?? undefined}
              disabled={!onZero}
            >
              <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Vynulovať
            </Button>
            <Button
              className={[
                "flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm border shadow-sm",
                canDeleteOrder
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60",
              ].join(" ")}
              onClick={
                canDeleteOrder
                  ? () => setDeleteConfirmation(true)
                  : undefined
              }
              disabled={!canDeleteOrder}
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Vymazať
            </Button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation}
        onClose={() => setDeleteConfirmation(false)}
        onConfirm={() => {
          deleteOrder(orderDate);
          if (onDelete) onDelete();
          onClose();
        }}
        title="Vymazať objednávku"
        description="Naozaj chcete vymazať celú objednávku pre tento deň? Táto akcia je nevratná."
        confirmText="Vymazať"
        variant="danger"
      />
    </div>
  , document.body);
};

export default OrderSummaryModal;
