import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp, CATEGORIES } from "../context/AppContext";
import DaySelector from "../components/order/DaySelector";
import MealCard from "../components/order/MealCard";
import CategoryRow from "../components/order/CategoryRow";
import DietSelector from "../components/order/DietSelector";
import OrderSummary from "../components/order/OrderSummary";
import { Coffee, Utensils, Apple, Trash2, ArrowLeft, Copy, Calendar } from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OrderService, { CategoryData, DailyOrder } from "../services/OrderService";
import { useToast } from "../../../context/ToastContext";
import { OrderRequestError } from "../hooks/useOrder";
import TourOverlay from "../components/onboarding/TourOverlay";
import { useOnboarding } from "../../../context/OnboardingContext";

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const navigate = useNavigate();

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
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
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
      if (!link || isSubmit) return;
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
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    { key: "breakfast", label: "Raňajky", icon: Coffee },
    { key: "lunch", label: "Obed", icon: Utensils },
    { key: "olovrant", label: "Olovrant", icon: Apple },
  ];

  const visibleMealsList =
    Array.isArray(adminVisibleMeals) && adminVisibleMeals.length > 0
      ? meals.filter((m) => adminVisibleMeals.includes(m.key))
      : meals;

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
    if (error instanceof OrderRequestError && error.code === "order_deadline_passed") {
      return "Objednávku už nie je možné odoslať, termín uplynul.";
    }
    return "Nepodarilo sa odoslať objednávku. Skúste to znova.";
  };

  const getTotalPortions = () => {
    let total = 0;
    visibleMealsList.forEach(({ key }) => {
      const mealKey = key as "breakfast" | "lunch" | "olovrant";
      if (activeMeals[mealKey] && currentOrder[mealKey]) {
        Object.values(currentOrder[mealKey]).forEach((cat: CategoryData) => {
          const counts = cat.menuCounts || {};
          total += (Object.values(counts) as number[]).reduce((a: number, b: number) => a + b, 0);
        });
      }
    });
    return total;
  };

  const getTotalDiets = () => {
    let total = 0;
    visibleMealsList.forEach(({ key }) => {
      const mealKey = key as "breakfast" | "lunch" | "olovrant";
      if (activeMeals[mealKey] && currentOrder[mealKey]) {
        Object.values(currentOrder[mealKey]).forEach((cat: CategoryData) => {
          if (cat.diets) {
            total += (Object.values(cat.diets) as number[]).reduce((a: number, b: number) => a + b, 0);
          }
        });
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    try {
      await submitOrder(selectedDate);
      const total = getTotalPortions();
      const dietCount = getTotalDiets();
      navigate(`/success?date=${selectedDate}&total=${total}&dietCount=${dietCount}`);
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
    toast.success("Objednávka bola vynulovaná lokálne. Odošlite ju, aby sa zmena uložila.");
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
        <>
          <button
            className="zp-btn zp-btn--secondary zp-btn--sm"
            style={{ flex: 1 }}
            onClick={() => {
              const loaded = loadBreakfastFromPrevLunch();
              if (loaded) {
                toast.success("Raňajky načítané z obeda (včera).");
              } else {
                toast.info("Nemám dáta z včerajšieho obeda.");
              }
              resetMealData("breakfast");
            }}
          >
            <Copy style={{ width: 12, height: 12 }} /> Načítať z včerajška
          </button>
          <button
            className="zp-btn zp-btn--danger zp-btn--sm"
            onClick={() => {
              clearMeal("breakfast");
              resetMealData("breakfast");
            }}
          >
            <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
          </button>
        </>
      );
    }
    if (mealKey === "lunch") {
      return (
        <button
          className="zp-btn zp-btn--danger zp-btn--sm"
          style={{ flex: 1 }}
          onClick={() => {
            clearMeal("lunch");
            resetMealData("lunch");
          }}
        >
          <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
        </button>
      );
    }
    if (mealKey === "olovrant") {
      return (
        <>
          <button
            className="zp-btn zp-btn--secondary zp-btn--sm"
            style={{ flex: 1 }}
            onClick={() => {
              const copied = copyOlovrantFromCurrentLunch();
              if (copied) {
                toast.success("Olovrant skopírovaný z obeda.");
              } else {
                toast.info("Obed je prázdny, nie je čo kopírovať.");
              }
              resetMealData("olovrant");
            }}
          >
            <Copy style={{ width: 12, height: 12 }} /> Kopírovať z obeda
          </button>
          <button
            className="zp-btn zp-btn--danger zp-btn--sm"
            onClick={() => {
              clearMeal("olovrant");
              resetMealData("olovrant");
            }}
          >
            <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
          </button>
        </>
      );
    }
    return null;
  };

  const dateFormatter = new Intl.DateTimeFormat('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateObj = new Date(`${selectedDate}T12:00:00`);
  const formattedDate = dateFormatter.format(dateObj);
  const totalPortions = getTotalPortions();

  return (
    <div className="zp-app">
      <div className="zp-orderpage">
        {/* Top bar */}
        <div className="zp-orderbar">
          <button
            className="zp-iconbtn"
            aria-label="Späť"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
          </button>
          <div>
            <h1>Objednávka</h1>
            <p>Príprava na vybraný deň</p>
          </div>
        </div>

        {/* Top context strip */}
        <div className="zp-order-context">
          <span className="ic">
            <Calendar style={{ width: 16, height: 16, strokeWidth: 2 }} />
          </span>
          <div className="body">
            <div className="l">Na {formattedDate}</div>
            <div className="v">
              máte objednané{" "}
              <span style={{ color: "var(--green-700)" }}>{totalPortions}</span> porcií
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div data-tour-id="tour-day-selector">
          <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} holidays={holidays} />
        </div>

        {/* Holiday banner */}
        {holidays?.has(selectedDate) && (
          <div className="zp-banner zp-banner--holiday" style={{ display: "flex", gap: 12 }}>
            <span className="icon">🏖️</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-500)", fontSize: 14 }}>
                Voľný deň
              </div>
              <div style={{ fontSize: 13, color: "var(--teal-500)" }}>Na tento deň nie je možné zadať objednávku.</div>
            </div>
          </div>
        )}

        {/* Meal cards */}
        <div
          style={holidays?.has(selectedDate) ? { opacity: 0.4, pointerEvents: "none" } : {}}
          aria-disabled={holidays?.has(selectedDate) ? true : undefined}
        >
          {visibleMealsList.map((mealItem, mealIndex) => {
            const { key: rawKey, label, icon } = mealItem;
            const key = rawKey as "breakfast" | "lunch" | "olovrant";
            const isEditable = OrderService.checkDeadline(selectedDate, key, globalDeadlines);
            const isHoliday = holidays?.has(selectedDate);

            return (
              <MealCard
                key={key}
                title={label}
                icon={icon}
                isActive={isEditable && !isHoliday && activeMeals[key]}
                onToggle={() => isEditable && !isHoliday && toggleMeal(key)}
                copyAction={isEditable && !isHoliday ? handleCopyTrigger(key) : null}
                className={!isEditable || isHoliday ? "" : ""}
                tourId={mealIndex === 0 ? "tour-meal-card" : undefined}
                statusMessage={
                  !isEditable ? (
                    <>Termín uplynul · Objednávka uzavretá</>
                  ) : null
                }
              >
                <div>
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
                          isEditable && !isHoliday && updateMenuCount(key, category, menuType, val)
                        }
                        hasDietsEnabled={availableDiets.length > 0}
                        dietCount={dietCount}
                        onOpenDiets={() =>
                          isEditable && !isHoliday && setActiveDietModal({ meal: key, category })
                        }
                        disabled={!isEditable || !!isHoliday}
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

        {/* Order summary */}
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
                !OrderService.checkDeadline(selectedDate, "breakfast", globalDeadlines) &&
                !OrderService.checkDeadline(selectedDate, "lunch", globalDeadlines) &&
                !OrderService.checkDeadline(selectedDate, "olovrant", globalDeadlines)
              )
            }
            disabledMessage={
              holidays?.has(selectedDate)
                ? "Voľný deň – objednávky nie sú dostupné."
                : "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul)."
            }
          />
        </div>

        {/* Thank-you footer */}
        <p className="zp-thanks">
          Ďakujeme za Vašu objednávku
          <small>Posielame ju priamo do našej kuchyne.</small>
        </p>
      </div>

      {/* Diet bottom-sheet */}
      {activeDietModal && (
        <DietSelector
          isOpen={true}
          onClose={() => setActiveDietModal(null)}
          categoryLabel={activeDietModal.category}
          enabledDiets={getAvailableDiets(activeDietModal.category)}
          diets={
            currentOrder[activeDietModal.meal as "breakfast" | "lunch" | "olovrant"][
              activeDietModal.category
            ].diets
          }
          maxPortions={
            currentOrder[activeDietModal.meal as "breakfast" | "lunch" | "olovrant"][
              activeDietModal.category
            ].menuCounts?.["A"] || 0
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
        description="Naozaj chcete vynulovať celú objednávku? Všetky porcie a diéty budú nastavené na nulu."
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
