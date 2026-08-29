import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, FileText, Loader2, Inbox, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { useScrollToHashRow } from "../../lib/scrollToHashRow";
import ConfirmationModal from "../client/components/ui/ConfirmationModal";
import { PageHead, Button, Card, Badge, Empty, Select } from "./ui";
import GramageTable, { type TableSpec, type SpecSection, type SpecVydaj } from "./GramageTable";
import {
  prevWeekday,
  nextWeekday,
  dashboardMaxDate,
  dashboardDefaultDate,
  toDateString,
  isWeekday,
  formatDay as formatDate,
} from "../../lib/businessDay";

const API = import.meta.env.VITE_API_URL || "/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Component {
  label: string;
  base_grams: string | null;
  unit?: string;
  is_exception?: boolean;
}

interface ColGroup {
  key: string;
  label: string;
  meal: string;
  variant: string;
  diet_name?: string | null;
  diet_color?: string;
  template_name: string;
  components: Component[];
}

interface SubRow {
  type: "standard" | "diet";
  meal: string;
  variant?: string;
  label: string;
  diet_color?: string;
  diet_base_colors?: string[];
  count: number;
  col_grams: string[][];
}

interface DietSummaryRow {
  name: string;
  color?: string;
  base_colors?: string[];
  count: number;
  col_grams: string[][];
}

interface ClientRow {
  client: string;
  client_id: number;
  row_key?: string;
  prevadzka_id?: number | null;
  delivery_note?: string;
  total_count: number;
  standard_total_count: number;
  standard_col_grams: string[][];
  diet_summary_rows: DietSummaryRow[];
  admin_order_note?: string;
  sub_rows: SubRow[];
}

interface CountStandardRow {
  name: string;
  count: number;
}

interface CountDietRow {
  label: string;
  count: number;
}

interface CountSection {
  meal: string;
  variant: string;
  diet_name?: string | null;
  label: string;
  standard: CountStandardRow[];
  diets: CountDietRow[];
}

interface DeliveryRouteGroup {
  id: number;
  name: string;
  driver?: string;
  departure_time?: string | null;
  note?: string;
  rows: ClientRow[];
}

interface DeliveryBlockGroup {
  id: number;
  name: string;
  routes: DeliveryRouteGroup[];
}

// Hotový popis tabuľky z backendu. Obrazovka aj PDF ho renderujú z rovnakého
// spec-u, takže sa nemajú ako rozísť — všetky rozhodnutia o poradí riadkov,
// textoch, číslach a triedach padli v gramage_table_spec.py.

interface GramageDashboard {
  date: string;
  meal_plan_id: number | null;
  col_groups: ColGroup[];
  rows: ClientRow[];
  blocks?: DeliveryBlockGroup[];
  unassigned_rows?: ClientRow[];
  totals: string[][];
  count_summary: CountSection[];
  diet_colors?: Record<string, string>;
  diet_base_colors?: Record<string, string[]>;
  spec: TableSpec;
}

type OrderMealKey = "breakfast" | "lunch" | "olovrant";

interface OrderMealSummary {
  menus?: Record<string, number>;
  diets?: Record<string, number>;
  categories?: Array<{
    name: string;
    menus: Record<string, number>;
    diets: Record<string, number>;
    total: number;
  }>;
  total: number;
}

interface OrderReportRow {
  // Riadok je na objednávku, nie na používateľa — EduPage prevádzky zdieľajú
  // jeden systémový login, takže `user_id` nie je unikátne.
  order_id: number;
  user_id: number;
  name: string;
  email: string;
  breakfast: OrderMealSummary;
  lunch: OrderMealSummary;
  olovrant: OrderMealSummary;
  total: number;
}

interface OrderReport {
  date: string;
  rows: OrderReportRow[];
  totals: Record<OrderMealKey, OrderMealSummary> & { grand: number };
}

interface ClosedDayResponse {
  date: string;
  is_closed: boolean;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  // Od 12:00 sa odomkne aj zajtrajšok — British School sa scrapuje o 12:15
  // deň vopred, tak jej riadok potrebuje byť vidno ešte pred tým (#535).
  const maxDate = useMemo(() => dashboardMaxDate(), []);
  const actualToday = useMemo(() => toDateString(new Date()), []);
  const [date, setDate] = useState(() => dashboardDefaultDate());
  const [data, setData] = useState<GramageDashboard | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closedLoading, setClosedLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const closedRequestId = useRef(0);
  const [sections, setSections] = useState<string[]>([]);
  // Prázdny výber = všetky výdajné body; inak práve ten jeden vybratý.
  const [vydaj, setVydaj] = useState<string>("");

  // Ktoré sekcie (raňajky / polievka / menu / olovrant) a ktoré výdajné body sa
  // zobrazujú. Prázdny výber = kompletná tabuľka. Rovnaký filter dostane
  // obrazovka aj PDF, takže vytlačíš presne to, čo vidíš.
  const sectionQuery = useMemo(
    () =>
      [
        ...sections.map((key) => `&section=${encodeURIComponent(key)}`),
        ...(vydaj ? [`&vydaj=${encodeURIComponent(vydaj)}`] : []),
      ].join(""),
    [sections, vydaj],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    setOrderReport(null);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}${sectionQuery}`);
      if (res.ok) {
        const gramage: GramageDashboard = await res.json();
        setData(gramage);

        // Gramáž potrebuje vyplnené menu (col_groups). Keď menu ešte nie je zadané
        // — či už chýba plán úplne, alebo existuje prázdny — dotiahni aspoň počty
        // objednávok, nech admin vidí porcie namiesto prázdna.
        if (!gramage.meal_plan_id || gramage.col_groups.length === 0) {
          const reportRes = await apiFetch(`${API}/admin/summary/daily-report/?date=${date}`);
          if (reportRes.ok) setOrderReport(await reportRes.json());
        }
      }
    } catch (e) { logger.error(e); }
    finally { setLoading(false); }
  }, [apiFetch, date, sectionQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchClosedState = useCallback(async () => {
    const requestId = ++closedRequestId.current;
    setClosedLoading(true);
    try {
      const res = await apiFetch(`${API}/admin/closed-days/?date=${date}`);
      if (!res.ok) throw new Error("closed-day status failed");
      const payload = await res.json() as ClosedDayResponse;
      if (requestId === closedRequestId.current) setIsClosed(payload.is_closed);
    } catch (e) {
      logger.error(e);
      if (requestId === closedRequestId.current) {
        setIsClosed(false);
        toastError("Nepodarilo sa overiť, či je deň uzavretý.");
      }
    } finally {
      if (requestId === closedRequestId.current) setClosedLoading(false);
    }
  }, [apiFetch, date, toastError]);

  useEffect(() => {
    void fetchClosedState();
  }, [fetchClosedState]);

  const handleExport = useCallback(async (fmt: "pdf", setFmt: (v: boolean) => void) => {
    setFmt(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard-${fmt}/?date=${date}${sectionQuery}`);
      if (!res.ok) { toastError("Chyba pri generovaní súboru."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gramaz_${date}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { logger.error(e); toastError("Chyba pri generovaní súboru."); }
    finally { setFmt(false); }
  }, [apiFetch, date, sectionQuery, toastError]);

  const submitClosedDayAction = useCallback(
    async (
      method: "POST" | "DELETE",
      url: string,
      setPending: (pending: boolean) => void,
      nextIsClosed: boolean,
      successMsg: string,
      genericFailMsg: string,
      failMarker: string,
    ) => {
      setPending(true);
      try {
        const res = await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || failMarker);
        }
        setIsClosed(nextIsClosed);
        toastSuccess(successMsg);
      } catch (e) {
        logger.error(e);
        toastError(e instanceof Error && e.message !== failMarker ? e.message : genericFailMsg);
        await fetchClosedState();
      } finally {
        setPending(false);
      }
    },
    [apiFetch, date, fetchClosedState, toastError, toastSuccess],
  );

  const handleCloseDay = useCallback(
    () => submitClosedDayAction(
      "POST",
      `${API}/admin/closed-days/`,
      setClosing,
      true,
      "Deň bol uzavretý.",
      "Deň sa nepodarilo uzavrieť.",
      "close failed",
    ),
    [submitClosedDayAction],
  );

  const handleUnlockDay = useCallback(
    () => submitClosedDayAction(
      "DELETE",
      `${API}/admin/closed-days/unlock/`,
      setUnlocking,
      false,
      "Deň bol odomknutý.",
      "Deň sa nepodarilo odomknúť.",
      "unlock failed",
    ),
    [submitClosedDayAction],
  );

  const isAtMax = date >= maxDate;
  // Tabuľka žije zo spec-u, takže sa aj jej prázdnosť posudzuje podľa neho.
  const hasData = Boolean(
    data && (data.spec.rows.length > 0 || data.spec.header.groups.length > 0),
  );
  const hasOrderCounts = Boolean(orderReport?.rows.some((row) => row.total > 0));

  useScrollToHashRow(hasData);

  return (
    <>
      <PageHead
        eyebrow="Tabuľka"
        title="Gramáž jedál"
        desc={<span style={{ textTransform: "capitalize" }}>{formatDate(date)}</span>}
        actions={
          <>
            <Button variant="danger" onClick={() => handleExport("pdf", setPdfLoading)} disabled={pdfLoading || loading || !hasData}>
              {pdfLoading ? <Loader2 className="zpa-spin" /> : <FileText />} Stiahnuť PDF
            </Button>
            {!closedLoading && !isClosed && (
              <Button variant="secondary" onClick={() => setCloseConfirmOpen(true)} disabled={closing}>
                {closing ? <Loader2 className="zpa-spin" /> : <LockKeyhole />} Uzamknúť
              </Button>
            )}
            {!closedLoading && isClosed && (
              <>
                <span role="status" style={{ color: "var(--green-700)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  <Check style={{ width: 16, verticalAlign: "middle", marginRight: 5 }} />
                  Deň je uzavretý
                </span>
                <Button variant="secondary" onClick={() => setUnlockConfirmOpen(true)} disabled={unlocking}>
                  {unlocking ? <Loader2 className="zpa-spin" /> : <LockKeyholeOpen />} Odomknúť
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="zpa-stack">
        {/* Date navigator */}
        <Card>
          <div className="zpa-datenav">
            <button className="zpa-navchip" onClick={() => setDate(prevWeekday(date))} disabled={closing || unlocking}>
              <ChevronLeft /> Predchádzajúci deň
            </button>
            <div className="mid">
              <input
                type="date" value={date} max={maxDate}
                disabled={closing || unlocking}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (!isWeekday(new Date(val + "T12:00:00"))) return;
                  if (val <= maxDate) setDate(val);
                }}
                className="zpa-input"
                style={{ width: "auto" }}
              />
              {date === actualToday && <Badge tone="orange">Dnes</Badge>}
              {date === maxDate && date !== actualToday && date > actualToday && (
                <Badge tone="orange">Zajtra</Badge>
              )}
              {date === maxDate && date !== actualToday && date < actualToday && (
                <Badge tone="gray">Posledný pracovný deň</Badge>
              )}
            </div>
            <button
              className="zpa-navchip"
              onClick={() => { const n = nextWeekday(date); if (n <= maxDate) setDate(n); }}
              disabled={isAtMax || closing || unlocking}
            >
              Nasledujúci deň <ChevronRight />
            </button>
          </div>
        </Card>

        {/* Content */}
        {loading && <Empty>Načítavam dáta…</Empty>}

        {!loading && data && !hasData && !hasOrderCounts && (
          <Empty icon={<Inbox />}>
            Pre tento deň nie sú žiadne dáta.
            {!data.meal_plan_id && (
              <span style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                Jedálniček pre tento deň nebol naplánovaný.
              </span>
            )}
          </Empty>
        )}

        {!loading && data && hasData && (
          <>
            <PrintFilter
              sections={data.spec.sections}
              vydaje={data.spec.vydaje ?? []}
              vydaj={vydaj}
              onToggleSection={(key) =>
                setSections((current) =>
                  toggleSelection(
                    current,
                    key,
                    data.spec.sections.map((section) => section.key),
                  ),
                )
              }
              onVydajChange={setVydaj}
              onReset={() => {
                setSections([]);
                setVydaj("");
              }}
            />
            <GramageTable spec={data.spec} onClientNameClick={(id) => navigate(`/admin/facilities/${id}`)} />
          </>
        )}
        {!loading && data && !hasData && hasOrderCounts && orderReport && (
          <OrderCountsTable report={orderReport} />
        )}
      </div>

      <ConfirmationModal
        isOpen={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => void handleCloseDay()}
        title="Uzamknúť objednávky na tento deň?"
        description="Po uzamknutí už nebude možné upravovať objednávky pre tento deň. Prípadné odomknutie bude vyžadovať samostatné potvrdenie."
        confirmText="Uzamknúť"
        variant="warning"
      />
      <ConfirmationModal
        isOpen={unlockConfirmOpen}
        onClose={() => setUnlockConfirmOpen(false)}
        onConfirm={() => void handleUnlockDay()}
        title="Odomknúť objednávky na tento deň?"
        description="Odomknutím sa deň znova otvorí na úpravy objednávok, diét a ďalších údajov."
        confirmText="Odomknúť"
        variant="warning"
      />
    </>
  );
};

// ── OrderCountsTable ─────────────────────────────────────────────────────────

const MEAL_LABELS: Record<OrderMealKey, string> = {
  breakfast: "Raňajky",
  lunch: "Obed",
  olovrant: "Olovrant",
};

const MEAL_KEYS: OrderMealKey[] = ["breakfast", "lunch", "olovrant"];

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

function mergeCounts(
  target: Record<string, number>,
  source: Record<string, number> | undefined,
) {
  for (const [label, count] of Object.entries(source ?? {})) {
    if (count > 0) target[label] = (target[label] ?? 0) + count;
  }
}

function mealMenus(meal: OrderMealSummary): Record<string, number> {
  const result: Record<string, number> = {};
  if (meal.categories?.length) {
    for (const category of meal.categories) mergeCounts(result, category.menus);
    return result;
  }
  mergeCounts(result, meal.menus);
  return result;
}

function mealDiets(meal: OrderMealSummary): Record<string, number> {
  const result: Record<string, number> = {};
  if (meal.categories?.length) {
    for (const category of meal.categories) mergeCounts(result, category.diets);
    return result;
  }
  mergeCounts(result, meal.diets);
  return result;
}

const OrderCountsTable: React.FC<{ report: OrderReport }> = ({ report }) => {
  const rows = report.rows.filter((row) => row.total > 0);

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line-soft)", background: "rgba(255,201,92,0.12)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--mustard-700)" }}>
          Počty objednávok bez gramáže
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
          Jedálniček pre tento deň nie je naplánovaný, preto sa zobrazujú iba objednané počty.
        </div>
      </div>
      <div className="zpa-table-wrap">
        <table className="zpa-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Prevádzka</th>
              {MEAL_KEYS.map((meal) => (
                <th key={meal} style={{ minWidth: 180 }}>{MEAL_LABELS[meal]}</th>
              ))}
              <th className="c" style={{ minWidth: 90 }}>Spolu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.order_id}>
                <td>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{row.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{row.email}</div>
                </td>
                {MEAL_KEYS.map((meal) => {
                  const mealData = row[meal];
                  const menuText = formatCounts(mealMenus(mealData));
                  const dietText = formatCounts(mealDiets(mealData));
                  return (
                    <td key={meal} style={{ verticalAlign: "top" }}>
                      {mealData.total > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--green-900)" }}>
                            {mealData.total}
                          </div>
                          {menuText && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{menuText}</div>}
                          {dietText && <div style={{ fontSize: 12, color: "var(--mustard-700)" }}>{dietText}</div>}
                        </div>
                      ) : (
                        <span style={{ color: "var(--line)" }}>—</span>
                      )}
                    </td>
                  );
                })}
                <td className="c" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--green-900)" }}>
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--bg-cream-soft)" }}>
              <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green-800)" }}>Spolu</td>
              {MEAL_KEYS.map((meal) => (
                <td key={meal} style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--green-800)" }}>
                  {report.totals[meal].total > 0 ? report.totals[meal].total : "—"}
                </td>
              ))}
              <td className="c" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--green-900)" }}>
                {report.totals.grand}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

// ── Filter zobrazenia a tlače ────────────────────────────────────────────────
// Rovnaký výber ide na obrazovku aj do PDF — čo vidíš, to vytlačíš.

/**
 * Prepnutie jednej položky vo filtri. Prázdny výber znamená „všetko", takže
 * prvé odkliknutie musí vychádzať zo skutočne zobrazených položiek, nie z
 * prázdna; a keď sú nakoniec vybraté všetky, vraciame sa na prázdno.
 */
const toggleSelection = (current: string[], value: string, all: string[]): string[] => {
  const base = current.length ? current : all;
  const next = base.includes(value) ? base.filter((item) => item !== value) : [...base, value];
  return next.length === all.length ? [] : next;
};

const FilterRow: React.FC<{
  label: string;
  items: Array<{ key: string; label: string; selected: boolean }>;
  onToggle: (key: string) => void;
}> = ({ label, items, onToggle }) => (
  <div className="row">
    <span className="lbl">{label}</span>
    {items.map((item) => (
      <button
        key={item.key}
        type="button"
        className={`chip${item.selected ? " on" : ""}`}
        aria-pressed={item.selected}
        onClick={() => onToggle(item.key)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

const PrintFilter: React.FC<{
  sections: SpecSection[];
  vydaje: SpecVydaj[];
  vydaj: string;
  onToggleSection: (key: string) => void;
  onVydajChange: (key: string) => void;
  onReset: () => void;
}> = ({ sections, vydaje, vydaj, onToggleSection, onVydajChange, onReset }) => {
  const allSelected = sections.every((section) => section.selected) && !vydaj;
  return (
    <div className="zpa-section-filter">
      <FilterRow
        label="Jedlá"
        items={sections.map((section) => ({ ...section, key: section.key }))}
        onToggle={onToggleSection}
      />
      {vydaje.length > 1 && (
        <div className="row">
          <span className="lbl">Cluster</span>
          <Select
            value={vydaj}
            onChange={(e) => onVydajChange(e.target.value)}
            className={`cluster-select${vydaj ? " is-active" : ""}`}
            aria-label="Cluster"
          >
            <option value="">Všetky clustre</option>
            {vydaje.map((item) => (
              <option key={item.key} value={item.key}>{item.name}</option>
            ))}
          </Select>
        </div>
      )}
      <div className="row">
        <span className="hint">
          {allSelected
            ? "Tlačí sa celá tabuľka. Odkliknutím vyberieš, čo sa má zobraziť aj vytlačiť."
            : "Do PDF ide presne tento výber."}
        </span>
        {!allSelected && (
          <button type="button" className="reset" onClick={onReset}>
            Zobraziť všetko
          </button>
        )}
      </div>
    </div>
  );
};

// ── GramageTable ──────────────────────────────────────────────────────────────

export default AdminDashboard;
