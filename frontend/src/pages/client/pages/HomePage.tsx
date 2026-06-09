import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Calendar,
  UtensilsCrossed,
  Bot,
  XCircle,
  CalendarDays,
  PenLine,
  Lock,
  Clock,
  History,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../../../context/auth";
import { useToast } from "../../../context/ToastContext";
import OrderSummaryModal from "../components/order/OrderSummaryModal";
import OrderService, { DailyOrder } from "../services/OrderService";
import { OrderRequestError } from "../hooks/useOrder";
import TourOverlay from "../components/onboarding/TourOverlay";
import { logger } from '../../../lib/logger';

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Shape returned by GET /api/orders/planned/
interface PlannedDay {
  date: string;
  exists: boolean;
  is_auto: boolean | null;
  is_empty: boolean | null;
  totalPortions: number;
  mealCount: { breakfast: number; lunch: number; olovrant: number };
  predictedTotal: number;
  predictedMealCount: { breakfast: number; lunch: number; olovrant: number };
  predictedData?: DailyOrder;
}

// Past submitted orders for the history strip
interface HistoryOrder {
  date: string;
  totalPortions: number;
  mealCount: { breakfast: number; lunch: number; olovrant: number };
  data: Record<string, Record<string, { menuCounts: Record<string, number> }>>;
}

interface MonthlySummary {
  total: number;
  items: { label: string; count: number }[];
}

/** First workday strictly after today (Mon–Fri). */
function firstNextWorkday(): string {
  const d = OrderService.getServerNow();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return OrderService.toLocalDateString(d);
}

const HomePage = () => {
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [allHistoryOrders, setAllHistoryOrders] = useState<HistoryOrder[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalOrderData, setModalOrderData] = useState<any>(null);
  const [modalOrderId, setModalOrderId] = useState<number | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    total: 0,
    items: [],
  });
  const [predictedModalDay, setPredictedModalDay] = useState<PlannedDay | null>(
    null,
  );

  const { globalDeadlines } = useApp();
  const { apiFetch, user } = useAuth();
  const toast = useToast();
  const getFriendlyOrderErrorMessage = (error: unknown) => {
    if (
      error instanceof OrderRequestError &&
      error.code === "order_deadline_passed"
    ) {
      return "Objednávku už nie je možné meniť, termín uplynul.";
    }
    return "Nepodarilo sa upraviť objednávku. Skúste to znova.";
  };

  const parseOrderActionError = async (response: Response) => {
    try {
      const payload = await response.clone().json();
      throw new OrderRequestError(
        payload?.error?.message || "Request failed",
        payload?.error?.code,
      );
    } catch (error) {
      if (error instanceof OrderRequestError) {
        throw error;
      }
      const text = await response.text();
      throw new OrderRequestError(text || "Request failed");
    }
  };

  const firstWorkday = firstNextWorkday();
  const _now = OrderService.getServerNow();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const todayDay = plannedDays.find((d) => d.date === todayStr) ?? null;

  const isTodayEditable = (() => {
    if (!globalDeadlines) return false;
    const now = OrderService.getServerNow();
    return (["breakfast", "lunch", "olovrant"] as const).some((meal) => {
      if ((globalDeadlines as Record<string, unknown>)[`${meal}_day_before`]) return false;
      const rawTime = globalDeadlines[meal] || "10:00";
      const [hourStr, minuteStr] = rawTime.split(":");
      const hours = Number.isFinite(Number(hourStr)) ? Number(hourStr) : 10;
      const minutes = Number.isFinite(Number(minuteStr)) ? Number(minuteStr) : 0;
      const deadline = new Date(now);
      deadline.setHours(hours, minutes, 0, 0);
      return now < deadline;
    });
  })();

  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/orders/planned/`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlannedDays)
      .catch(logger.error);
  }, [user, apiFetch]);

  useEffect(() => {
    if (!user) return;
    const now = OrderService.getServerNow();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    apiFetch(`${API_URL}/orders/planned/monthly-summary/?year=${year}&month=${month}`)
      .then((r) => (r.ok ? r.json() : { total: 0, items: [] }))
      .then((data) => setMonthlySummary({
        total: data.total || 0,
        items: Array.isArray(data.items) ? data.items : [],
      }))
      .catch(logger.error);
  }, [user, apiFetch]);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const r = await apiFetch(`${API_URL}/orders/`);
        if (!r.ok) return;
        const json = await r.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = Array.isArray(json) ? json : (json.results ?? []);
        const today = OrderService.toLocalDateString(OrderService.getServerNow());
        const history: HistoryOrder[] = [];
        const toSeed: { date: string; data: HistoryOrder["data"] }[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.forEach((rec: any) => {
          if (rec.status !== "submitted" || rec.date >= today) return;
          const mealData: HistoryOrder["data"] = rec.data || {};
          let total = 0;
          const counts = { breakfast: 0, lunch: 0, olovrant: 0 };
          ["breakfast", "lunch", "olovrant"].forEach((meal) => {
            const mealObj = mealData[meal];
            if (!mealObj) return;
            Object.values(mealObj).forEach((cat) => {
              const menuCounts = cat?.menuCounts || {};
              const c = (Object.values(menuCounts) as number[]).reduce((a, b) => a + b, 0);
              total += c;
              counts[meal as keyof typeof counts] += c;
            });
          });
          if (total > 0) {
            const historyItem = { date: rec.date, totalPortions: total, mealCount: counts, data: mealData };
            history.push(historyItem);
            toSeed.push({ date: rec.date, data: mealData });
          }
        });

        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllHistoryOrders(history);
        setHistoryOrders(history.slice(0, 5));

        if (toSeed.length > 0) {
          const CHUNK_SIZE = 5;
          let index = 0;
          const processChunk = () => {
            const end = Math.min(index + CHUNK_SIZE, toSeed.length);
            for (; index < end; index++) {
              const item = toSeed[index];
              const key = `order_${item.date}`;
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify({ ...item.data, status: "submitted" }));
              }
            }
            if (index < toSeed.length) {
              if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(processChunk);
              } else {
                setTimeout(processChunk, 10);
              }
            }
          };
          if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(processChunk);
          } else {
            setTimeout(processChunk, 10);
          }
        }
      } catch (e) {
        logger.error("Failed to fetch order history", e);
      }
    };
    fetchHistory();
  }, [user, apiFetch]);

  const openDayModal = async (date: string) => {
    try {
      const r = await apiFetch(`${API_URL}/orders/by-date/${date}/`);
      if (r.ok) {
        const rec = await r.json();
        setModalOrderData(rec.data || {});
        setModalOrderId(rec.id ?? null);
      } else {
        setModalOrderData({});
        setModalOrderId(null);
      }
    } catch {
      setModalOrderData({});
      setModalOrderId(null);
    }
    setSelectedDate(date);
  };

  const handlePlannedCardClick = (day: PlannedDay) => {
    const hasPrediction = !day.exists && day.predictedTotal > 0;
    if (!day.exists && hasPrediction) {
      setPredictedModalDay(day);
    } else if (!day.exists) {
      setModalOrderData({ breakfast: {}, lunch: {}, olovrant: {} });
      setModalOrderId(null);
      setSelectedDate(day.date);
    } else {
      openDayModal(day.date);
    }
  };

  const handleZeroPredicted = async (day: PlannedDay) => {
    try {
      const res = await apiFetch(`${API_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: day.date,
          status: "submitted",
          data: { breakfast: {}, lunch: {}, olovrant: {} },
        }),
      });
      if (!res.ok) await parseOrderActionError(res);
      setPlannedDays((prev) =>
        prev.map((d) =>
          d.date === day.date
            ? { ...d, exists: true, is_empty: true, is_auto: false, totalPortions: 0, mealCount: { breakfast: 0, lunch: 0, olovrant: 0 } }
            : d,
        ),
      );
      toast.success("Objednávka bola vynulovaná.");
    } catch (e) {
      logger.error(e);
      toast.error(getFriendlyOrderErrorMessage(e));
    } finally {
      setPredictedModalDay(null);
    }
  };

  const handleZeroExisting = async () => {
    if (!selectedDate || modalOrderId === null) return;
    try {
      const res = await apiFetch(`${API_URL}/orders/${modalOrderId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted", data: { breakfast: {}, lunch: {}, olovrant: {} } }),
      });
      if (!res.ok) await parseOrderActionError(res);
      const date = selectedDate;
      setPlannedDays((prev) =>
        prev.map((d) =>
          d.date === date
            ? { ...d, exists: true, is_empty: true, is_auto: false, totalPortions: 0, mealCount: { breakfast: 0, lunch: 0, olovrant: 0 } }
            : d,
        ),
      );
      setSelectedDate(null);
      setModalOrderId(null);
      toast.success("Objednávka bola vynulovaná.");
    } catch (e) {
      logger.error(e);
      toast.error(getFriendlyOrderErrorMessage(e));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "long" });
  };

  const formatLongDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" });
  };

  const getTodayEyebrow = () => {
    const d = new Date(`${todayStr}T12:00:00`);
    const day = d.toLocaleDateString("sk-SK", { weekday: "long" });
    const date = d.toLocaleDateString("sk-SK", { day: "numeric", month: "long" });
    return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${date}`;
  };

  const greeting = user?.first_name
    ? `Dobrý deň, ${user.first_name}.`
    : user?.company_name
    ? `Dobrý deň, ${user.company_name}.`
    : "Dobrý deň.";

  // Badge helpers using zp-* classes
  const PlannedBadge = ({ day }: { day: PlannedDay }) => {
    if (!day.exists) {
      return (
        <span className="zp-pill zp-pill--auto">
          <Bot className="w-3 h-3" style={{ width: 11, height: 11 }} />
          Automatická
        </span>
      );
    }
    if (day.is_empty) {
      return (
        <span className="zp-pill zp-pill--empty">
          <XCircle style={{ width: 11, height: 11 }} />
          Manuálna – nulová
        </span>
      );
    }
    if (day.is_auto) {
      return (
        <span className="zp-pill zp-pill--auto">
          <Bot style={{ width: 11, height: 11 }} />
          Automatická
        </span>
      );
    }
    return (
      <span className="zp-pill zp-pill--manual">
        <PenLine style={{ width: 11, height: 11 }} />
        Manuálna
      </span>
    );
  };

  return (
    <div className="zp-app">
      <div className="zp-grain" style={{ minHeight: "100%" }}>
        {/* Top bar */}
        <div className="zp-topbar">
          <img
            src="/logo-zdravy-projekt.png"
            alt="Zdravý projekt"
            style={{ height: 32, width: "auto", display: "block" }}
          />
          <Link
            to="/settings"
            className="zp-iconbtn"
            aria-label="Nastavenia"
            data-tour-id="tour-profile-btn"
          >
            <Settings />
          </Link>
        </div>

        {/* Greeting */}
        <div className="zp-greeting">
          <span className="zp-eyebrow">{getTodayEyebrow()}</span>
          <h1>{greeting}</h1>
          <p>Tu je váš týždeň v Zdravom projekte.</p>
        </div>

        {/* Hero CTA */}
        <Link
          data-tour-id="tour-new-order-btn"
          to={`/order?date=${firstWorkday}`}
          className="zp-hero-cta"
        >
          <span className="icon-bubble">
            <Plus style={{ width: 26, height: 26, strokeWidth: 1.8 }} />
          </span>
          <span className="body">
            <span className="eye">Pripravte novú</span>
            <h3>Nová objednávka</h3>
            <span className="when">{formatLongDate(firstWorkday)}</span>
          </span>
          <span className="chev">
            <ChevronRight style={{ width: 22, height: 22 }} />
          </span>
        </Link>

        {/* Auto-rollover disclaimer */}
        <p className="zp-disclaimer">
          Objednávky sa automaticky preklápajú na ďalší deň, pokiaľ ich manuálne neupravíte.
        </p>

        {/* Today */}
        {todayDay &&
          (() => {
            const day = todayDay;
            const isEmpty = day.exists && day.is_empty;
            const isUnset = !day.exists;
            const hasPrediction = isUnset && day.predictedTotal > 0;
            const isAutoFilled = isUnset && hasPrediction;
            const totalPortions =
              day.exists && !day.is_empty
                ? day.totalPortions
                : isAutoFilled
                ? day.predictedTotal
                : null;
            const mealCount =
              day.exists && !day.is_empty
                ? day.mealCount
                : isAutoFilled
                ? day.predictedMealCount
                : null;

            return (
              <div data-tour-id="tour-today-section" className="zp-section">
                <h2>
                  <Clock style={{ width: 18, height: 18 }} /> Dnešná objednávka
                </h2>
                <div
                  className={`zp-day zp-day--today${isEmpty ? " zp-day--empty" : ""}`}
                  onClick={() => handlePlannedCardClick(day)}
                  role="button"
                >
                  <div className="zp-day-top">
                    <div className="zp-day-left">
                      <div className="zp-day-icon">
                        {isEmpty ? (
                          <XCircle style={{ width: 20, height: 20 }} />
                        ) : isTodayEditable ? (
                          <Clock style={{ width: 20, height: 20 }} />
                        ) : (
                          <Lock style={{ width: 20, height: 20 }} />
                        )}
                      </div>
                      <div className="flex1">
                        <div className="zp-day-title">
                          {formatDate(todayStr)}
                          <span className="pill-today">DNES</span>
                        </div>
                        {isTodayEditable ? (
                          <span className="zp-pill zp-pill--deadline">
                            <Clock style={{ width: 11, height: 11 }} />
                            {day.exists && !day.is_empty ? "Upraviť do termínu" : "Vytvoriť do termínu"}
                          </span>
                        ) : (
                          <PlannedBadge day={day} />
                        )}
                      </div>
                    </div>
                    {totalPortions !== null && (
                      <div className="zp-day-count">
                        {totalPortions}
                        <small>porcií</small>
                      </div>
                    )}
                  </div>
                  {mealCount !== null && (
                    <div className="zp-meal-chips">
                      {mealCount.breakfast > 0 && (
                        <span className="zp-mchip zp-mchip--breakfast">
                          Raňajky · {mealCount.breakfast}
                        </span>
                      )}
                      {mealCount.lunch > 0 && (
                        <span className="zp-mchip zp-mchip--lunch">
                          Obed · {mealCount.lunch}
                        </span>
                      )}
                      {mealCount.olovrant > 0 && (
                        <span className="zp-mchip zp-mchip--olovrant">
                          Olovrant · {mealCount.olovrant}
                        </span>
                      )}
                    </div>
                  )}
                  {isUnset && !hasPrediction && (
                    <p className="zp-day-hint">Na dnešný deň nebola vytvorená žiadna objednávka.</p>
                  )}
                </div>
              </div>
            );
          })()}

        {/* Planned */}
        <div data-tour-id="tour-planned-section" className="zp-section">
          <h2>
            <CalendarDays style={{ width: 18, height: 18 }} /> Plánované objednávky
          </h2>

          {plannedDays
            .filter((d) => d.date !== todayStr)
            .map((day) => {
              const isEmpty = day.exists && day.is_empty;
              const isUnset = !day.exists;
              const hasPrediction = isUnset && day.predictedTotal > 0;
              const isAutoFilled = isUnset && hasPrediction;
              const totalPortions =
                day.exists && !day.is_empty
                  ? day.totalPortions
                  : isAutoFilled
                  ? day.predictedTotal
                  : null;
              const mealCount =
                day.exists && !day.is_empty
                  ? day.mealCount
                  : isAutoFilled
                  ? day.predictedMealCount
                  : null;

              return (
                <div
                  key={day.date}
                  className={`zp-day${isEmpty ? " zp-day--empty" : isUnset && !hasPrediction ? " zp-day--unset" : ""}`}
                  onClick={() => handlePlannedCardClick(day)}
                  role="button"
                >
                  <div className="zp-day-top">
                    <div className="zp-day-left">
                      <div className="zp-day-icon">
                        {isEmpty ? (
                          <XCircle style={{ width: 20, height: 20 }} />
                        ) : isUnset ? (
                          <Bot style={{ width: 20, height: 20 }} />
                        ) : day.is_auto ? (
                          <Bot style={{ width: 20, height: 20 }} />
                        ) : (
                          <Calendar style={{ width: 20, height: 20 }} />
                        )}
                      </div>
                      <div className="flex1">
                        <div className="zp-day-title">{formatDate(day.date)}</div>
                        <PlannedBadge day={day} />
                      </div>
                    </div>
                    {totalPortions !== null && (
                      <div className="zp-day-count" style={totalPortions === 0 ? { color: "var(--ink-mute)" } : {}}>
                        {totalPortions}
                        <small>porcií</small>
                      </div>
                    )}
                  </div>
                  {mealCount !== null && (
                    <div className="zp-meal-chips">
                      {mealCount.breakfast > 0 && (
                        <span className="zp-mchip zp-mchip--breakfast">Raňajky · {mealCount.breakfast}</span>
                      )}
                      {mealCount.lunch > 0 && (
                        <span className="zp-mchip zp-mchip--lunch">Obed · {mealCount.lunch}</span>
                      )}
                      {mealCount.olovrant > 0 && (
                        <span className="zp-mchip zp-mchip--olovrant">Olovrant · {mealCount.olovrant}</span>
                      )}
                    </div>
                  )}
                  {isUnset && !hasPrediction && (
                    <p className="zp-day-hint">Žiadna história na predikciu</p>
                  )}
                  {isEmpty && (
                    <p className="zp-day-hint">Bez objednávky — voľný deň pre kuchyňu.</p>
                  )}
                </div>
              );
            })}
        </div>

        {/* Monthly summary */}
        <div className="zp-section">
          <h2>
            <CalendarDays style={{ width: 18, height: 18 }} /> Mesačný súhrn
          </h2>
        </div>
        <div className="zp-monthly">
          <div className="eye">Tento mesiac</div>
          <h3>
            Mesačný súhrn
            <small>
              {new Date().toLocaleDateString("sk-SK", { month: "long", year: "numeric" })} · doteraz odoberané
            </small>
          </h3>
          <div className="zp-monthly-grid">
            {(() => {
              const MEAL_LABELS = new Set(["Raňajky", "Obed", "Olovrant"]);
              const mealItems = monthlySummary.items.filter((i) => MEAL_LABELS.has(i.label));
              const display = mealItems.length > 0 ? mealItems : [{ label: "Zatiaľ bez odberu", count: 0 }];
              return display;
            })().map((item) => (
              <div className="zp-monthly-stat" key={item.label}>
                <div className="num">{item.count}</div>
                <div className="lbl">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="zp-monthly-foot">
            <span>Spolu</span>
            <span>
              <strong>{monthlySummary.total}</strong> porcií
            </span>
          </div>
        </div>

        {/* History */}
        <div data-tour-id="tour-history-section" className="zp-section">
          <h2 className="with-action">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <History style={{ width: 18, height: 18 }} /> História
            </span>
            {allHistoryOrders.length > 5 && (
              <button
                className="zp-btn zp-btn--ghost zp-btn--sm"
                onClick={() => setShowAllHistory((v) => !v)}
              >
                {showAllHistory ? "Menej ←" : `Viac (${allHistoryOrders.length}) →`}
              </button>
            )}
          </h2>

          {(showAllHistory ? allHistoryOrders : historyOrders).length === 0 ? (
            <div className="zp-empty">
              <UtensilsCrossed />
              <p style={{ margin: "8px 0 0", fontSize: 14 }}>História je prázdna</p>
            </div>
          ) : (
            (showAllHistory ? allHistoryOrders : historyOrders).map((order) => (
              <div
                key={order.date}
                className="zp-day"
                style={{ background: "var(--bg-cream-soft)", marginBottom: 8 }}
                onClick={() => {
                  setModalOrderData(order.data);
                  setSelectedDate(order.date);
                }}
                role="button"
              >
                <div className="zp-day-top">
                  <div className="zp-day-left">
                    <div
                      className="zp-day-icon"
                      style={{ background: "rgba(114,136,75,0.12)", color: "var(--green-700)" }}
                    >
                      <Calendar style={{ width: 20, height: 20 }} />
                    </div>
                    <div>
                      <div className="zp-day-title">{formatDate(order.date)}</div>
                      <span className="zp-pill" style={{ background: "rgba(114,136,75,0.16)", color: "var(--green-700)" }}>
                        Vybavená
                      </span>
                    </div>
                  </div>
                  <div className="zp-day-count" style={{ fontSize: 19 }}>
                    {order.totalPortions}
                    <small>porcií</small>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail modal */}
        <OrderSummaryModal
          isOpen={!!selectedDate}
          onClose={() => {
            setSelectedDate(null);
            setModalOrderId(null);
          }}
          orderDate={selectedDate ?? ""}
          orderData={modalOrderData}
          globalDeadlines={globalDeadlines}
          isAuto={!!plannedDays.find((d) => d.date === selectedDate)?.is_auto}
          onZero={modalOrderId !== null ? handleZeroExisting : undefined}
          onDelete={() => {
            if (selectedDate) {
              setPlannedDays((prev) =>
                prev.map((d) =>
                  d.date === selectedDate
                    ? { ...d, exists: false, is_auto: null, is_empty: null, totalPortions: 0, mealCount: { breakfast: 0, lunch: 0, olovrant: 0 } }
                    : d,
                ),
              );
              setHistoryOrders((prev) => prev.filter((o) => o.date !== selectedDate));
              setSelectedDate(null);
              setModalOrderId(null);
            }
          }}
        />

        {/* Auto-predicted day preview modal */}
        <OrderSummaryModal
          isOpen={!!predictedModalDay}
          onClose={() => setPredictedModalDay(null)}
          orderDate={predictedModalDay?.date ?? ""}
          orderData={predictedModalDay?.predictedData}
          globalDeadlines={globalDeadlines}
          isPredicted
          predictedMealCount={predictedModalDay?.predictedMealCount}
          onZero={() => predictedModalDay && handleZeroPredicted(predictedModalDay)}
        />

      </div>
      <TourOverlay />
    </div>
  );
};

export default HomePage;
