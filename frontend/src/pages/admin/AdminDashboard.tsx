import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';

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
  template_name: string;
  components: Component[];
}

interface SubRow {
  type: "standard" | "diet";
  meal: string;
  variant?: string;
  label: string;
  count: number;
  col_grams: string[][];
}

interface DietSummaryRow {
  name: string;
  count: number;
  col_grams: string[][];
}

interface ClientRow {
  client: string;
  client_id: number;
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
  label: string;
  standard: CountStandardRow[];
  diets: CountDietRow[];
}

interface GramageDashboard {
  date: string;
  meal_plan_id: number | null;
  col_groups: ColGroup[];
  rows: ClientRow[];
  totals: string[][];
  count_summary: CountSection[];
}

type OrderMealKey = "breakfast" | "lunch" | "olovrant";

interface OrderMealSummary {
  menus: Record<string, number>;
  diets: Record<string, number>;
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

// ── Meal color palette ────────────────────────────────────────────────────────

interface MealColors {
  header1: string;   // primary header bg
  header2: string;   // secondary header bg (component row)
  cellBg: string;    // data cell tint
  rowBorder: string; // tbody row left border
  cardHeader: string;
  cardStdBg: string;
  cardDietBg: string;
  cardStdText: string;
  cardDietText: string;
}

const BREAKFAST_SNACK_COLORS: MealColors = {
  header1: "bg-amber-700", header2: "bg-amber-600", cellBg: "bg-amber-100",
  rowBorder: "border-l-4 border-amber-400",
  cardHeader: "bg-amber-700", cardStdBg: "bg-amber-50", cardDietBg: "bg-amber-100/60",
  cardStdText: "text-amber-900", cardDietText: "text-amber-700",
};

const SOUP_COLORS: MealColors = {
  header1: "bg-sky-700", header2: "bg-sky-600", cellBg: "bg-sky-100",
  rowBorder: "border-l-4 border-sky-400",
  cardHeader: "bg-sky-700", cardStdBg: "bg-sky-50", cardDietBg: "bg-sky-100/60",
  cardStdText: "text-sky-900", cardDietText: "text-sky-700",
};

// main_course used to hold one column per client-facing menu variant
// (A/B/C/V), each with its own template. The catalog-based admin editor
// normally saves a single variant-less selection (falls back to the "A"
// palette below), but legacy/manually-created multi-variant data still
// gets distinct colors per variant.
const MAIN_COURSE_COLORS: Record<string, MealColors> = {
  A: {
    header1: "bg-indigo-700", header2: "bg-indigo-600", cellBg: "bg-indigo-100",
    rowBorder: "border-l-4 border-indigo-400",
    cardHeader: "bg-indigo-700", cardStdBg: "bg-indigo-50", cardDietBg: "bg-indigo-100/60",
    cardStdText: "text-indigo-900", cardDietText: "text-indigo-700",
  },
  B: {
    header1: "bg-violet-700", header2: "bg-violet-600", cellBg: "bg-violet-100",
    rowBorder: "border-l-4 border-violet-400",
    cardHeader: "bg-violet-700", cardStdBg: "bg-violet-50", cardDietBg: "bg-violet-100/60",
    cardStdText: "text-violet-900", cardDietText: "text-violet-700",
  },
  C: {
    header1: "bg-fuchsia-700", header2: "bg-fuchsia-600", cellBg: "bg-fuchsia-100",
    rowBorder: "border-l-4 border-fuchsia-400",
    cardHeader: "bg-fuchsia-700", cardStdBg: "bg-fuchsia-50", cardDietBg: "bg-fuchsia-100/60",
    cardStdText: "text-fuchsia-900", cardDietText: "text-fuchsia-700",
  },
  V: {
    header1: "bg-purple-700", header2: "bg-purple-600", cellBg: "bg-purple-100",
    rowBorder: "border-l-4 border-purple-400",
    cardHeader: "bg-purple-700", cardStdBg: "bg-purple-50", cardDietBg: "bg-purple-100/60",
    cardStdText: "text-purple-900", cardDietText: "text-purple-700",
  },
};

const AFTERNOON_SNACK_COLORS: MealColors = {
  header1: "bg-emerald-700", header2: "bg-emerald-600", cellBg: "bg-emerald-100",
  rowBorder: "border-l-4 border-emerald-400",
  cardHeader: "bg-emerald-700", cardStdBg: "bg-emerald-50", cardDietBg: "bg-emerald-100/60",
  cardStdText: "text-emerald-900", cardDietText: "text-emerald-700",
};

function getMealColors(meal: string, variant: string): MealColors {
  if (meal === "breakfast_snack") return BREAKFAST_SNACK_COLORS;
  if (meal === "soup") return SOUP_COLORS;
  if (meal === "main_course") return MAIN_COURSE_COLORS[variant] ?? MAIN_COURSE_COLORS.A;
  return AFTERNOON_SNACK_COLORS;
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

        if (!gramage.meal_plan_id) {
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gramáž jedál</h2>
          <p className="text-gray-500 mt-1 capitalize">{formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("pdf", setPdfLoading)}
            disabled={pdfLoading || loading || !hasData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold shadow hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pdfLoading ? <Spinner /> : null}
            Stiahnuť PDF
          </button>
          <button
            onClick={() => handleExport("xlsx", setXlsxLoading)}
            disabled={xlsxLoading || loading || !hasData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {xlsxLoading ? <Spinner /> : null}
            Stiahnuť XLSX
          </button>
        </div>
      </div>

      {/* Date navigator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4">
        <button
          onClick={() => setDate(prevWeekday(date))}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft /> Predchádzajúci deň
        </button>
        <div className="flex items-center gap-3">
          <input
            type="date" value={date} max={maxDate}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              if (!isWeekday(new Date(val + "T12:00:00"))) return;
              if (val <= maxDate) setDate(val);
            }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none"
          />
          {date === actualToday && (
            <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Dnes</span>
          )}
          {date === maxDate && date !== actualToday && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Posledný pracovný deň</span>
          )}
        </div>
        <button
          onClick={() => { const n = nextWeekday(date); if (n <= maxDate) setDate(n); }}
          disabled={isAtMax}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Nasledujúci deň <ChevronRight />
        </button>
      </div>

      {/* Content */}
      {loading && <div className="text-center py-16 text-gray-400 text-sm">Načítavam dáta...</div>}

      {!loading && data && !hasData && !hasOrderCounts && (
        <div className="text-center py-16 text-gray-400 text-sm italic">
          Pre tento deň nie sú žiadne dáta.
          {!data.meal_plan_id && (
            <span className="block mt-1 text-xs">Jedálniček pre tento deň nebol naplánovaný.</span>
          )}
        </div>
      )}

      {!loading && data && hasData && <GramageTable data={data} />}
      {!loading && data && !hasData && hasOrderCounts && orderReport && (
        <OrderCountsTable report={orderReport} />
      )}
    </div>
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

const OrderCountsTable: React.FC<{ report: OrderReport }> = ({ report }) => {
  const rows = report.rows.filter((row) => row.total > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
        <div className="text-sm font-semibold text-amber-900">
          Počty objednávok bez gramáže
        </div>
        <div className="text-xs text-amber-700 mt-0.5">
          Jedálniček pre tento deň nie je naplánovaný, preto sa zobrazujú iba objednané počty.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="px-4 py-3 text-left font-semibold min-w-[220px]">Prevádzka</th>
              {MEAL_KEYS.map((meal) => (
                <th key={meal} className="px-4 py-3 text-left font-semibold min-w-[180px]">
                  {MEAL_LABELS[meal]}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold min-w-[90px]">Spolu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {row.name}
                  <div className="text-xs font-normal text-slate-400">{row.email}</div>
                </td>
                {MEAL_KEYS.map((meal) => {
                  const mealData = row[meal];
                  const menuText = formatCounts(mealData.menus);
                  const dietText = formatCounts(mealData.diets);
                  return (
                    <td key={meal} className="px-4 py-3 align-top">
                      {mealData.total > 0 ? (
                        <div className="space-y-1">
                          <div className="font-semibold tabular-nums text-slate-900">
                            {mealData.total}
                          </div>
                          {menuText && <div className="text-xs text-slate-500">{menuText}</div>}
                          {dietText && <div className="text-xs text-amber-700">{dietText}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center font-bold tabular-nums text-slate-900">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-200">
              <td className="px-4 py-3 font-bold text-slate-800">Spolu</td>
              {MEAL_KEYS.map((meal) => (
                <td key={meal} className="px-4 py-3 font-bold tabular-nums text-slate-800">
                  {report.totals[meal].total > 0 ? report.totals[meal].total : "—"}
                </td>
              ))}
              <td className="px-4 py-3 text-center font-bold tabular-nums text-slate-900">
                {report.totals.grand}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ── GramageTable ──────────────────────────────────────────────────────────────

const GramageTable: React.FC<{ data: GramageDashboard }> = ({ data }) => {
  const { col_groups, rows, totals } = data;
  const [expandedClients, setExpandedClients] = useState<number[]>([]);

  const totalComponents = col_groups.reduce((s, cg) => s + cg.components.length, 0);

  const toggleClient = (clientId: number) => {
    setExpandedClients((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  };

  // Precomputed per-col-group colors
  const colGroupColors = useMemo(
    () => col_groups.map((cg) => getMealColors(cg.meal, cg.variant)),
    [col_groups],
  );

  // One summary entry per col_group: count from count_summary, grams from totals[gi]
  const perMenuSummary = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const section of data.count_summary) {
      const key = `${section.meal}_${section.variant}`;
      countMap.set(
        key,
        section.standard.reduce((s, r) => s + r.count, 0) +
          section.diets.reduce((s, r) => s + r.count, 0),
      );
    }
    return col_groups.map((cg, gi) => ({
      label: cg.label,
      meal: cg.meal,
      variant: cg.variant,
      count: countMap.get(`${cg.meal}_${cg.variant}`) ?? 0,
      // gram values only for this col_group's index; empty for all others
      col_grams: col_groups.map((_, i) => (i === gi ? (totals[i] ?? []) : [])),
    }));
  }, [col_groups, data.count_summary, totals]);

  const GramCells = ({
    col_grams,
    extraCellClass = "",
    positiveClass,
    tintCells = false,
  }: {
    col_grams: string[][];
    extraCellClass?: string;
    positiveClass?: string;
    tintCells?: boolean;
  }) => {
    const resolved = positiveClass ?? "text-gray-900 font-medium";
    const formatValue = (rawValue: string | undefined, component: Component) => {
      if (!rawValue) return null;
      const value = parseFloat(rawValue);
      if (!Number.isFinite(value) || value <= 0) return null;
      if (component.is_exception || component.unit === "ks") {
        return value.toLocaleString("sk-SK", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        });
      }
      return Math.round(value).toString();
    };
    return (
    <>
      {col_groups.map((cg, gi) => {
        const grams = col_grams[gi] || [];
        const tint = tintCells ? colGroupColors[gi].cellBg : "";
        return cg.components.map((component, ci) => {
          const formatted = formatValue(grams[ci], component);
          return (
            <td key={`${gi}-${ci}`} className={`px-2 py-1.5 text-right tabular-nums text-xs ${tint} ${extraCellClass}`}>
              {formatted ? (
                <span className={resolved}>{formatted}</span>
              ) : (
                <span className="text-gray-200">—</span>
              )}
            </td>
          );
        });
      })}
    </>
    );
  };

  const SummaryRow = ({
    label,
    count,
    col_grams,
    rowClassName,
    cellClassName,
    positiveClass,
  }: {
    label: string;
    count: number;
    col_grams: string[][];
    rowClassName: string;
    cellClassName: string;
    positiveClass?: string;
  }) => (
    <tr className={rowClassName}>
      <td className={`px-4 py-2 sticky left-0 z-10 ${cellClassName}`}>
        <div className="font-semibold">{label}</div>
      </td>
      <td className={`px-3 py-2 text-center font-semibold ${cellClassName}`}>
        {count > 0 ? count : "—"}
      </td>
      <GramCells col_grams={col_grams} tintCells positiveClass={positiveClass} />
    </tr>
  );

  const TotalCells = () => (
    <>
      {col_groups.map((cg, gi) =>
        cg.components.map((component, ci) => {
          const value = parseFloat(totals[gi]?.[ci] ?? "");
          const formatted =
            Number.isFinite(value) && value > 0
              ? component.is_exception || component.unit === "ks"
                ? value.toLocaleString("sk-SK", {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0,
                  })
                : Math.round(value).toString()
              : "0";
          return (
            <td key={`${gi}-${ci}`} className="px-2 py-2 text-right tabular-nums text-sm font-bold text-white">
              {formatted}
            </td>
          );
        })
      )}
    </>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Row 1: meal group headers — each col_group gets its meal color */}
            <tr className="text-white">
              <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-700 z-10 min-w-[180px]" rowSpan={2}>
                Prevádzka / Riadok
              </th>
              <th className="px-3 py-3 font-semibold text-center min-w-[50px] bg-slate-700" rowSpan={2}>
                Počet
              </th>
              {col_groups.map((cg, gi) => (
                <th
                  key={cg.key}
                  colSpan={cg.components.length}
                  className={`px-3 py-2 text-center font-semibold border-l border-white/20 ${colGroupColors[gi].header1}`}
                >
                  {cg.label}
                  <div className="text-[10px] font-normal opacity-75 truncate max-w-[200px] mx-auto">
                    {cg.template_name}
                  </div>
                </th>
              ))}
            </tr>
            {/* Row 2: component labels */}
            <tr className="text-white text-xs">
              {col_groups.map((cg, gi) =>
                cg.components.map((comp, ci) => (
                  <th
                    key={`${cg.key}-${ci}`}
                    className={`px-2 py-1.5 text-center font-medium ${colGroupColors[gi].header2} ${ci === 0 ? "border-l border-white/20" : ""}`}
                  >
                    {comp.label}
                    <span className="block text-[10px] opacity-60">
                      {comp.is_exception
                        ? `podľa vekovej skupiny (${comp.unit ?? "ks"})`
                        : `${comp.base_grams}${comp.unit ?? "g"}`}
                    </span>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedClients.includes(row.client_id);

              return (
                <React.Fragment key={row.client_id}>
                  <tr className="bg-slate-100 border-t-2 border-slate-200">
                    <td
                      colSpan={2 + totalComponents}
                      className="p-0 sticky left-0 bg-slate-100"
                    >
                      <button
                        type="button"
                        onClick={() => toggleClient(row.client_id)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-2 text-left font-bold text-slate-700 text-sm hover:bg-slate-200/60 transition-colors"
                      >
                        <span>
                          <span className="inline-flex items-center gap-2">
                            <ChevronDisclosure expanded={isExpanded} />
                            {row.client}
                          </span>
                          <span className="ml-2 text-xs font-normal text-slate-500">
                              štandard {row.standard_total_count}
                              {row.diet_summary_rows.length > 0
                                ? `, diéty ${row.diet_summary_rows.reduce((sum, diet) => sum + diet.count, 0)}`
                                : ""}
                          </span>
                        </span>
                        <span className="text-xs font-normal text-slate-400">
                          spolu porcií {row.total_count}
                        </span>
                      </button>
                    </td>
                  </tr>

                  {isExpanded && row.sub_rows.map((sr, si) => {
                    const mealColors = getMealColors(sr.meal, sr.type === "standard" ? (sr.variant ?? "") : "");
                    return (
                      <tr
                        key={si}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                          sr.type === "diet" ? "bg-yellow-50" : ""
                        }`}
                      >
                        <td className={`px-4 py-1.5 text-gray-700 sticky left-0 z-10 ${mealColors.rowBorder} ${sr.type === "diet" ? "bg-yellow-50 pl-8 text-xs italic text-yellow-700" : "bg-white"}`}>
                          {sr.type === "diet" ? `↳ ${sr.label}` : sr.label}
                        </td>
                        <td className={`px-3 py-1.5 text-center font-semibold ${sr.type === "diet" ? "text-yellow-700 text-xs" : "text-gray-900"}`}>
                          {sr.count}
                        </td>
                        <GramCells col_grams={sr.col_grams} tintCells />
                      </tr>
                    );
                  })}

                  {isExpanded && row.admin_order_note?.trim() && (
                    <tr className="border-b border-green-100 bg-green-50/40">
                      <td
                        colSpan={2 + totalComponents}
                        className="px-4 py-3 text-sm text-green-900"
                      >
                        <span className="font-semibold">Poznámka k objednávke:</span>{" "}
                        <span className="whitespace-pre-wrap">
                          {row.admin_order_note}
                        </span>
                      </td>
                    </tr>
                  )}

                  <SummaryRow
                    label="Súčet bez diét"
                    count={row.standard_total_count}
                    col_grams={row.standard_col_grams}
                    rowClassName="border-b border-emerald-100 bg-emerald-50/80"
                    cellClassName="bg-emerald-50/80 text-emerald-900"
                    positiveClass="text-emerald-900 font-medium"
                  />
                  {row.diet_summary_rows.map((diet) => (
                    <SummaryRow
                      key={diet.name}
                      label={diet.name}
                      count={diet.count}
                      col_grams={diet.col_grams}
                      rowClassName="border-b border-amber-100 bg-amber-50/80"
                      cellClassName="bg-amber-50/80 text-amber-900"
                      positiveClass="text-amber-900 font-medium"
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            {/* ── Per-menu summary: one row per col_group ── */}
            <tr className="bg-slate-600 text-white border-t-2 border-slate-700">
              <td colSpan={2 + totalComponents} className="px-4 py-2 font-bold text-xs uppercase tracking-wider sticky left-0 bg-slate-600 z-10">
                Súhrn porcií
              </td>
            </tr>
            {perMenuSummary.map((item, gi) => {
              const c = colGroupColors[gi];
              return (
                <tr key={`pm_${gi}`} className={`border-b border-gray-100 ${c.cardStdBg}`}>
                  <td className={`px-4 py-2 sticky left-0 z-10 font-semibold text-sm ${c.cardStdBg} ${c.cardStdText} ${c.rowBorder}`}>
                    {item.label}
                  </td>
                  <td className={`px-3 py-2 text-center font-bold tabular-nums text-sm ${c.cardStdText}`}>
                    {item.count > 0 ? item.count : "—"}
                  </td>
                  <GramCells col_grams={item.col_grams} tintCells positiveClass={`${c.cardStdText} font-bold`} />
                </tr>
              );
            })}
            {/* ── Grand total grams ── */}
            <tr className="bg-slate-700 text-white border-t-2 border-slate-800">
              <td colSpan={2} className="px-4 py-2.5 font-bold sticky left-0 bg-slate-700 z-10">
                CELKOM (g)
              </td>
              <TotalCells />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const ChevronLeft = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDisclosure: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default AdminDashboard;
