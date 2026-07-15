import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Card, Button, IconButton, Field, Input, Textarea, Modal, Empty } from "./ui";

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
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
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
    <>
      <PageHead
        eyebrow="Nastavenia"
        title="Správa diét"
        desc="Pridajte, premenujte alebo upravte popisy systémových diét"
      />

      <div className="zpa-stack">
        <Card pad>
          <form onSubmit={handleAddDiet} className="zpa-formrow">
            <Field label="Názov diéty">
              <Input
                value={newDietName}
                onChange={(e) => setNewDietName(e.target.value)}
                placeholder="Názov novej diéty (napr. Bez lepku)"
              />
            </Field>
            <Field label="Popis">
              <Input
                value={newDietDescription}
                onChange={(e) => setNewDietDescription(e.target.value)}
                placeholder="Popis diéty pre prevádzku"
              />
            </Field>
            <Button type="submit" disabled={!newDietName.trim()}>
              <Plus /> Pridať diétu
            </Button>
          </form>
        </Card>

        {diets.length === 0 ? (
          <Empty>Zatiaľ nie sú vytvorené žiadne diéty.</Empty>
        ) : (
          <div className="zpa-grid-cards">
            {diets.map((diet) => (
              <Card key={diet.id} pad className="zpa-diet-card">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{diet.name}</div>
                  {diet.description && (
                    <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0" }}>{diet.description}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <IconButton
                    title="Upraviť"
                    onClick={() =>
                      setRenameModal({
                        id: diet.id,
                        currentName: diet.name,
                        newName: diet.name,
                        description: diet.description || "",
                      })
                    }
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton title="Vymazať" onClick={() => setDeleteConfirm({ id: diet.id, name: diet.name })}>
                    <Trash2 />
                  </IconButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <Modal
          title="Odstrániť diétu"
          onClose={() => setDeleteConfirm(null)}
          icon={<Trash2 />}
          iconKind="danger"
          foot={
            <>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Zrušiť</Button>
              <Button variant="danger" onClick={handleDeleteConfirmed}>Áno, vymazať</Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)" }}>
            Naozaj chcete odstrániť diétu{" "}
            <strong style={{ color: "var(--green-900)" }}>„{deleteConfirm.name}"</strong>? Táto akcia sa nedá vrátiť.
          </p>
        </Modal>
      )}

      {/* Rename modal */}
      {renameModal && (
        <Modal
          title="Premenovať diétu"
          onClose={() => setRenameModal(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setRenameModal(null)}>Zrušiť</Button>
              <Button
                onClick={handleRename}
                disabled={
                  renaming ||
                  !renameModal.newName.trim() ||
                  (renameModal.newName.trim() === renameModal.currentName &&
                    renameModal.description.trim() ===
                      (diets.find((diet) => diet.id === renameModal.id)?.description || "").trim())
                }
              >
                {renaming ? "Ukladám…" : "Uložiť"}
              </Button>
            </>
          }
        >
          <Field label="Nový názov" hint={`aktuálne: ${renameModal.currentName}`}>
            <Input
              value={renameModal.newName}
              onChange={(e) => setRenameModal((prev) => (prev ? { ...prev, newName: e.target.value } : prev))}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (renaming || !renameModal.newName.trim()) return;
                if (renameModal.newName.trim() === renameModal.currentName) return;
                handleRename();
              }}
              placeholder="Nový názov diéty"
              autoFocus
            />
          </Field>
          <Field label="Popis">
            <Textarea
              value={renameModal.description}
              onChange={(e) => setRenameModal((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              placeholder="Popis diéty pre prevádzku"
              rows={4}
            />
          </Field>
        </Modal>
      )}
    </>
  );
};

export default DietManager;
