import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp, CATEGORIES } from "../context/AppContext";
import DaySelector from "../components/order/DaySelector";
import MealCard from "../components/order/MealCard";
import CategoryRow from "../components/order/CategoryRow";
import DietSelector from "../components/order/DietSelector";
import OrderSummary from "../components/order/OrderSummary";
import {
  Coffee,
  Utensils,
  Apple,
  Check,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Switch } from "../components/ui/Switch";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OrderService, { DailyOrder } from "../services/OrderService";
import { useToast } from "../../../context/ToastContext";

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
    settings,
    updateSettings,
    clearMeal,
    getAvailableDiets,
    submitOrder,
    adminVisibleMeals,
    adminVisibleMenus,
    globalDeadlines,
  } = useApp();

  const [activeDietModal, setActiveDietModal] = useState<{
    meal: "breakfast" | "lunch" | "olovrant";
    category: string;
  } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [dataChangedState, setDataChangedState] = useState({
    breakfast: false,
    lunch: false,
    olovrant: false,
  });

  // Simple navigation blocking for internal links
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

  const initialDataRef = useRef<{
    breakfast: string;
    lunch: string;
    olovrant: string;
  } | null>(null);
  const dateKeyRef = useRef(selectedDate);
  const ignoreDataChangeRef = useRef(false);
  const prevDayLunchDataRef = useRef<string | null>(null);

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
      ignoreDataChangeRef.current = false;
      prevDayLunchDataRef.current = null;
      setDataChangedState({
        breakfast: false,
        lunch: false,
        olovrant: false,
      });
    }

    if (initialDataRef.current === null) {
      initialDataRef.current = {
        breakfast: JSON.stringify(currentOrder.breakfast),
        lunch: JSON.stringify(currentOrder.lunch),
        olovrant: JSON.stringify(currentOrder.olovrant),
      };
      return;
    }

    const currentData = {
      breakfast: JSON.stringify(currentOrder.breakfast),
      lunch: JSON.stringify(currentOrder.lunch),
      olovrant: JSON.stringify(currentOrder.olovrant),
    };

    // If ignoring change (during copy init), check if sync completed
    if (ignoreDataChangeRef.current) {
      let syncComplete = true;

      // Check Olovrant Sync
      if (settings.copyOlovrantFromLunch) {
        if (currentData.olovrant !== currentData.lunch) {
          syncComplete = false;
        } else {
          setDataChangedState((prev) => ({ ...prev, olovrant: false }));
        }
      }

      // Check Breakfast Sync
      if (settings.copyBreakfastFromPrevLunch) {
        // We compare current breakfast against what we expect (prevDayLunchDataRef)
        if (
          prevDayLunchDataRef.current &&
          currentData.breakfast !== prevDayLunchDataRef.current
        ) {
          syncComplete = false;
        } else if (prevDayLunchDataRef.current) {
          setDataChangedState((prev) => ({ ...prev, breakfast: false }));
        }
      }

      if (syncComplete) {
        ignoreDataChangeRef.current = false;
      }

      // While ignoring, we don't want to calculate standard diffs for the copying fields
      // but we SHOULD calculate normal diffs for non-copying fields.
      // For simplicity, we just partial update above and avoid the full diff block below if ignoring.
      // However, we must ensure other fields update.
      const initialData = initialDataRef.current || {
        breakfast: "",
        lunch: "",
        olovrant: "",
      };

      setDataChangedState((prev) => ({
        breakfast: settings.copyBreakfastFromPrevLunch
          ? prev.breakfast
          : currentData.breakfast !== initialData.breakfast,
        lunch: currentData.lunch !== initialData.lunch,
        olovrant: settings.copyOlovrantFromLunch
          ? prev.olovrant
          : currentData.olovrant !== initialData.olovrant,
      }));
    } else {
      const initialData = initialDataRef.current || {
        breakfast: "",
        lunch: "",
        olovrant: "",
      };
      setDataChangedState({
        breakfast: currentData.breakfast !== initialData.breakfast,
        lunch: currentData.lunch !== initialData.lunch,
        olovrant: currentData.olovrant !== initialData.olovrant,
      });
    }
  }, [
    currentOrder,
    selectedDate,
    settings.copyOlovrantFromLunch,
    settings.copyBreakfastFromPrevLunch,
  ]);

  useEffect(() => {
    if (dataChangedState.breakfast && settings.copyBreakfastFromPrevLunch) {
      updateSettings("copyBreakfastFromPrevLunch", false);
    }
    if (dataChangedState.olovrant && settings.copyOlovrantFromLunch) {
      updateSettings("copyOlovrantFromLunch", false);
    }
  }, [
    dataChangedState,
    settings.copyBreakfastFromPrevLunch,
    settings.copyOlovrantFromLunch,
    updateSettings,
  ]);

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

  const handleSubmit = async () => {
    try {
      await submitOrder(selectedDate);
      toast.success("Objednávka bola úspešne odoslaná!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      toast.error("Nepodarilo sa odoslať objednávku. Skúste to znova.");
    }
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
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-indigo-900 font-medium">
                Auto-výpočet (podľa včera)
              </span>
            </div>
            <Switch
              checked={settings.copyBreakfastFromPrevLunch}
              onCheckedChange={(val) => {
                updateSettings("copyBreakfastFromPrevLunch", val);
                if (!val) {
                  clearMeal("breakfast");
                  resetMealData("breakfast");
                } else {
                  // ENABLE COPY
                  ignoreDataChangeRef.current = true;
                  setDataChangedState((prev) => ({
                    ...prev,
                    breakfast: false,
                  }));

                  // Calculate what we expect to receive (Previous Day Lunch)
                  // This mirrors the logic in useOrder
                  const prevDate = new Date(selectedDate);
                  prevDate.setDate(prevDate.getDate() - 1);
                  const prevDateStr = prevDate.toISOString().split("T")[0];
                  const prevOrderSaved = localStorage.getItem(
                    `order_${prevDateStr}`,
                  );

                  let expectedData = JSON.stringify(
                    OrderService.createEmptyMeal(),
                  );
                  if (prevOrderSaved) {
                    try {
                      const prevOrder = JSON.parse(prevOrderSaved);
                      if (prevOrder.lunch) {
                        expectedData = JSON.stringify(prevOrder.lunch);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }

                  prevDayLunchDataRef.current = expectedData;

                  // Update expectation
                  initialDataRef.current = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(initialDataRef.current as any),
                    breakfast: expectedData,
                  };
                }
              }}
              className="scale-90"
            />
          </div>
          <button
            onClick={() => {
              clearMeal("breakfast");
              resetMealData("breakfast");
              setDataChangedState((prev) => ({ ...prev, breakfast: false }));
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
              setDataChangedState((prev) => ({ ...prev, lunch: false }));
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
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-indigo-900 font-medium">
                Kopírovať z dnešného obeda
              </span>
            </div>
            <Switch
              checked={settings.copyOlovrantFromLunch}
              onCheckedChange={(val) => {
                updateSettings("copyOlovrantFromLunch", val);
                if (!val) {
                  clearMeal("olovrant");
                  resetMealData("olovrant");
                } else {
                  // ENABLE COPY
                  ignoreDataChangeRef.current = true;
                  setDataChangedState((prev) => ({ ...prev, olovrant: false }));

                  // We expect the new state to be currentOrder.lunch
                  // We update initialDataRef to this EXPECTED state immediately
                  initialDataRef.current = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(initialDataRef.current as any),
                    olovrant: JSON.stringify(currentOrder.lunch),
                  };
                }
              }}
              className="scale-90"
            />
          </div>
          <button
            onClick={() => {
              clearMeal("olovrant");
              resetMealData("olovrant");
              setDataChangedState((prev) => ({ ...prev, olovrant: false }));
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
        <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} />

        <div className="space-y-6">
          {visibleMealsList.map((mealItem) => {
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
                  ).map((category) => {
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
                      />
                    );
                  })}
                </div>
              </MealCard>
            );
          })}
        </div>

        <OrderSummary
          onSubmit={handleSubmit}
          disabled={
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
          }
          disabledMessage="Na tento deň už nie je možné vytvoriť objednávku (termín uplynul)."
        />
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

      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-green-500 p-1 rounded-full">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="font-medium text-sm">
            Objednávka bola úspešne uložená.
          </span>
        </div>
      )}

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
    </div>
  );
};

export default OrderPage;
