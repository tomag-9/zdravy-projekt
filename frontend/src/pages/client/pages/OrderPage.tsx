import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp, CATEGORIES } from "../context/AppContext";
import DaySelector from "../components/order/DaySelector";
import MealCard from "../components/order/MealCard";
import CategoryRow from "../components/order/CategoryRow";
import DietSelector from "../components/order/DietSelector";
import OrderSummary from "../components/order/OrderSummary";
import { Coffee, Utensils, Apple, Trash2, ArrowLeft, Copy } from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OrderService, { DailyOrder } from "../services/OrderService";
import { useToast } from "../../../context/ToastContext";
import { OrderRequestError } from "../hooks/useOrder";
import TourOverlay from "../components/onboarding/TourOverlay";
import { useOnboarding } from "../../../context/OnboardingContext";

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const {
    selectedDate,
    setSelectedDate,
    activeMeals,
    toggleMeal,
    currentOrder,
    updateMenuCount,
    updateDiet,
    enabledCategories,
    clearMeal,
    getAvailableDiets,
    submitOrder,
    adminVisibleMeals,
    adminVisibleMenus,
    globalDeadlines,
    loadBreakfastFromPrevLunch,
    copyOlovrantFromCurrentLunch,
    holidays,
  } = useApp();

  const { isTourActive, currentStep } = useOnboarding();

  const [activeDietModal, setActiveDietModal] = useState<{
    meal: "breakfast" | "lunch" | "olovrant";
    category: string;
  } | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [showZeroModal, setShowZeroModal] = useState(false);

  const initialDataRef = useRef<{
    breakfast: string;
    lunch: string;
    olovrant: string;
  } | null>(null);
  const dateKeyRef = useRef(selectedDate);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest("a");
      const button = (e.target as Element).closest("button");
      const isSubmit = button && (button.innerText || "").includes("Odoslať");

      // Allow if submitted recently or clean state (simplified check)
      if (!link || isSubmit) return;

      // Check if order is draft/dirty
      if (currentOrder.status !== "submitted") {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("#")) {
          e.preventDefault();
          setPendingNavigation(href);
          setShowUnsavedModal(true);
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentOrder.status]);

  useEffect(() => {
    const dateFromUrl = searchParams.get("date");
    if (dateFromUrl) {
      setSelectedDate(dateFromUrl);
    }
  }, [searchParams, setSelectedDate]);

  useEffect(() => {
    if (dateKeyRef.current !== selectedDate) {
      dateKeyRef.current = selectedDate;
      initialDataRef.current = null;
    }
    if (initialDataRef.current === null) {
      initialDataRef.current = {
        breakfast: JSON.stringify(currentOrder.breakfast),
        lunch: JSON.stringify(currentOrder.lunch),
        olovrant: JSON.stringify(currentOrder.olovrant),
      };
    }
  }, [currentOrder, selectedDate]);

  const meals: {
    key: keyof DailyOrder;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "breakfast", label: "Raňajky", icon: Coffee },
    { key: "lunch", label: "Obed", icon: Utensils },
    { key: "olovrant", label: "Olovrant", icon: Apple },
  ];

  const visibleMealsList =
    Array.isArray(adminVisibleMeals) && adminVisibleMeals.length > 0
      ? meals.filter((m) => adminVisibleMeals.includes(m.key))
      : meals;

  // ── Tour: auto-expand first meal when reaching the CategoryRow step (7) ─────
  useEffect(() => {
    if (!isTourActive || currentStep !== 7) return;
    const firstMeal = visibleMealsList[0];
    if (!firstMeal) return;
    const key = firstMeal.key as "breakfast" | "lunch" | "olovrant";
    const isEditable = OrderService.checkDeadline(selectedDate, key, globalDeadlines);
    if (isEditable && !activeMeals[key]) {
      toggleMeal(key);
    }
  }, [isTourActive, currentStep, visibleMealsList, selectedDate, globalDeadlines, activeMeals, toggleMeal]);

  const getFriendlyOrderErrorMessage = (error: unknown) => {
    if (
      error instanceof OrderRequestError &&
      error.code === "order_deadline_passed"
    ) {
      return "Objednávku už nie je možné odoslať, termín uplynul.";
    }

    return "Nepodarilo sa odoslať objednávku. Skúste to znova.";
  };

  const handleSubmit = async () => {
    try {
      await submitOrder(selectedDate);
      toast.success("Objednávka bola úspešne odoslaná!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      toast.error(getFriendlyOrderErrorMessage(e));
    }
  };
  const handleReset = () => {
    const mealsToReset = visibleMealsList.filter((m) =>
      OrderService.checkDeadline(selectedDate, m.key, globalDeadlines),
    );
    setShowZeroModal(false);
    if (mealsToReset.length === 0) {
      toast.info("Termín pre všetky jedlá uplynul, nič nebolo vynulované.");
      return;
    }
    mealsToReset.forEach((meal) => {
      const mealKey = meal.key as "breakfast" | "lunch" | "olovrant";
      clearMeal(mealKey);
      resetMealData(mealKey);
    });
    toast.success(
      "Objednávka bola vynulovaná lokálne. Odošlite ju, aby sa zmena uložila.",
    );
  };
  const resetMealData = (mealKey: keyof DailyOrder) => {
    initialDataRef.current = {
      breakfast:
        mealKey === "breakfast"
          ? JSON.stringify(currentOrder.breakfast)
          : (initialDataRef.current?.breakfast as string),
      lunch:
        mealKey === "lunch"
          ? JSON.stringify(currentOrder.lunch)
          : (initialDataRef.current?.lunch as string),
      olovrant:
        mealKey === "olovrant"
          ? JSON.stringify(currentOrder.olovrant)
          : (initialDataRef.current?.olovrant as string),
    };
  };

  const handleCopyTrigger = (mealKey: string) => {
    if (mealKey === "breakfast") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              const loaded = loadBreakfastFromPrevLunch();
              if (loaded) {
                toast.success("Raňajky načítané z obeda (včera).");
              } else {
                toast.info("Nemám dáta z včerajšieho obeda.");
              }
              resetMealData("breakfast");
            }}
            className="w-full text-xs py-2 px-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <Copy className="w-3 h-3" /> Načítať z včerajšieho obeda
          </button>
          <button
            onClick={() => {
              clearMeal("breakfast");
              resetMealData("breakfast");
            }}
            className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Vymazať
          </button>
        </div>
      );
    }

    if (mealKey === "lunch") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              clearMeal("lunch");
              resetMealData("lunch");
            }}
            className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Vymazať
          </button>
        </div>
      );
    }

    if (mealKey === "olovrant") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              const copied = copyOlovrantFromCurrentLunch();
              if (copied) {
                toast.success("Olovrant skopírovaný z obeda.");
              } else {
                toast.info("Obed je prázdny, nie je čo kopírovať.");
              }
              resetMealData("olovrant");
            }}
            className="w-full text-xs py-2 px-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <Copy className="w-3 h-3" /> Kopírovať z obeda
          </button>
          <button
            onClick={() => {
              clearMeal("olovrant");
              resetMealData("olovrant");
            }}
            className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Vymazať
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 md:p-0 pb-24">
      <div className="max-w-6xl mx-auto mb-6 md:mb-8 pt-2 md:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/home">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                Objednávka jedál
              </h1>
              <p className="hidden sm:block text-sm md:text-base text-slate-500">
                Správa denného menu a diét
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div data-tour-id="tour-day-selector">
          <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} holidays={holidays} />
        </div>

        {holidays?.has(selectedDate) && (
          <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4 text-sky-800">
            <span className="text-2xl" aria-hidden="true">🏖️</span>
            <div>
              <div className="font-semibold text-sky-900">Voľný deň</div>
              <div className="text-sm text-sky-700">Na tento deň nie je možné zadať objednávku.</div>
            </div>
          </div>
        )}

        <div
          className={`space-y-6 ${holidays?.has(selectedDate) ? 'opacity-40 pointer-events-none select-none' : ''}`}
          inert={holidays?.has(selectedDate) ? true : undefined}
        >
          {visibleMealsList.map((mealItem, mealIndex) => {
            const { key: rawKey, label, icon } = mealItem;
            const key = rawKey as "breakfast" | "lunch" | "olovrant";
            // Check deadline - assuming OrderService is available
            const isEditable = OrderService.checkDeadline(
              selectedDate,
              key,
              globalDeadlines,
            );

            return (
              <MealCard
                key={key}
                title={label}
                icon={icon}
                isActive={isEditable && activeMeals[key]}
                onToggle={() => isEditable && toggleMeal(key)} // Block toggle if not editable
                copyAction={isEditable ? handleCopyTrigger(key) : null} // Hide copy if not editable
                className={!isEditable ? "opacity-75" : ""} // Visual feedback
                tourId={mealIndex === 0 ? "tour-meal-card" : undefined}
                statusMessage={
                  !isEditable ? (
                    <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-2 inline-flex mb-2">
                      <span className="font-bold">Termín uplynul</span>
                      <span>- Objednávka uzavretá</span>
                    </div>
                  ) : null
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CATEGORIES.filter((category) =>
                    enabledCategories.includes(category),
                  ).map((category, catIndex) => {
                    const data = currentOrder[key]?.[category];
                    if (!data) return null;

                    const dietCount = (
                      Object.values(data.diets || {}) as number[]
                    ).reduce((a: number, b: number) => a + b, 0);
                    const availableDiets = getAvailableDiets(category);

                    return (
                      <CategoryRow
                        key={category}
                        label={category}
                        menuCounts={data.menuCounts}
                        onMenuCountChange={(menuType, val) =>
                          isEditable &&
                          updateMenuCount(key, category, menuType, val)
                        }
                        hasDietsEnabled={availableDiets.length > 0}
                        dietCount={dietCount}
                        onOpenDiets={() =>
                          isEditable &&
                          setActiveDietModal({ meal: key, category })
                        }
                        disabled={!isEditable}
                        visibleMenus={adminVisibleMenus}
                        tourId={mealIndex === 0 && catIndex === 0 ? "tour-category-row" : undefined}
                      />
                    );
                  })}
                </div>
              </MealCard>
            );
          })}
        </div>

        <div data-tour-id="tour-order-summary">
        <OrderSummary
          onSubmit={handleSubmit}
          onReset={
            visibleMealsList.every((m) =>
              OrderService.checkDeadline(selectedDate, m.key, globalDeadlines),
            )
              ? () => setShowZeroModal(true)
              : undefined
          }
          disabled={
            holidays?.has(selectedDate) ||
            (
              !OrderService.checkDeadline(
                selectedDate,
                "breakfast",
                globalDeadlines,
              ) &&
              !OrderService.checkDeadline(
                selectedDate,
                "lunch",
                globalDeadlines,
              ) &&
              !OrderService.checkDeadline(
                selectedDate,
                "olovrant",
                globalDeadlines,
              )
            )
          }
          disabledMessage={
            holidays?.has(selectedDate)
              ? "Voľný deň – objednávky nie sú dostupné."
              : "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul)."
          }
        />
        </div>
      </div>

      {activeDietModal && (
        <DietSelector
          isOpen={true}
          onClose={() => setActiveDietModal(null)}
          categoryLabel={activeDietModal.category}
          enabledDiets={getAvailableDiets(activeDietModal.category)}
          diets={
            currentOrder[
              activeDietModal.meal as "breakfast" | "lunch" | "olovrant"
            ][activeDietModal.category].diets
          }
          maxPortions={
            currentOrder[
              activeDietModal.meal as "breakfast" | "lunch" | "olovrant"
            ][activeDietModal.category].menuCounts?.["A"] || 0
          }
          onUpdateDiet={(diet, count) =>
            updateDiet(
              activeDietModal.meal as "breakfast" | "lunch" | "olovrant",
              activeDietModal.category,
              diet,
              count,
            )
          }
        />
      )}

      <ConfirmationModal
        isOpen={showZeroModal}
        onClose={() => setShowZeroModal(false)}
        onConfirm={handleReset}
        title="Vynulovať objednávku"
        description="Naozaj chcete vynulovať celú objednávku? Všetky porcie a diéty budú nastavené na nulu."
        confirmText="Vynulovať"
        cancelText="Zrušiť"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onConfirm={() => {
          if (pendingNavigation) {
            window.location.href = pendingNavigation;
          }
        }}
        title="Neuložené zmeny"
        description="Máte rozpracovanú objednávku. Naozaj chcete odísť? Vaše zmeny ostanú iba ako koncept."
        confirmText="Odísť"
        cancelText="Zostať"
        variant="warning"
      />
      <TourOverlay />
    </div>
  );
};

export default OrderPage;
