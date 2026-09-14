import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, LoaderCircle, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/auth";
import { logger } from "../../lib/logger";
import { dashboardDefaultDate } from "../../lib/businessDay";
import { useDashboardMaxDate } from "../../hooks/useDashboardMaxDate";
import { PageHead, Card, AdminDateNav, Empty, Badge, Button, Checkbox, TableWrap, SearchBox } from "./ui";

// Zvýraznenie zlúčenej bunky — rovnaký tón ako zelený Badge (`--green-700`
// na `rgba(114,136,75,0.16)`), nech zapadne do zvyšku admina.
const MERGED_CELL_BG = "rgba(114,136,75,0.16)";

const API = import.meta.env.VITE_API_URL || "/api";

type Meal = "breakfast_snack" | "soup" | "main_course" | "afternoon_snack";

// Polievka (11.9.2026) je nezávislá od hlavného jedla — vlastný riadok v
// tomto boarde, aj keď v gramážnej tabuľke/PDF ostáva zlúčená do obeda.
const MEAL_ORDER: Meal[] = ["breakfast_snack", "soup", "main_course", "afternoon_snack"];

interface BoardComponent {
  index: number;
  label: string;
}

interface BoardMeal {
  meal: Meal;
  label: string;
  template_name: string;
  components: BoardComponent[];
}

interface BoardDiet {
  id: number;
  name: string;
  // Kombinovaná diéta (napr. "NoMilk+NoGluten") nesie mená svojich
  // základných diét — prázdne pole pre jednozložkovú. Backend
  // (`apply_diet_component_merge_toggle`) tú istú kaskádu presadzuje aj pri
  // zápise; tu len rovnaké pravidlo premietame do UI (zamknutá bunka), nech
  // sa admin nemusí dozvedieť o zamietnutí až z chyby po kliku.
  base_diet_names?: string[];
  text_color?: string;
  background_color?: string;
}

interface BoardMerged {
  meal: Meal;
  diet_name: string;
  component_index: number;
}

interface Board {
  date: string;
  meals: BoardMeal[];
  diets: BoardDiet[];
  merged: BoardMerged[];
}

function mergedKey(meal: string, dietName: string, componentIndex: number): string {
  return `${meal}\u0000${dietName}\u0000${componentIndex}`;
}

const DietComponentMergePage: React.FC = () => {
  const { apiFetch } = useAuth();
  // Rovnaký aktuálny/najbližší pracovný deň a navigačné okno ako Gramáž a
  // Kontrola objednávok. Piatok od 21:00 tak začína pondelkom.
  const [date, setDate] = useState(() => dashboardDefaultDate());
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bunky práve v requeste — nech admin nevidí "zamrznutý" klik, kým čaká
  // na server, ale ani nemôže tú istú bunku odklikať dvakrát súbežne.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);

  const upperMaxDate = useDashboardMaxDate();

  // Jedlo bez dnešných zlúčení je (default) zbalené — kuchyňa rieši len
  // výnimky, tabuľka s jedlami "ako obvykle" by len zaberala miesto.
  // Ručný klik na hlavičku prebije tento default, kým sa nezmení deň.
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpandedOverride({});
  }, [date]);

  const fetchBoard = useCallback(
    async (d: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${API}/admin/diet-component-merge/board/?date=${d}`);
        if (!res.ok) {
          setError("Nepodarilo sa načítať zoznam zložiek.");
          setBoard(null);
          return;
        }
        setBoard(await res.json());
      } catch (e) {
        logger.error(e);
        setError("Nepodarilo sa načítať zoznam zložiek.");
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    fetchBoard(date);
  }, [fetchBoard, date]);

  const mergedSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of board?.merged || []) {
      set.add(mergedKey(m.meal, m.diet_name, m.component_index));
    }
    return set;
  }, [board]);

  // Default je "spolu" (10.9.2026) — čo zaujíma admina je počet VÝNIMIEK
  // ("zvlášť"), nie počet zlúčení (tých je typicky väčšina gridu). Sekcia sa
  // preto sama rozbalí len keď má aspoň jednu výnimku.
  const separatedCountByMeal = useMemo(() => {
    const mergedCounts = new Map<string, number>();
    for (const m of board?.merged || []) {
      mergedCounts.set(m.meal, (mergedCounts.get(m.meal) || 0) + 1);
    }
    const counts = new Map<string, number>();
    for (const m of board?.meals || []) {
      const totalCells = m.components.length * (board?.diets.length || 0);
      counts.set(m.meal, totalCells - (mergedCounts.get(m.meal) || 0));
    }
    return counts;
  }, [board]);
  const hasSeparations = useMemo(
    () => Array.from(separatedCountByMeal.values()).some((count) => count > 0),
    [separatedCountByMeal]
  );

  // Vyhľadávanie diét, samostatné pre každú časť jedla.
  const [search, setSearch] = useState<Record<string, string>>({});
  useEffect(() => {
    setSearch({});
  }, [date]);

  const toggle = async (meal: Meal, diet: BoardDiet, component: BoardComponent, next: boolean) => {
    const key = mergedKey(meal, diet.name, component.index);
    if (pending.has(key)) return;
    setPending((prev) => new Set(prev).add(key));
    try {
      const res = await apiFetch(`${API}/admin/diet-component-merge/toggle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          meal,
          component_index: component.index,
          component_label: component.label,
          diet_id: diet.id,
          merged: next,
        }),
      });
      if (res.ok) {
        setBoard(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Zmenu sa nepodarilo uložiť, skús znova.");
      }
    } catch (e) {
      logger.error(e);
      setError("Zmenu sa nepodarilo uložiť, skús znova.");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const reset = async () => {
    if (resetting || pending.size > 0) return;
    setResetting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/admin/diet-component-merge/reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        setBoard(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Reset sa nepodarilo uložiť, skús znova.");
      }
    } catch (e) {
      logger.error(e);
      setError("Reset sa nepodarilo uložiť, skús znova.");
    } finally {
      setResetting(false);
    }
  };

  // Kombinovaná diéta (má `base_diet_names`) môže byť "spolu" len keď sú
  // "spolu" všetky jej základné diéty pre tú istú bunku — rovnaké pravidlo
  // presadzuje aj backend (`apply_diet_component_merge_toggle`), tu len
  // vopred zablokujeme klik, nech admin nedostane zamietnutie až po ňom.
  const missingBases = (meal: Meal, diet: BoardDiet, componentIndex: number): string[] =>
    (diet.base_diet_names || []).filter(
      (baseName) => !mergedSet.has(mergedKey(meal, baseName, componentIndex))
    );

  const meals = useMemo(() => {
    const byKey = new Map((board?.meals || []).map((m) => [m.meal, m]));
    return MEAL_ORDER.map((meal) => byKey.get(meal)).filter((m): m is BoardMeal => !!m);
  }, [board]);

  return (
    <>
      <PageHead
        title="Zlúčenie diét"
        desc="Pre každú zložku dnešného raňajok/desiaty, polievky, obeda (Menu A) a olovrantu diéty idú spolu so štandardom (default) — odklikni len tie zložky, čo sa dnes pripravia zvlášť. Polievka a obed sú nezávislé bunky. Referencia pre kuchyňu, gramážnu tabuľku/PDF nemení."
        titleExtra={<AdminDateNav date={date} onChange={setDate} maxDate={upperMaxDate} compact />}
        actions={
          <>
            <span
              aria-live="polite"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-mute)" }}
              title="Každá zmena sa uloží hneď po kliknutí."
            >
              {pending.size > 0 || resetting ? <LoaderCircle className="zpa-spin" size={16} /> : <CheckCircle2 size={16} />}
              {pending.size > 0 || resetting ? "Ukladám…" : "Ukladá sa automaticky"}
            </span>
            <Button
              variant="secondary"
              sm
              onClick={reset}
              disabled={resetting || pending.size > 0 || !hasSeparations}
              title="Zruší všetky označenia „zvlášť“ pre vybraný deň"
            >
              <RotateCcw /> {resetting ? "Resetujem…" : "Resetovať všetko spolu"}
            </Button>
          </>
        }
      />

      {error && (
        <p style={{ fontSize: 14, color: "var(--coral-600)", margin: "0 0 12px" }}>{error}</p>
      )}

      {loading && !board && <Card pad>Načítavam…</Card>}

      {!loading && board && meals.length === 0 && (
        <Card pad>
          <Empty>Jedálniček pre tento deň ešte nie je nastavený.</Empty>
        </Card>
      )}

      {board &&
        meals.map((meal) => {
          const separatedCount = separatedCountByMeal.get(meal.meal) || 0;
          const expanded = expandedOverride[meal.meal] ?? separatedCount > 0;
          const query = (search[meal.meal] || "").trim().toLowerCase();
          const visibleDiets = query
            ? board.diets.filter((d) => d.name.toLowerCase().includes(query))
            : board.diets;
          return (
            <Card key={meal.meal} pad style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="zpa-celok-toggle"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedOverride((prev) => ({ ...prev, [meal.meal]: !expanded }))
                }
                style={{ width: "100%" }}
              >
                <ChevronRight
                  className="chev"
                  style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}
                />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
                  {meal.label}
                </span>
                {separatedCount > 0 ? (
                  <Badge tone="green">{separatedCount} zvlášť</Badge>
                ) : (
                  <Badge tone="gray">dnes všetko spolu</Badge>
                )}
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-mute)" }}>
                  {expanded ? "Zbaliť" : "Rozbaliť"}
                </span>
              </button>
              {expanded && (
                <>
                  <p style={{ margin: "12px 0 8px", fontSize: 13, color: "var(--gray-500)" }}>
                    {meal.template_name}
                  </p>
                  <SearchBox
                    value={search[meal.meal] || ""}
                    onChange={(v) => setSearch((prev) => ({ ...prev, [meal.meal]: v }))}
                    placeholder="Hľadať diétu…"
                    className="zpa-diet-merge-search"
                  />
                  <TableWrap>
                    <table className="zpa-table">
                      <thead>
                        <tr>
                          <th>Diéta</th>
                          {meal.components.map((c) => (
                            <th key={c.index}>{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDiets.map((diet) => (
                          <tr key={diet.id}>
                            <td
                              style={
                                diet.text_color || diet.background_color
                                  ? { color: diet.text_color || undefined, background: diet.background_color || undefined }
                                  : undefined
                              }
                            >
                              {diet.name}
                            </td>
                            {meal.components.map((component) => {
                              const key = mergedKey(meal.meal, diet.name, component.index);
                              const spolu = mergedSet.has(key);
                              const missing = spolu ? [] : missingBases(meal.meal, diet, component.index);
                              const locked = missing.length > 0;
                              // Checkbox je default NEZAČIARKNUTÝ (= spolu) —
                              // zaškrtnutie je práve tá výnimka "zvlášť", nech
                              // admin odklikáva len to, čo sa má robiť inak.
                              return (
                                <td
                                  key={component.index}
                                  style={spolu ? { background: MERGED_CELL_BG } : undefined}
                                  title={locked ? `Vyžaduje "spolu" aj pri: ${missing.join(", ")}` : undefined}
                                >
                                  <Checkbox
                                    on={!spolu}
                                    disabled={locked}
                                    onChange={(checked) => toggle(meal.meal, diet, component, !checked)}
                                  >
                                    {spolu ? "spolu" : "zvlášť"}
                                  </Checkbox>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </>
              )}
            </Card>
          );
        })}
    </>
  );
};

export default DietComponentMergePage;
