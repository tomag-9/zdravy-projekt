import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth";

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
  username: string;
  email: string;
  breakfast: MealRow;
  lunch: MealRow;
  olovrant: MealRow;
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MealCell: React.FC<{ meal: MealRow }> = ({ meal }) => {
  if (meal.total === 0) {
    return <span className="text-gray-300 text-xs italic">–</span>;
  }

  const menus: Record<string, number> = {};
  const diets: Record<string, number> = {};
  for (const cat of meal.categories) {
    for (const [k, v] of Object.entries(cat.menus)) {
      menus[k] = (menus[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(cat.diets)) {
      diets[k] = (diets[k] || 0) + v;
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {Object.entries(menus)
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
      </div>
      {Object.keys(diets).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(diets)
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
      )}
      <span className="text-xs font-bold text-gray-800">{meal.total} ks</span>
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

  const isAtMax = date >= maxDate;

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

  const handleDownloadXlsx = async () => {
    setXlsxLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/summary/daily-report-xlsx/?date=${date}`,
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prehlad_${date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert("Chyba pri generovaní XLSX súboru.");
      }
    } catch (e) {
      console.error(e);
      alert("Chyba pri generovaní XLSX súboru.");
    } finally {
      setXlsxLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Denný prehľad</h2>
          <p className="text-gray-500 mt-1 capitalize">{formatDate(date)}</p>
        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 flex flex-col">
              <div className="text-indigo-100 text-sm font-medium">
                Klientov
              </div>
              <div className="text-4xl font-bold mt-1">
                {report.rows.length}
              </div>
              <div className="text-indigo-200 text-xs mt-1">klientov</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 flex flex-col">
              <div className="text-indigo-100 text-sm font-medium">
                Celkovo porcií
              </div>
              <div className="text-4xl font-bold mt-1">
                {report.totals.grand}
              </div>
              <div className="text-indigo-200 text-xs mt-1">porcií spolu</div>
            </div>
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
          </div>

          {report.totals.olovrant.total > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TotalsBadge
                label="🍎 Olovrant"
                data={report.totals.olovrant}
                colorClass="bg-green-50 border border-green-100"
              />
            </div>
          )}

          {/* Orders table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Objednávky klientov
              </h3>
              <span className="text-sm text-gray-500">
                {report.rows.length} klientov
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[160px]">
                      Klient
                    </th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-600 min-w-[130px]">
                      Email
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
                  {report.rows.map((row) => (
                    <tr
                      key={row.user_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {row.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {row.username}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs break-all">
                        {row.email}
                      </td>
                      <td className="px-3 py-3 bg-orange-50/20">
                        <MealCell meal={row.breakfast} />
                      </td>
                      <td className="px-3 py-3 bg-blue-50/20">
                        <MealCell meal={row.lunch} />
                      </td>
                      <td className="px-3 py-3 bg-green-50/20">
                        <MealCell meal={row.olovrant} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-gray-900 text-base">
                          {row.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td colSpan={2} className="px-4 py-3 text-gray-700">
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
