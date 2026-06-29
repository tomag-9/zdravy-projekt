import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

interface PlanSummary {
  id: number;
  date: string;
  grand_total_grams?: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  // 0=Sun…6=Sat → convert to Mon=0…Sun=6
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const MONTH_NAMES = [
  "Január", "Február", "Marec", "Apríl", "Máj", "Jún",
  "Júl", "August", "September", "Október", "November", "December",
];
const DOW = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

const MealPlanCalendar: React.FC = () => {
  const { apiFetch } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [plans, setPlans] = useState<Record<string, PlanSummary>>({});
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(
    async (y: number, m: number) => {
      setLoading(true);
      const from = `${y}-${pad(m + 1)}-01`;
      const lastDay = daysInMonth(y, m);
      const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
      try {
        const res = await apiFetch(`${API}/admin/meal-plans/?from=${from}&to=${to}`);
        if (res.ok) {
          const data = await res.json();
          const list: PlanSummary[] = Array.isArray(data) ? data : data.results || [];
          const index: Record<string, PlanSummary> = {};
          for (const p of list) {
            index[p.date] = p;
          }
          setPlans(index);
        }
      } catch (e) {
        logger.error(e);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    fetchPlans(year, month);
  }, [fetchPlans, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const numDays = daysInMonth(year, month);
  const startDow = firstDayOfMonth(year, month);
  // Build calendar grid cells
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Jedálniček</h2>
          <p className="text-gray-500 mt-1">Plánujte jedálniček pre každý deň</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            ← Predošlý
          </button>
          <h3 className="text-xl font-bold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            Ďalší →
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && (
          <>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DOW.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-gray-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`e-${idx}`} />;
                }
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                const plan = plans[dateStr];
                const isToday = dateStr === todayStr;
                const isWeekend = ((startDow + day - 1) % 7) >= 5;

                return (
                  <div
                    key={dateStr}
                    className={`
                      relative min-h-[72px] p-2 rounded-xl text-left transition-all duration-150 border
                      ${isToday ? "border-teal-400 bg-teal-50" : "border-gray-100 bg-white"}
                      ${isWeekend && !isToday ? "bg-gray-50" : ""}
                    `}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isToday ? "text-teal-700" : isWeekend ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {day}
                    </span>
                    {plan && (
                      <div className="mt-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-1" />
                        <span className="text-xs text-teal-700 font-medium">
                          Plán
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
          Existujúci plán
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-teal-400 bg-teal-50" />
          Dnešný deň
        </span>
      </div>
    </div>
  );
};

export default MealPlanCalendar;
