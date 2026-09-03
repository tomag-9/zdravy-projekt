import { useState, useEffect, useRef, type ComponentType, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsPC } from "../../../hooks/useIsPC";
import { useApp, CATEGORIES } from "../context/AppContext";
import DaySelector from "../components/order/DaySelector";
import DietSelector from "../components/order/DietSelector";
import PackSeparatelySelector from "../components/order/PackSeparatelySelector";
import OrderSummary from "../components/order/OrderSummary";
import OrderFormBody from "../components/order/OrderFormBody";
import { Coffee, Utensils, Apple, Trash2, ArrowLeft, Copy, Calendar, Settings, Store } from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OrderService, { CategoryData, DailyOrder } from "../services/OrderService";
import { useToast } from "../../../context/ToastContext";
import { OrderRequestError } from "../hooks/useOrder";
import TourOverlay from "../components/onboarding/TourOverlay";
import { useOnboarding } from "../../../context/OnboardingContext";
import { logger } from '../../../lib/logger';
import { dayOffReason, fromDateKey } from '../../../lib/businessDay';
import { buildAllPackSeparatelyItems } from "../components/order/packSeparately";
import type { PackTarget } from "../components/order/packSeparately";

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
    updateFullDayPackSeparately,
    clearFullDay,
    specialDietNote,
    setSpecialDietNote,
    currentOrder,
    updateMenuCount,
    updateDiet,
    updatePackSeparately,
    enabledCategories,
    clearMeal,
    getAvailableDiets,
    submitOrder,
    adminVisibleMeals,
    adminVisibleMenus,
    getVisibleMenusForMeal,
    globalDeadlines,
    loadBreakfastFromPrevLunch,
    copyLunchFromCurrentBreakfast,
    copyOlovrantFromCurrentLunch,
    holidays,
    closures,
    mealPlanAvailability,
    prevadzky,
    needsChoice,
    chosenPrevadzka,
    setChosenPrevadzka,
    activePrevadzka,
    packSeparatelyEnabled,
    dietMenuVariantMap,
  } = useApp();

  const getOccupiedMenus = (mealKey: string): Set<string> => {
    if (!mealPlanAvailability) return new Set();
    const available = mealPlanAvailability[mealKey];
    if (!available) return new Set();
    return new Set(getVisibleMenusForMeal(mealKey as MealKey).filter((m: string) => !available.has(m)));
  };

  const { isTourActive, currentStep, steps: tourSteps } = useOnboarding();

  const [activeDietModal, setActiveDietModal] = useState<{
    meal: "breakfast" | "lunch" | "olovrant" | "fullDay";
    category: string;
  } | null>(null);
  const [activePackSeparatelyModal, setActivePackSeparatelyModal] = useState<{ scope: "order" } | null>(null);
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

  // URL dátum → selectedDate musí sa uplatniť SYNCHRÓNNE počas renderu, nie cez
  // useEffect (ten beží až po vykreslení/commite) — inak medzi navigáciou na
  // nový dátum a tým, než sa efekt stihne spustiť, appka na chvíľu vykreslí a
  // dovolí interakciu so STARÝM selectedDate, hoci URL už ukazuje nový dátum.
  // Presne to spôsobilo, že submit tesne po navigácii zapísal objednávku pod
  // iný (starý) dátum, než na akom bol user (Emjoy, 3.9.2026 — B/C
  // predobjednané na zajtra sa vynulovalo pri editácii "dnešného" obeda;
  // Loki log potvrdil POST s date z URL A, ale success redirect a refetch pre
  // date B). Oficiálny React vzor "adjusting state during render" namiesto
  // efektu — ak sa URL dátum líši od naposledy uplatneného, oprav
  // selectedDate HNEĎ, v tom istom render-passe, predtým než React čokoľvek
  // zacommitne. `lastSyncedUrlDate` (nie porovnanie priamo so `selectedDate`)
  // zabezpečuje, že sa to spustí len raz na URL zmenu — neskoršia legitímna
  // zmena cez DaySelector (mimo URL) sa tak neprepíše späť.
  const dateFromUrl = searchParams.get("date");
  // `null`, nie `dateFromUrl` — inak by sa na PRVOM vykreslení podmienka
  // nižšie nikdy nesplnila (dateFromUrl === lastSyncedUrlDate by bolo vždy
  // pravda) a mount-time nezhoda (selectedDate="dnes" z useOrder defaultu
  // vs. URL na iný deň) by sa vôbec neopravila.
  const [lastSyncedUrlDate, setLastSyncedUrlDate] = useState<string | null>(null);
  if (dateFromUrl && dateFromUrl !== lastSyncedUrlDate) {
    setLastSyncedUrlDate(dateFromUrl);
    setSelectedDate(dateFromUrl);
  }

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

  // Celodenka zadáva jeden set porcií pre všetky chody, takže smie ponúknuť len
  // menu, ktoré sú viditeľné vo VŠETKÝCH viditeľných chodoch — prienik. Inak by
  // sa dalo cez celodenku objednať menu B na olovrant, ktorý má povolené len A.
  const fullDayVisibleMenus =
    visibleMealsList.reduce<string[] | null>((acc, meal) => {
      const mealMenus = getVisibleMenusForMeal(meal.key as MealKey);
      if (acc === null) return mealMenus;
      return acc.filter((menu) => mealMenus.includes(menu));
    }, null) ?? adminVisibleMenus;
  const isFullDayDeadlineOpen = firstVisibleMealKey
    ? OrderService.checkDeadline(selectedDate, firstVisibleMealKey, globalDeadlines)
    : false;

  useEffect(() => {
    if (fullDayOrder && !isFullDayDeadlineOpen) {
      toggleFullDay();
    }
  }, [fullDayOrder, isFullDayDeadlineOpen, toggleFullDay]);

  // A multi-prevádzka login lands on the chooser, which has none of the tour's
  // targets on it — the tour would dead-end there for exactly the logins the
  // switcher step is meant for (issue #476). Pick the first prevádzka for them;
  // the step that follows shows where to change it.
  useEffect(() => {
    if (!isTourActive || !needsChoice || chosenPrevadzka) return;
    if (tourSteps[currentStep]?.page !== "/order") return;
    const first = prevadzky[0];
    if (first) setChosenPrevadzka(first);
  }, [
    isTourActive,
    currentStep,
    tourSteps,
    needsChoice,
    chosenPrevadzka,
    prevadzky,
    setChosenPrevadzka,
  ]);

  useEffect(() => {
    if (!isTourActive || tourSteps[currentStep]?.targetId !== "tour-category-row") return;
    const firstMeal = visibleMealsList[0];
    if (!firstMeal) return;
    const key = firstMeal.key as "breakfast" | "lunch" | "olovrant";
    const isEditable = OrderService.checkDeadline(selectedDate, key, globalDeadlines);
    if (isEditable && !activeMeals[key]) {
      toggleMeal(key);
    }
  }, [isTourActive, currentStep, tourSteps, visibleMealsList, selectedDate, globalDeadlines, activeMeals, toggleMeal]);

  const getFriendlyOrderErrorMessage = (error: unknown) => {
    // Backend pošle presný dôvod (ktoré jedlo, aký termín) v `error.message` —
    // predtým sa tu zahadzoval a nahrádzal všeobecnou hláškou, takže klient
    // nemal ako zistiť, KTORÉ jedlo mu blokuje aj zvyšok objednávky (incident
    // Vyšehradská, 2.9.2026).
    if (error instanceof OrderRequestError && error.code === "order_deadline_passed") {
      return error.message || "Objednávku už nie je možné odoslať, termín uplynul.";
    }
    if (error instanceof OrderRequestError && error.code === "prevadzka_closure") {
      return "Prevádzka má na tento deň nastavené voľno, objednávku zadať nemožno.";
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

  // Celodenka drží porcie v `fullDayData` mimo `currentOrder` — bez tejto vetvy by
  // blok „zabaliť zvlášť“ pri zapnutej celodenke nemal z čoho postaviť položky.
  const packSeparatelySections = (
    fullDayOrder
      ? [{ meal: "fullDay" as const, mealLabel: "Celý deň", items: buildAllPackSeparatelyItems(fullDayData, enabledCategories, dietMenuVariantMap) }]
      : visibleMealsList.map(({ key, label }) => ({
          meal: key as MealKey,
          mealLabel: label,
          items: buildAllPackSeparatelyItems(currentOrder[key as MealKey], enabledCategories, dietMenuVariantMap),
        }))
  ).filter((section) => section.items.length > 0);

  const handleUpdatePackSeparately = (
    meal: MealKey | "fullDay",
    category: string,
    kind: "menus" | "diets",
    key: string,
    count: number,
    target: PackTarget
  ) => {
    if (meal === "fullDay") {
      updateFullDayPackSeparately(category, kind, key, count, target);
      return;
    }
    updatePackSeparately(meal, category, kind, key, count, target);
  };

  const activePackSeparatelyItems = packSeparatelySections
    .map((section) => ({
      meal: section.meal,
      mealLabel: section.mealLabel,
      items: section.items.filter((item) => item.count > 0)
    }))
    .filter((section) => section.items.length > 0);

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
      // Pri viacerých prevádzkach je bežné hlásiť ten istý deň za obe, tak sa
      // ďalšia objednávka vždy začne výberom namiesto tichého zdedenia tej predošlej.
      if (needsChoice) setChosenPrevadzka(null);
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
        <>
          <button
            className="zp-btn zp-btn--secondary zp-btn--sm"
            style={{ flex: 1 }}
            onClick={() => {
              const copied = copyLunchFromCurrentBreakfast();
              if (copied) {
                toast.success("Obed načítaný z raňajok.");
              } else {
                toast.info("Raňajky sú prázdne, nie je čo kopírovať.");
              }
              resetMealData("lunch");
            }}
          >
            <Copy style={{ width: 12, height: 12 }} /> Načítať z raňajok
          </button>
          <button
            className="zp-btn zp-btn--danger zp-btn--sm"
            onClick={() => {
              clearMeal("lunch");
              resetMealData("lunch");
            }}
          >
            <Trash2 style={{ width: 12, height: 12 }} /> Vymazať
          </button>
        </>
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
  const dateObj = fromDateKey(selectedDate);
  const formattedDate = dateFormatter.format(dateObj);
  const totalPortions = getTotalPortions();

  // Jedno miesto pre "v tento deň sa neobjednáva": sviatok kuchyne (`holidays`)
  // aj voľno tejto prevádzky (`closures`, #490). Dôvod si držíme, lebo banner
  // má povedať, ktorý z tých dvoch prípadov nastal.
  const dayOffKind = dayOffReason(dateObj, { holidays, closures });
  const isHolidayDay = dayOffKind === "holiday" || dayOffKind === "closure";
  const dayOffTitle = dayOffKind === "closure" ? "Voľno prevádzky" : "Voľný deň";
  const dayOffSubtitle =
    dayOffKind === "closure"
      ? "Prevádzka má na tento deň nastavené voľno, objednávku zadať nemožno."
      : "Na tento deň nie je možné zadať objednávku.";
  const allVisibleDeadlinesClosed = visibleMealsList.every((m) =>
    !OrderService.checkDeadline(selectedDate, m.key, globalDeadlines),
  );
  const menuBcEditable = OrderService.checkMenuBcDeadline(selectedDate, globalDeadlines);

  const orderFormBodyContent = (
    <OrderFormBody
      categories={CATEGORIES.filter(cat => enabledCategories.includes(cat))}
      visibleMealsList={visibleMealsList as {
        key: MealKey;
        label: string;
        icon: ComponentType<{ className?: string; style?: CSSProperties }>;
      }[]}
      fullDayOrder={fullDayOrder}
      onToggleFullDay={toggleFullDay}
      fullDayData={fullDayData}
      fullDayVisibleMenus={fullDayVisibleMenus}
      onFullDayMenuCount={updateFullDayMenuCount}
      onOpenFullDayDiets={(category) => setActiveDietModal({ meal: "fullDay", category })}
      onClearFullDay={clearFullDay}
      fullDayEnabled={isFullDayDeadlineOpen}
      fullDayStatusMessage={
        !isFullDayDeadlineOpen ? (
          <>Termín prvého jedla uplynul · Celodenná objednávka je uzavretá</>
        ) : null
      }
      order={currentOrder}
      activeMeals={activeMeals as Record<MealKey, boolean>}
      onToggleMeal={(meal) => toggleMeal(meal)}
      onMenuCountChange={(meal, category, menuType, value) => updateMenuCount(meal, category, menuType, value)}
      onOpenDiets={(meal, category) => setActiveDietModal({ meal, category })}
      getVisibleMenusForMeal={getVisibleMenusForMeal}
      disabledMenus={menuBcEditable ? [] : ["B", "C", "D"]}
      getAvailableDiets={getAvailableDiets}
      getOccupiedMenus={getOccupiedMenus}
      mealActions={(meal) => handleCopyTrigger(meal)}
      isMealEditable={(meal) =>
        OrderService.checkDeadline(selectedDate, meal, globalDeadlines) && !isHolidayDay
      }
      mealStatusMessage={(meal) => {
        const isEditable = OrderService.checkDeadline(selectedDate, meal, globalDeadlines);
        const blockedByFullDay = fullDayOrder && isFullDayDeadlineOpen;
        return blockedByFullDay ? (
          <>Celodenná objednávka je aktívna</>
        ) : !isEditable ? (
          <>Termín uplynul · Objednávka uzavretá</>
        ) : null;
      }}
      packSeparatelyEnabled={packSeparatelyEnabled}
      activePackSeparatelyItems={activePackSeparatelyItems}
      onOpenPackSeparately={() => setActivePackSeparatelyModal({ scope: "order" })}
      onUpdatePackSeparately={handleUpdatePackSeparately}
      showSpecialDietNote={hasSpecialDietOrdered()}
      specialDietNote={specialDietNote}
      onSpecialDietNoteChange={setSpecialDietNote}
      specialDietNoteInvalid={!specialDietNote.trim()}
      dimmed={!!isHolidayDay}
      tourIds={true}
    />
  );

  const orderSummaryContent = (
    <div data-tour-id="tour-order-summary">
      <OrderSummary
        order={currentOrder}
        activeMeals={activeMeals as Record<MealKey, boolean>}
        date={selectedDate}
        onSubmit={handleSubmit}
        onReset={
          visibleMealsList.every((m) =>
            OrderService.checkDeadline(selectedDate, m.key, globalDeadlines),
          )
            ? () => setShowZeroModal(true)
            : undefined
        }
        disabled={
          isHolidayDay ||
          (fullDayOrder ? !isFullDayDeadlineOpen : allVisibleDeadlinesClosed)
        }
        disabledMessage={
          dayOffKind === "closure"
            ? "Prevádzka má na tento deň voľno – objednávky nie sú dostupné."
            : isHolidayDay
              ? "Voľný deň – objednávky nie sú dostupné."
              : "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul)."
        }
      />
    </div>
  );

  // Pri viac-prevádzkovom celku musí byť stále vidieť, za koho sa objednáva,
  // a musí sa dať prepnúť — inak výber ostane zaseknutý na prvej voľbe.
  const prevadzkaStrip = needsChoice && activePrevadzka ? (
    <div className="zp-order-context" data-tour-id="tour-prevadzka-switch">
      <span className="ic">
        <Store style={{ width: 16, height: 16, strokeWidth: 2 }} />
      </span>
      <div className="body">
        <div className="l">Objednávate za</div>
        <div className="v">{activePrevadzka.nazov}</div>
      </div>
      <button
        className="zp-btn zp-btn--secondary zp-btn--sm"
        style={{ marginLeft: "auto", flex: "0 0 auto" }}
        onClick={() => setChosenPrevadzka(null)}
      >
        Zmeniť
      </button>
    </div>
  ) : null;

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
            onUpdateDiet={(diet, count) =>
              isFullDay
                ? updateFullDayDiet(activeDietModal.category, diet, count)
                : updateDiet(activeDietModal.meal as "breakfast" | "lunch" | "olovrant", activeDietModal.category, diet, count)
            }
          />
        );
      })()}

      {activePackSeparatelyModal && (
        <PackSeparatelySelector
          isOpen={true}
          onClose={() => setActivePackSeparatelyModal(null)}
          sections={packSeparatelySections}
          onUpdatePackSeparately={(meal, category, kind, key, count, target) =>
            handleUpdatePackSeparately(meal, category, kind, key, count, target)
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
    </>
  );

  // Počas načítavania nič neblokujeme: celok s jednou prevádzkou (drvivá väčšina)
  // by inak videl prázdnu obrazovku. Chooser sa zobrazí, až keď vieme, že treba.
  // Musí byť nad `isPC` vetvou, inak by ho desktop nikdy nezobrazil.
  if (needsChoice && !chosenPrevadzka) {
    return (
      <div className={isPC ? "pc-wrap" : "zp-app"}>
        <div className="zp-orderpage">
          {/* Na PC vlastnú hlavičku aj späť nesie ClientLayoutPC. */}
          {!isPC && (
            <div className="zp-orderbar">
              <button className="zp-iconbtn" aria-label="Späť" onClick={() => navigate("/home")}>
                <ArrowLeft size={20} />
              </button>
              <h1 className="zp-orderbar__title">Vyberte prevádzku</h1>
            </div>
          )}

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

  if (isPC) {
    return (
      <div className="pc-wrap">
        {prevadzkaStrip}

        {/* PC day selector */}
        <div className="pc-daysel-pc" data-tour-id="tour-day-selector">
          <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} holidays={holidays} closures={closures} />
        </div>

        {/* Holiday banner */}
        {isHolidayDay && (
          <div className="zp-banner zp-banner--holiday" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span className="icon">🏖️</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-500)", fontSize: 14 }}>
                {dayOffTitle}
              </div>
              <div style={{ fontSize: 13, color: "var(--teal-500)" }}>{dayOffSubtitle}</div>
            </div>
          </div>
        )}

        <div className="pc-order-grid">
          <div>
            {orderFormBodyContent}
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

        {prevadzkaStrip}

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
          <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} holidays={holidays} closures={closures} />
        </div>

        {/* Holiday banner */}
        {isHolidayDay && (
          <div className="zp-banner zp-banner--holiday" style={{ display: "flex", gap: 12 }}>
            <span className="icon">🏖️</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-500)", fontSize: 14 }}>
                {dayOffTitle}
              </div>
              <div style={{ fontSize: 13, color: "var(--teal-500)" }}>{dayOffSubtitle}</div>
            </div>
          </div>
        )}

        {orderFormBodyContent}

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
