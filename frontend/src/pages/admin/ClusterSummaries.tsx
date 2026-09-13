import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";
import { dashboardDefaultDate, dashboardMaxDate } from "../../lib/businessDay";
import GramageTable, { type TableSpec } from "./GramageTable";
import ClusterSummaryChart from "./ClusterSummaryChart";
import { AdminDateNav, Button, Card, Empty, PageHead } from "./ui";

const API = import.meta.env.VITE_API_URL || "/api";

type Meal = "breakfast" | "lunch" | "olovrant";

const MEALS: Array<{ key: Meal; label: string }> = [
  { key: "breakfast", label: "Raňajky" },
  { key: "lunch", label: "Obed" },
  { key: "olovrant", label: "Olovrant" },
];

interface SummaryResponse {
  date: string;
  meals: Meal[];
  spec: TableSpec;
}

/**
 * Tlačové súhrny sú úmyselne samostatná obrazovka od hlavnej tabuľky.
 * Všetky zvolené jedlá sa tu radia podľa obedového clustra, kým dashboard
 * naďalej používa vlastné trasy pre raňajky, obed a olovrant.
 */
const ClusterSummaries: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError } = useToast();
  const maxDate = useMemo(() => dashboardMaxDate(), []);
  const [date, setDate] = useState(() => dashboardDefaultDate());
  const [meals, setMeals] = useState<Meal[]>(() => MEALS.map(({ key }) => key));
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ date });
    meals.forEach((meal) => params.append("meal", meal));
    return params.toString();
  }, [date, meals]);

  const fetchPreview = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/cluster-summary/?${query}`);
      if (!res.ok) throw new Error("summary preview failed");
      const payload = await res.json() as SummaryResponse;
      if (id === requestId.current) setData(payload);
    } catch (err) {
      logger.error(err);
      if (id === requestId.current) {
        setData(null);
        setError("Nepodarilo sa načítať sumáre. Skúste stránku obnoviť.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [apiFetch, query]);

  useEffect(() => { void fetchPreview(); }, [fetchPreview]);

  const toggleMeal = (meal: Meal) => {
    setMeals((selected) => {
      if (selected.includes(meal)) {
        // Bez jedla nemá požiadavka význam; zároveň sa tak nikdy nepošle
        // nejednoznačný prázdny parameter, ktorý backend správne chápe ako všetko.
        return selected.length === 1 ? selected : selected.filter((key) => key !== meal);
      }
      return MEALS.map(({ key }) => key).filter((key) => selected.includes(key) || key === meal);
    });
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-plans/cluster-summary-pdf/?${query}`);
      if (!res.ok) throw new Error("summary PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `sumare_${meals.join("-")}_${date}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Safari can start the download asynchronously after the click.  Keep
      // the object URL alive until that navigation has been picked up.
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri generovaní PDF sumárov.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Sumáre"
        desc="Raňajky a olovrant sú v sumári priradené ku clusteru obeda."
        actions={
          <Button onClick={() => void downloadPdf()} disabled={pdfLoading || loading} allowReadOnly>
            {pdfLoading ? <Loader2 size={16} className="zpa-spin" /> : <Download size={16} />}
            Stiahnuť PDF
          </Button>
        }
      />
      <ClusterSummaryChart />

      <div className="zpa-summary-day-head">
        <div><h3>Sumár vybraného dňa</h3><p>Tento dátum mení iba tabuľku a PDF nižšie, nie graf.</p></div>
      </div>
      <div className="zpa-toolbar" style={{ marginBottom: 16 }}>
        <div className="zpa-toolbar-left">
          <AdminDateNav date={date} onChange={setDate} maxDate={maxDate} disabled={loading} compact />
          <div role="group" aria-label="Vybrané jedlá" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MEALS.map(({ key, label }) => (
              <label key={key} className={`zpa-check${meals.includes(key) ? " on" : ""}`} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={meals.includes(key)}
                  onChange={() => toggleMeal(key)}
                  aria-label={label}
                  style={{ position: "absolute", opacity: 0 }}
                />
                <span className="box" aria-hidden="true">{meals.includes(key) && <Check />}</span>
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {loading && !data && <Card pad><div className="zpa-empty"><Loader2 className="zpa-spin" /> Načítavam sumáre…</div></Card>}
      {error && <Empty>Sumáre sa nepodarilo načítať: {error}</Empty>}
      {data && <GramageTable spec={data.spec} alwaysExpanded />}
    </>
  );
};

export default ClusterSummaries;
