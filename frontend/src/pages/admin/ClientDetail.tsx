import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, ChevronUp, KeyRound, Plus, Pencil, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import AdminOrderEditorModal from "./AdminOrderEditorModal";
import ConfirmationModal from "../client/components/ui/ConfirmationModal";
import { logger } from '../../lib/logger';
import { Card, CardHead, Button, IconButton, Badge, Checkbox, Textarea, Modal, Empty, Toggle } from "./ui";

interface Diet {
  id: number;
  name: string;
}

interface UserProfile {
  is_edupage: boolean;
  api_identifier: string;
  company_name: string;
  billing_name?: string;
}

interface AdminUser {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  profile: UserProfile | null;
}

interface FacilityDetail {
  id: number;
  celok: number;
  celok_nazov: string;
  nazov: string;
  adresa: string;
  edupage_match: string;
  celok_zdroj_objednavok: string;
  visible_menus: string[];
  visible_meals: string[];
  visible_diets: number[];
  admin_order_note: string;
  client_user_id: number | null;
  pack_separately_enabled: boolean;
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
  const { id: facilityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { success, error: toastError, warning: toastWarning } = useToast();

  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [allDiets, setAllDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "order_note">("dashboard");

  // Settings State
  const [menus, setMenus] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState<Set<string>>(new Set());
  const [userDiets, setUserDiets] = useState<Set<number>>(new Set());
  const [adminOrderNote, setAdminOrderNote] = useState("");
  const [packSeparatelyEnabled, setPackSeparatelyEnabled] = useState(false);

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
  const facilityRequestSeq = useRef(0);

  // Password reset
  const [sendingReset, setSendingReset] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const applyFacilitySettings = useCallback((data: FacilityDetail) => {
    setMenus(new Set(data.visible_menus?.length ? data.visible_menus : ALL_MENUS));
    setMeals(new Set(data.visible_meals?.length ? data.visible_meals : ALL_MEALS));
    setUserDiets(new Set(data.visible_diets || []));
    setAdminOrderNote(data.admin_order_note || "");
    setPackSeparatelyEnabled(!!data.pack_separately_enabled);
  }, []);

  const fetchUser = useCallback(async (userId: number): Promise<AdminUser | null> => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/${userId}/`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      logger.error(e);
    }
    return null;
  }, [apiFetch]);

  const fetchFacility = useCallback(async () => {
    if (!facilityId) return null;
    const requestSeq = ++facilityRequestSeq.current;
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/facility-prevadzky/${facilityId}/`);
      if (res.ok) {
        const data = await res.json();
        if (requestSeq !== facilityRequestSeq.current) return null;
        setFacility(data);
        applyFacilitySettings(data);
        setUser(null);
        if (data.client_user_id) {
          const userData = await fetchUser(data.client_user_id);
          if (requestSeq !== facilityRequestSeq.current) return null;
          setUser(userData);
        }
        return data as FacilityDetail;
      }
      if (requestSeq !== facilityRequestSeq.current) return null;
      setFacility(null);
      return null;
    } catch (e) {
      logger.error(e);
      if (requestSeq !== facilityRequestSeq.current) return null;
      setFacility(null);
      return null;
    }
  }, [apiFetch, facilityId, fetchUser, applyFacilitySettings]);

  const fetchDiets = useCallback(async () => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/diets/`);
      if (res.ok) {
        const data = await res.json();
        setAllDiets(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      logger.error(e);
    }
  }, [apiFetch]);

  const fetchOrders = useCallback(async () => {
    if (!facilityId) return;
    setOrdersLoading(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/orders/?prevadzka=${facilityId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        list.sort((a: DailyOrder, b: DailyOrder) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentOrders(list);
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setOrdersLoading(false);
    }
  }, [apiFetch, facilityId]);

  const handleSendPasswordReset = async () => {
    if (!user) return;
    setSendingReset(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        success(`Reset link bol odoslaný na ${user.email}.`);
      } else {
        toastError("Nepodarilo sa odoslať reset link.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri odosielaní reset linku.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget || !facilityId) return;
    setOrderActionLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/orders/${deleteOrderTarget.id}/?prevadzka=${encodeURIComponent(facilityId)}`,
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
      logger.error(e);
      toastError("Chyba pri odstraňovaní objednávky.");
    } finally {
      setOrderActionLoading(false);
    }
  };

  const handleResetOrder = async () => {
    if (!resetOrderTarget || !facilityId) return;
    setOrderActionLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/orders/${resetOrderTarget.id}/?prevadzka=${encodeURIComponent(facilityId)}`,
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
      logger.error(e);
      toastError("Chyba pri vynulovaní objednávky.");
    } finally {
      setOrderActionLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setFacility(null);
    setUser(null);
    setRecentOrders([]);
    setExpandedOrderId(null);
    setActiveTab("dashboard");
    Promise.all([fetchFacility(), fetchDiets()]).finally(() => setLoading(false));
  }, [fetchFacility, fetchDiets]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  const handleSave = async () => {
    if (!facility) return;
    setSaving(true);
    try {
      const payload = {
        visible_menus: Array.from(menus),
        visible_meals: Array.from(meals),
        visible_diets: Array.from(userDiets),
        admin_order_note: adminOrderNote,
        pack_separately_enabled: packSeparatelyEnabled,
      };

      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/facility-prevadzky/${facility.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          setFacility(data);
          applyFacilitySettings(data);
        }
        success("Nastavenia boli uložené.");
        navigate("/admin/facilities");
      } else {
        toastError("Nepodarilo sa uložiť nastavenia.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Nastala chyba pri ukladaní nastavení.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    setter(newSet);
  };

  if (loading) return <div className="zpa-empty">Načítavam…</div>;
  if (!facility) return <div className="zpa-empty" style={{ color: "var(--coral-600)" }}>Prevádzka nenájdená</div>;

  const isEdupageClient = facility.celok_zdroj_objednavok === "edupage" || user?.profile?.is_edupage === true;
  const canResetPassword = Boolean(user && !user.profile?.is_edupage);
  const orderEditorMenus = Array.from(menus);
  const orderEditorMeals = Array.from(meals);
  const orderEditorDiets = Array.from(userDiets);

  const mealCount = (data: unknown): number => {
    let count = 0;
    if (data && typeof data === "object") {
      Object.values(data).forEach((cat: unknown) => {
        const category = cat as { menuCounts?: Record<string, number> };
        if (category?.menuCounts) count += Object.values(category.menuCounts).reduce((a, b) => a + Number(b), 0);
      });
    } else if (typeof data === "string" && data) {
      count = 1;
    } else if (data === true) {
      count = 1;
    }
    return count;
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "dashboard", label: "Prehľad objednávok" },
    { key: "settings", label: "Nastavenia" },
    { key: "order_note", label: "Poznámka k objednávke" },
  ];

  return (
    <>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => navigate("/admin/facilities")} style={{ marginBottom: 16, paddingLeft: 0 }}>
            <ChevronLeft /> Späť na správu prevádzok
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span className="zpa-avatar-sm" style={{ width: 60, height: 60, fontSize: 24 }}>{facility.nazov.charAt(0).toUpperCase()}</span>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--green-900)", margin: 0 }}>
                  {facility.nazov}
                </h1>
                <p style={{ color: "var(--ink-3)", margin: "4px 0 0" }}>{facility.celok_nazov}</p>
                {facility.adresa && (
                  <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "2px 0 0" }}>{facility.adresa}</p>
                )}
                {isEdupageClient && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Badge tone="teal">Edupage prevádzka</Badge>
                    {user?.profile?.api_identifier && (
                      <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "ui-monospace, monospace" }}>ID: {user.profile.api_identifier}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {canResetPassword && (
              <Button variant="secondary" onClick={() => setShowResetConfirmation(true)} disabled={sendingReset} title="Odoslať reset hesla na email">
                <KeyRound /> {sendingReset ? "Odosielam…" : "Reset hesla"}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="zpa-tabs" style={{ maxWidth: "fit-content", gap: 4 }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} className={`zpa-tab${activeTab === t.key ? " active" : ""}`} style={{ flex: "none", padding: "12px 20px" }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <Card style={{ overflow: "hidden" }}>
            <div className="zpa-card-head" style={{ padding: "16px 24px", borderBottom: "1px solid var(--line-soft)" }}>
              <h3>História objednávok</h3>
              <Button sm onClick={() => setShowNewOrderModal(true)}>
                <Plus /> Nová objednávka
              </Button>
            </div>
            {ordersLoading ? (
              <Empty>Načítavam objednávky…</Empty>
            ) : recentOrders.length === 0 ? (
              <Empty>Táto prevádzka zatiaľ nemá žiadne objednávky.</Empty>
            ) : (
              <div className="zpa-table-wrap">
                <table className="zpa-table">
                  <thead>
                    <tr>
                      <th>Dátum</th>
                      <th>Súhrn</th>
                      <th className="r">Akcie</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const summaries: string[] = [];
                      const lunchCount = mealCount(order.data.lunch);
                      if (lunchCount > 0) summaries.push(`${lunchCount}x Obed`);
                      const breakfastCount = mealCount(order.data.breakfast);
                      if (breakfastCount > 0) summaries.push(`${breakfastCount}x Raňajky`);
                      const olovrantCount = mealCount(order.data.olovrant);
                      if (olovrantCount > 0) summaries.push(`${olovrantCount}x Olovrant`);
                      const summaryText = summaries.length > 0 ? summaries.join(", ") : "-";
                      const isExpanded = expandedOrderId === order.id;

                      return (
                        <React.Fragment key={order.id}>
                          <tr style={isExpanded ? { background: "var(--bg-cream-soft)" } : undefined}>
                            <td style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", cursor: "pointer" }} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                              {order.date}
                            </td>
                            <td style={{ fontWeight: 600, color: "var(--ink-2)", cursor: "pointer" }} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                              {summaryText}
                            </td>
                            <td className="r">
                              <div style={{ display: "inline-flex", gap: 4 }}>
                                <IconButton onClick={() => setEditOrderTarget(order)} title="Upraviť objednávku" aria-label="Upraviť objednávku"><Pencil /></IconButton>
                                <IconButton onClick={() => setResetOrderTarget(order)} title="Vynulovať objednávku" aria-label="Vynulovať objednávku"><RotateCcw /></IconButton>
                                <IconButton onClick={() => setDeleteOrderTarget(order)} title="Odstrániť objednávku" aria-label="Odstrániť objednávku"><Trash2 /></IconButton>
                              </div>
                            </td>
                            <td className="c" style={{ cursor: "pointer", color: "var(--ink-mute)" }} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: "var(--bg-cream-warm)" }}>
                              <td colSpan={4} style={{ borderTop: "1px solid var(--line-soft)" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, fontSize: 14 }}>
                                  {[
                                    { title: "Obed", data: order.data.lunch },
                                    { title: "Raňajky", data: order.data.breakfast },
                                    { title: "Olovrant", data: order.data.olovrant },
                                  ].map(({ title, data }) => (
                                    <div key={title}>
                                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", marginBottom: 8, borderBottom: "1px solid var(--line-soft)", paddingBottom: 4 }}>{title}</div>
                                      {(() => {
                                        if (!data) return <span style={{ color: "var(--ink-mute)" }}>-</span>;
                                        if (typeof data === "string") return <span>{data === "true" ? "Áno" : data}</span>;
                                        if (data === true) return <span>Áno</span>;
                                        const items: React.JSX.Element[] = [];
                                        Object.entries(data).forEach(([catName, catData]) => {
                                          if (!catData || typeof catData !== "object") return;
                                          const category = catData as { menuCounts?: Record<string, number>; diets?: Record<string, number> };
                                          const menuCounts = category.menuCounts || {};
                                          const diets = category.diets || {};
                                          const totalPortions = Object.values(menuCounts).reduce((a, b) => a + Number(b), 0);
                                          const totalDiets = Object.values(diets).reduce((a, b) => a + Number(b), 0);
                                          if (Number(totalPortions) > 0) {
                                            items.push(
                                              <div key={catName} style={{ display: "flex", flexDirection: "column", marginBottom: 4, borderBottom: "1px solid var(--line-soft)", paddingBottom: 4 }}>
                                                <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{String(totalPortions)}x {catName}</span>
                                                {Number(totalDiets) > 0 && <span style={{ fontSize: 12, color: "var(--green-600)", paddingLeft: 8 }}>• {String(totalDiets)}x Diéta</span>}
                                              </div>,
                                            );
                                          }
                                        });
                                        return items.length ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{items}</div> : <span style={{ color: "var(--ink-mute)" }}>-</span>;
                                      })()}
                                    </div>
                                  ))}
                                </div>
                                {order.data.soup && typeof order.data.soup === "string" && (
                                  <div style={{ marginTop: 16, paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
                                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", marginRight: 8 }}>Polievka:</span>
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
              </div>
            )}
          </Card>
        )}

        {activeTab === "settings" && (
          <div className="zpa-stack">
            <div className="zpa-grid-2">
              <Card pad>
                <CardHead title="Viditeľné menu" desc="Vyberte, ktoré typy menu sa zobrazia pre túto prevádzku." />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {ALL_MENUS.map((menu) => (
                    <Checkbox key={menu} on={menus.has(menu)} onChange={() => toggleSet(menus, menu, setMenus)}>
                      Menu {menu}
                    </Checkbox>
                  ))}
                </div>
              </Card>

              <Card pad>
                <CardHead title="Viditeľné jedlá" desc="Nastavte, ktoré chody dňa sú dostupné." />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {ALL_MEALS.map((meal) => (
                    <Checkbox
                      key={meal}
                      on={meals.has(meal)}
                      onChange={() => {
                        if (meals.has(meal) && meals.size === 1) {
                          toastWarning("Prevádzka musí mať povolený aspoň jeden chod.");
                          return;
                        }
                        toggleSet(meals, meal, setMeals);
                      }}
                    >
                      {MEAL_LABELS[meal] ?? meal}
                    </Checkbox>
                  ))}
                </div>
              </Card>

              <Card pad>
                <CardHead title="Zabaliť zvlášť" desc="Keď je vypnuté, klient v objednávke neuvidí blok pre balenie zvlášť." />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 8 }}>
                  <div style={{ color: "var(--ink-2)", fontSize: 14 }}>
                    Povoliť klientovi označiť vybrané položky na balenie zvlášť.
                  </div>
                  <Toggle
                    on={packSeparatelyEnabled}
                    onChange={setPackSeparatelyEnabled}
                    ariaLabel="Povoliť zabaliť zvlášť"
                  />
                </div>
              </Card>
            </div>

            <Card pad>
              <CardHead
                title="Povolené diéty"
                desc="Obmedzte, ktoré špeciálne diéty si prevádzka môže vybrať."
                actions={<Button variant="ghost" sm onClick={() => navigate("/admin/diets")}><Plus /> Pridať novú diétu</Button>}
              />
              {allDiets.length === 0 ? (
                <Empty>
                  V systéme nie sú definované žiadne diéty.
                  <div style={{ marginTop: 8 }}>
                    <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => navigate("/admin/diets")}>Prejsť na správu diét →</button>
                  </div>
                </Empty>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 8 }}>
                  {allDiets.map((diet) => (
                    <Checkbox key={diet.id} on={userDiets.has(diet.id)} onChange={() => toggleSet(userDiets, diet.id, setUserDiets)}>
                      {diet.name}
                    </Checkbox>
                  ))}
                </div>
              )}
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Ukladám…" : "Uložiť nastavenia"}</Button>
            </div>
          </div>
        )}

        {activeTab === "order_note" && (
          <div className="zpa-stack">
            <Card pad>
              <CardHead title="Poznámka k objednávke" desc="Táto poznámka sa zobrazuje iba v admin dashboarde po rozkliknutí prevádzky, nad súhrnnými číslami." />
              <div style={{ marginTop: 8 }}>
                <Textarea value={adminOrderNote} onChange={(e) => setAdminOrderNote(e.target.value)} rows={6} placeholder="Sem zadajte internú poznámku k objednávkam prevádzky…" />
              </div>
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Ukladám…" : "Uložiť poznámku"}</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Password reset confirmation ── */}
      {user && (
      <ConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={handleSendPasswordReset}
        title="Odoslať reset hesla"
        description={`Naozaj chcete odoslať reset link na ${user.email}? Prevádzka si cez tento odkaz bude môcť nastaviť nové heslo.`}
        confirmText={sendingReset ? "Odosielam..." : "Odoslať"}
        cancelText="Zrušiť"
        variant="warning"
      />
      )}

      {/* ── Delete order confirmation modal ── */}
      {deleteOrderTarget && (
        <Modal
          title="Odstrániť objednávku"
          onClose={() => setDeleteOrderTarget(null)}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={
            <>
              <Button variant="ghost" onClick={() => setDeleteOrderTarget(null)} disabled={orderActionLoading}>Zrušiť</Button>
              <Button variant="danger" onClick={handleDeleteOrder} disabled={orderActionLoading}>{orderActionLoading ? "Odstraňujem…" : "Odstrániť"}</Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj chcete odstrániť objednávku zo dňa <strong style={{ color: "var(--green-900)" }}>{deleteOrderTarget.date}</strong>? Táto akcia je nevratná.
          </p>
        </Modal>
      )}

      {/* ── Create / Edit order modal ── */}
      {(showNewOrderModal || editOrderTarget) && facilityId && (
        <AdminOrderEditorModal
          clientId={user?.id ?? null}
          prevadzkaId={facility.id}
          visibleMenus={orderEditorMenus}
          visibleMeals={orderEditorMeals}
          visibleDiets={orderEditorDiets}
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
        <Modal
          title="Vynulovať objednávku"
          onClose={() => setResetOrderTarget(null)}
          icon={<RotateCcw />}
          iconKind="warn"
          foot={
            <>
              <Button variant="ghost" onClick={() => setResetOrderTarget(null)} disabled={orderActionLoading}>Zrušiť</Button>
              <Button variant="honey" onClick={handleResetOrder} disabled={orderActionLoading}>{orderActionLoading ? "Vynulujem…" : "Vynulovať"}</Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj chcete vynulovať objednávku zo dňa <strong style={{ color: "var(--green-900)" }}>{resetOrderTarget.date}</strong>? Všetky položky budú vymazané, záznam zostane zachovaný.
          </p>
        </Modal>
      )}
    </>
  );
};

export default ClientDetail;
