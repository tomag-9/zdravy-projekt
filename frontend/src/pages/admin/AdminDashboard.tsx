import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Loader2, Inbox, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import ConfirmationModal from "../client/components/ui/ConfirmationModal";
import { PageHead, Button, Card, Badge, Empty } from "./ui";
import { DietColorSwatch } from "./DietColorSwatch";

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

interface SpecCell {
  text?: string;
  css?: string;
  colspan?: number;
  count?: string;
  sub?: string;
  meta?: string;
  meta_right?: string;
  label?: string;
  swatch?: { color: string; base_colors: string[] };
}

interface SpecRow {
  kind: string;
  css: string;
  cells: SpecCell[];
  group_id?: string;
  collapsible?: boolean;
  color?: string | null;
}

interface TableSpec {
  total_columns: number;
  header: {
    corner: string;
    groups: Array<{ text: string; sub: string; css: string; colspan: number }>;
    components: Array<{ text: string; sub: string; css: string }>;
  };
  rows: SpecRow[];
  footer: SpecRow[];
}

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

function toDateString(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function isWeekday(d: Date) { const day = d.getDay(); return day !== 0 && day !== 6; }

function prevWeekday(s: string): string {
  const d = new Date(s + "T12:00:00");
  do { d.setDate(d.getDate() - 1); } while (!isWeekday(d));
  return toDateString(d);
}

function nextWeekday(s: string): string {
  const d = new Date(s + "T12:00:00");
  do { d.setDate(d.getDate() + 1); } while (!isWeekday(d));
  return toDateString(d);
}

function lastWeekdayToday(): string {
  const d = new Date();
  while (!isWeekday(d)) d.setDate(d.getDate() - 1);
  return toDateString(d);
}

function formatDate(s: string): string {
  return new Date(s + "T12:00:00").toLocaleDateString("sk-SK", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const maxDate = useMemo(() => lastWeekdayToday(), []);
  const actualToday = useMemo(() => toDateString(new Date()), []);
  const [date, setDate] = useState(maxDate);
  const [data, setData] = useState<GramageDashboard | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closedLoading, setClosedLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const closedRequestId = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    setOrderReport(null);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}`);
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
  }, [apiFetch, date]);

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

  const handleExport = useCallback(async (fmt: "xlsx" | "pdf", setFmt: (v: boolean) => void) => {
    setFmt(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard-${fmt}/?date=${date}`);
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
  }, [apiFetch, date, toastError]);

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

  return (
    <>
      <PageHead
        eyebrow="Prehľad"
        title="Gramáž jedál"
        desc={<span style={{ textTransform: "capitalize" }}>{formatDate(date)}</span>}
        actions={
          <>
            <Button variant="danger" onClick={() => handleExport("pdf", setPdfLoading)} disabled={pdfLoading || loading || !hasData}>
              {pdfLoading ? <Loader2 className="zpa-spin" /> : <FileText />} Stiahnuť PDF
            </Button>
            <Button variant="primary" onClick={() => handleExport("xlsx", setXlsxLoading)} disabled={xlsxLoading || loading || !hasData}>
              {xlsxLoading ? <Loader2 className="zpa-spin" /> : <FileSpreadsheet />} Stiahnuť XLSX
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
              {date === maxDate && date !== actualToday && <Badge tone="gray">Posledný pracovný deň</Badge>}
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

        {!loading && data && hasData && <GramageTable data={data} />}
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

// ── GramageTable ──────────────────────────────────────────────────────────────

const SpecCells: React.FC<{ cells: SpecCell[] }> = ({ cells }) => (
  <>
    {cells.map((cell, index) => (
      <td key={index} className={cell.css || undefined} colSpan={cell.colspan}>
        {cell.count !== undefined ? (
          <span className="lbl-line">
            <span>
              {cell.swatch && (
                <span style={{ display: "inline-flex", marginRight: 8 }}>
                  <DietColorSwatch color={cell.swatch.color} baseColors={cell.swatch.base_colors} size={9} />
                </span>
              )}
              {cell.text}
            </span>
            <span className="count-badge">{cell.count}</span>
          </span>
        ) : (
          cell.text
        )}
      </td>
    ))}
  </>
);

const GramageTable: React.FC<{ data: GramageDashboard }> = ({ data }) => {
  const { spec } = data;
  const [expandedClients, setExpandedClients] = useState<string[]>([]);

  const toggleClient = (key: string) => {
    setExpandedClients((current) =>
      current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key],
    );
  };

  // Riadok si nesie triedy aj farbu zo spec-u — tu sa už nič nerozhoduje,
  // len prekladá na značky (viď backend/api/exporters/gramage_table_spec.py).
  const renderRow = (row: SpecRow, index: number) => {
    const style = row.color ? { color: row.color } : undefined;

    if (row.kind === "client") {
      const cell = row.cells[0];
      const isExpanded = expandedClients.includes(row.group_id ?? "");
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <button type="button" className="client-toggle" onClick={() => toggleClient(row.group_id ?? "")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={`chev${isExpanded ? " open" : ""}`}><ChevronRight size={15} /></span>
                {cell.text}
                <span className="meta">{cell.meta}</span>
              </span>
              <span className="meta">{cell.meta_right}</span>
            </button>
          </td>
        </tr>
      );
    }

    if (row.kind === "route") {
      const cell = row.cells[0];
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <span className="route-pill">
              <span>{cell.text}</span>
              {cell.sub && <small>{cell.sub}</small>}
            </span>
          </td>
        </tr>
      );
    }

    if (row.kind === "note-admin" || row.kind === "note-delivery") {
      const cell = row.cells[0];
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <strong>{cell.label}</strong>{" "}
            <span style={{ whiteSpace: "pre-wrap" }}>{cell.text}</span>
          </td>
        </tr>
      );
    }

    return (
      <tr key={index} className={row.css} style={style}>
        <SpecCells cells={row.cells} />
      </tr>
    );
  };

  // Podriadky, poznámky a medzisúčty klienta sa ukazujú až po rozbalení.
  const visibleRows = spec.rows.filter(
    (row) => !row.collapsible || expandedClients.includes(row.group_id ?? ""),
  );

  return (
    <Card style={{ overflow: "hidden" }}>
      <div className="zpa-table-wrap zpa-gram-wrap">
        <table className="zpa-gram">
          <thead>
            <tr>
              <th className="corner" rowSpan={2}>{spec.header.corner}</th>
              {spec.header.groups.map((group, index) => (
                <th key={index} className={group.css} colSpan={group.colspan}>
                  {group.text}<small>{group.sub}</small>
                </th>
              ))}
            </tr>
            <tr>
              {spec.header.components.map((component, index) => (
                <th key={index} className={component.css}>
                  {component.text}<small>{component.sub}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{visibleRows.map(renderRow)}</tbody>
          <tfoot>{spec.footer.map(renderRow)}</tfoot>
        </table>
      </div>
    </Card>
  );
};


export default AdminDashboard;
