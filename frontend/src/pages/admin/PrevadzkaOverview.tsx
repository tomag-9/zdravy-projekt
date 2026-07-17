import React, { useCallback, useEffect, useState } from "react";
import { Check, AlertTriangle, X, Upload, Smartphone, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";
import { PageHead, Button, Card, Input } from "./ui";

const API = import.meta.env.VITE_API_URL || "/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewCounts {
  breakfast: number;
  lunch: number;
  olovrant: number;
  total: number;
}

interface OverviewRow {
  prevadzka_id: number;
  nazov: string;
  celok: string;
  delivered: boolean;
  delivery_status?: "missing" | "manual_zero" | "auto" | "manual";
  counts: OverviewCounts;
  flags: { attention: string[]; config_notes: string[] };
  has_warning: boolean;
}

interface OverviewResponse {
  date: string;
  edupage: OverviewRow[];
  app: OverviewRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ── Row ───────────────────────────────────────────────────────────────────────

const StatusDot: React.FC<{ row: OverviewRow; source: "edupage" | "app" }> = ({ row, source }) => {
  if (source === "app") {
    if (row.delivery_status === "manual_zero") {
      return (
        <span className="zpa-statusdot zero" title="Manuálne odoslaná nulová objednávka">
          0
        </span>
      );
    }
    if (row.delivery_status === "auto") {
      return (
        <span className="zpa-statusdot warn" title="Automaticky skopírované z predchádzajúceho dňa">
          <AlertTriangle />
        </span>
      );
    }
    if (row.delivery_status === "manual") {
      return (
        <span className="zpa-statusdot ok" title="Manuálne zadané">
          <Check />
        </span>
      );
    }
  }

  if (!row.delivered) {
    return (
      <span className="zpa-statusdot err" title="Zatiaľ nedošlo nič">
        <X />
      </span>
    );
  }
  if (row.has_warning) {
    const notes = [...row.flags.config_notes, ...row.flags.attention].join("\n");
    return (
      <span className="zpa-statusdot warn" title={`Dodané, ale skontroluj:\n${notes}`}>
        <AlertTriangle />
      </span>
    );
  }
  return (
    <span className="zpa-statusdot ok" title="Podklady dodané">
      <Check />
    </span>
  );
};

const MealCount: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="zpa-mealcount">
    <span className="k">{label}</span>
    <span className={`v${value > 0 || strong ? " on" : ""}${strong ? " strong" : ""}`}>{value}</span>
  </div>
);

const OverviewRowItem: React.FC<{ row: OverviewRow; source: "edupage" | "app" }> = ({ row, source }) => {
  const showCelok = row.celok && row.celok !== row.nazov;
  return (
    <div className="zpa-ovrow">
      <StatusDot row={row} source={source} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="nm">{row.nazov}</div>
        {showCelok && <div className="sub">{row.celok}</div>}
      </div>
      <div className="zpa-ovcounts">
        <MealCount label="R" value={row.counts.breakfast} />
        <MealCount label="Ob" value={row.counts.lunch} />
        <MealCount label="Ol" value={row.counts.olovrant} />
        <div className="sep" />
        <MealCount label="Spolu" value={row.counts.total} strong />
      </div>
    </div>
  );
};

// ── Category card ─────────────────────────────────────────────────────────────

const CategoryCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  rows: OverviewRow[];
  source: "edupage" | "app";
}> = ({ title, icon, rows, source }) => {
  const delivered = rows.filter((r) => r.delivered).length;
  const warnings = rows.filter((r) => r.delivered && (r.has_warning || r.delivery_status === "auto")).length;
  return (
    <Card style={{ overflow: "hidden" }}>
      <div className="zpa-card-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--green-600)", display: "inline-flex" }}>{icon}</span>
          <h3>{title}</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{ color: "var(--ink-3)" }}>{delivered}/{rows.length} dodané</span>
          {warnings > 0 && <span style={{ color: "var(--mustard-700)", fontWeight: 700 }}>{warnings} na kontrolu</span>}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="zpa-empty" style={{ padding: "28px 20px" }}>Žiadne prevádzky.</div>
      ) : (
        <div>
          {rows.map((row) => (
            <OverviewRowItem key={row.prevadzka_id} row={row} source={source} />
          ))}
        </div>
      )}
    </Card>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const PrevadzkaOverview: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError } = useToast();
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExport = useCallback(
    async (fmt: "xlsx" | "pdf", setFmt: (v: boolean) => void) => {
      setFmt(true);
      try {
        const res = await apiFetch(
          `${API}/admin/summary/prevadzka-overview-${fmt}/?date=${date}`,
        );
        if (!res.ok) {
          toastError("Chyba pri generovaní súboru.");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dodanie_podkladov_${date}.${fmt}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        logger.error(e);
        toastError("Chyba pri generovaní súboru.");
      } finally {
        setFmt(false);
      }
    },
    [apiFetch, date, toastError],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/admin/summary/prevadzka-overview/?date=${date}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toastError("Nepodarilo sa načítať prehľad prevádzok.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Nepodarilo sa načítať prehľad prevádzok.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, date, toastError]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <>
      <PageHead
        eyebrow="Prevádzky"
        title="Dodanie podkladov"
        desc="Prehľad, ktoré prevádzky za daný deň dodali objednávky."
        actions={
          <>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
            <Button variant="danger" onClick={() => handleExport("pdf", setPdfLoading)} disabled={pdfLoading || loading || !data}>
              {pdfLoading ? <Loader2 className="zpa-spin" /> : <FileText />} PDF
            </Button>
            <Button variant="primary" onClick={() => handleExport("xlsx", setXlsxLoading)} disabled={xlsxLoading || loading || !data}>
              {xlsxLoading ? <Loader2 className="zpa-spin" /> : <FileSpreadsheet />} XLSX
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="zpa-empty">Načítavam…</div>
      ) : (
        <div className="zpa-grid-2">
          <CategoryCard title="EduPage prevádzky" icon={<Upload />} rows={data?.edupage ?? []} source="edupage" />
          <CategoryCard title="App prevádzky" icon={<Smartphone />} rows={data?.app ?? []} source="app" />
        </div>
      )}
    </>
  );
};

export default PrevadzkaOverview;
