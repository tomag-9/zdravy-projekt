import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

interface PlanSummary {
  id: number;
  date: string;
  grand_total_grams?: string;
}

type MealCategory = "breakfast_snack" | "soup" | "main_course" | "afternoon_snack";

interface MealTemplateOption {
  id: number;
  category: MealCategory;
  name: string;
  weight_label: string;
  menu_variant?: string;
}

interface MealPlanItem {
  id: number;
  category: MealCategory;
  menu_variant: string;
  template: number;
  template_detail: MealTemplateOption;
}

interface DayPlanResponse {
  exists: boolean;
  date: string;
  items: MealPlanItem[];
}

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast_snack: "Raňajky-desiata",
  soup: "Polievka",
  main_course: "Hlavný chod",
  afternoon_snack: "Olovrant",
};

const MAIN_COURSE_VARIANTS = ["A", "B", "C", "V"] as const;
type MainCourseVariant = (typeof MAIN_COURSE_VARIANTS)[number];
type SelectionKey = Exclude<MealCategory, "main_course"> | `main_course_${MainCourseVariant}`;

const EMPTY_SELECTION: Record<SelectionKey, number | ""> = {
  breakfast_snack: "",
  soup: "",
  main_course_A: "",
  main_course_B: "",
  main_course_C: "",
  main_course_V: "",
  afternoon_snack: "",
};

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

export const DayEditorPanel: React.FC<{
  date: string;
  templates: MealTemplateOption[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ date, templates, onClose, onSaved }) => {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] =
    useState<Record<SelectionKey, number | "">>(EMPTY_SELECTION);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${API}/admin/meal-plans/by-date/?date=${date}`);
        if (res.ok) {
          const data: DayPlanResponse = await res.json();
          if (!cancelled) {
            const next: Record<SelectionKey, number | ""> = { ...EMPTY_SELECTION };
            for (const item of data.items || []) {
              if (item.category === "main_course") {
                const variant = (item.menu_variant || "").toUpperCase();
                if (!variant) {
                  for (const targetVariant of MAIN_COURSE_VARIANTS) {
                    next[`main_course_${targetVariant}`] = item.template;
                  }
                } else if (MAIN_COURSE_VARIANTS.includes(variant as MainCourseVariant)) {
                  next[`main_course_${variant as MainCourseVariant}`] = item.template;
                }
              } else if (item.category in next) {
                next[item.category as SelectionKey] = item.template;
              }
            }
            setSelected(next);
          }
        }
      } catch (e) {
        logger.error(e);
        if (!cancelled) setError("Nepodarilo sa načítať jedálniček pre tento deň.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiFetch, date]);

  const templatesByCategory = useMemo(() => {
    const grouped: Record<MealCategory, MealTemplateOption[]> = {
      breakfast_snack: [],
      soup: [],
      main_course: [],
      afternoon_snack: [],
    };
    for (const t of templates) {
      if (t.category in grouped) grouped[t.category].push(t);
    }
    return grouped;
  }, [templates]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const items_write = [
      ...(["breakfast_snack", "soup", "afternoon_snack"] as const)
        .filter((cat) => selected[cat] !== "")
        .map((cat) => ({ template_id: selected[cat], menu_variant: "" })),
      ...MAIN_COURSE_VARIANTS
        .filter((variant) => selected[`main_course_${variant}`] !== "")
        .map((variant) => ({
          template_id: selected[`main_course_${variant}`],
          menu_variant: variant,
        })),
    ];
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, items_write }),
      });
      if (!res.ok) {
        setError("Uloženie zlyhalo. Skúste to znova.");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      logger.error(e);
      setError("Uloženie zlyhalo. Skúste to znova.");
    } finally {
      setSaving(false);
    }
  };

  const renderSelect = (
    selectionKey: SelectionKey,
    category: MealCategory,
    label: string,
  ) => (
    <select
      aria-label={label}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      value={selected[selectionKey]}
      onChange={(e) => {
        const nextValue = e.target.value ? Number(e.target.value) : "";
        setSelected((current) => {
          const next = { ...current, [selectionKey]: nextValue };
          if (
            selectionKey === "main_course_A" &&
            current.main_course_A === "" &&
            nextValue !== ""
          ) {
            for (const variant of MAIN_COURSE_VARIANTS) {
              const key: SelectionKey = `main_course_${variant}`;
              if (next[key] === "") next[key] = nextValue;
            }
          }
          return next;
        });
      }}
    >
      <option value="">— nevybraté —</option>
      {templatesByCategory[category].map((t) => (
        <option key={t.id} value={t.id}>
          {t.name} ({t.weight_label})
        </option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Jedálniček — {date}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {CATEGORY_LABELS.breakfast_snack}
              </label>
              {renderSelect(
                "breakfast_snack",
                "breakfast_snack",
                CATEGORY_LABELS.breakfast_snack,
              )}
            </div>

            <div className="border border-gray-100 rounded-xl p-3 space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700">Obed</div>
                <p className="mt-1 text-xs text-gray-500">
                  Menu A/B/C/V sú samostatné gramáže. Prvý výber Menu A sa
                  skopíruje do prázdnych variantov; ďalšie zmeny sú nezávislé.
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {CATEGORY_LABELS.soup}
                </label>
                {renderSelect("soup", "soup", CATEGORY_LABELS.soup)}
              </div>
              {MAIN_COURSE_VARIANTS.map((variant) => (
                <div key={variant}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {CATEGORY_LABELS.main_course} Menu {variant}
                  </label>
                  {renderSelect(
                    `main_course_${variant}`,
                    "main_course",
                    `${CATEGORY_LABELS.main_course} Menu ${variant}`,
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {CATEGORY_LABELS.afternoon_snack}
              </label>
              {renderSelect(
                "afternoon_snack",
                "afternoon_snack",
                CATEGORY_LABELS.afternoon_snack,
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50"
          >
            {saving ? "Ukladám…" : "Uložiť"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MealPlanCalendar: React.FC = () => {
  const { apiFetch } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [plans, setPlans] = useState<Record<string, PlanSummary>>({});
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<MealTemplateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/admin/meal-templates/`);
      if (res.ok) {
        const data = await res.json();
        const list: MealTemplateOption[] = Array.isArray(data) ? data : data.results || [];
        setTemplates(list);
      }
    } catch (e) {
      logger.error(e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchPlans(year, month);
  }, [fetchPlans, year, month]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      relative min-h-[72px] p-2 rounded-xl text-left transition-all duration-150 border
                      ${isToday ? "border-teal-400 bg-teal-50" : "border-gray-100 bg-white"}
                      ${isWeekend && !isToday ? "bg-gray-50" : ""}
                      hover:border-teal-300
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
                  </button>
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

      {selectedDate && (
        <DayEditorPanel
          date={selectedDate}
          templates={templates}
          onClose={() => setSelectedDate(null)}
          onSaved={() => fetchPlans(year, month)}
        />
      )}
    </div>
  );
};

export default MealPlanCalendar;
