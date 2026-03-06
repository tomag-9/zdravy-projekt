import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MealCategory {
  name: string;
  menus: Record<string, number>;
  diets: Record<string, number>;
  total: number;
}

interface MealRow {
  categories: MealCategory[];
  total: number;
}

interface UserRow {
  user_id: number;
  name: string;
  email: string;
  breakfast: MealRow;
  lunch: MealRow;
  olovrant: MealRow;
  visible_meals: string[];
  total: number;
}

interface MealTotals {
  menus: Record<string, number>;
  diets: Record<string, number>;
  total: number;
}

interface ReportTotals {
  breakfast: MealTotals;
  lunch: MealTotals;
  olovrant: MealTotals;
  grand: number;
}

interface DailyReport {
  date: string;
  rows: UserRow[];
  totals: ReportTotals;
}

// ---------------------------------------------------------------------------
// Date helpers (weekday navigation, no weekends)
// ---------------------------------------------------------------------------
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function prevWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  do {
    d.setDate(d.getDate() - 1);
  } while (!isWeekday(d));
  return toDateString(d);
}

function nextWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  do {
    d.setDate(d.getDate() + 1);
  } while (!isWeekday(d));
  return toDateString(d);
}

function lastWeekdayToday(): string {
  const d = new Date();
  while (!isWeekday(d)) {
    d.setDate(d.getDate() - 1);
  }
  return toDateString(d);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Canonical age-group category order (youngest → oldest)
const CAT_ORDER = [
  "Jasle",
  "Škôlka",
  "ZŠ 1.stupeň",
  "ZŠ 2.stupeň",
  "Dospelý (SŠ)",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * mealAllowed=false → completely blank white cell (meal not configured for this user)
 * mealAllowed=true  → show each category row in canonical order; blank row if no data
 */
const MealCell: React.FC<{
  meal: MealRow;
  userCategoryNames: string[];
  mealAllowed: boolean;
}> = ({ meal, userCategoryNames, mealAllowed }) => {
  const catByName = useMemo(
    () => new Map(meal.categories.map((c) => [c.name, c])),
    [meal.categories],
  );

  if (!mealAllowed) return null;

  if (userCategoryNames.length === 0) {
    return <span className="text-gray-300 text-xs italic">–</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {userCategoryNames.map((catName) => {
        const cat = catByName.get(catName);
        const hasContent = cat && cat.total > 0;
        return (
          <div key={catName} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {catName}
            </span>
            {hasContent ? (
              <div className="flex flex-wrap gap-1">
                {Object.entries(cat!.menus)
                  .filter(([, cnt]) => cnt > 0)
                  .map(([menu, cnt]) => (
                    <span
                      key={menu}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      <span className="font-bold">{menu}</span>
                      <span className="text-gray-500">×{cnt}</span>
                    </span>
                  ))}
                {Object.entries(cat!.diets)
                  .filter(([, cnt]) => cnt > 0)
                  .map(([diet, cnt]) => (
                    <span
                      key={diet}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100"
                    >
                      {diet}
                      {cnt > 1 && <span className="font-bold ml-0.5">×{cnt}</span>}
                    </span>
                  ))}
              </div>
            ) : (
              <span className="text-gray-300 text-xs italic">–</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TotalsBadge: React.FC<{
  label: string;
  data: MealTotals;
  colorClass: string;
}> = ({ label, data, colorClass }) => (
  <div className={`rounded-xl p-3 ${colorClass} flex flex-col gap-1`}>
    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {label}
    </div>
    <div className="text-2xl font-bold text-gray-900">{data.total}</div>
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(data.menus || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => (
          <span
            key={k}
            className="text-[11px] bg-white/60 px-1.5 py-0.5 rounded font-medium text-gray-700"
          >
            {k}: {v}
          </span>
        ))}
    </div>
    {Object.keys(data.diets || {}).length > 0 && (
      <div className="flex flex-wrap gap-1">
        {Object.entries(data.diets)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded"
            >
              {k}: {v}
            </span>
          ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AdminDashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  // maxDate: last weekday on-or-before today (the furthest navigable date)
  const maxDate = useMemo(() => lastWeekdayToday(), []);
  // actualTodayStr: the real calendar today (may be a weekend)
  const actualTodayStr = useMemo(() => toDateString(new Date()), []);
  const [date, setDate] = useState(maxDate);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isAtMax = date >= maxDate;
  const { error: toastError } = useToast();
  // Keep a ref so polling loops can be cancelled on unmount
  const cancelPollRef = useRef(false);
  useEffect(() => {
    cancelPollRef.current = false;
    return () => {
      cancelPollRef.current = true;
    };
  }, []);

  const POLL_INTERVAL_MS = 1500;
  const POLL_MAX_ATTEMPTS = 200; // ~5 minutes max

  const downloadViaTask = useCallback(
    async (fmt: "pdf" | "xlsx", setLoading: (v: boolean) => void) => {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_URL || "/api";
      try {
        const initRes = await apiFetch(
          `${apiBase}/admin/report-tasks/?date=${date}&format=${fmt}`,
          { method: "POST" },
        );
        if (!initRes.ok) {
          toastError(
            fmt === "pdf"
              ? "Chyba pri spúšťaní generovania PDF."
              : "Chyba pri spúšťaní generovania XLSX.",
          );
          return;
        }
        const { task_id } = (await initRes.json()) as { task_id: string };

        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MS),
          );
          if (cancelPollRef.current) return;

          const statusRes = await apiFetch(
            `${apiBase}/admin/report-tasks/${task_id}/`,
          );
          if (!statusRes.ok) {
            toastError(
              fmt === "pdf"
                ? "Chyba pri kontrole stavu generovania PDF súboru."
                : "Chyba pri kontrole stavu generovania XLSX súboru.",
            );
            return;
          }
          const { status: taskStatus } = (await statusRes.json()) as {
            status: string;
          };

          if (taskStatus === "complete") {
            const dlRes = await apiFetch(
              `${apiBase}/admin/report-tasks/${task_id}/download/`,
            );
            if (!dlRes.ok) {
              toastError("Chyba pri sťahovaní súboru.");
              return;
            }
            const blob = await dlRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `prehlad_${date}.${fmt}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return;
          }

          if (taskStatus === "failed") {
            toastError(
              fmt === "pdf"
                ? "Chyba pri generovaní PDF súboru."
                : "Chyba pri generovaní XLSX súboru.",
            );
            return;
          }
        }
        toastError("Generovanie súboru trvalo príliš dlho.");
      } catch (e) {
        console.error(e);
        toastError(
          fmt === "pdf"
            ? "Chyba pri generovaní PDF súboru."
            : "Chyba pri generovaní XLSX súboru.",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, date, toastError],
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/summary/daily-report/?date=${date}`,
      );
      if (res.ok) {
        setReport(await res.json());
      } else {
        console.error("Failed to fetch daily report");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrev = () => setDate((d) => prevWeekday(d));
  const handleNext = () => {
    setDate((d) => {
      const next = nextWeekday(d);
      return next <= maxDate ? next : d;
    });
  };

  const handleDownloadXlsx = () => downloadViaTask("xlsx", setXlsxLoading);

  const handleDownloadPdf = () => downloadViaTask("pdf", setPdfLoading);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Denný prehľad</h2>
          <p className="text-gray-500 mt-1 capitalize">{formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={
              pdfLoading || loading || !report || report.rows.length === 0
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold shadow hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pdfLoading ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            Stiahnuť PDF
          </button>
          <button
            onClick={handleDownloadXlsx}
            disabled={
              xlsxLoading || loading || !report || report.rows.length === 0
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {xlsxLoading ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
            )}
            Stiahnuť XLSX
          </button>
        </div>
      </div>

      {/* Day navigator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Predchádzajúci deň
        </button>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={maxDate}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              const d = new Date(val + "T12:00:00");
              if (!isWeekday(d)) return;
              if (val <= maxDate) setDate(val);
            }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
          {date === actualTodayStr && (
            <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              Dnes
            </span>
          )}
          {date === maxDate && date !== actualTodayStr && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Posledný pracovný deň
            </span>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={isAtMax}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Nasledujúci deň
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Načítavam dáta...
        </div>
      )}

      {/* Empty state */}
      {!loading && report && report.rows.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm italic">
          Pre tento deň nie sú žiadne objednávky.
        </div>
      )}

      {/* Content */}
      {!loading && report && report.rows.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <TotalsBadge
              label="☕ Raňajky"
              data={report.totals.breakfast}
              colorClass="bg-orange-50 border border-orange-100"
            />
            <TotalsBadge
              label="🍽️ Obed"
              data={report.totals.lunch}
              colorClass="bg-blue-50 border border-blue-100"
            />
            {report.totals.olovrant.total > 0 && (
              <TotalsBadge
                label="🍎 Olovrant"
                data={report.totals.olovrant}
                colorClass="bg-green-50 border border-green-100"
              />
            )}
          </div>

          {/* Orders table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Objednávky klientov
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[160px]">
                      Klient
                    </th>
                    <th className="px-3 py-3 font-semibold text-orange-700 bg-orange-50/50 min-w-[140px] text-left">
                      ☕ Raňajky
                    </th>
                    <th className="px-3 py-3 font-semibold text-blue-700 bg-blue-50/50 min-w-[140px] text-left">
                      🍽️ Obed
                    </th>
                    <th className="px-3 py-3 font-semibold text-green-700 bg-green-50/50 min-w-[140px] text-left">
                      🍎 Olovrant
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 min-w-[70px]">
                      Spolu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.rows.map((row) => {
                    // Categories this user actually ordered on this day,
                    // in canonical age-group order
                    const userCatNames = (() => {
                      const names = new Set<string>();
                      row.breakfast.categories.forEach((c) =>
                        names.add(c.name),
                      );
                      row.lunch.categories.forEach((c) => names.add(c.name));
                      row.olovrant.categories.forEach((c) =>
                        names.add(c.name),
                      );
                      return [
                        ...CAT_ORDER.filter((c) => names.has(c)),
                        ...Array.from(names)
                          .filter((n) => !CAT_ORDER.includes(n))
                          .sort(),
                      ];
                    })();
                    const vm =
                      row.visible_meals ?? [
                        "breakfast",
                        "lunch",
                        "olovrant",
                      ];
                    return (
                      <tr
                        key={row.user_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-gray-900">
                            {row.name}
                          </div>
                          {row.name !== row.email && (
                            <div className="text-xs text-gray-400">
                              {row.email}
                            </div>
                          )}
                        </td>
                        <td
                          className={`px-3 py-3 align-top ${
                            vm.includes("breakfast") ? "bg-orange-50/20" : ""
                          }`}
                        >
                          <MealCell
                            meal={row.breakfast}
                            userCategoryNames={userCatNames}
                            mealAllowed={vm.includes("breakfast")}
                          />
                        </td>
                        <td
                          className={`px-3 py-3 align-top ${
                            vm.includes("lunch") ? "bg-blue-50/20" : ""
                          }`}
                        >
                          <MealCell
                            meal={row.lunch}
                            userCategoryNames={userCatNames}
                            mealAllowed={vm.includes("lunch")}
                          />
                        </td>
                        <td
                          className={`px-3 py-3 align-top ${
                            vm.includes("olovrant") ? "bg-green-50/20" : ""
                          }`}
                        >
                          <MealCell
                            meal={row.olovrant}
                            userCategoryNames={userCatNames}
                            mealAllowed={vm.includes("olovrant")}
                          />
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <span className="font-bold text-gray-900 text-base">
                            {row.total}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-3 text-gray-700">
                      SPOLU
                    </td>
                    <td className="px-3 py-3 bg-orange-50/40">
                      <span className="font-bold text-orange-700">
                        {report.totals.breakfast.total} ks
                      </span>
                    </td>
                    <td className="px-3 py-3 bg-blue-50/40">
                      <span className="font-bold text-blue-700">
                        {report.totals.lunch.total} ks
                      </span>
                    </td>
                    <td className="px-3 py-3 bg-green-50/40">
                      <span className="font-bold text-green-700">
                        {report.totals.olovrant.total} ks
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-bold text-indigo-700">
                        {report.totals.grand}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
