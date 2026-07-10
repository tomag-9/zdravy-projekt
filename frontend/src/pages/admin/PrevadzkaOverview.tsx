import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";

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

const StatusBadge: React.FC<{ row: OverviewRow }> = ({ row }) => {
  if (!row.delivered) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600"
        title="Prevádzka zatiaľ nedodala podklady"
      >
        ✕
      </span>
    );
  }
  if (row.has_warning) {
    const notes = [...row.flags.config_notes, ...row.flags.attention].join("\n");
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600"
        title={`Dodané, ale skontroluj:\n${notes}`}
      >
        !
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600"
      title="Podklady dodané"
    >
      ✓
    </span>
  );
};

const MealCount: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex flex-col items-center min-w-[2.5rem]">
    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
    <span className={`text-sm font-semibold ${value > 0 ? "text-gray-800" : "text-gray-300"}`}>
      {value}
    </span>
  </div>
);

const OverviewRowItem: React.FC<{ row: OverviewRow }> = ({ row }) => {
  const showCelok = row.celok && row.celok !== row.nazov;
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors">
      <StatusBadge row={row} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 truncate">{row.nazov}</div>
        {showCelok && <div className="text-xs text-gray-400 truncate">{row.celok}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MealCount label="R" value={row.counts.breakfast} />
        <MealCount label="Ob" value={row.counts.lunch} />
        <MealCount label="Ol" value={row.counts.olovrant} />
        <div className="w-px h-8 bg-gray-100 mx-1" />
        <div className="flex flex-col items-center min-w-[2.5rem]">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Spolu</span>
          <span className="text-sm font-bold text-gray-900">{row.counts.total}</span>
        </div>
      </div>
    </div>
  );
};

// ── Category card ─────────────────────────────────────────────────────────────

const CategoryCard: React.FC<{
  title: string;
  icon: string;
  accent: string;
  rows: OverviewRow[];
}> = ({ title, icon, accent, rows }) => {
  const delivered = rows.filter((r) => r.delivered).length;
  const warnings = rows.filter((r) => r.delivered && r.has_warning).length;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${accent}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            {delivered}/{rows.length} dodané
          </span>
          {warnings > 0 && (
            <span className="text-amber-600 font-semibold">{warnings} ⚠️</span>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">Žiadne prevádzky.</div>
      ) : (
        <div>
          {rows.map((row) => (
            <OverviewRowItem key={row.prevadzka_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const PrevadzkaOverview: React.FC = () => {
  const { apiFetch } = useAuth();
  const { error: toastError } = useToast();
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dodanie podkladov</h1>
          <p className="text-sm text-gray-500">
            Prehľad, ktoré prevádzky za daný deň dodali objednávky.
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Načítavam…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryCard
            title="EduPage prevádzky"
            icon="📤"
            accent="bg-indigo-50/60"
            rows={data?.edupage ?? []}
          />
          <CategoryCard
            title="App prevádzky"
            icon="📱"
            accent="bg-teal-50/60"
            rows={data?.app ?? []}
          />
        </div>
      )}
    </div>
  );
};

export default PrevadzkaOverview;
