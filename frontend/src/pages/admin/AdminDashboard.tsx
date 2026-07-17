import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Loader2, Inbox } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Button, Card, Badge, Empty } from "./ui";

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
  count: number;
  col_grams: string[][];
}

interface DietSummaryRow {
  name: string;
  color?: string;
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

// ── Meal hue mapping (brand-translated meal colours, see admin.css .mh-*) ───────

function mealHue(meal: string, variant: string): string {
  if (meal === "breakfast_snack") return "break";
  if (meal === "soup") return "soup";
  if (meal === "main_course") {
    const v = (variant || "A").toUpperCase();
    return v === "B" || v === "C" || v === "V" ? `menu${v}` : "menuA";
  }
  return "snack";
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
  const { error: toastError } = useToast();
  const maxDate = useMemo(() => lastWeekdayToday(), []);
  const actualToday = useMemo(() => toDateString(new Date()), []);
  const [date, setDate] = useState(maxDate);
  const [data, setData] = useState<GramageDashboard | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const isAtMax = date >= maxDate;
  const hasData = data && (data.rows.length > 0 || data.col_groups.length > 0);
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
          </>
        }
      />

      <div className="zpa-stack">
        {/* Date navigator */}
        <Card>
          <div className="zpa-datenav">
            <button className="zpa-navchip" onClick={() => setDate(prevWeekday(date))}>
              <ChevronLeft /> Predchádzajúci deň
            </button>
            <div className="mid">
              <input
                type="date" value={date} max={maxDate}
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
              disabled={isAtMax}
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
              <tr key={row.user_id}>
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

const GramageTable: React.FC<{ data: GramageDashboard }> = ({ data }) => {
  const { col_groups, rows, totals } = data;
  const [expandedClients, setExpandedClients] = useState<string[]>([]);

  const totalComponents = col_groups.reduce((s, cg) => s + cg.components.length, 0);

  const rowKey = (row: ClientRow) => row.row_key ?? String(row.client_id);

  const toggleClient = (key: string) => {
    setExpandedClients((current) =>
      current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key],
    );
  };

  // Precomputed per-col-group hue
  const colGroupHues = useMemo(
    () => col_groups.map((cg) => mealHue(cg.meal, cg.variant)),
    [col_groups],
  );

  // One summary entry per col_group: count from count_summary, grams from totals[gi]
  const perMenuSummary = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const section of data.count_summary) {
      const key = `${section.meal}_${section.variant}_${section.diet_name ?? ""}`;
      countMap.set(
        key,
        section.standard.reduce((s, r) => s + r.count, 0) +
          section.diets.reduce((s, r) => s + r.count, 0),
      );
    }
    return col_groups.map((cg, gi) => ({
      label: cg.label,
      count: countMap.get(`${cg.meal}_${cg.variant}_${cg.diet_name ?? ""}`) ?? 0,
      // gram values only for this col_group's index; empty for all others
      col_grams: col_groups.map((_, i) => (i === gi ? (totals[i] ?? []) : [])),
    }));
  }, [col_groups, data.count_summary, totals]);

  const formatValue = (rawValue: string | undefined, component: Component) => {
    if (!rawValue) return null;
    const value = parseFloat(rawValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (component.is_exception || component.unit === "ks") {
      return value.toLocaleString("sk-SK", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
    }
    return Math.round(value).toString();
  };

  const GramCells = ({ col_grams }: { col_grams: string[][] }) => (
    <>
      {col_groups.map((cg, gi) => {
        const grams = col_grams[gi] || [];
        const hue = colGroupHues[gi];
        return cg.components.map((component, ci) => {
          const formatted = formatValue(grams[ci], component);
          return formatted ? (
            <td key={`${gi}-${ci}`} className={`cell-num mh-${hue}-cell`}>{formatted}</td>
          ) : (
            <td key={`${gi}-${ci}`} className="cell-empty">—</td>
          );
        });
      })}
    </>
  );

  const CountBadge = ({ count }: { count: number }) => (
    <span className="count-badge">{count > 0 ? count : "—"}</span>
  );

  const SummaryRow = ({ label, count, col_grams, kind, color }: {
    label: string; count: number; col_grams: string[][]; kind: "std" | "diet"; color?: string;
  }) => (
    <tr className={kind === "std" ? "summ-std" : "summ-diet"} style={kind === "diet" && color ? { background: `${color}22` } : undefined}>
      <td>
        <span className="lbl-line">
          <span>
            {kind === "diet" && color && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: color, marginRight: 8 }} />}
            {label}
          </span>
          <CountBadge count={count} />
        </span>
      </td>
      <GramCells col_grams={col_grams} />
    </tr>
  );

  const renderClientRow = (row: ClientRow) => {
    const key = rowKey(row);
    const isExpanded = expandedClients.includes(key);
    const dietTotal = row.diet_summary_rows.reduce((sum, diet) => sum + diet.count, 0);
    return (
      <React.Fragment key={key}>
        <tr className="client-row">
          <td colSpan={1 + totalComponents}>
            <button type="button" className="client-toggle" onClick={() => toggleClient(key)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={`chev${isExpanded ? " open" : ""}`}><ChevronRight size={15} /></span>
                {row.client}
                <span className="meta">
                  štandard {row.standard_total_count}{dietTotal ? `, diéty ${dietTotal}` : ""}
                </span>
              </span>
              <span className="meta">spolu porcií {row.total_count}</span>
            </button>
          </td>
        </tr>

        {isExpanded && row.sub_rows.map((sr, si) => (
          <tr key={si} className={`sub-row${sr.type === "diet" ? " diet" : ""}`} style={sr.type === "diet" && sr.diet_color ? { background: `${sr.diet_color}1f` } : undefined}>
            <td className="lbl">
              <span className="lbl-line">
                <span>
                  {sr.type === "diet" && sr.diet_color && <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: sr.diet_color, marginRight: 8 }} />}
                  {sr.type === "diet" ? `↳ ${sr.label}` : sr.label}
                </span>
                <CountBadge count={sr.count} />
              </span>
            </td>
            <GramCells col_grams={sr.col_grams} />
          </tr>
        ))}

        {isExpanded && row.admin_order_note?.trim() && (
          <tr>
            <td colSpan={1 + totalComponents} style={{ background: "rgba(114,136,75,0.06)", color: "var(--green-800)", fontSize: 13, padding: "10px 20px" }}>
              <strong style={{ fontFamily: "var(--font-display)" }}>Poznámka k objednávke:</strong>{" "}
              <span style={{ whiteSpace: "pre-wrap" }}>{row.admin_order_note}</span>
            </td>
          </tr>
        )}

        {isExpanded && row.delivery_note?.trim() && (
          <tr>
            <td colSpan={1 + totalComponents} style={{ background: "rgba(255,201,92,0.14)", color: "var(--mustard-700)", fontSize: 13, padding: "10px 20px" }}>
              <strong style={{ fontFamily: "var(--font-display)" }}>Rozvoz:</strong>{" "}
              <span style={{ whiteSpace: "pre-wrap" }}>{row.delivery_note}</span>
            </td>
          </tr>
        )}

        <SummaryRow label="Súčet bez diét" count={row.standard_total_count} col_grams={row.standard_col_grams} kind="std" />
        {row.diet_summary_rows.map((diet) => (
          <SummaryRow key={diet.name} label={diet.name} count={diet.count} col_grams={diet.col_grams} kind="diet" color={diet.color || data.diet_colors?.[diet.name]} />
        ))}
      </React.Fragment>
    );
  };

  return (
    <Card style={{ overflow: "hidden" }}>
      <div className="zpa-table-wrap">
        <table className="zpa-gram">
          <thead>
            <tr>
              <th className="corner" rowSpan={2}>Prevádzka / Riadok</th>
              {col_groups.map((cg, gi) => (
                <th key={cg.key} className={`grp mh-${colGroupHues[gi]}-1`} colSpan={cg.components.length}>
                  {cg.label}<small>{cg.template_name}</small>
                </th>
              ))}
            </tr>
            <tr>
              {col_groups.map((cg, gi) =>
                cg.components.map((comp, ci) => (
                  <th key={`${cg.key}-${ci}`} className={`comp mh-${colGroupHues[gi]}-2`}>
                    {comp.label}
                    <small>
                      {comp.is_exception
                        ? `podľa vekovej skupiny (${comp.unit ?? "ks"})`
                        : `${comp.base_grams}${comp.unit ?? "g"}`}
                    </small>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {data.blocks?.length ? (
              <>
                {data.blocks.map((block) => (
                  <React.Fragment key={`block-${block.id}`}>
                    <tr className="band">
                      <td colSpan={1 + totalComponents}>{block.name}</td>
                    </tr>
                    {block.routes.map((route) => (
                      <React.Fragment key={`route-${route.id}`}>
                        <tr style={{ background: "var(--bg-cream-soft)" }}>
                          <td colSpan={1 + totalComponents} style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green-900)", padding: "10px 20px" }}>
                            {route.name}
                            <span style={{ marginLeft: 8, fontSize: 12, fontFamily: "var(--font-sans)", color: "var(--ink-3)" }}>
                              {[route.departure_time?.slice(0, 5), route.driver].filter(Boolean).join(" / ")}
                            </span>
                          </td>
                        </tr>
                        {route.rows.length ? (
                          route.rows.map(renderClientRow)
                        ) : (
                          <tr>
                            <td colSpan={1 + totalComponents} style={{ color: "var(--ink-mute)", padding: "10px 20px" }}>
                              Žiadne riadky v tejto trase pre vybraný deň.
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {(data.unassigned_rows?.length ?? 0) > 0 && (
                  <>
                    <tr className="band">
                      <td colSpan={1 + totalComponents}>Nepriradené prevádzky</td>
                    </tr>
                    {data.unassigned_rows?.map(renderClientRow)}
                  </>
                )}
              </>
            ) : (
              rows.map(renderClientRow)
            )}
          </tbody>
          <tfoot>
            <tr className="band"><td colSpan={1 + totalComponents}>Súhrn porcií</td></tr>
            {perMenuSummary.map((item, gi) => (
              <tr key={`pm_${gi}`} style={{ background: "var(--bg-cream-warm)" }}>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-800)", paddingLeft: 20 }}>
                  <span className="lbl-line">
                    <span>{item.label}</span>
                    <CountBadge count={item.count} />
                  </span>
                </td>
                <GramCells col_grams={item.col_grams} />
              </tr>
            ))}
            <tr className="total">
              <td className="corner" style={{ textAlign: "left" }}>CELKOM (g / ml)</td>
              {col_groups.map((cg, gi) =>
                cg.components.map((component, ci) => {
                  const value = parseFloat(totals[gi]?.[ci] ?? "");
                  const formatted =
                    Number.isFinite(value) && value > 0
                      ? component.is_exception || component.unit === "ks"
                        ? value.toLocaleString("sk-SK", { maximumFractionDigits: 2, minimumFractionDigits: 0 })
                        : Math.round(value).toString()
                      : "0";
                  return <td key={`${gi}-${ci}`}>{formatted}</td>;
                })
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

export default AdminDashboard;
