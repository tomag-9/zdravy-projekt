import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Card, Button, IconButton, Field, Input, Textarea, Modal, Empty, ColorSwatchPicker, Checkbox } from "./ui";
import { DietColorSwatch } from "./DietColorSwatch";
import { dietReorderPayload, moveDietBefore } from "./dietReorder";

export interface Diet {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  description: string;
  color?: string;
  base_diets?: number[];
  base_colors?: string[];
}

interface DeleteConfirm {
  id: number;
  name: string;
}

interface RenameModal {
  id: number;
  currentName: string;
  newName: string;
  sortOrder: number;
  description: string;
  color: string;
  baseDietIds: number[];
  isComposite: boolean;
}

interface CompositeModal {
  baseDietIds: number[];
}

interface DragState {
  dietId: number;
}

const sameDietIds = (left: number[], right: number[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const DietManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error } = useToast();
  const [diets, setDiets] = useState<Diet[]>([]);
  const [newDietName, setNewDietName] = useState("");
  const [newDietSortOrder, setNewDietSortOrder] = useState(0);
  const [newDietDescription, setNewDietDescription] = useState("");
  const [newDietColor, setNewDietColor] = useState("#D83131");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModal | null>(null);
  const [compositeModal, setCompositeModal] = useState<CompositeModal | null>(null);
  const [creatingComposite, setCreatingComposite] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const saveVersionRef = useRef(0);

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
            sort_order: newDietSortOrder,
            description: newDietDescription.trim(),
            color: newDietColor,
            base_diets: [],
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
        setNewDietSortOrder(0);
        setNewDietDescription("");
        setNewDietColor("#D83131");
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

  const toggleCompositeDiet = (dietId: number) => {
    setCompositeModal((current) => {
      if (!current) return current;
      const selected = current.baseDietIds.includes(dietId)
        ? current.baseDietIds.filter((id) => id !== dietId)
        : [...current.baseDietIds, dietId];
      return { baseDietIds: selected };
    });
  };

  const handleAddCompositeDiet = async () => {
    if (!compositeModal || compositeModal.baseDietIds.length < 2) return;
    const selectedDiets = composableDiets.filter((diet) =>
      compositeModal.baseDietIds.includes(diet.id),
    );
    if (selectedDiets.length < 2) return;

    setCreatingComposite(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedDiets.map((diet) => diet.name).join(" – "),
            sort_order: Math.max(0, ...diets.map((diet) => diet.sort_order || 0)) + 1,
            description: `Kombinácia: ${selectedDiets.map((diet) => diet.name).join(", ")}`,
            color: selectedDiets[0].color || "#D83131",
            base_diets: selectedDiets.map((diet) => diet.id),
            is_active: true,
          }),
        },
      );
      if (res.ok) {
        setCompositeModal(null);
        await fetchDiets();
        success("Kombinovaná diéta bola vytvorená");
      } else {
        error("Nepodarilo sa vytvoriť kombinovanú diétu (možno už existuje)");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri vytváraní kombinovanej diéty");
    } finally {
      setCreatingComposite(false);
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
            sort_order: renameModal.sortOrder,
            description: renameModal.description.trim(),
            color: renameModal.color,
            base_diets: renameModal.baseDietIds,
          }),
        },
      );
      if (res.ok) {
        success("Diéta bola uložená");
        fetchDiets();
        setRenameModal(null);
      } else {
        error("Nepodarilo sa uložiť diétu (možno názov už existuje)");
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní diéty");
    } finally {
      setRenaming(false);
    }
  };

  const persistDietOrder = async (nextDiets: Diet[]) => {
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/diets/reorder/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dietReorderPayload(nextDiets)),
        },
      );
      if (!res.ok) {
        error("Nepodarilo sa uložiť poradie diét.");
        if (saveVersionRef.current === saveVersion) await fetchDiets();
        return;
      }
      const saved = await res.json();
      if (saveVersionRef.current === saveVersion) {
        setDiets(Array.isArray(saved) ? saved : saved.results || []);
      }
    } catch (e) {
      logger.error(e);
      error("Chyba pri ukladaní poradia diét.");
      if (saveVersionRef.current === saveVersion) await fetchDiets();
    }
  };

  const startDrag = (event: React.DragEvent, nextDragging: DragState) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, select, input, textarea, a")) {
      event.preventDefault();
      return;
    }
    setDragging(nextDragging);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-zpa-diet", JSON.stringify(nextDragging));
  };

  const allowDrop = (event: React.DragEvent) => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropDiet = (targetDietId: number) => {
    if (!dragging || dragging.dietId === targetDietId) return;
    const nextDiets = moveDietBefore(diets, dragging.dietId, targetDietId);
    if (nextDiets === diets) return;
    setDiets(nextDiets);
    setDragging(null);
    void persistDietOrder(nextDiets);
  };

  const composableDiets = diets.filter((diet) => (diet.base_diets || []).length === 0);

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
            <Field label="Poradie">
              <Input
                type="number"
                inputMode="numeric"
                value={newDietSortOrder}
                onChange={(e) => setNewDietSortOrder(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Farba" as="div">
              <ColorSwatchPicker
                value={newDietColor}
                onChange={setNewDietColor}
                ariaLabel="Farba novej diéty"
              />
            </Field>
            <Button type="submit" disabled={!newDietName.trim()}>
              <Plus /> Pridať diétu
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={composableDiets.length < 2}
              onClick={() => setCompositeModal({ baseDietIds: [] })}
            >
              <Layers /> Vytvoriť kombinovanú
            </Button>
          </form>
        </Card>

        {diets.length === 0 ? (
          <Empty>Zatiaľ nie sú vytvorené žiadne diéty.</Empty>
        ) : (
          <div className="zpa-grid-cards">
            {diets.map((diet, dietPosition) => (
              <Card
                key={diet.id}
                pad
                className={`zpa-diet-card zpa-draggable-row${dragging?.dietId === diet.id ? " is-dragging" : ""}`}
                draggable
                onDragStart={(event) => startDrag(event, { dietId: diet.id })}
                onDragEnd={() => setDragging(null)}
                onDragOver={allowDrop}
                onDrop={(event) => {
                  event.preventDefault();
                  dropDiet(diet.id);
                }}
                title="Potiahnutím zmeňte poradie"
              >
                <div style={{ minWidth: 0, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="zpa-row-grip" aria-hidden="true"><GripVertical /></span>
                  <DietColorSwatch color={diet.color} baseColors={diet.base_colors} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{diet.name}</div>
                    {/* Display-only 1-based position in the sorted list — the raw
                        sort_order field is 0-based (and can repeat across diets
                        that were never explicitly reordered), so showing it
                        directly reads as "diéta č. 0". The DB value itself is
                        left untouched; this is purely presentational. */}
                    <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "4px 0 0" }}>Poradie: {dietPosition + 1}</p>
                  {diet.description && (
                    <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0" }}>{diet.description}</p>
                  )}
                  {(diet.base_diets || []).length > 0 && (
                    <p style={{ fontSize: 12, color: "var(--green-700)", margin: "4px 0 0" }}>
                      Kombinácia: {(diet.base_diets || []).map((id) => diets.find((item) => item.id === id)?.name).filter(Boolean).join(" + ")}
                    </p>
                  )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <IconButton
                    title="Upraviť"
                    onClick={() =>
                      setRenameModal({
                        id: diet.id,
                        currentName: diet.name,
                        newName: diet.name,
                        sortOrder: diet.sort_order ?? 0,
                        description: diet.description || "",
                        color: diet.color || "#D83131",
                        baseDietIds: diet.base_diets || [],
                        isComposite: (diet.base_diets || []).length > 0,
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

      {compositeModal && (
        <Modal
          title="Vytvoriť kombinovanú diétu"
          onClose={() => setCompositeModal(null)}
          icon={<Layers />}
          iconKind="ok"
          foot={
            <>
              <Button variant="ghost" onClick={() => setCompositeModal(null)}>Zrušiť</Button>
              <Button
                onClick={handleAddCompositeDiet}
                disabled={creatingComposite || compositeModal.baseDietIds.length < 2}
              >
                {creatingComposite ? "Vytváram…" : "Vytvoriť kombináciu"}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)" }}>
            Vyberte aspoň dve existujúce diéty. Názov aj viacfarebné označenie sa vytvoria automaticky.
          </p>
          <div className="zpa-composite-options">
            {composableDiets.map((diet) => (
              <Checkbox
                key={diet.id}
                on={compositeModal.baseDietIds.includes(diet.id)}
                onChange={() => toggleCompositeDiet(diet.id)}
              >
                <DietColorSwatch color={diet.color} size={14} />
                <span>{diet.name}</span>
              </Checkbox>
            ))}
          </div>
          {compositeModal.baseDietIds.length > 0 && (
            <div className="zpa-composite-preview">
              <DietColorSwatch
                baseColors={compositeModal.baseDietIds.map((id) => diets.find((diet) => diet.id === id)?.color || "")}
                size={24}
              />
              <span>
                {compositeModal.baseDietIds.map((id) => diets.find((diet) => diet.id === id)?.name).filter(Boolean).join(" – ")}
              </span>
            </div>
          )}
        </Modal>
      )}

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
          title="Upraviť diétu"
          onClose={() => setRenameModal(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setRenameModal(null)}>Zrušiť</Button>
              <Button
                onClick={handleRename}
                disabled={
                  renaming ||
                  !renameModal.newName.trim() ||
                  (renameModal.isComposite && renameModal.baseDietIds.length < 2) ||
                  (renameModal.newName.trim() === renameModal.currentName &&
                    renameModal.sortOrder === (diets.find((diet) => diet.id === renameModal.id)?.sort_order || 0) &&
                    renameModal.description.trim() ===
                      (diets.find((diet) => diet.id === renameModal.id)?.description || "").trim() &&
                    renameModal.color === (diets.find((diet) => diet.id === renameModal.id)?.color || "#D83131"))
                    && sameDietIds(
                      renameModal.baseDietIds,
                      diets.find((diet) => diet.id === renameModal.id)?.base_diets || [],
                    )
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
          <Field label="Poradie">
            <Input
              type="number"
              inputMode="numeric"
              value={renameModal.sortOrder}
              onChange={(e) => setRenameModal((prev) => (prev ? { ...prev, sortOrder: Number(e.target.value) || 0 } : prev))}
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
          {!renameModal.isComposite ? (
            <Field label="Farba" as="div">
              <ColorSwatchPicker
                value={renameModal.color}
                onChange={(color) => setRenameModal((prev) => (prev ? { ...prev, color } : prev))}
                ariaLabel={`Farba diéty ${renameModal.currentName}`}
              />
            </Field>
          ) : (
            <Field label="Zloženie kombinácie" as="div">
              <div className="zpa-composite-options">
                {composableDiets.filter((diet) => diet.id !== renameModal.id).map((diet) => (
                  <Checkbox
                    key={diet.id}
                    on={renameModal.baseDietIds.includes(diet.id)}
                    onChange={(selected) => setRenameModal((current) => current ? {
                      ...current,
                      baseDietIds: selected
                        ? [...current.baseDietIds, diet.id]
                        : current.baseDietIds.filter((id) => id !== diet.id),
                    } : current)}
                  >
                    <DietColorSwatch color={diet.color} size={14} />
                    <span>{diet.name}</span>
                  </Checkbox>
                ))}
              </div>
            </Field>
          )}
        </Modal>
      )}
    </>
  );
};

export default DietManager;
