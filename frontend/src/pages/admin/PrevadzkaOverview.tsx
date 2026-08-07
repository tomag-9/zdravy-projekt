import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, AlertTriangle, X, Upload, Smartphone, FileText, FileSpreadsheet, Loader2, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";
import ConfirmationModal from "../client/components/ui/ConfirmationModal";
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

interface ClosedDayResponse {
  date: string;
  is_closed: boolean;
}

interface ReportTaskResponse {
  task_id: string;
  status: "pending" | "processing" | "complete" | "failed";
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
  const { error: toastError, success: toastSuccess } = useToast();
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closedLoading, setClosedLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [reportLoading, setReportLoading] = useState<"pdf" | "xlsx" | null>(null);
  const closedRequestId = useRef(0);

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

  const handleCloseDay = useCallback(async () => {
    setClosing(true);
    try {
      const res = await apiFetch(`${API}/admin/closed-days/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "close failed");
      }
      setIsClosed(true);
      toastSuccess("Deň bol uzavretý.");
    } catch (e) {
      logger.error(e);
      toastError(e instanceof Error && e.message !== "close failed" ? e.message : "Deň sa nepodarilo uzavrieť.");
      await fetchClosedState();
    } finally {
      setClosing(false);
    }
  }, [apiFetch, date, fetchClosedState, toastError, toastSuccess]);

  const handleUnlockDay = useCallback(async () => {
    setUnlocking(true);
    try {
      const res = await apiFetch(`${API}/admin/closed-days/unlock/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "unlock failed");
      }
      setIsClosed(false);
      toastSuccess("Deň bol odomknutý.");
    } catch (e) {
      logger.error(e);
      toastError(e instanceof Error && e.message !== "unlock failed" ? e.message : "Deň sa nepodarilo odomknúť.");
      await fetchClosedState();
    } finally {
      setUnlocking(false);
    }
  }, [apiFetch, date, fetchClosedState, toastError, toastSuccess]);

  const handleClosedDayExport = useCallback(async (fmt: "pdf" | "xlsx") => {
    setReportLoading(fmt);
    try {
      const submit = await apiFetch(`${API}/admin/report-tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, format: fmt }),
      });
      if (!submit.ok) throw new Error("submit failed");
      const submitted = await submit.json() as ReportTaskResponse;

      let complete = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const statusRes = await apiFetch(`${API}/admin/report-tasks/${submitted.task_id}/`);
        if (!statusRes.ok) throw new Error("poll failed");
        const task = await statusRes.json() as ReportTaskResponse;
        if (task.status === "failed") throw new Error("task failed");
        if (task.status === "complete") {
          complete = true;
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!complete) throw new Error("task timeout");

      const download = await apiFetch(`${API}/admin/report-tasks/${submitted.task_id}/download/`);
      if (!download.ok) throw new Error("download failed");
      const blob = await download.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `denny_prehlad_objednavok_${date}.${fmt}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error(e);
      toastError("Denný prehľad sa nepodarilo vygenerovať.");
    } finally {
      setReportLoading(null);
    }
  }, [apiFetch, date, toastError]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchClosedState();
  }, [fetchClosedState]);

  return (
    <>
      <PageHead
        eyebrow="Prevádzky"
        title="Dodanie podkladov"
        desc="Prehľad, ktoré prevádzky za daný deň dodali objednávky."
        actions={
          <>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={closing || unlocking} style={{ width: "auto" }} />
            <Button variant="danger" onClick={() => handleExport("pdf", setPdfLoading)} disabled={pdfLoading || loading || !data}>
              {pdfLoading ? <Loader2 className="zpa-spin" /> : <FileText />} PDF
            </Button>
            <Button variant="primary" onClick={() => handleExport("xlsx", setXlsxLoading)} disabled={xlsxLoading || loading || !data}>
              {xlsxLoading ? <Loader2 className="zpa-spin" /> : <FileSpreadsheet />} XLSX
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
                <Button
                  variant="danger"
                  aria-label="PDF objednávok"
                  onClick={() => handleClosedDayExport("pdf")}
                  disabled={reportLoading !== null}
                >
                  {reportLoading === "pdf" ? <Loader2 className="zpa-spin" /> : <FileText />} PDF objednávok
                </Button>
                <Button
                  variant="primary"
                  aria-label="XLSX objednávok"
                  onClick={() => handleClosedDayExport("xlsx")}
                  disabled={reportLoading !== null}
                >
                  {reportLoading === "xlsx" ? <Loader2 className="zpa-spin" /> : <FileSpreadsheet />} XLSX objednávok
                </Button>
                <Button variant="secondary" onClick={() => setUnlockConfirmOpen(true)} disabled={unlocking}>
                  {unlocking ? <Loader2 className="zpa-spin" /> : <LockKeyholeOpen />} Odomknúť
                </Button>
              </>
            )}
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
    </>
  );
};

export default PrevadzkaOverview;
