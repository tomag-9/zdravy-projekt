import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

const LUNCH_VARIANTS = ["A", "B", "C", "V"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealTemplate {
  id: number;
  category: string;
  name: string;
  weight_label: string;
  base_weight_grams: string;
  menu_variant: string;
}

interface DraftItem {
  templateId: number;
  category: string;
  menuVariant: string;
}

interface MealPlanDraft {
  notes: string;
  items: DraftItem[];
}

interface MealPlanResponseItem {
  template: number;
  category: string;
  menu_variant: string;
}

interface MealPlanResponse {
  exists?: boolean;
  id: number;
  notes?: string;
  items?: MealPlanResponseItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const MealPlanEditor: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { success, error } = useToast();

  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [draft, setDraft] = useState<MealPlanDraft>({ notes: "", items: [] });
  const [planId, setPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, planRes] = await Promise.all([
        apiFetch(`${API}/admin/meal-templates/`),
        apiFetch(`${API}/admin/meal-plans/by-date/?date=${date}`),
      ]);

      if (!tplRes.ok) {
        error("Nepodarilo sa načítať šablóny jedál.");
      } else {
        const d = await tplRes.json();
        setTemplates(Array.isArray(d) ? d : d.results || []);
      }

      if (planRes.ok) {
        const plan: MealPlanResponse = await planRes.json();
        if (plan.exists === false) {
          setPlanId(null);
          setDraft({ notes: "", items: [] });
        } else {
          setPlanId(plan.id);
          setDraft({
            notes: plan.notes || "",
            items: (plan.items || []).map((i) => ({
              templateId: i.template,
              category: i.category,
              menuVariant: i.menu_variant,
            })),
          });
        }
      } else {
        error("Nepodarilo sa načítať jedálniček pre zvolený deň.");
      }
    } catch (e) {
      error("Nepodarilo sa pripojiť k API pre jedálniček.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, date, error]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const templatesByCategory = useMemo(() => {
    const map: Record<string, MealTemplate[]> = { breakfast: [], lunch: [], snack: [] };
    for (const t of templates) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [templates]);

  const lunchVariantsInDraft = useMemo(
    () =>
      [...new Set(draft.items.filter((i) => i.category === "lunch").map((i) => i.menuVariant))].sort(),
    [draft.items]
  );

  const getItemForSlot = (category: string, variant = "") =>
    draft.items.find((i) => i.category === category && i.menuVariant === variant);

  const setTemplateForSlot = (category: string, variant: string, templateId: number | null) => {
    setDraft((prev) => {
      const withoutSlot = prev.items.filter(
        (i) => !(i.category === category && i.menuVariant === variant)
      );
      if (templateId === null) return { ...prev, items: withoutSlot };
      return { ...prev, items: [...withoutSlot, { templateId, category, menuVariant: variant }] };
    });
  };

  const addLunchVariant = () => {
    const existing = new Set(lunchVariantsInDraft);
    const next = LUNCH_VARIANTS.find((v) => !existing.has(v));
    if (!next) return;
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { templateId: 0, category: "lunch", menuVariant: next }],
    }));
  };

  const removeLunchVariant = (variant: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((i) => !(i.category === "lunch" && i.menuVariant === variant)),
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      date,
      notes: draft.notes,
      items_write: draft.items
        .filter((i) => i.templateId > 0)
        .map((i) => ({ template_id: i.templateId, menu_variant: i.menuVariant })),
    };
    try {
      const url = planId
        ? `${API}/admin/meal-plans/${planId}/`
        : `${API}/admin/meal-plans/`;
      const res = await apiFetch(url, {
        method: planId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setPlanId(saved.id);
        success("Jedálniček uložený");
      } else {
        const data = await res.json().catch(() => ({}));
        error(data?.detail || "Nepodarilo sa uložiť");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/meal-plan")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            ← Späť
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Jedálniček — {date}</h2>
            <p className="text-gray-500 mt-0.5">
              {planId ? "Upraviť existujúci plán" : "Vytvoriť nový plán"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition font-medium"
        >
          {saving ? "Ukladám…" : "Uložiť"}
        </button>
      </div>

      {/* Planning */}
      <div className="space-y-4 max-w-2xl">
        {/* Breakfast */}
        <MealSection
          label="Raňajky"
          templates={templatesByCategory.breakfast || []}
          selectedItem={getItemForSlot("breakfast")}
          onSelect={(id) => setTemplateForSlot("breakfast", "", id)}
        />

        {/* Lunch variants */}
        {lunchVariantsInDraft.map((variant) => (
          <MealSection
            key={variant}
            label={`Obed — Menu ${variant}`}
            templates={templatesByCategory.lunch || []}
            selectedItem={getItemForSlot("lunch", variant)}
            onSelect={(id) => setTemplateForSlot("lunch", variant, id)}
            onRemove={() => removeLunchVariant(variant)}
          />
        ))}

        {lunchVariantsInDraft.length < LUNCH_VARIANTS.length && (
          <button
            onClick={addLunchVariant}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-teal-300 hover:text-teal-600 transition text-sm"
          >
            + Pridať variant obeda (A / B / C / V)
          </button>
        )}

        {/* Snack */}
        <MealSection
          label="Olovrant"
          templates={templatesByCategory.snack || []}
          selectedItem={getItemForSlot("snack")}
          onSelect={(id) => setTemplateForSlot("snack", "", id)}
        />

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Voliteľné poznámky k jedálničku"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// ── MealSection ───────────────────────────────────────────────────────────────

interface MealSectionProps {
  label: string;
  templates: MealTemplate[];
  selectedItem?: { templateId: number; category: string; menuVariant: string };
  onSelect: (id: number | null) => void;
  onRemove?: () => void;
}

const MealSection: React.FC<MealSectionProps> = ({
  label, templates, selectedItem, onSelect, onRemove
}) => {
  const selectedTemplate = templates.find((t) => t.id === selectedItem?.templateId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 transition"
          >
            Odstrániť variant
          </button>
        )}
      </div>
      <select
        value={selectedItem?.templateId ?? ""}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
      >
        <option value="">— Vybrať šablónu —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {selectedTemplate && (
        <p className="mt-2 text-xs text-gray-400 font-mono">
          Rozloženie: {selectedTemplate.weight_label}
        </p>
      )}
    </div>
  );
};

export default MealPlanEditor;
