import React, { useCallback, useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Card, CardHead, Button, Input, Select, Checkbox } from "./ui";

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
    <>
      <PageHead
        eyebrow="Katalóg"
        title="Katalóg jedál"
        desc="Spravujte koeficienty vekových skupín a pridávajte nové rozloženia do katalógu váh jedál."
      />

      <div className="zpa-stack">
        {/* Portion types / coefficients */}
        <Card pad>
          <CardHead title="Typy porcií a koeficienty" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {portionTypes.map((pt) => (
              <div key={pt.id} className="zpa-coefrow">
                <span style={{ width: 160, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--green-900)" }}>{pt.name}</span>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={coefficientDrafts[pt.id] ?? ""}
                  onChange={(e) => setCoefficientDrafts((d) => ({ ...d, [pt.id]: e.target.value }))}
                />
                <span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span>
                <Button variant="secondary" sm onClick={() => saveCoefficient(pt)} disabled={savingPortionTypeId === pt.id}>
                  {savingPortionTypeId === pt.id ? "Ukladám…" : "Uložiť"}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Catalog templates by category */}
        {loading ? (
          <div className="zpa-empty"><Loader2 className="zpa-spin" /> Načítavam…</div>
        ) : (
          CATEGORIES.map((category) => (
            <Card key={category} pad>
              <CardHead
                title={CATEGORY_LABELS[category]}
                actions={
                  <Button sm onClick={() => openAddForm(category)}>
                    <Plus /> Pridať nové rozloženie
                  </Button>
                }
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {templatesByCategory(category).map((tpl) => (
                  <div key={tpl.id} className="zpa-tplrow" style={tpl.is_active ? undefined : { opacity: 0.5 }}>
                    <div>
                      <span className="nm">{tpl.name}</span>
                      <span className={`wl${tpl.unit_exception ? " exc" : ""}`}>{tpl.weight_label}</span>
                    </div>
                    <Button variant="ghost" sm onClick={() => toggleTemplateActive(tpl)}>
                      {tpl.is_active ? "Deaktivovať" : "Aktivovať"}
                    </Button>
                  </div>
                ))}
                {templatesByCategory(category).length === 0 && (
                  <p style={{ fontSize: 14, color: "var(--ink-mute)", margin: 0 }}>Žiadne rozloženia.</p>
                )}
              </div>

              {addingCategory === category && (
                <div style={{ marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <Input
                    placeholder={`Názov (napr. "${CATEGORY_LABELS[category]} 8")`}
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, name: e.target.value }))}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className="zpa-label">Zložky</span>
                    {newTemplate.components.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Input placeholder="Názov zložky (napr. Hlavná zložka)" value={c.label} onChange={(e) => updateComponent(i, { label: e.target.value })} />
                        <Input placeholder="Množstvo" value={c.grams} onChange={(e) => updateComponent(i, { grams: e.target.value })} style={{ width: 110 }} />
                        <Select value={c.unit} onChange={(e) => updateComponent(i, { unit: e.target.value as Component["unit"] })} style={{ width: "auto" }}>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="text">text</option>
                        </Select>
                        <button className="zpa-iconbtn" onClick={() => removeComponentRow(i)} disabled={newTemplate.components.length === 1} aria-label="Odstrániť zložku">
                          <X />
                        </button>
                      </div>
                    ))}
                    <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={addComponentRow}>
                      <Plus /> Pridať zložku
                    </button>
                  </div>

                  <Checkbox on={newTemplate.hasException} onChange={(v) => setNewTemplate((t) => ({ ...t, hasException: v }))}>
                    Táto zložka má pevný počet kusov podľa vekovej skupiny (napr. vajce)
                  </Checkbox>

                  {newTemplate.hasException && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,201,92,0.12)", borderRadius: "var(--radius-md)", padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Input placeholder="Názov zložky (napr. Vajce)" value={newTemplate.exceptionLabel} onChange={(e) => setNewTemplate((t) => ({ ...t, exceptionLabel: e.target.value }))} />
                        <Input placeholder="Jednotka (napr. ks)" value={newTemplate.exceptionUnit} onChange={(e) => setNewTemplate((t) => ({ ...t, exceptionUnit: e.target.value }))} style={{ width: 110 }} />
                      </div>
                      {portionTypes.map((pt) => (
                        <div key={pt.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 160, fontSize: 14, color: "var(--ink-2)" }}>{pt.name}</span>
                          <Input
                            placeholder="Počet ks"
                            value={newTemplate.exceptionCounts[pt.name] ?? ""}
                            onChange={(e) =>
                              setNewTemplate((t) => ({ ...t, exceptionCounts: { ...t.exceptionCounts, [pt.name]: e.target.value } }))
                            }
                            style={{ width: 110 }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button variant="ghost" onClick={() => setAddingCategory(null)}>Zrušiť</Button>
                    <Button onClick={handleCreateTemplate} disabled={saving}>
                      {saving ? "Ukladám…" : "Pridať do katalógu"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </>
  );
};

export default MealCatalogAdmin;
