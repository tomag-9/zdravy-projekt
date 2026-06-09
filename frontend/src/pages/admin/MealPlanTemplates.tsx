import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || "/api";

type Category = "breakfast" | "lunch" | "snack";

const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: "Raňajky",
  lunch: "Obed",
  snack: "Olovrant",
};

interface MealTemplate {
  id: number;
  category: Category;
  name: string;
  weight_label: string;
  base_weight_grams: string;
  menu_variant: string;
  is_active: boolean;
}

interface EditModal {
  id: number | null;
  category: Category;
  name: string;
  composition: string; // combined weight_label — "200g + 25g + 50g"
}

// ── Composition parsing (mirrors backend logic) ───────────────────────────────
function parseCompositionGrams(composition: string): number | null {
  // Match e.g. "200g", "25 g", "1.5g" — but NOT "ml"
  const matches = composition.match(/(\d+(?:[.,]\d+)?)\s*g(?![a-z])/gi);
  if (!matches || matches.length === 0) return null;
  return matches.reduce((sum, m) => {
    const num = parseFloat(m.replace(/[gG]/g, "").replace(",", ".").trim());
    return sum + num;
  }, 0);
}

function compositionHint(composition: string): { total: number | null; error: boolean } {
  if (!composition.trim()) return { total: null, error: false };
  const total = parseCompositionGrams(composition);
  return { total, error: total === null };
}

const emptyEdit = (category: Category): EditModal => ({
  id: null,
  category,
  name: "",
  composition: "",
});

const MealPlanTemplates: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error } = useToast();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<Category>("breakfast");
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MealTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/admin/meal-templates/?active_only=false`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      logger.error(e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const tabTemplates = templates.filter((t) => t.category === activeTab);

  const hint = compositionHint(editModal?.composition ?? "");

  const handleSave = async () => {
    if (!editModal || !editModal.name.trim() || !editModal.composition.trim()) return;
    if (hint.error) return; // frontend guard

    setSaving(true);
    const payload = {
      category: editModal.category,
      name: editModal.name.trim(),
      weight_label: editModal.composition.trim(),
    };
    try {
      const url = editModal.id
        ? `${API}/admin/meal-templates/${editModal.id}/`
        : `${API}/admin/meal-templates/`;
      const res = await apiFetch(url, {
        method: editModal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        success(editModal.id ? "Šablóna aktualizovaná" : "Šablóna vytvorená");
        fetchTemplates();
        setEditModal(null);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.weight_label?.[0] ||
          data?.non_field_errors?.[0] ||
          "Nepodarilo sa uložiť";
        error(msg);
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await apiFetch(
        `${API}/admin/meal-templates/${deleteConfirm.id}/`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        success(`Šablóna "${deleteConfirm.name}" bola odstránená`);
        fetchTemplates();
      } else {
        error("Nepodarilo sa odstrániť (šablóna je možno použitá v plánoch)");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri odstraňovaní");
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/meal-plan"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            ← Späť
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Šablóny jedál</h2>
            <p className="text-gray-500 mt-1">
              Spravujte šablóny jedál pre jedálniček
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditModal(emptyEdit(activeTab))}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          + Pridať šablónu
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["breakfast", "lunch", "snack"] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === cat
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Templates table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 font-semibold text-gray-600">Názov</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Zloženie</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Základ (g)</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tabTemplates.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{tpl.name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                  {tpl.weight_label || "—"}
                </td>
                <td className="px-6 py-4 font-semibold text-teal-700">
                  {tpl.base_weight_grams} g
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() =>
                      setEditModal({
                        id: tpl.id,
                        category: tpl.category,
                        name: tpl.name,
                        composition: tpl.weight_label,
                      })
                    }
                    className="text-indigo-500 hover:text-indigo-700 text-sm px-3 py-1 rounded-md hover:bg-indigo-50 transition"
                  >
                    Upraviť
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(tpl)}
                    className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-md hover:bg-red-50 transition"
                  >
                    Vymazať
                  </button>
                </td>
              </tr>
            ))}
            {tabTemplates.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  Žiadne šablóny pre {CATEGORY_LABELS[activeTab].toLowerCase()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Create modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal?.id ? "Upraviť šablónu" : "Nová šablóna"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategória
            </label>
            <select
              value={editModal?.category ?? "breakfast"}
              onChange={(e) =>
                setEditModal((prev) =>
                  prev ? { ...prev, category: e.target.value as Category } : prev
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {(["breakfast", "lunch", "snack"] as Category[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Názov
            </label>
            <input
              type="text"
              value={editModal?.name ?? ""}
              onChange={(e) =>
                setEditModal((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev
                )
              }
              placeholder="napr. Kuracie prsia + ryža + šalát"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zloženie a gramáž
            </label>
            <input
              type="text"
              value={editModal?.composition ?? ""}
              onChange={(e) =>
                setEditModal((prev) =>
                  prev ? { ...prev, composition: e.target.value } : prev
                )
              }
              placeholder="napr. 120g + 80g + 50g"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none font-mono ${
                hint.error
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-300 focus:ring-teal-500"
              }`}
            />
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              {!editModal?.composition?.trim() && (
                <span className="text-gray-400">
                  Formát: <code className="bg-gray-100 px-1 rounded">200g + 25g + 50g</code>
                  {" "}— hodnoty v gramoch sa sčítajú
                </span>
              )}
              {hint.error && editModal?.composition?.trim() && (
                <span className="text-red-500">
                  Nepodarilo sa rozpoznať gramáž — použite formát{" "}
                  <code className="bg-red-50 px-1 rounded">200g + 25g</code>
                </span>
              )}
              {hint.total !== null && (
                <span className="text-teal-700 font-semibold">
                  ✓ Základ: {hint.total.toFixed(0)} g
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setEditModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={
              saving ||
              !editModal?.name.trim() ||
              !editModal?.composition.trim() ||
              hint.error ||
              hint.total === null
            }
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Ukladám…" : "Uložiť"}
          </button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Odstrániť šablónu"
      >
        <p className="text-gray-600 mb-6">
          Naozaj chcete odstrániť šablónu{" "}
          <span className="font-semibold text-gray-900">"{deleteConfirm?.name}"</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Zrušiť
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Áno, vymazať
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MealPlanTemplates;
