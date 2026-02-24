import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  UtensilsCrossed,
  History,
  Settings,
  LogOut,
  User,
  Bot,
  XCircle,
  CalendarDays,
  PenLine,
  Lock,
  Clock,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../../../context/auth";
import OrderSummaryModal from "../components/order/OrderSummaryModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";

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
}

// Past submitted orders for the history strip
interface HistoryOrder {
  date: string;
  totalPortions: number;
  mealCount: { breakfast: number; lunch: number; olovrant: number };
  data: Record<string, Record<string, { menuCounts: Record<string, number> }>>;
}

/** First workday strictly after today (Mon–Fri). */
function firstNextWorkday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

interface TodayOrder {
  loaded: boolean;
  exists: boolean;
  data: Record<string, unknown>;
  totalPortions: number;
  mealCount: { breakfast: number; lunch: number; olovrant: number };
  is_auto: boolean;
}

const HomePage = () => {
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalOrderData, setModalOrderData] = useState<any>(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [todayOrder, setTodayOrder] = useState<TodayOrder | null>(null);

  const { logout, globalDeadlines } = useApp();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  const firstWorkday = firstNextWorkday();
  const todayStr = new Date().toISOString().split("T")[0];

  // Check whether any meal deadline for today hasn't passed yet
  const isTodayEditable = (() => {
    if (!globalDeadlines) return false;
    const now = new Date();
    return (["breakfast", "lunch", "olovrant"] as const).some((meal) => {
      const timeStr = globalDeadlines[meal] || "10:00";
      const deadline = new Date(`${todayStr}T${timeStr}:00`);
      return now < deadline;
    });
  })();

  // ── Today's order ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/orders/by-date/${todayStr}/`)
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .then((rec) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = rec.data || {};
        let total = 0;
        const counts = { breakfast: 0, lunch: 0, olovrant: 0 };
        ["breakfast", "lunch", "olovrant"].forEach((meal) => {
          const mealObj = data[meal];
          if (!mealObj) return;
          Object.values(mealObj).forEach((cat: unknown) => {
            const menuCounts =
              (cat as { menuCounts?: Record<string, number> })?.menuCounts || {};
            const c = (Object.values(menuCounts) as number[]).reduce(
              (a, b) => a + b,
              0,
            );
            total += c;
            counts[meal as keyof typeof counts] += c;
          });
        });
        setTodayOrder({
          loaded: true,
          exists: total > 0,
          data,
          totalPortions: total,
          mealCount: counts,
          is_auto: rec.is_auto || false,
        });
      })
      .catch(() =>
        setTodayOrder({
          loaded: true,
          exists: false,
          data: {},
          totalPortions: 0,
          mealCount: { breakfast: 0, lunch: 0, olovrant: 0 },
          is_auto: false,
        }),
      );
  }, [user, apiFetch, todayStr]);

  // ── Planned orders (5 next workdays) ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/orders/planned/`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlannedDays)
      .catch(console.error);
  }, [user, apiFetch]);

  // ── History (past submitted orders) ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const r = await apiFetch(`${API_URL}/orders/`);
        if (!r.ok) return;
        const json = await r.json();
        // DRF may return paginated { count, results } or plain array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = Array.isArray(json) ? json : (json.results ?? []);
        const today = new Date().toISOString().split("T")[0];
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
              const c = (Object.values(menuCounts) as number[]).reduce(
                (a, b) => a + b,
                0,
              );
              total += c;
              counts[meal as keyof typeof counts] += c;
            });
          });
          if (total > 0) {
            const historyItem = {
              date: rec.date,
              totalPortions: total,
              mealCount: counts,
              data: mealData,
            };
            history.push(historyItem);
            // Collect for deferred localStorage seeding
            toSeed.push({ date: rec.date, data: mealData });
          }
        });

        history.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setHistoryOrders(history.slice(0, 5));

        // Deferred seeding in background chunks to avoid blocking the main thread
        if (toSeed.length > 0) {
          const CHUNK_SIZE = 5;
          let index = 0;

          const processChunk = () => {
            const end = Math.min(index + CHUNK_SIZE, toSeed.length);
            for (; index < end; index++) {
              const item = toSeed[index];
              const key = `order_${item.date}`;
              if (!localStorage.getItem(key)) {
                localStorage.setItem(
                  key,
                  JSON.stringify({ ...item.data, status: "submitted" }),
                );
              }
            }

            if (index < toSeed.length) {
              if (
                typeof window !== "undefined" &&
                "requestIdleCallback" in window
              ) {
                (
                  window as unknown as {
                    requestIdleCallback: (cb: () => void) => void;
                  }
                ).requestIdleCallback(processChunk);
              } else {
                setTimeout(processChunk, 10);
              }
            }
          };

          if (
            typeof window !== "undefined" &&
            "requestIdleCallback" in window
          ) {
            (
              window as unknown as {
                requestIdleCallback: (cb: () => void) => void;
              }
            ).requestIdleCallback(processChunk);
          } else {
            setTimeout(processChunk, 10);
          }
        }
      } catch (e) {
        console.error("Failed to fetch order history", e);
      }
    };
    fetchHistory();
  }, [user, apiFetch]);

  // ── Open detail modal for a day that has an existing order ────────────────
  const openDayModal = async (date: string) => {
    try {
      const r = await apiFetch(`${API_URL}/orders/by-date/${date}/`);
      if (r.ok) {
        const rec = await r.json();
        setModalOrderData(rec.data || {});
      } else {
        setModalOrderData({});
      }
    } catch {
      setModalOrderData({});
    }
    setSelectedDate(date);
  };

  const handlePlannedCardClick = (day: PlannedDay) => {
    if (!day.exists) {
      // No order yet → go directly to the order page for that day
      navigate(`/order?date=${day.date}`);
    } else {
      // Has an order → show summary modal
      openDayModal(day.date);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("sk-SK", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  };

  // ── Badge helpers ──────────────────────────────────────────────────────────
  const PlannedBadge = ({ day }: { day: PlannedDay }) => {
    if (!day.exists) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
          <Bot className="w-3 h-3" />
          Automatická
        </span>
      );
    }
    if (day.is_empty) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
          <XCircle className="w-3 h-3" />
          Manuálna – nulová
        </span>
      );
    }
    if (day.is_auto) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
          <Bot className="w-3 h-3" />
          Automatická
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
        <PenLine className="w-3 h-3" />
        Manuálna
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8 pt-2 md:pt-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Zdravý Projekt
            </h1>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Link to="/profile">
              <button className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md group">
                <User className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                <span className="hidden md:inline text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                  Profil
                </span>
              </button>
            </Link>
            <Link to="/settings">
              <button className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md group">
                <Settings className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                <span className="hidden md:inline text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                  Nastavenia
                </span>
              </button>
            </Link>
            <button
              onClick={() => setShowLogoutConfirmation(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white border border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
            >
              <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-600 transition-colors" />
              <span className="hidden md:inline text-sm font-medium text-red-600 group-hover:text-red-700 transition-colors">
                Odhlásiť sa
              </span>
            </button>
          </div>
        </div>

        {/* New Order CTA — navigates to first next workday */}
        <Link
          to={`/order?date=${firstWorkday}`}
          className="group relative block mb-10"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
          <button className="relative w-full bg-white hover:bg-slate-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between shadow-xl shadow-indigo-100/50 transition-all duration-300 group-hover:-translate-y-1">
            <div className="flex items-center gap-5">
              <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Nová objednávka
                </h3>
                <p className="text-slate-500">{formatDate(firstWorkday)}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-indigo-600 font-semibold px-4 py-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
              Prejsť na objednávku →
            </div>
          </button>
        </Link>

        {/* ── Dnešná objednávka ── */}
        {todayOrder?.loaded && (
          <div className="mb-8 animate-in slide-in-from-bottom-3 duration-400">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Dnešná objednávka
            </h2>
            <div
              onClick={() => {
                if (isTodayEditable) {
                  navigate(`/order?date=${todayStr}`);
                } else if (todayOrder.exists) {
                  setModalOrderData(todayOrder.data);
                  setSelectedDate(todayStr);
                }
              }}
              className={[
                "p-5 rounded-xl border transition-all duration-200 group",
                isTodayEditable
                  ? "bg-white border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 cursor-pointer"
                  : todayOrder.exists
                    ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer"
                    : "bg-slate-50 border-slate-200 cursor-default",
              ].join(" ")}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "p-2.5 rounded-lg",
                      isTodayEditable
                        ? "bg-orange-50 group-hover:bg-orange-100"
                        : "bg-slate-100",
                    ].join(" ")}
                  >
                    {isTodayEditable ? (
                      <Calendar className="w-5 h-5 text-orange-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {formatDate(todayStr)}
                    </h3>
                    {isTodayEditable ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3" />
                        {todayOrder.exists ? "Upraviť do termínu" : "Vytvoriť do termínu"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                        <Lock className="w-3 h-3" />
                        Po termíne – len na zobrazenie
                      </span>
                    )}
                  </div>
                </div>

                {todayOrder.exists && (
                  <div className="text-2xl font-bold text-slate-900">
                    {todayOrder.totalPortions}
                    <span className="text-xs font-normal text-slate-500 ml-1">ks</span>
                  </div>
                )}
              </div>

              {/* Meal chips */}
              {todayOrder.exists && (
                <div className="flex gap-2 mt-3">
                  {todayOrder.mealCount.breakfast > 0 && (
                    <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md">
                      Raňajky: {todayOrder.mealCount.breakfast}
                    </span>
                  )}
                  {todayOrder.mealCount.lunch > 0 && (
                    <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md">
                      Obed: {todayOrder.mealCount.lunch}
                    </span>
                  )}
                  {todayOrder.mealCount.olovrant > 0 && (
                    <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-md">
                      Olovrant: {todayOrder.mealCount.olovrant}
                    </span>
                  )}
                  {todayOrder.is_auto && (
                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-md">
                      <Bot className="w-3 h-3" />
                      Auto
                    </span>
                  )}
                </div>
              )}

              {!todayOrder.exists && !isTodayEditable && (
                <p className="text-xs text-slate-400 mt-2">
                  Na dnešný deň nebola vytvorená žiadna objednávka.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Plánované objednávky – 5 pracovných dní ── */}
        <div className="mb-10 animate-in slide-in-from-bottom-5 duration-500">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Plánované objednávky
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plannedDays.map((day) => {
              const isEmpty = day.exists && day.is_empty;
              const isUnset = !day.exists;
              const hasPrediction = isUnset && day.predictedTotal > 0;
              // auto-filled = unset but system will copy last order → render same as real auto
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
                  onClick={() => handlePlannedCardClick(day)}
                  className={[
                    "p-5 rounded-xl border cursor-pointer transition-all duration-200 group",
                    isEmpty
                      ? "bg-white border-red-100 hover:border-red-200 hover:shadow-sm"
                      : isUnset && !hasPrediction
                        ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
                        : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200",
                  ].join(" ")}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "p-2.5 rounded-lg transition-colors",
                          isEmpty
                            ? "bg-red-50"
                            : "bg-indigo-50 group-hover:bg-indigo-100",
                        ].join(" ")}
                      >
                        {isEmpty ? (
                          <XCircle className="w-5 h-5 text-red-400" />
                        ) : isUnset ? (
                          <Bot className="w-5 h-5 text-indigo-600" />
                        ) : day.is_auto ? (
                          <Bot className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Calendar className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {formatDate(day.date)}
                        </h3>
                        <PlannedBadge day={day} />
                      </div>
                    </div>

                    {totalPortions !== null && (
                      <div className="text-2xl font-bold text-slate-900">
                        {totalPortions}
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          ks
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meal breakdown chips */}
                  {mealCount !== null && (
                    <div className="flex gap-2 mt-2">
                      {mealCount.breakfast > 0 && (
                        <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md">
                          Raňajky: {mealCount.breakfast}
                        </span>
                      )}
                      {mealCount.lunch > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md">
                          Obed: {mealCount.lunch}
                        </span>
                      )}
                      {mealCount.olovrant > 0 && (
                        <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-md">
                          Olovrant: {mealCount.olovrant}
                        </span>
                      )}
                    </div>
                  )}

                  {/* No history at all — nothing to copy from */}
                  {isUnset && !hasPrediction && (
                    <p className="text-xs text-slate-400 mt-2">
                      Žiadna história na predikciu
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── História – posledných 5 minulých ── */}
        <div className="animate-in slide-in-from-bottom-10 duration-700">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            História (Posledných 5)
          </h2>
          {historyOrders.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">História je prázdna</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyOrders.map((order) => (
                <div
                  key={order.date}
                  onClick={() => {
                    setModalOrderData(order.data);
                    setSelectedDate(order.date);
                  }}
                  className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="block font-medium text-slate-700">
                        {formatDate(order.date)}
                      </span>
                      <span className="text-xs text-slate-400">
                        Vybavená objednávka
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">
                    {order.totalPortions} porcií
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Detail modal ── */}
        <OrderSummaryModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          orderDate={selectedDate ?? ""}
          orderData={modalOrderData}
          globalDeadlines={globalDeadlines}
          onDelete={() => {
            if (selectedDate) {
              setPlannedDays((prev) =>
                prev.map((d) =>
                  d.date === selectedDate
                    ? {
                        ...d,
                        exists: false,
                        is_auto: null,
                        is_empty: null,
                        totalPortions: 0,
                        mealCount: { breakfast: 0, lunch: 0, olovrant: 0 },
                      }
                    : d,
                ),
              );
              setHistoryOrders((prev) =>
                prev.filter((o) => o.date !== selectedDate),
              );
              setSelectedDate(null);
            }
          }}
        />

        <ConfirmationModal
          isOpen={showLogoutConfirmation}
          onClose={() => setShowLogoutConfirmation(false)}
          onConfirm={logout}
          title="Odhlásenie"
          description="Naozaj sa chcete odhlásiť z aplikácie?"
          confirmText="Odhlásiť sa"
          cancelText="Zrušiť"
          variant="danger"
        />
      </div>
    </div>
  );
};

export default HomePage;
