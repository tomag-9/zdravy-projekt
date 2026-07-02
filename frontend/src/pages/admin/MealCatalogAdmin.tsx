import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

type MealCategory = "breakfast_snack" | "soup" | "main_course" | "afternoon_snack";

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast_snack: "Raňajky-desiata",
  soup: "Polievka",
  main_course: "Hlavný chod",
  afternoon_snack: "Olovrant",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as MealCategory[];

interface PortionType {
  id: number;
  name: string;
  coefficient: string;
  coefficient_pct: number;
  is_active: boolean;
}

interface Component {
  label: string;
  grams: string;
  unit: "g" | "ml" | "text";
}

interface UnitException {
  component_label: string;
  unit: string;
  counts_by_portion_type: Record<string, string>;
}

interface MealTemplate {
  id: number;
  category: MealCategory;
  name: string;
  weight_label: string;
  base_weight_grams: string;
  components: Component[];
  unit_exception: UnitException | null;
  is_active: boolean;
}

const emptyComponent = (): Component => ({ label: "", grams: "", unit: "g" });

const emptyNewTemplate = (category: MealCategory) => ({
  category,
  name: "",
  components: [emptyComponent()],
  hasException: false,
  exceptionLabel: "",
  exceptionUnit: "ks",
  exceptionCounts: {} as Record<string, string>,
});

const MealCatalogAdmin: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error } = useToast();

  const [portionTypes, setPortionTypes] = useState<PortionType[]>([]);
  const [coefficientDrafts, setCoefficientDrafts] = useState<Record<number, string>>({});
  const [savingPortionTypeId, setSavingPortionTypeId] = useState<number | null>(null);

  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCategory, setAddingCategory] = useState<MealCategory | null>(null);
  const [newTemplate, setNewTemplate] = useState(emptyNewTemplate("soup"));
  const [saving, setSaving] = useState(false);

  const fetchPortionTypes = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/admin/portion-types/`);
      if (res.ok) {
        const data = await res.json();
        const list: PortionType[] = Array.isArray(data) ? data : data.results || [];
        setPortionTypes(list);
        setCoefficientDrafts(
          Object.fromEntries(list.map((pt) => [pt.id, pt.coefficient_pct.toString()])),
        );
      }
    } catch (e) {
      logger.error(e);
    }
  }, [apiFetch]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-templates/`);
      if (res.ok) {
        const data = await res.json();
        const list: MealTemplate[] = Array.isArray(data) ? data : data.results || [];
        setTemplates(list);
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchPortionTypes();
    fetchTemplates();
  }, [fetchPortionTypes, fetchTemplates]);

  const saveCoefficient = async (pt: PortionType) => {
    const draft = coefficientDrafts[pt.id];
    const pct = Number(draft);
    if (!draft || Number.isNaN(pct) || pct <= 0) {
      error("Zadajte platné percento koeficientu (napr. 115 pre 115%)");
      return;
    }
    setSavingPortionTypeId(pt.id);
    try {
      const res = await apiFetch(`${API}/admin/portion-types/${pt.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coefficient: (pct / 100).toFixed(4) }),
      });
      if (res.ok) {
        success(`Koeficient pre "${pt.name}" bol uložený`);
        fetchPortionTypes();
      } else {
        error("Nepodarilo sa uložiť koeficient");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní koeficientu");
    } finally {
      setSavingPortionTypeId(null);
    }
  };

  const toggleTemplateActive = async (tpl: MealTemplate) => {
    try {
      const res = await apiFetch(`${API}/admin/meal-templates/${tpl.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tpl.is_active }),
      });
      if (res.ok) {
        fetchTemplates();
      } else {
        error("Nepodarilo sa zmeniť stav rozloženia");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní");
    }
  };

  const openAddForm = (category: MealCategory) => {
    setNewTemplate(emptyNewTemplate(category));
    setAddingCategory(category);
  };

  const updateComponent = (index: number, patch: Partial<Component>) => {
    setNewTemplate((t) => ({
      ...t,
      components: t.components.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };

  const addComponentRow = () => {
    setNewTemplate((t) => ({ ...t, components: [...t.components, emptyComponent()] }));
  };

  const removeComponentRow = (index: number) => {
    setNewTemplate((t) => ({
      ...t,
      components: t.components.filter((_, i) => i !== index),
    }));
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      error("Zadajte názov rozloženia");
      return;
    }
    const components = newTemplate.components
      .filter((c) => c.label.trim() && c.grams.trim())
      .map((c) => ({ label: c.label.trim(), grams: c.grams.trim(), unit: c.unit }));
    if (components.length === 0) {
      error("Pridajte aspoň jednu zložku s gramážou");
      return;
    }

    const body: Record<string, unknown> = {
      category: newTemplate.category,
      name: newTemplate.name.trim(),
      components,
    };
    if (newTemplate.hasException && newTemplate.exceptionLabel.trim()) {
      body.unit_exception = {
        component_label: newTemplate.exceptionLabel.trim(),
        unit: newTemplate.exceptionUnit.trim() || "ks",
        counts_by_portion_type: Object.fromEntries(
          portionTypes
            .map((pt) => [pt.name, newTemplate.exceptionCounts[pt.name]])
            .filter(([, count]) => count && String(count).trim()),
        ),
      };
    }

    setSaving(true);
    try {
      const res = await apiFetch(`${API}/admin/meal-templates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        success("Nové rozloženie bolo pridané do katalógu");
        setAddingCategory(null);
        fetchTemplates();
      } else {
        const payload = await res.json().catch(() => null);
        error(
          payload && typeof payload === "object"
            ? JSON.stringify(payload)
            : "Nepodarilo sa pridať rozloženie",
        );
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní rozloženia");
    } finally {
      setSaving(false);
    }
  };

  const templatesByCategory = (category: MealCategory) =>
    templates.filter((t) => t.category === category);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Katalóg jedál</h2>
        <p className="text-gray-500 mt-1">
          Spravujte koeficienty vekových skupín a pridávajte nové rozloženia do
          katalógu váh jedál.
        </p>
      </div>

      {/* Portion types / coefficients */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Typy porcií a koeficienty
        </h3>
        <div className="space-y-2">
          {portionTypes.map((pt) => (
            <div key={pt.id} className="flex items-center gap-3">
              <span className="w-40 text-sm font-medium text-gray-700">{pt.name}</span>
              <input
                type="number"
                step="1"
                min="1"
                value={coefficientDrafts[pt.id] ?? ""}
                onChange={(e) =>
                  setCoefficientDrafts((d) => ({ ...d, [pt.id]: e.target.value }))
                }
                className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => saveCoefficient(pt)}
                disabled={savingPortionTypeId === pt.id}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 transition disabled:opacity-50"
              >
                {savingPortionTypeId === pt.id ? "Ukladám…" : "Uložiť"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog templates by category */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        CATEGORIES.map((category) => (
          <div
            key={category}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {CATEGORY_LABELS[category]}
              </h3>
              <button
                onClick={() => openAddForm(category)}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 transition"
              >
                + Pridať nové rozloženie
              </button>
            </div>

            <div className="space-y-2">
              {templatesByCategory(category).map((tpl) => (
                <div
                  key={tpl.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                    tpl.is_active ? "border-gray-100" : "border-gray-100 opacity-50"
                  }`}
                >
                  <div>
                    <span className="font-medium text-gray-800">{tpl.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {tpl.weight_label}
                    </span>
                    {tpl.unit_exception && (
                      <span className="text-xs text-amber-600 ml-2">
                        (výnimka: {tpl.unit_exception.component_label})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleTemplateActive(tpl)}
                    className="text-sm px-3 py-1 rounded-md hover:bg-gray-50 transition text-gray-600"
                  >
                    {tpl.is_active ? "Deaktivovať" : "Aktivovať"}
                  </button>
                </div>
              ))}
              {templatesByCategory(category).length === 0 && (
                <p className="text-sm text-gray-400">Žiadne rozloženia.</p>
              )}
            </div>

            {addingCategory === category && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                <input
                  type="text"
                  placeholder={`Názov (napr. "${CATEGORY_LABELS[category]} 8")`}
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((t) => ({ ...t, name: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500">Zložky</span>
                  {newTemplate.components.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Názov zložky (napr. Hlavná zložka)"
                        value={c.label}
                        onChange={(e) => updateComponent(i, { label: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Množstvo"
                        value={c.grams}
                        onChange={(e) => updateComponent(i, { grams: e.target.value })}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                      <select
                        value={c.unit}
                        onChange={(e) =>
                          updateComponent(i, { unit: e.target.value as Component["unit"] })
                        }
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="text">text</option>
                      </select>
                      <button
                        onClick={() => removeComponentRow(i)}
                        disabled={newTemplate.components.length === 1}
                        className="text-red-500 hover:text-red-700 text-sm px-2 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addComponentRow}
                    className="text-sm text-teal-700 hover:text-teal-900"
                  >
                    + Pridať zložku
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newTemplate.hasException}
                    onChange={(e) =>
                      setNewTemplate((t) => ({ ...t, hasException: e.target.checked }))
                    }
                  />
                  Táto zložka má pevný počet kusov podľa vekovej skupiny (napr. vajce)
                </label>

                {newTemplate.hasException && (
                  <div className="space-y-2 bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Názov zložky (napr. Vajce)"
                        value={newTemplate.exceptionLabel}
                        onChange={(e) =>
                          setNewTemplate((t) => ({ ...t, exceptionLabel: e.target.value }))
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Jednotka (napr. ks)"
                        value={newTemplate.exceptionUnit}
                        onChange={(e) =>
                          setNewTemplate((t) => ({ ...t, exceptionUnit: e.target.value }))
                        }
                        className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    {portionTypes.map((pt) => (
                      <div key={pt.id} className="flex items-center gap-2">
                        <span className="w-40 text-sm text-gray-600">{pt.name}</span>
                        <input
                          type="text"
                          placeholder="Počet ks"
                          value={newTemplate.exceptionCounts[pt.name] ?? ""}
                          onChange={(e) =>
                            setNewTemplate((t) => ({
                              ...t,
                              exceptionCounts: {
                                ...t.exceptionCounts,
                                [pt.name]: e.target.value,
                              },
                            }))
                          }
                          className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setAddingCategory(null)}
                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm"
                  >
                    Zrušiť
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {saving ? "Ukladám…" : "Pridať do katalógu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MealCatalogAdmin;
