import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import AdminOrderEditorModal from "./AdminOrderEditorModal";

interface Diet {
  id: number;
  name: string;
}

interface UserSettings {
  visible_menus: string[];
  visible_meals: string[];
  visible_diets: number[]; // IDs
  admin_order_note?: string;
}

interface UserProfile {
  client_type: "app" | "api";
  api_identifier: string;
  company_name: string;
}

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  settings: UserSettings | null;
  profile: UserProfile | null;
}

interface OrderData {
  lunch?: unknown;
  soup?: string;
  breakfast?: unknown;
  olovrant?: unknown;
}

interface DailyOrder {
  id: number;
  date: string;
  status: string;
  data: OrderData;
}

const ALL_MENUS = ["A", "B", "C", "V"];
const ALL_MEALS = ["breakfast", "lunch", "olovrant"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Raňajky",
  lunch: "Obed",
  olovrant: "Olovrant",
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { success, error: toastError, warning: toastWarning } = useToast();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [allDiets, setAllDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "settings" | "order_note"
  >(
    "dashboard",
  );

  // Settings State
  const [menus, setMenus] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState<Set<string>>(new Set());
  const [userDiets, setUserDiets] = useState<Set<number>>(new Set());
  const [adminOrderNote, setAdminOrderNote] = useState("");

  // Dashboard State
  const [recentOrders, setRecentOrders] = useState<DailyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Order actions
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<DailyOrder | null>(null);
  const [resetOrderTarget, setResetOrderTarget] = useState<DailyOrder | null>(null);
  const [editOrderTarget, setEditOrderTarget] = useState<DailyOrder | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);

  // Password reset
  const [sendingReset, setSendingReset] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${id}/`,
      );
      if (res.ok) {
        const data = await res.json();
        setUser(data);

        const settings = data.settings || {};
        setMenus(new Set(settings.visible_menus || ["A"]));
        setMeals(
          new Set(
            settings.visible_meals?.length
              ? settings.visible_meals
              : ["breakfast", "lunch", "olovrant"],
          ),
        );
        setUserDiets(new Set(settings.visible_diets || []));
        setAdminOrderNote(settings.admin_order_note || "");
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiFetch, id]);

  const fetchDiets = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/`,
      );
      if (res.ok) {
        const data = await res.json();
        setAllDiets(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiFetch]);

  const fetchOrders = useCallback(async () => {
    if (!id) return;
    setOrdersLoading(true);
    try {
      // Fetch orders for this user
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/orders/?user_id=${id}`,
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        // Sort by date desc
        list.sort(
          (a: DailyOrder, b: DailyOrder) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setRecentOrders(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  }, [apiFetch, id]);

  const handleSendPasswordReset = async () => {
    if (!user) return;
    setSendingReset(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/auth/password-reset/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        },
      );
      if (res.ok) {
        success(`Reset link bol odoslaný na ${user.email}.`);
      } else {
        toastError("Nepodarilo sa odoslať reset link.");
      }
    } catch (e) {
      console.error(e);
      toastError("Chyba pri odosielaní reset linku.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    setOrderActionLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/orders/${deleteOrderTarget.id}/?user_id=${id}`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 204) {
        success("Objednávka bola odstránená.");
        setRecentOrders((prev) => prev.filter((o) => o.id !== deleteOrderTarget.id));
        setDeleteOrderTarget(null);
      } else {
        toastError("Nepodarilo sa odstrániť objednávku.");
      }
    } catch (e) {
      console.error(e);
      toastError("Chyba pri odstraňovaní objednávky.");
    } finally {
      setOrderActionLoading(false);
    }
  };

  const handleResetOrder = async () => {
    if (!resetOrderTarget) return;
    setOrderActionLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/orders/${resetOrderTarget.id}/?user_id=${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: {} }),
        },
      );
      if (res.ok) {
        success("Objednávka bola vynulovaná.");
        setResetOrderTarget(null);
        fetchOrders();
      } else {
        toastError("Nepodarilo sa vynulovať objednávku.");
      }
    } catch (e) {
      console.error(e);
      toastError("Chyba pri vynulovaní objednávky.");
    } finally {
      setOrderActionLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchUser(), fetchDiets()]).finally(() => setLoading(false));
  }, [fetchUser, fetchDiets]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_staff: user.is_staff,
        settings: {
          visible_menus: Array.from(menus),
          visible_meals: Array.from(meals),
          visible_diets: Array.from(userDiets),
          admin_order_note: adminOrderNote,
        },
      };

      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${user.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        success("Nastavenia boli uložené.");
        navigate("/admin/clients");
      } else {
        toastError("Nepodarilo sa uložiť nastavenia.");
      }
    } catch (e) {
      console.error(e);
      toastError("Nastala chyba pri ukladaní nastavení.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSet = <T,>(
    set: Set<T>,
    value: T,
    setter: (s: Set<T>) => void,
  ) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Načítavam...</div>;
  if (!user)
    return <div className="p-8 text-center text-red-500">Klient nenájdený</div>;

  const isApiClient = user.profile?.client_type === "api";

  // If the current tab is not valid for this client type, reset to dashboard.
  if (isApiClient && activeTab !== "dashboard") {
    setActiveTab("dashboard");
  }

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div>
        <button
          onClick={() => navigate("/admin/clients")}
          className="text-gray-500 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Späť na zoznam klientov
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {user.first_name || user.last_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.email}
              </h2>
              <p className="text-gray-500">{user.email}</p>
              {isApiClient && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    API klient
                  </span>
                  {user.profile?.api_identifier && (
                    <span className="text-sm text-gray-500 font-mono">
                      ID: {user.profile.api_identifier}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {!isApiClient && (
            <button
              onClick={handleSendPasswordReset}
              disabled={sendingReset}
              title="Odoslať reset hesla na email"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-all disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {sendingReset ? "Odosielam..." : "Reset hesla"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Prehľad objednávok
        </button>
        {!isApiClient && (
          <>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Nastavenia
            </button>
            <button
              onClick={() => setActiveTab("order_note")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "order_note"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Poznámka k objednávke
            </button>
          </>
        )}
      </div>

      {activeTab === "dashboard" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">História objednávok</h3>
              {!isApiClient && (
                <button
                  onClick={() => setShowNewOrderModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nová objednávka
                </button>
              )}
            </div>
            {ordersLoading ? (
              <div className="p-12 text-center text-gray-400">
                Načítavam objednávky...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                Tento klient zatiaľ nemá žiadne objednávky.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Dátum</th>
                    <th className="px-6 py-4">Súhrn</th>
                    <th className="px-6 py-4 text-right">Akcie</th>
                    <th className="px-4 py-4 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => {
                    // Calculate Summary
                    const summaries: string[] = [];

                    // Lunch
                    let lunchCount = 0;
                    const lunchData = order.data.lunch;
                    if (lunchData && typeof lunchData === "object") {
                      Object.values(lunchData).forEach((cat: unknown) => {
                        const category = cat as {
                          menuCounts?: Record<string, number>;
                        };
                        if (category?.menuCounts) {
                          lunchCount += Object.values(
                            category.menuCounts,
                          ).reduce((a, b) => a + Number(b), 0);
                        }
                      });
                    } else if (typeof lunchData === "string") {
                      lunchCount = 1; // Legacy assumption
                    }
                    if (lunchCount > 0) summaries.push(`${lunchCount}x Obed`);

                    // Breakfast
                    let breakfastCount = 0;
                    const breakfastData = order.data.breakfast;
                    if (breakfastData && typeof breakfastData === "object") {
                      Object.values(breakfastData).forEach((cat: unknown) => {
                        const category = cat as {
                          menuCounts?: Record<string, number>;
                        };
                        if (category?.menuCounts) {
                          breakfastCount += Object.values(
                            category.menuCounts,
                          ).reduce((a, b) => a + Number(b), 0);
                        }
                      });
                    } else if (
                      typeof breakfastData === "string" &&
                      breakfastData
                    ) {
                      breakfastCount = 1;
                    } else if (
                      breakfastData === "true" ||
                      breakfastData === true
                    ) {
                      breakfastCount = 1;
                    }
                    if (breakfastCount > 0)
                      summaries.push(`${breakfastCount}x Raňajky`);

                    // Olovrant
                    let olovrantCount = 0;
                    const olovrantData = order.data.olovrant;
                    if (olovrantData && typeof olovrantData === "object") {
                      Object.values(olovrantData).forEach((cat: unknown) => {
                        const category = cat as {
                          menuCounts?: Record<string, number>;
                        };
                        if (category?.menuCounts) {
                          olovrantCount += Object.values(
                            category.menuCounts,
                          ).reduce((a, b) => a + Number(b), 0);
                        }
                      });
                    } else if (olovrantData) {
                      olovrantCount = 1;
                    }
                    if (olovrantCount > 0)
                      summaries.push(`${olovrantCount}x Olovrant`);

                    const summaryText =
                      summaries.length > 0 ? summaries.join(", ") : "-";
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors ${isExpanded ? "bg-gray-50" : ""}`}
                        >
                          <td
                            className="px-6 py-4 font-medium text-gray-900 cursor-pointer"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            {order.date}
                          </td>
                          <td
                            className="px-6 py-4 font-bold text-gray-700 cursor-pointer"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            {summaryText}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditOrderTarget(order)}
                                title="Upraviť objednávku"
                                aria-label="Upraviť objednávku"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setResetOrderTarget(order)}
                                title="Vynulovať objednávku"
                                aria-label="Vynulovať objednávku"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteOrderTarget(order)}
                                title="Odstrániť objednávku"
                                aria-label="Odstrániť objednávku"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td
                            className="px-4 py-4 cursor-pointer"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td
                              colSpan={4}
                              className="px-6 py-4 border-t border-gray-100 shadow-inner"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                {/* Helper to render meal section */}
                                {[
                                  { title: "Obed", data: order.data.lunch },
                                  {
                                    title: "Raňajky",
                                    data: order.data.breakfast,
                                  },
                                  {
                                    title: "Olovrant",
                                    data: order.data.olovrant,
                                  },
                                ].map(({ title, data }) => (
                                  <div key={title}>
                                    <div className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
                                      {title}
                                    </div>
                                    {(() => {
                                      if (!data)
                                        return (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        );
                                      if (typeof data === "string")
                                        return (
                                          <span>
                                            {data === "true" ? "Áno" : data}
                                          </span>
                                        );
                                      if (data === true)
                                        return <span>Áno</span>;

                                      // Object data
                                      const items: React.JSX.Element[] = [];
                                      Object.entries(data).forEach(
                                        ([catName, catData]) => {
                                          // Skip internal keys if any (like soup sometimes in old structure?) and check for standard structure
                                          if (
                                            !catData ||
                                            typeof catData !== "object"
                                          )
                                            return;

                                          const category = catData as {
                                            menuCounts?: Record<string, number>;
                                            diets?: Record<string, number>;
                                          };
                                          const menuCounts =
                                            category.menuCounts || {};
                                          const diets = category.diets || {};

                                          const totalPortions = Object.values(
                                            menuCounts,
                                          ).reduce((a, b) => a + Number(b), 0);
                                          const totalDiets = Object.values(
                                            diets,
                                          ).reduce((a, b) => a + Number(b), 0);

                                          // Only show if there are portions
                                          if (Number(totalPortions) > 0) {
                                            items.push(
                                              <div
                                                key={catName}
                                                className="flex flex-col mb-1 border-b border-gray-50 last:border-0 pb-1"
                                              >
                                                <div className="flex justify-between items-baseline">
                                                  <span className="font-medium text-gray-800">
                                                    {String(totalPortions)}x{" "}
                                                    {catName}
                                                  </span>
                                                </div>
                                                {Number(totalDiets) > 0 && (
                                                  <div className="text-xs text-indigo-600 pl-2">
                                                    • {String(totalDiets)}x
                                                    Diéta
                                                  </div>
                                                )}
                                              </div>,
                                            );
                                          }
                                        },
                                      );

                                      return items.length ? (
                                        <div className="space-y-1">{items}</div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>

                              {/* Soup Section separate if needed, or included? */}
                              {order.data.soup &&
                                typeof order.data.soup === "string" && (
                                  <div className="mt-4 pt-2 border-t border-gray-100">
                                    <span className="font-semibold text-gray-900 mr-2">
                                      Polievka:
                                    </span>
                                    <span>{order.data.soup}</span>
                                  </div>
                                )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && !isApiClient && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            {/* Menus Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                  📋
                </span>
                Viditeľné menu
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Vyberte, ktoré typy menu sa zobrazia pre tohto klienta.
              </p>
              <div className="space-y-3">
                {ALL_MENUS.map((menu) => (
                  <label
                    key={menu}
                    className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200"
                  >
                    <input
                      type="checkbox"
                      checked={menus.has(menu)}
                      onChange={() => toggleSet(menus, menu, setMenus)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-3"
                    />
                    <span className="font-medium text-gray-700">
                      Menu {menu}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Meals Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-amber-100 text-amber-600 p-2 rounded-lg mr-3">
                  🍽️
                </span>
                Viditeľné jedlá
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Nastavte, ktoré chody dňa sú dostupné.
              </p>
              <div className="space-y-3">
                {ALL_MEALS.map((meal) => (
                  <label
                    key={meal}
                    className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-amber-50 has-[:checked]:border-amber-200"
                  >
                    <input
                      type="checkbox"
                      checked={meals.has(meal)}
                      onChange={() => {
                        if (meals.has(meal) && meals.size === 1) {
                          toastWarning(
                            "Klient musí mať povolený aspoň jeden chod.",
                          );
                          return;
                        }
                        toggleSet(meals, meal, setMeals);
                      }}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-gray-300 mr-3"
                    />
                    <span className="font-medium text-gray-700">
                      {MEAL_LABELS[meal] ?? meal}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Diets Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3">
                  🥗
                </span>
                Povolené diéty
              </h3>
              <button
                type="button"
                onClick={() => navigate("/admin/diets")}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 transition"
              >
                <span className="text-base leading-none">+</span>
                Pridať novú diétu
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Obmedzte, ktoré špeciálne diéty si klient môže vybrať.
            </p>

            {allDiets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 italic mb-3">
                  V systéme nie sú definované žiadne diéty.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/admin/diets")}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition"
                >
                  Prejsť na správu diét →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allDiets.map((diet) => (
                  <label
                    key={diet.id}
                    className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-green-50 has-[:checked]:border-green-200"
                  >
                    <input
                      type="checkbox"
                      checked={userDiets.has(diet.id)}
                      onChange={() =>
                        toggleSet(userDiets, diet.id, setUserDiets)
                      }
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300 mr-3"
                    />
                    <span className="text-gray-700">{diet.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? "Ukladám..." : "Uložiť nastavenia"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "order_note" && !isApiClient && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Poznámka k objednávke
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Táto poznámka sa zobrazuje iba v admin dashboarde po rozkliknutí
              klienta, nad súhrnnými číslami.
            </p>
            <textarea
              value={adminOrderNote}
              onChange={(e) => setAdminOrderNote(e.target.value)}
              rows={6}
              placeholder="Sem zadajte internú poznámku k objednávkam klienta..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end pt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? "Ukladám..." : "Uložiť poznámku"}
            </button>
          </div>
        </div>
      )}
    </div>

      {/* ── Delete order confirmation modal ── */}
      {deleteOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Odstrániť objednávku</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Naozaj chcete odstrániť objednávku zo dňa{" "}
                <strong className="text-gray-800">{deleteOrderTarget.date}</strong>?
                Táto akcia je nevratná.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOrderTarget(null)}
                  disabled={orderActionLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={orderActionLoading}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-red-200 transition-all"
                >
                  {orderActionLoading ? "Odstraňujem..." : "Odstrániť"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit order modal ── */}
      {(showNewOrderModal || editOrderTarget) && id && (
        <AdminOrderEditorModal
          clientId={id}
          visibleMenus={Array.from(menus)}
          visibleMeals={Array.from(meals)}
          visibleDiets={Array.from(userDiets)}
          allDiets={allDiets}
          existingOrder={editOrderTarget ?? null}
          onClose={() => {
            setShowNewOrderModal(false);
            setEditOrderTarget(null);
          }}
          onSaved={() => {
            setShowNewOrderModal(false);
            setEditOrderTarget(null);
            fetchOrders();
          }}
        />
      )}

      {/* ── Reset order confirmation modal ── */}
      {resetOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-amber-100 text-amber-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Vynulovať objednávku</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Naozaj chcete vynulovať objednávku zo dňa{" "}
                <strong className="text-gray-800">{resetOrderTarget.date}</strong>?
                Všetky položky budú vymazané, záznam zostane zachovaný.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setResetOrderTarget(null)}
                  disabled={orderActionLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleResetOrder}
                  disabled={orderActionLoading}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-amber-200 transition-all"
                >
                  {orderActionLoading ? "Vynulujem..." : "Vynulovať"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientDetail;
