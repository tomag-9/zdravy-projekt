import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Component {
  label: string;
  base_grams: string;
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
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}`);
      if (res.ok) setData(await res.json());
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

      {!loading && data && !hasData && (
        <div className="text-center py-16 text-gray-400 text-sm italic">
          Pre tento deň nie sú žiadne dáta.
          {!data.meal_plan_id && (
            <span className="block mt-1 text-xs">Jedálniček pre tento deň nebol naplánovaný.</span>
          )}
        </div>
      )}

      {!loading && data && hasData && <GramageTable data={data} />}
    </div>
  );
};

// ── GramageTable ──────────────────────────────────────────────────────────────

const GramageTable: React.FC<{ data: GramageDashboard }> = ({ data }) => {
  const { col_groups, rows, totals } = data;
  const [expandedClients, setExpandedClients] = useState<number[]>([]);

  // Total component count across all col_groups
  const totalComponents = col_groups.reduce((s, cg) => s + cg.components.length, 0);

  const toggleClient = (clientId: number) => {
    setExpandedClients((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  };

  // Aggregate sub_rows from all clients into per-variant gram totals
  const aggregatedRows = useMemo(() => {
    type NumRow = { type: "standard" | "diet"; label: string; count: number; col_grams: number[][] };
    const map = new Map<string, NumRow>();
    for (const clientRow of rows) {
      for (const sr of clientRow.sub_rows) {
        const key = `${sr.type}::${sr.label}`;
        if (!map.has(key)) {
          map.set(key, {
            type: sr.type as "standard" | "diet",
            label: sr.label,
            count: 0,
            col_grams: col_groups.map((cg) => Array<number>(cg.components.length).fill(0)),
          });
        }
        const agg = map.get(key)!;
        agg.count += sr.count;
        sr.col_grams.forEach((group, gi) => {
          group.forEach((val, ci) => {
            agg.col_grams[gi][ci] = (agg.col_grams[gi][ci] ?? 0) + parseFloat(val || "0");
          });
        });
      }
    }
    const toStr = (r: NumRow) => ({ ...r, col_grams: r.col_grams.map((g) => g.map(String)) });
    const all = [...map.values()];
    return {
      standard: all.filter((r) => r.type === "standard").sort((a, b) => a.label.localeCompare(b.label, "sk")).map(toStr),
      diets: all.filter((r) => r.type === "diet").sort((a, b) => a.label.localeCompare(b.label, "sk")).map(toStr),
    };
  }, [rows, col_groups]);

  // Helper: render gramage cells for a sub_row
  const GramCells = ({ col_grams, className = "", positiveClass = "text-gray-900 font-medium" }: { col_grams: string[][]; className?: string; positiveClass?: string }) => (
    <>
      {col_groups.map((cg, gi) => {
        const grams = col_grams[gi] || [];
        return cg.components.map((_, ci) => (
          <td key={`${gi}-${ci}`} className={`px-2 py-1.5 text-right tabular-nums text-xs ${className}`}>
            {grams[ci] ? (
              <span className={parseFloat(grams[ci]) > 0 ? positiveClass : "text-gray-300"}>
                {parseFloat(grams[ci]) > 0 ? Math.round(parseFloat(grams[ci])) : "—"}
              </span>
            ) : (
              <span className="text-gray-200">—</span>
            )}
          </td>
        ));
      })}
    </>
  );

  const SummaryRow = ({
    label,
    count,
    col_grams,
    rowClassName,
    cellClassName,
  }: {
    label: string;
    count: number;
    col_grams: string[][];
    rowClassName: string;
    cellClassName: string;
  }) => (
    <tr className={rowClassName}>
      <td className={`px-4 py-2 sticky left-0 z-10 ${cellClassName}`}>
        <div className="font-semibold">{label}</div>
      </td>
      <td className={`px-3 py-2 text-center font-semibold ${cellClassName}`}>
        {count > 0 ? count : "—"}
      </td>
      <GramCells col_grams={col_grams} className={cellClassName} />
    </tr>
  );

  // Totals row cells
  const TotalCells = () => (
    <>
      {col_groups.map((cg, gi) =>
        cg.components.map((_, ci) => (
          <td key={`${gi}-${ci}`} className="px-2 py-2 text-right tabular-nums text-sm font-bold text-white">
            {totals[gi]?.[ci] ? Math.round(parseFloat(totals[gi][ci])) : 0}
          </td>
        ))
      )}
    </>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Row 1: meal group headers */}
            <tr className="bg-blue-800 text-white">
              <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-blue-800 z-10 min-w-[180px]" rowSpan={2}>
                Klient / Riadok
              </th>
              <th className="px-3 py-3 font-semibold text-center min-w-[50px]" rowSpan={2}>
                Počet
              </th>
              {col_groups.map((cg) => (
                <th
                  key={cg.key}
                  colSpan={cg.components.length}
                  className="px-3 py-2 text-center font-semibold border-l border-blue-600"
                >
                  {cg.label}
                  <div className="text-[10px] font-normal opacity-75 truncate max-w-[200px] mx-auto">
                    {cg.template_name}
                  </div>
                </th>
              ))}
            </tr>
            {/* Row 2: component labels */}
            <tr className="bg-blue-700 text-white text-xs">
              {col_groups.map((cg) =>
                cg.components.map((comp, ci) => (
                  <th key={`${cg.key}-${ci}`} className={`px-2 py-1.5 text-center font-medium ${ci === 0 ? "border-l border-blue-600" : ""}`}>
                    {comp.label}
                    <span className="block text-[10px] opacity-60">{comp.base_grams}g</span>
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

                  {isExpanded && row.sub_rows.map((sr, si) => (
                    <tr
                      key={si}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                        sr.type === "diet" ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className={`px-4 py-1.5 text-gray-700 sticky left-0 z-10 ${sr.type === "diet" ? "bg-yellow-50 pl-8 text-xs italic text-yellow-700" : "bg-white"}`}>
                        {sr.type === "diet" ? `↳ ${sr.label}` : sr.label}
                      </td>
                      <td className={`px-3 py-1.5 text-center font-semibold ${sr.type === "diet" ? "text-yellow-700 text-xs" : "text-gray-900"}`}>
                        {sr.count}
                      </td>
                      <GramCells col_grams={sr.col_grams} />
                    </tr>
                  ))}

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
                  />
                  {row.diet_summary_rows.map((diet) => (
                    <SummaryRow
                      key={diet.name}
                      label={diet.name}
                      count={diet.count}
                      col_grams={diet.col_grams}
                      rowClassName="border-b border-amber-100 bg-amber-50/80"
                      cellClassName="bg-amber-50/80 text-amber-900"
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            {/* Section header */}
            <tr className="bg-slate-600 text-white border-t-2 border-slate-700">
              <td colSpan={2 + totalComponents} className="px-4 py-2 font-bold text-xs uppercase tracking-wider sticky left-0 bg-slate-600 z-10">
                Súhrn porcií
              </td>
            </tr>
            {/* Standard variant rows */}
            {aggregatedRows.standard.map((row) => (
              <tr key={row.label} className="border-b border-gray-100 bg-white">
                <td className="px-4 py-2 sticky left-0 z-10 bg-white text-sm text-gray-700">{row.label}</td>
                <td className="px-3 py-2 text-center text-sm tabular-nums font-semibold text-gray-900">{row.count > 0 ? row.count : "—"}</td>
                <GramCells col_grams={row.col_grams} />
              </tr>
            ))}
            {/* Diet variant rows */}
            {aggregatedRows.diets.map((row) => (
              <tr key={row.label} className="border-b border-amber-50 bg-amber-50/40">
                <td className="px-4 py-2 pl-10 sticky left-0 z-10 bg-amber-50/40 text-xs italic text-amber-700">↳ {row.label}</td>
                <td className="px-3 py-2 text-center text-xs tabular-nums font-semibold text-amber-700">{row.count > 0 ? row.count : "—"}</td>
                <GramCells col_grams={row.col_grams} className="bg-amber-50/40" positiveClass="text-amber-800 font-medium" />
              </tr>
            ))}
            {/* Grand total */}
            <tr className="bg-blue-800 text-white border-t-2 border-blue-900">
              <td colSpan={2} className="px-4 py-2.5 font-bold sticky left-0 bg-blue-800 z-10">
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
