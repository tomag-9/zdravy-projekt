import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, FileText, Loader2, Inbox, LockKeyhole, LockKeyholeOpen, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { useScrollToHashRow } from "../../lib/scrollToHashRow";
import ConfirmationModal from "../client/components/ui/ConfirmationModal";
import { PageHead, Button, Card, Badge, Empty, Modal, Toggle, Checkbox } from "./ui";
import GramageTable, { type TableSpec, type SpecSection, type SpecVydaj } from "./GramageTable";
import {
  prevWeekday,
  nextWeekday,
  dashboardMaxDate,
  dashboardDefaultDate,
  toDateString,
  isWeekday,
  formatDay as formatDate,
} from "../../lib/businessDay";

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
  diet_base_colors?: string[];
  count: number;
  col_grams: string[][];
}

interface DietSummaryRow {
  name: string;
  color?: string;
  base_colors?: string[];
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

// Hotový popis tabuľky z backendu. Obrazovka aj PDF ho renderujú z rovnakého
// spec-u, takže sa nemajú ako rozísť — všetky rozhodnutia o poradí riadkov,
// textoch, číslach a triedach padli v gramage_table_spec.py.

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
  diet_base_colors?: Record<string, string[]>;
  spec: TableSpec;
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
  // Riadok je na objednávku, nie na používateľa — EduPage prevádzky zdieľajú
  // jeden systémový login, takže `user_id` nie je unikátne.
  order_id: number;
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

interface ClosedDayResponse {
  date: string;
  is_closed: boolean;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  // Od 12:00 sa odomkne aj zajtrajšok — British School sa scrapuje o 12:15
  // deň vopred, tak jej riadok potrebuje byť vidno ešte pred tým (#535).
  const maxDate = useMemo(() => dashboardMaxDate(), []);
  const actualToday = useMemo(() => toDateString(new Date()), []);
  const [date, setDate] = useState(() => dashboardDefaultDate());
  const [data, setData] = useState<GramageDashboard | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closedLoading, setClosedLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const closedRequestId = useRef(0);
  const [sections, setSections] = useState<string[]>([]);
  // Prázdny výber = všetky výdajné body; inak môže byť vybratých aj viac
  // (napr. Cluster A + B naraz).
  const [selectedVydaje, setSelectedVydaje] = useState<string[]>([]);
  // "Nastavenia tabuľky" (2.9.2026) — predtým voľné filtre nad tabuľkou,
  // teraz v samostatnom modáli, nech tabuľka dostane celú výšku.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Prázdne trasy (bez objednávok) sa defaultne UKAZUJÚ — inak to vyzerá,
  // akoby trasa vôbec neexistovala, nie že len nemá dáta.
  const [showEmpty, setShowEmpty] = useState(true);
  const [clusterSummary, setClusterSummary] = useState(true);
  // Prázdny výber = diéty vo všetkých zobrazených clustroch (rovnaký "prázdne
  // = všetko" princíp ako sections/selectedVydaje).
  const [dietClusters, setDietClusters] = useState<string[]>([]);
  // "Rozbaliť všetko" — namiesto zbaleného per-klienta riadku ukáže rovno
  // rozbalený PDF-formát (bez opakovaného medzisúčtu) priamo na obrazovke.
  const [expanded, setExpanded] = useState(false);

  // Ktoré sekcie (raňajky / polievka / menu / olovrant), výdajné body a
  // ostatné "Nastavenia tabuľky" sa zobrazujú. Prázdny výber = kompletná
  // tabuľka. Rovnaký filter dostane obrazovka aj PDF, takže vytlačíš presne
  // to, čo vidíš.
  const sectionQuery = useMemo(() => {
    const parts = [
      ...sections.map((key) => `&section=${encodeURIComponent(key)}`),
      ...selectedVydaje.map((key) => `&vydaj=${encodeURIComponent(key)}`),
      ...dietClusters.map((key) => `&diet_cluster=${encodeURIComponent(key)}`),
    ];
    if (!showEmpty) parts.push("&show_empty=0");
    if (!clusterSummary) parts.push("&cluster_summary=0");
    if (expanded) parts.push("&expanded=1");
    return parts.join("");
  }, [sections, selectedVydaje, dietClusters, showEmpty, clusterSummary, expanded]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    setOrderReport(null);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}${sectionQuery}`);
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
  }, [apiFetch, date, sectionQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchClosedState = useCallback(async () => {
    const requestId = ++closedRequestId.current;
    setClosedLoading(true);
    try {
      const res = await apiFetch(`${API}/admin/closed-days/?date=${date}`);
      if (!res.ok) throw new Error("closed-day status failed");
      const payload = await res.json() as ClosedDayResponse;
      if (requestId === closedRequestId.current) setIsClosed(payload.is_closed);
    } catch (e) {
      logger.error(e);
      if (requestId === closedRequestId.current) {
        setIsClosed(false);
        toastError("Nepodarilo sa overiť, či je deň uzavretý.");
      }
    } finally {
      if (requestId === closedRequestId.current) setClosedLoading(false);
    }
  }, [apiFetch, date, toastError]);

  useEffect(() => {
    void fetchClosedState();
  }, [fetchClosedState]);

  const handleExport = useCallback(async (fmt: "pdf", setFmt: (v: boolean) => void) => {
    setFmt(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard-${fmt}/?date=${date}${sectionQuery}`);
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
  }, [apiFetch, date, sectionQuery, toastError]);

  const submitClosedDayAction = useCallback(
    async (
      method: "POST" | "DELETE",
      url: string,
      setPending: (pending: boolean) => void,
      nextIsClosed: boolean,
      successMsg: string,
      genericFailMsg: string,
      failMarker: string,
    ) => {
      setPending(true);
      try {
        const res = await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || failMarker);
        }
        setIsClosed(nextIsClosed);
        toastSuccess(successMsg);
      } catch (e) {
        logger.error(e);
        toastError(e instanceof Error && e.message !== failMarker ? e.message : genericFailMsg);
        await fetchClosedState();
      } finally {
        setPending(false);
      }
    },
    [apiFetch, date, fetchClosedState, toastError, toastSuccess],
  );

  const handleCloseDay = useCallback(
    () => submitClosedDayAction(
      "POST",
      `${API}/admin/closed-days/`,
      setClosing,
      true,
      "Deň bol uzavretý.",
      "Deň sa nepodarilo uzavrieť.",
      "close failed",
    ),
    [submitClosedDayAction],
  );

  const handleUnlockDay = useCallback(
    () => submitClosedDayAction(
      "DELETE",
      `${API}/admin/closed-days/unlock/`,
      setUnlocking,
      false,
      "Deň bol odomknutý.",
      "Deň sa nepodarilo odomknúť.",
      "unlock failed",
    ),
    [submitClosedDayAction],
  );

  const isAtMax = date >= maxDate;
  // Tabuľka žije zo spec-u, takže sa aj jej prázdnosť posudzuje podľa neho.
  const hasData = Boolean(
    data && (data.spec.rows.length > 0 || data.spec.header.groups.length > 0),
  );
  const hasOrderCounts = Boolean(orderReport?.rows.some((row) => row.total > 0));

  useScrollToHashRow(hasData);

  return (
    <>
      <PageHead
        eyebrow="Tabuľka"
        title="Gramáž jedál"
        titleExtra={
          // Dátumový prepínač — vpravo od nadpisu, kompaktne, nech tabuľka
          // dole dostane čo najviac výšky (nie je to vlastný riadok pod ním).
          <Card className="zpa-datenav-card">
            <div className="zpa-datenav zpa-datenav--compact">
              <button
                className="zpa-navchip"
                onClick={() => setDate(prevWeekday(date))}
                disabled={closing || unlocking}
                aria-label="Predchádzajúci deň"
                title="Predchádzajúci deň"
              >
                <ChevronLeft />
              </button>
              <div className="mid">
                <input
                  type="date" value={date} max={maxDate}
                  disabled={closing || unlocking}
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
                {date === maxDate && date !== actualToday && date > actualToday && (
                  <Badge tone="orange">Zajtra</Badge>
                )}
                {date === maxDate && date !== actualToday && date < actualToday && (
                  <Badge tone="gray">Posledný pracovný deň</Badge>
                )}
              </div>
              <button
                className="zpa-navchip"
                onClick={() => { const n = nextWeekday(date); if (n <= maxDate) setDate(n); }}
                disabled={isAtMax || closing || unlocking}
                aria-label="Nasledujúci deň"
                title="Nasledujúci deň"
              >
                <ChevronRight />
              </button>
            </div>
          </Card>
        }
        desc={<span style={{ textTransform: "capitalize" }}>{formatDate(date)}</span>}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(true)} disabled={!hasData}>
              <SlidersHorizontal /> Nastavenia tabuľky
            </Button>
            <Button variant="danger" onClick={() => handleExport("pdf", setPdfLoading)} disabled={pdfLoading || loading || !hasData}>
              {pdfLoading ? <Loader2 className="zpa-spin" /> : <FileText />} Stiahnuť PDF
            </Button>
            {!closedLoading && !isClosed && (
              <Button variant="secondary" onClick={() => setCloseConfirmOpen(true)} disabled={closing}>
                {closing ? <Loader2 className="zpa-spin" /> : <LockKeyhole />} Uzamknúť
              </Button>
            )}
            {!closedLoading && isClosed && (
              <>
                <span role="status" style={{ color: "var(--green-700)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  <Check style={{ width: 16, verticalAlign: "middle", marginRight: 5 }} />
                  Deň je uzavretý
                </span>
                <Button variant="secondary" onClick={() => setUnlockConfirmOpen(true)} disabled={unlocking}>
                  {unlocking ? <Loader2 className="zpa-spin" /> : <LockKeyholeOpen />} Odomknúť
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="zpa-stack">
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

        {!loading && data && hasData && (
          <div className="zpa-gram-fill">
            <GramageTable spec={data.spec} fill onClientNameClick={(id) => navigate(`/admin/facilities/${id}`)} />
          </div>
        )}
        {!loading && data && !hasData && hasOrderCounts && orderReport && (
          <OrderCountsTable report={orderReport} />
        )}
      </div>

      <ConfirmationModal
        isOpen={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => void handleCloseDay()}
        title="Uzamknúť objednávky na tento deň?"
        description="Po uzamknutí už nebude možné upravovať objednávky pre tento deň. Prípadné odomknutie bude vyžadovať samostatné potvrdenie."
        confirmText="Uzamknúť"
        variant="warning"
      />
      <ConfirmationModal
        isOpen={unlockConfirmOpen}
        onClose={() => setUnlockConfirmOpen(false)}
        onConfirm={() => void handleUnlockDay()}
        title="Odomknúť objednávky na tento deň?"
        description="Odomknutím sa deň znova otvorí na úpravy objednávok, diét a ďalších údajov."
        confirmText="Odomknúť"
        variant="warning"
      />

      {settingsOpen && data && (
        <TableSettingsModal
          sections={data.spec.sections}
          vydaje={data.spec.vydaje ?? []}
          dietClusters={dietClusters}
          showEmpty={showEmpty}
          clusterSummary={clusterSummary}
          expanded={expanded}
          onToggleSection={(key) =>
            setSections((current) =>
              toggleSelection(current, key, data.spec.sections.map((section) => section.key)),
            )
          }
          onToggleVydaj={(key) =>
            setSelectedVydaje((current) =>
              toggleSelection(current, key, (data.spec.vydaje ?? []).map((v) => v.key)),
            )
          }
          onToggleDietCluster={(key) =>
            setDietClusters((current) =>
              toggleSelection(current, key, (data.spec.vydaje ?? []).map((v) => v.key)),
            )
          }
          onShowEmptyChange={setShowEmpty}
          onClusterSummaryChange={setClusterSummary}
          onExpandedChange={setExpanded}
          onReset={() => {
            setSections([]);
            setSelectedVydaje([]);
            setDietClusters([]);
            setShowEmpty(true);
            setClusterSummary(true);
            setExpanded(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
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
              <tr key={row.order_id}>
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

// ── Filter zobrazenia a tlače ────────────────────────────────────────────────
// Rovnaký výber ide na obrazovku aj do PDF — čo vidíš, to vytlačíš.

/**
 * Prepnutie jednej položky vo filtri. Prázdny výber znamená „všetko", takže
 * prvé odkliknutie musí vychádzať zo skutočne zobrazených položiek, nie z
 * prázdna; a keď sú nakoniec vybraté všetky, vraciame sa na prázdno.
 */
const toggleSelection = (current: string[], value: string, all: string[]): string[] => {
  const base = current.length ? current : all;
  const next = base.includes(value) ? base.filter((item) => item !== value) : [...base, value];
  return next.length === all.length ? [] : next;
};

/**
 * Všetky filtre a nastavenia tabuľky "Gramáž jedál" v jednom modáli (2.9.2026)
 * — predtým voľne nad tabuľkou (dva riadky chipov/dropdown), teraz tu, nech
 * tabuľka dostane celú výšku obrazovky. Rovnaký výber ide na obrazovku aj do
 * PDF — čo vidíš, to vytlačíš.
 */
const TableSettingsModal: React.FC<{
  sections: SpecSection[];
  vydaje: SpecVydaj[];
  dietClusters: string[];
  showEmpty: boolean;
  clusterSummary: boolean;
  expanded: boolean;
  onToggleSection: (key: string) => void;
  onToggleVydaj: (key: string) => void;
  onToggleDietCluster: (key: string) => void;
  onShowEmptyChange: (v: boolean) => void;
  onClusterSummaryChange: (v: boolean) => void;
  onExpandedChange: (v: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}> = ({
  sections,
  vydaje,
  dietClusters,
  showEmpty,
  clusterSummary,
  expanded,
  onToggleSection,
  onToggleVydaj,
  onToggleDietCluster,
  onShowEmptyChange,
  onClusterSummaryChange,
  onExpandedChange,
  onReset,
  onClose,
}) => {
  const dietClusterOn = (key: string) => dietClusters.length === 0 || dietClusters.includes(key);
  return (
    <Modal
      title="Nastavenia tabuľky"
      onClose={onClose}
      icon={<SlidersHorizontal />}
      foot={
        <>
          <Button variant="ghost" onClick={onReset}>Obnoviť predvolené</Button>
          <Button variant="primary" onClick={onClose}>Hotovo</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div className="zpa-settings-lbl">Jedlá</div>
          <div className="zpa-section-filter">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`chip${section.selected ? " on" : ""}`}
                aria-pressed={section.selected}
                onClick={() => onToggleSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {vydaje.length > 1 && (
          <div>
            <div className="zpa-settings-lbl">Cluster</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vydaje.map((v) => (
                <Checkbox key={v.key} on={v.selected} onChange={() => onToggleVydaj(v.key)}>
                  {v.name}
                </Checkbox>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Zobraziť prázdne trasy</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Trasy bez objednávok sa ukážu, nie skryjú.</div>
          </div>
          <Toggle on={showEmpty} onChange={onShowEmptyChange} ariaLabel="Zobraziť prázdne trasy" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Zobraziť sumáre klastrov</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Pásy „SUMÁR CLUSTER ... S DIÉTAMI MŠ".</div>
          </div>
          <Toggle on={clusterSummary} onChange={onClusterSummaryChange} ariaLabel="Zobraziť sumáre klastrov" />
        </div>

        {clusterSummary && vydaje.length > 1 && (
          <div>
            <div className="zpa-settings-lbl">Diéty v sumári klastra</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vydaje.map((v) => (
                <Checkbox key={v.key} on={dietClusterOn(v.key)} onChange={() => onToggleDietCluster(v.key)}>
                  {v.name}
                </Checkbox>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Zobraziť všetko rozbalené</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Formát ako v PDF — bez zbaleného medzisúčtu za klienta.</div>
          </div>
          <Toggle on={expanded} onChange={onExpandedChange} ariaLabel="Zobraziť všetko rozbalené" />
        </div>
      </div>
    </Modal>
  );
};

// ── GramageTable ──────────────────────────────────────────────────────────────

export default AdminDashboard;
