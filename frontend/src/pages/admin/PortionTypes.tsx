import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";

const API = import.meta.env.VITE_API_URL || "/api";

interface PortionType {
  id: number;
  name: string;
  coefficient: string;
  coefficient_pct: number;
  is_active: boolean;
}

interface EditModal {
  id: number;
  name: string;
  coefficient_pct: number;
}

const PortionTypes: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<PortionType[]>([]);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/admin/portion-types/`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    const payload = {
      coefficient: (editModal.coefficient_pct / 100).toFixed(4),
    };
    try {
      const res = await apiFetch(`${API}/admin/portion-types/${editModal.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        success("Koeficient aktualizovaný");
        fetchItems();
        setEditModal(null);
      } else {
        error("Nepodarilo sa uložiť");
      }
    } catch (e) {
      console.error(e);
      error("Chyba pri ukladaní");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/meal-plan"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          ← Späť
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Typy porcií</h2>
          <p className="text-gray-500 mt-1">
            Váhové koeficienty pre jednotlivé skupiny stravníkov
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 font-semibold text-gray-600">Skupina</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Koeficient</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Príklad (základ 300g)</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((pt) => (
              <tr key={pt.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{pt.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-teal-100 text-teal-800">
                    {pt.coefficient_pct}%
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {(300 * parseFloat(pt.coefficient)).toFixed(0)} g
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() =>
                      setEditModal({
                        id: pt.id,
                        name: pt.name,
                        coefficient_pct: pt.coefficient_pct,
                      })
                    }
                    className="text-indigo-500 hover:text-indigo-700 text-sm px-3 py-1 rounded-md hover:bg-indigo-50 transition"
                  >
                    Upraviť %
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Žiadne typy porcií — spustite{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    python manage.py seed_meal_plan_data
                  </code>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit coefficient modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Upraviť koeficient — ${editModal?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Koeficient určuje, aká časť základnej gramáže šablóny sa použije pre túto skupinu.
            Napr. 50% = polovičná porcia.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Koeficient (%)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={editModal?.coefficient_pct ?? 100}
              onChange={(e) =>
                setEditModal((prev) =>
                  prev ? { ...prev, coefficient_pct: Number(e.target.value) } : prev
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Základ 300g →{" "}
              <strong>
                {(300 * (editModal?.coefficient_pct ?? 100) / 100).toFixed(0)} g
              </strong>
            </p>
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
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Ukladám…" : "Uložiť"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PortionTypes;
