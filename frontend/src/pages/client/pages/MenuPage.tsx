import { useEffect, useMemo, useState } from "react";
import { Coffee, Utensils, Apple } from "lucide-react";
import { useAuth } from "../../../context/auth";

const API_URL = import.meta.env.VITE_API_URL || "/api";

type MealKey = "breakfast" | "lunch" | "snack";

interface MealTemplate {
  category: MealKey;
  name: string;
  weight_label: string;
  menu_variant: string;
}

interface MealPlanItem {
  id: number;
  category: MealKey;
  menu_variant: string;
  template_detail: MealTemplate;
}

interface MealPlanResponse {
  exists: boolean;
  date: string;
  items: MealPlanItem[];
}

interface WeekDay {
  date: string;
  label: string;
}

const MEAL_META = {
  breakfast: { label: "Raňajky", icon: Coffee },
  lunch: { label: "Obed", icon: Utensils },
  snack: { label: "Olovrant", icon: Apple },
} satisfies Record<MealKey, { label: string; icon: typeof Coffee }>;

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWorkWeek(): WeekDay[] {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date: toLocalDateString(date),
      label: date.toLocaleDateString("sk-SK", { weekday: "long" }),
    };
  });
}

const MenuPage = () => {
  const { apiFetch } = useAuth();
  const week = useMemo(() => currentWorkWeek(), []);
  const today = toLocalDateString(new Date());
  const defaultIdx = Math.max(week.findIndex((day) => day.date === today), 0);
  const [dayIdx, setDayIdx] = useState(defaultIdx);
  const [plans, setPlans] = useState<Record<string, MealPlanResponse>>({});
  const [loading, setLoading] = useState(true);
  const day = week[dayIdx];
  const plan = plans[day.date];

  useEffect(() => {
    let cancelled = false;
    async function fetchWeek() {
      setLoading(true);
      const entries = await Promise.all(
        week.map(async (weekDay) => {
          try {
            const res = await apiFetch(
              `${API_URL}/meal-plans/by-date/?date=${weekDay.date}`,
            );
            if (!res.ok) {
              return [weekDay.date, { exists: false, date: weekDay.date, items: [] }];
            }
            const data = (await res.json()) as MealPlanResponse;
            return [weekDay.date, data];
          } catch {
            return [weekDay.date, { exists: false, date: weekDay.date, items: [] }];
          }
        }),
      );
      if (!cancelled) {
        setPlans(Object.fromEntries(entries));
        setLoading(false);
      }
    }
    fetchWeek();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, week]);

  const groupedItems = useMemo(() => {
    const grouped: Record<MealKey, MealPlanItem[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
    };
    (plan?.items || []).forEach((item) => {
      if (item.category in grouped) {
        grouped[item.category].push(item);
      }
    });
    return grouped;
  }, [plan]);

  const letterClass = (letter: string) => {
    if (letter === "B") return "b";
    if (letter === "V") return "v";
    return "";
  };

  return (
    <div className="zp-app">
      <div className="zp-pageheader">
        <div>
          <h1>Jedálniček</h1>
          <p>Aktuálny týždeň</p>
        </div>
      </div>

      <div className="zp-week-tabs">
        {week.map((weekDay, index) => (
          <button
            key={weekDay.date}
            onClick={() => setDayIdx(index)}
            className={`zp-week-tab${index === dayIdx ? " zp-week-tab--active" : ""}`}
            style={{
              background:
                index === dayIdx ? "var(--green-700)" : "var(--bg-cream-warm)",
              color: index === dayIdx ? "var(--bg-cream)" : "var(--ink-2)",
              borderColor:
                index === dayIdx ? "var(--green-700)" : "var(--line-soft)",
            }}
          >
            {weekDay.label}
          </button>
        ))}
      </div>

      <div className="zp-menu-day">
        <div className="zp-menu-day-head">
          <h3>{day.label}</h3>
          <span className="when">{day.date}</span>
        </div>

        {loading && <div className="zp-empty">Načítavam jedálniček...</div>}

        {!loading && (!plan?.exists || plan.items.length === 0) && (
          <div className="zp-empty">Na tento deň zatiaľ nie je zverejnený jedálniček.</div>
        )}

        {!loading &&
          (Object.keys(MEAL_META) as MealKey[]).map((mealKey) => {
            const mealItems = groupedItems[mealKey];
            if (mealItems.length === 0) return null;
            const Icon = MEAL_META[mealKey].icon;
            const weightLabel = mealItems
              .map((item) => item.template_detail?.weight_label)
              .filter(Boolean)
              .join(" · ");

            return (
              <div className="zp-menu-meal" key={mealKey}>
                <div className="zp-menu-meal-head">
                  <Icon style={{ width: 16, height: 16 }} />
                  <span className="name">{MEAL_META[mealKey].label}</span>
                  <span className="gram">{weightLabel}</span>
                </div>
                {mealItems.map((item) => {
                  const variant = item.menu_variant || item.template_detail?.menu_variant || "A";
                  return (
                    <div className="zp-menu-item" key={item.id}>
                      <span className={`letter ${letterClass(variant)}`}>{variant}</span>
                      <div className="body">
                        <div className="ttl">{item.template_detail?.name}</div>
                        {item.template_detail?.weight_label && (
                          <div className="desc">{item.template_detail.weight_label}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MenuPage;
