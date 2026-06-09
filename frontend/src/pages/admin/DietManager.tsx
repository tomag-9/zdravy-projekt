import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";
import { logger } from '../../lib/logger';

interface Diet {
  id: number;
  name: string;
  is_active: boolean;
  description: string;
}

interface DeleteConfirm {
  id: number;
  name: string;
}

interface RenameModal {
  id: number;
  currentName: string;
  newName: string;
  description: string;
}

const DietManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error } = useToast();
  const [diets, setDiets] = useState<Diet[]>([]);
  const [newDietName, setNewDietName] = useState("");
  const [newDietDescription, setNewDietDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(
    null,
  );
  const [renameModal, setRenameModal] = useState<RenameModal | null>(null);
  const [renaming, setRenaming] = useState(false);

  const fetchDiets = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/`,
      );
      if (res.ok) {
        const data = await res.json();
        setDiets(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      logger.error(e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDiets();
  }, [fetchDiets]);

  const handleAddDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDietName) return;

    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newDietName.trim(),
            description: newDietDescription.trim(),
            is_active: true,
          }),
        },
      );
      if (res.ok) {
        const created = (await res.json()) as Diet;
        setDiets((prev) => {
          if (prev.some((d) => d.id === created.id)) return prev;
          return [created, ...prev];
        });
        setNewDietName("");
        setNewDietDescription("");
        fetchDiets();
        success("Diéta bola úspešne pridaná");
      } else {
        error("Nepodarilo sa vytvoriť diétu (možno už existuje)");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri vytváraní diéty");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/${deleteConfirm.id}/`,
        { method: "DELETE" },
      );
      if (res.ok) {
        success(`Diéta "${deleteConfirm.name}" bola odstránená`);
        fetchDiets();
      } else {
        error("Nepodarilo sa odstrániť diétu");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri odstraňovaní diéty");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleRename = async () => {
    if (!renameModal || !renameModal.newName.trim()) return;
    setRenaming(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/${renameModal.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: renameModal.newName.trim(),
            description: renameModal.description.trim(),
          }),
        },
      );
      if (res.ok) {
        success("Diéta bola premenovaná");
        fetchDiets();
        setRenameModal(null);
      } else {
        error("Nepodarilo sa premenovať diétu (možno názov už existuje)");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri premenovaní diéty");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Správa diét</h2>
          <p className="text-gray-500 mt-1">
            Pridajte, premenujte alebo upravte popisy systémových diét
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleAddDiet} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            value={newDietName}
            onChange={(e) => setNewDietName(e.target.value)}
            placeholder="Názov novej diéty (napr. Bez lepku)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <input
            type="text"
            value={newDietDescription}
            onChange={(e) => setNewDietDescription(e.target.value)}
            placeholder="Popis diéty pre klienta"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newDietName.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            Pridať diétu
          </button>
        </form>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {diets.map((diet) => (
          <div
            key={diet.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start gap-4"
          >
            <div>
              <span className="font-medium text-gray-800">{diet.name}</span>
              {diet.description && (
                <p className="text-sm text-gray-500 mt-1">{diet.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setRenameModal({
                    id: diet.id,
                    currentName: diet.name,
                    newName: diet.name,
                    description: diet.description || "",
                  })
                }
                className="text-indigo-500 hover:text-indigo-700 text-sm px-3 py-1 rounded-md hover:bg-indigo-50 transition"
              >
                Upraviť
              </button>
              <button
                onClick={() =>
                  setDeleteConfirm({ id: diet.id, name: diet.name })
                }
                className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-md hover:bg-red-50 transition"
              >
                Vymazať
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Odstrániť diétu"
      >
        <p className="text-gray-600 mb-6">
          Naozaj chcete odstrániť diétu{" "}
          <span className="font-semibold text-gray-900">
            "{deleteConfirm?.name}"
          </span>
          ? Táto akcia sa nedá vrátiť.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Zrušiť
          </button>
          <button
            onClick={handleDeleteConfirmed}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Áno, vymazať
          </button>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={!!renameModal}
        onClose={() => setRenameModal(null)}
        title="Premenovať diétu"
      >
        <p className="text-sm text-gray-500 mb-4">
          Aktuálny názov:{" "}
          <span className="font-medium text-gray-700">
            {renameModal?.currentName}
          </span>
        </p>
        <input
          type="text"
          value={renameModal?.newName ?? ""}
          onChange={(e) =>
            setRenameModal((prev) =>
              prev ? { ...prev, newName: e.target.value } : prev,
            )
          }
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (renaming || !renameModal?.newName.trim()) return;
            if (renameModal.newName.trim() === renameModal.currentName) return;
            handleRename();
          }}
          placeholder="Nový názov diéty"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
          autoFocus
        />
        <textarea
          value={renameModal?.description ?? ""}
          onChange={(e) =>
            setRenameModal((prev) =>
              prev ? { ...prev, description: e.target.value } : prev,
            )
          }
          placeholder="Popis diéty pre klienta"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setRenameModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Zrušiť
          </button>
          <button
            onClick={handleRename}
            disabled={
              renaming ||
              !renameModal?.newName.trim() ||
              (renameModal?.newName.trim() === renameModal?.currentName &&
                renameModal?.description.trim() ===
                  (diets.find((diet) => diet.id === renameModal?.id)?.description || "").trim())
            }
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {renaming ? "Ukladám…" : "Uložiť"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DietManager;
