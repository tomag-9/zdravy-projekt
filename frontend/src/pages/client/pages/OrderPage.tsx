import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsPC } from "../../../hooks/useIsPC";
import { useApp, CATEGORIES } from "../context/AppContext";
import DaySelector from "../components/order/DaySelector";
import MealCard from "../components/order/MealCard";
import CategoryRow from "../components/order/CategoryRow";
import DietSelector from "../components/order/DietSelector";
import OrderSummary from "../components/order/OrderSummary";
import { Coffee, Utensils, Apple, Trash2, ArrowLeft, Copy, Calendar, Settings, CalendarDays } from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OrderService, { CategoryData, DailyOrder } from "../services/OrderService";
import { useToast } from "../../../context/ToastContext";
import { OrderRequestError } from "../hooks/useOrder";
import TourOverlay from "../components/onboarding/TourOverlay";
import { TOUR_STEPS } from "../components/onboarding/tourSteps";
import { useOnboarding } from "../../../context/OnboardingContext";
import { logger } from '../../../lib/logger';

type MealKey = "breakfast" | "lunch" | "olovrant";

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const navigate = useNavigate();
  const isPC = useIsPC();

  const {
    selectedDate,
    setSelectedDate,
    activeMeals,
    toggleMeal,
    fullDayOrder,
    toggleFullDay,
    fullDayData,
    updateFullDayMenuCount,
    updateFullDayDiet,
    clearFullDay,
    specialDietNote,
    setSpecialDietNote,
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
    mealPlanAvailability,
    prevadzky,
    needsChoice,
    chosenPrevadzka,
    setChosenPrevadzka,
    activePrevadzka,
  } = useApp();

  const getOccupiedMenus = (mealKey: string): Set<string> => {
    if (!mealPlanAvailability) return new Set();
    const available = mealPlanAvailability[mealKey];
    if (!available) return new Set();
    return new Set(adminVisibleMenus.filter((m: string) => !available.has(m)));
  };

  const { isTourActive, currentStep } = useOnboarding();

  const [activeDietModal, setActiveDietModal] = useState<{
    meal: "breakfast" | "lunch" | "olovrant" | "fullDay";
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
  const firstVisibleMealKey = visibleMealsList[0]?.key as MealKey | undefined;
  const isFullDayDeadlineOpen = firstVisibleMealKey
    ? OrderService.checkDeadline(selectedDate, firstVisibleMealKey, globalDeadlines)
    : false;

  useEffect(() => {
    if (fullDayOrder && !isFullDayDeadlineOpen) {
      toggleFullDay();
    }
  }, [fullDayOrder, isFullDayDeadlineOpen, toggleFullDay]);

  useEffect(() => {
    if (!isTourActive || TOUR_STEPS[currentStep]?.targetId !== "tour-category-row") return;
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

  const hasSpecialDietOrdered = (): boolean => {
    const checkMeal = (meal: Record<string, CategoryData>) =>
      Object.values(meal).some(cat => (cat.diets?.['Špeciálna'] ?? 0) > 0);
    if (fullDayOrder) return checkMeal(fullDayData);
    return visibleMealsList.some(({ key }) => {
      const mealKey = key as "breakfast" | "lunch" | "olovrant";
      return activeMeals[mealKey] && checkMeal(currentOrder[mealKey]);
    });
  };

  const handleSubmit = async () => {
    if (hasSpecialDietOrdered() && !specialDietNote.trim()) {
      toast.error('Prosím špecifikujte špeciálnu diétu pred odoslaním.');
      return;
    }
    try {
      await submitOrder(selectedDate, activePrevadzka?.id);
      const total = getTotalPortions();
      const dietCount = getTotalDiets();
      navigate(`/success?date=${selectedDate}&total=${total}&dietCount=${dietCount}`);
    } catch (e) {
      logger.error(e);
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

  const fullDayMealLabels = visibleMealsList.map(m => m.label).join(' · ');
  const isHolidayDay = holidays?.has(selectedDate);
  const allVisibleDeadlinesClosed = visibleMealsList.every((m) =>
    !OrderService.checkDeadline(selectedDate, m.key, globalDeadlines),
  );

  const mealCardsContent = (
    <div
      style={isHolidayDay ? { opacity: 0.4, pointerEvents: "none" } : {}}
      aria-disabled={isHolidayDay ? true : undefined}
    >
      {/* Celodenná objednávka */}
      <MealCard
        title="Celodenná objednávka"
        icon={CalendarDays}
        tourId="tour-fullday-card"
        isActive={fullDayOrder && isFullDayDeadlineOpen}
        onToggle={() => isFullDayDeadlineOpen && toggleFullDay()}
        statusMessage={
          !isFullDayDeadlineOpen ? (
            <>Termín prvého jedla uplynul · Celodenná objednávka je uzavretá</>
          ) : null
        }
        copyAction={fullDayOrder ? (
          <button
            className="zp-btn zp-btn--danger zp-btn--sm"
            style={{ flex: 1 }}
            onClick={() => clearFullDay()}
          >
            <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
          </button>
        ) : null}
      >
        <div>
          <div className="zp-fullday-info">
            Bude objednané: <strong>{fullDayMealLabels}</strong>
          </div>
          {CATEGORIES.filter(cat => enabledCategories.includes(cat)).map(category => {
            const data = fullDayData[category];
            if (!data) return null;
            const dietCount = (Object.values(data.diets || {}) as number[]).reduce((a, b) => a + b, 0);
            const availableDiets = getAvailableDiets(category);
            return (
              <CategoryRow
                key={category}
                label={category}
                menuCounts={data.menuCounts}
                onMenuCountChange={(menuType, val) => updateFullDayMenuCount(category, menuType, val)}
                hasDietsEnabled={availableDiets.length > 0}
                dietCount={dietCount}
                onOpenDiets={() => setActiveDietModal({ meal: "fullDay", category })}
                disabled={false}
                visibleMenus={adminVisibleMenus}
              />
            );
          })}
        </div>
      </MealCard>

      {/* Individual meal cards */}
      {visibleMealsList.map((mealItem, mealIndex) => {
        const { key: rawKey, label, icon } = mealItem;
        const key = rawKey as "breakfast" | "lunch" | "olovrant";
        const isEditable = OrderService.checkDeadline(selectedDate, key, globalDeadlines);
        const isHoliday = isHolidayDay;
        const blockedByFullDay = fullDayOrder && isFullDayDeadlineOpen;

        return (
          <MealCard
            key={key}
            title={label}
            icon={icon}
            isActive={!blockedByFullDay && isEditable && !isHoliday && activeMeals[key]}
            onToggle={() => !blockedByFullDay && isEditable && !isHoliday && toggleMeal(key)}
            copyAction={!blockedByFullDay && isEditable && !isHoliday ? handleCopyTrigger(key) : null}
            tourId={mealIndex === 0 ? "tour-meal-card" : undefined}
            statusMessage={
              blockedByFullDay ? (
                <>Celodenná objednávka je aktívna</>
              ) : !isEditable ? (
                <>Termín uplynul · Objednávka uzavretá</>
              ) : null
            }
          >
            <div>
              {CATEGORIES.filter(category => enabledCategories.includes(category)).map((category, catIndex) => {
                const data = currentOrder[key]?.[category];
                if (!data) return null;
                const dietCount = (Object.values(data.diets || {}) as number[]).reduce((a, b) => a + b, 0);
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
                    occupiedMenus={getOccupiedMenus(key)}
                    tourId={mealIndex === 0 && catIndex === 0 ? "tour-category-row" : undefined}
                  />
                );
              })}
            </div>
          </MealCard>
        );
      })}
    </div>
  );

  const specialDietNoteContent = hasSpecialDietOrdered() && (
    <div className="zp-special-diet-note-box">
      <label className="zp-special-diet-note-label">
        Špecifikujte špeciálnu diétu <span style={{ color: "var(--color-danger)" }}>*</span>
      </label>
      <textarea
        className={`zp-input zp-special-diet-textarea${!specialDietNote.trim() ? " zp-input--error" : ""}`}
        placeholder="Popíšte vašu špeciálnu diétu"
        value={specialDietNote}
        rows={3}
        onChange={e => setSpecialDietNote(e.target.value)}
      />
    </div>
  );

  const orderSummaryContent = (
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
          (fullDayOrder ? !isFullDayDeadlineOpen : allVisibleDeadlinesClosed)
        }
        disabledMessage={
          holidays?.has(selectedDate)
            ? "Voľný deň – objednávky nie sú dostupné."
            : "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul)."
        }
      />
    </div>
  );

  const modals = (
    <>
      {activeDietModal && (() => {
        const isFullDay = activeDietModal.meal === "fullDay";
        const mealData = isFullDay
          ? fullDayData
          : currentOrder[activeDietModal.meal as "breakfast" | "lunch" | "olovrant"];
        const catData = mealData[activeDietModal.category];
        return (
          <DietSelector
            isOpen={true}
            onClose={() => setActiveDietModal(null)}
            categoryLabel={activeDietModal.category}
            enabledDiets={getAvailableDiets(activeDietModal.category)}
            diets={catData.diets}
            maxPortions={catData.menuCounts?.["A"] || 0}
            onUpdateDiet={(diet, count) =>
              isFullDay
                ? updateFullDayDiet(activeDietModal.category, diet, count)
                : updateDiet(activeDietModal.meal as "breakfast" | "lunch" | "olovrant", activeDietModal.category, diet, count)
            }
          />
        );
      })()}

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
    </>
  );

  if (isPC) {
    return (
      <div className="pc-wrap">
        {/* PC day selector */}
        <div className="pc-daysel-pc" data-tour-id="tour-day-selector">
          <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} holidays={holidays} />
        </div>

        {/* Holiday banner */}
        {holidays?.has(selectedDate) && (
          <div className="zp-banner zp-banner--holiday" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span className="icon">🏖️</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-500)", fontSize: 14 }}>
                Voľný deň
              </div>
              <div style={{ fontSize: 13, color: "var(--teal-500)" }}>Na tento deň nie je možné zadať objednávku.</div>
            </div>
          </div>
        )}

        <div className="pc-order-grid">
          <div>
            {mealCardsContent}
            {specialDietNoteContent}
            <p className="zp-thanks">
              Ďakujeme za Vašu objednávku
              <small>Posielame ju priamo do našej kuchyne.</small>
            </p>
          </div>
          <div className="pc-order-summary">
            {orderSummaryContent}
          </div>
        </div>

        {modals}
        <TourOverlay />
      </div>
    );
  }

  // Počas načítavania nič neblokujeme: celok s jednou prevádzkou (drvivá väčšina)
  // by inak videl prázdnu obrazovku. Chooser sa zobrazí, až keď vieme, že treba.
  if (needsChoice && !chosenPrevadzka) {
    return (
      <div className="zp-app">
        <div className="zp-orderpage">
          <div className="zp-orderbar">
            <button className="zp-iconbtn" aria-label="Späť" onClick={() => navigate("/")}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="zp-orderbar__title">Vyberte prevádzku</h1>
          </div>

          <div className="zp-card" style={{ margin: "1rem", padding: "1rem" }}>
            <p style={{ marginBottom: "1rem", opacity: 0.8 }}>
              Za ktorú prevádzku nahlasujete objednávku?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {prevadzky.map((p) => (
                <button
                  key={p.id}
                  className="zp-btn zp-btn--secondary"
                  style={{ justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => setChosenPrevadzka(p)}
                >
                  <span style={{ fontWeight: 600 }}>{p.nazov}</span>
                  {p.adresa && (
                    <span style={{ marginLeft: "0.5rem", opacity: 0.7, fontSize: "0.875rem" }}>
                      {p.adresa}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            className="zp-iconbtn"
            aria-label="Nastavenia"
            onClick={() => navigate("/settings")}
            style={{ marginLeft: "auto" }}
          >
            <Settings style={{ width: 18, height: 18, strokeWidth: 2 }} />
          </button>
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

        {mealCardsContent}

        {specialDietNoteContent}

        {orderSummaryContent}

        {/* Thank-you footer */}
        <p className="zp-thanks">
          Ďakujeme za Vašu objednávku
          <small>Posielame ju priamo do našej kuchyne.</small>
        </p>
      </div>

      {modals}
      <TourOverlay />
    </div>
  );
};

export default OrderPage;
