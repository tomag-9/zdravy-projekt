import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { logger } from '../../lib/logger';
import { PageHead, Card, Button, Select } from "./ui";

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
    <Select
      aria-label={label}
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
    </Select>
  );

  return (
    <div className="zpa-scrim">
      <div className="zpa-modal">
        <div className="zpa-modal-head">
          <h3>Jedálniček — {date}</h3>
          <button className="zpa-modal-close" onClick={onClose} aria-label="Zavrieť"><X /></button>
        </div>

        <div className="zpa-modal-body">
          {loading ? (
            <div className="zpa-empty"><Loader2 className="zpa-spin" /> Načítavam…</div>
          ) : (
            <>
              <label className="zpa-field">
                <span className="zpa-label">{CATEGORY_LABELS.breakfast_snack}</span>
                {renderSelect("breakfast_snack", "breakfast_snack", CATEGORY_LABELS.breakfast_snack)}
              </label>

              <div style={{ border: "1px solid var(--line-soft)", borderRadius: "var(--radius-md)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>Obed</div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
                    Menu A/B/C/V sú samostatné gramáže. Prvý výber Menu A sa skopíruje do prázdnych variantov; ďalšie zmeny sú nezávislé.
                  </p>
                </div>
                <label className="zpa-field">
                  <span className="zpa-label">{CATEGORY_LABELS.soup}</span>
                  {renderSelect("soup", "soup", CATEGORY_LABELS.soup)}
                </label>
                {MAIN_COURSE_VARIANTS.map((variant) => (
                  <label key={variant} className="zpa-field">
                    <span className="zpa-label">{CATEGORY_LABELS.main_course} Menu {variant}</span>
                    {renderSelect(`main_course_${variant}`, "main_course", `${CATEGORY_LABELS.main_course} Menu ${variant}`)}
                  </label>
                ))}
              </div>

              <label className="zpa-field">
                <span className="zpa-label">{CATEGORY_LABELS.afternoon_snack}</span>
                {renderSelect("afternoon_snack", "afternoon_snack", CATEGORY_LABELS.afternoon_snack)}
              </label>
            </>
          )}

          {error && <p style={{ fontSize: 14, color: "var(--coral-600)", margin: 0 }}>{error}</p>}
        </div>

        <div className="zpa-modal-foot">
          <Button variant="ghost" onClick={onClose}>Zrušiť</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Ukladám…" : "Uložiť"}
          </Button>
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
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <>
      <PageHead eyebrow="Jedálniček" title="Jedálniček" desc="Plánujte jedálniček pre každý deň" />

      <div className="zpa-stack">
        <Card pad>
          <div className="zpa-cal-head">
            <button className="zpa-navchip" onClick={prevMonth}><ChevronLeft /> Predošlý</button>
            <h3>{MONTH_NAMES[month]} {year}</h3>
            <button className="zpa-navchip" onClick={nextMonth}>Ďalší <ChevronRight /></button>
          </div>

          {loading && <div className="zpa-empty"><Loader2 className="zpa-spin" /> Načítavam…</div>}

          {!loading && (
            <>
              <div className="zpa-cal-dow">
                {DOW.map((d) => <span key={d}>{d}</span>)}
              </div>

              <div className="zpa-cal-grid">
                {cells.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} className="zpa-cal-cell empty" />;
                  const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                  const plan = plans[dateStr];
                  const isToday = dateStr === todayStr;
                  const isWeekend = ((startDow + day - 1) % 7) >= 5;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`zpa-cal-cell${isToday ? " today" : ""}${isWeekend && !isToday ? " weekend" : ""}`}
                    >
                      <span className="dnum">{day}</span>
                      {plan && (
                        <span className="zpa-cal-plan">
                          <span className="dot" /> Plán
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="zpa-cal-legend">
                <span><span className="zpa-cal-plan"><span className="dot" /></span> Existujúci plán</span>
                <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, border: "2px solid var(--orange-500)", background: "#fff4e0" }} /> Dnešný deň</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {selectedDate && (
        <DayEditorPanel
          date={selectedDate}
          templates={templates}
          onClose={() => setSelectedDate(null)}
          onSaved={() => fetchPlans(year, month)}
        />
      )}
    </>
  );
};

export default MealPlanCalendar;
