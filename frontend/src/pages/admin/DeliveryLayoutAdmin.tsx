import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Boxes, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";
import { Badge, Button, Card, Empty, Field, IconButton, Input, Modal, PageHead, Select, TableWrap } from "./ui";

const API = import.meta.env.VITE_API_URL || "/api";

interface DeliveryPrevadzka {
  id: number;
  nazov: string;
  report_alias: string;
  adresa: string;
  celok: string;
  delivery_route: number | null;
  delivery_sort_order: number;
  delivery_note: string;
  is_active: boolean;
}

interface DeliveryRoute {
  id: number;
  block: number;
  name: string;
  driver: string;
  departure_time: string | null;
  note: string;
  sort_order: number;
  is_active: boolean;
  prevadzky: DeliveryPrevadzka[];
}

interface DeliveryBlock {
  id: number;
  name: string;
  sort_order: number;
  include_in_main_summary: boolean;
  include_in_extra_summary: boolean;
  is_active: boolean;
  routes: DeliveryRoute[];
}

interface DeliveryLayout {
  blocks: DeliveryBlock[];
  unassigned_prevadzky: DeliveryPrevadzka[];
}

const EMPTY_LAYOUT: DeliveryLayout = { blocks: [], unassigned_prevadzky: [] };

type DragState =
  | { type: "route"; routeId: number }
  | { type: "prevadzka"; prevadzkaId: number };

interface ConfirmDialogState {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

function renumberLayout(layout: DeliveryLayout): DeliveryLayout {
  return {
    blocks: layout.blocks.map((block, bi) => ({
      ...block,
      sort_order: bi + 1,
      routes: block.routes.map((route, ri) => ({
        ...route,
        sort_order: ri + 1,
        block: block.id,
        prevadzky: route.prevadzky.map((prevadzka, pi) => ({
          ...prevadzka,
          delivery_route: route.id,
          delivery_sort_order: pi + 1,
        })),
      })),
    })),
    unassigned_prevadzky: layout.unassigned_prevadzky.map((prevadzka) => ({
      ...prevadzka,
      delivery_route: null,
      delivery_sort_order: 0,
    })),
  };
}

const DeliveryLayoutAdmin: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [layout, setLayout] = useState<DeliveryLayout>(EMPTY_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRouteModalFor, setShowRouteModalFor] = useState<DeliveryBlock | null>(null);
  const [newBlockName, setNewBlockName] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDriver, setNewRouteDriver] = useState("");
  const [newRouteTime, setNewRouteTime] = useState("");
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const routeOptions = useMemo(
    () => layout.blocks.flatMap((block) => block.routes.map((route) => ({ route, block }))),
    [layout.blocks],
  );

  const fetchLayout = useCallback(async () => {
    setLoading(true);
    try {
      const layoutRes = await apiFetch(`${API}/admin/delivery-blocks/layout/`);
      if (layoutRes.ok) setLayout(renumberLayout(await layoutRes.json()));
    } catch (e) {
      logger.error(e);
      toastError("Nepodarilo sa načítať rozvozový layout.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toastError]);

  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

  const updateLayout = (recipe: (draft: DeliveryLayout) => DeliveryLayout) => {
    setLayout((current) => renumberLayout(recipe(current)));
  };

  const moveBlock = (blockId: number, delta: number) => {
    updateLayout((current) => {
      const blocks = [...current.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= blocks.length) return current;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...current, blocks };
    });
  };

  const startDrag = (event: React.DragEvent, nextDragging: DragState) => {
    setDragging(nextDragging);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-zpa-delivery", JSON.stringify(nextDragging));
  };

  const allowDrop = (event: React.DragEvent, type: DragState["type"]) => {
    if (dragging?.type !== type) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropRoute = (targetBlockId: number, beforeRouteId?: number) => {
    if (dragging?.type !== "route") return;
    if (beforeRouteId === dragging.routeId) return;
    updateLayout((current) => {
      let moved: DeliveryRoute | null = null;
      const withoutMoved = current.blocks.map((block) => ({
        ...block,
        routes: block.routes.filter((route) => {
          if (route.id !== dragging.routeId) return true;
          moved = route;
          return false;
        }),
      }));
      if (!moved) return current;
      return {
        ...current,
        blocks: withoutMoved.map((block) => {
          if (block.id !== targetBlockId) return block;
          const nextRoute = { ...(moved as DeliveryRoute), block: targetBlockId };
          const routes = [...block.routes];
          const targetIndex = beforeRouteId ? routes.findIndex((route) => route.id === beforeRouteId) : -1;
          if (targetIndex >= 0) routes.splice(targetIndex, 0, nextRoute);
          else routes.push(nextRoute);
          return { ...block, routes };
        }),
      };
    });
  };

  const findPrevadzka = (prevadzkaId: number) => {
    for (const block of layout.blocks) {
      for (const route of block.routes) {
        const prevadzka = route.prevadzky.find((item) => item.id === prevadzkaId);
        if (prevadzka) return { prevadzka, route };
      }
    }
    const prevadzka = layout.unassigned_prevadzky.find((item) => item.id === prevadzkaId);
    return prevadzka ? { prevadzka, route: null } : null;
  };

  const movePrevadzka = (prevadzkaId: number, targetRouteId: number | null, beforePrevadzkaId?: number) => {
    updateLayout((current) => {
      let moved: DeliveryPrevadzka | null = null;
      const blocksWithout = current.blocks.map((block) => ({
        ...block,
        routes: block.routes.map((route) => ({
          ...route,
          prevadzky: route.prevadzky.filter((prevadzka) => {
            if (prevadzka.id !== prevadzkaId) return true;
            moved = prevadzka;
            return false;
          }),
        })),
      }));
      const unassignedWithout = current.unassigned_prevadzky.filter((prevadzka) => {
        if (prevadzka.id !== prevadzkaId) return true;
        moved = prevadzka;
        return false;
      });
      if (!moved) return current;
      if (targetRouteId === null) {
        const unassigned = [...unassignedWithout];
        const targetIndex = beforePrevadzkaId ? unassigned.findIndex((prevadzka) => prevadzka.id === beforePrevadzkaId) : -1;
        if (targetIndex >= 0) unassigned.splice(targetIndex, 0, moved);
        else unassigned.push(moved);
        return { blocks: blocksWithout, unassigned_prevadzky: unassigned };
      }
      return {
        blocks: blocksWithout.map((block) => ({
          ...block,
          routes: block.routes.map((route) => {
            if (route.id !== targetRouteId) return route;
            const prevadzky = [...route.prevadzky];
            const targetIndex = beforePrevadzkaId ? prevadzky.findIndex((prevadzka) => prevadzka.id === beforePrevadzkaId) : -1;
            if (targetIndex >= 0) prevadzky.splice(targetIndex, 0, moved as DeliveryPrevadzka);
            else prevadzky.push(moved as DeliveryPrevadzka);
            return { ...route, prevadzky };
          }),
        })),
        unassigned_prevadzky: unassignedWithout,
      };
    });
  };

  const requestUnassignPrevadzka = (prevadzka: DeliveryPrevadzka, move: () => void) => {
    setConfirmDialog({
      title: "Odobrať prevádzku z trasy?",
      body: (
        <p>
          Prevádzka <strong>{prevadzka.report_alias || prevadzka.nazov}</strong> sa presunie medzi nepriradené
          prevádzky. Zmena sa uloží až po kliknutí na <strong>Uložiť poradie</strong>.
        </p>
      ),
      confirmLabel: "Odobrať z trasy",
      onConfirm: move,
    });
  };

  const dropPrevadzka = (targetRouteId: number | null, beforePrevadzkaId?: number) => {
    if (dragging?.type !== "prevadzka") return;
    if (beforePrevadzkaId === dragging.prevadzkaId) return;

    if (targetRouteId === null) {
      const source = findPrevadzka(dragging.prevadzkaId);
      if (source?.route) {
        const prevadzkaId = dragging.prevadzkaId;
        requestUnassignPrevadzka(source.prevadzka, () => movePrevadzka(prevadzkaId, null, beforePrevadzkaId));
        return;
      }
    }

    movePrevadzka(dragging.prevadzkaId, targetRouteId, beforePrevadzkaId);
  };

  const assignPrevadzka = (prevadzkaId: number, routeId: number | null) => {
    updateLayout((current) => {
      let moved: DeliveryPrevadzka | null = null;
      const blocksWithout = current.blocks.map((block) => ({
        ...block,
        routes: block.routes.map((route) => {
          const remaining = route.prevadzky.filter((prevadzka) => {
            if (prevadzka.id !== prevadzkaId) return true;
            moved = prevadzka;
            return false;
          });
          return { ...route, prevadzky: remaining };
        }),
      }));
      const unassigned = current.unassigned_prevadzky.filter((prevadzka) => {
        if (prevadzka.id !== prevadzkaId) return true;
        moved = prevadzka;
        return false;
      });
      if (!moved) return current;
      if (routeId === null) return { blocks: blocksWithout, unassigned_prevadzky: [...unassigned, moved] };
      return {
        blocks: blocksWithout.map((block) => ({
          ...block,
          routes: block.routes.map((route) =>
            route.id === routeId ? { ...route, prevadzky: [...route.prevadzky, moved as DeliveryPrevadzka] } : route,
          ),
        })),
        unassigned_prevadzky: unassigned,
      };
    });
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const payload = renumberLayout(layout);
      const res = await apiFetch(`${API}/admin/delivery-blocks/reorder/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toastError("Nepodarilo sa uložiť poradie.");
        return;
      }
      setLayout(renumberLayout(await res.json()));
      success("Rozvozové poradie bolo uložené.");
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri ukladaní poradia.");
    } finally {
      setSaving(false);
    }
  };

  const createBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName.trim()) return;
    const res = await apiFetch(`${API}/admin/delivery-blocks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBlockName.trim(), sort_order: layout.blocks.length + 1 }),
    });
    if (res.ok) {
      setNewBlockName("");
      setShowBlockModal(false);
      await fetchLayout();
      success("Blok bol pridaný.");
    } else {
      toastError("Nepodarilo sa pridať blok.");
    }
  };

  const createRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRouteModalFor || !newRouteName.trim()) return;
    const res = await apiFetch(`${API}/admin/delivery-routes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        block: showRouteModalFor.id,
        name: newRouteName.trim(),
        driver: newRouteDriver.trim(),
        departure_time: newRouteTime || null,
        sort_order: showRouteModalFor.routes.length + 1,
      }),
    });
    if (res.ok) {
      setNewRouteName("");
      setNewRouteDriver("");
      setNewRouteTime("");
      setShowRouteModalFor(null);
      await fetchLayout();
      success("Trasa bola pridaná.");
    } else {
      toastError("Nepodarilo sa pridať trasu.");
    }
  };

  const deleteRoute = async (route: DeliveryRoute) => {
    const res = await apiFetch(`${API}/admin/delivery-routes/${route.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      await fetchLayout();
      success("Trasa bola odstránená.");
    } else {
      toastError("Nepodarilo sa odstrániť trasu.");
    }
  };

  const requestDeleteRoute = (route: DeliveryRoute) => {
    setConfirmDialog({
      title: "Odstrániť trasu?",
      body: (
        <p>
          Trasa <strong>{route.name}</strong> sa odstráni. Prevádzky z tejto trasy ostanú nepriradené a bude
          ich treba zaradiť nanovo.
        </p>
      ),
      confirmLabel: "Odstrániť trasu",
      onConfirm: () => deleteRoute(route),
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Rozvoz"
        title="Poradie a trasy"
        desc="Rozdelenie prevádzok do blokov a trás pre admin Prehľad."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowBlockModal(true)}>
              <Plus /> Blok
            </Button>
            <Button onClick={saveLayout} disabled={saving || loading}>
              <Save /> {saving ? "Ukladám…" : "Uložiť poradie"}
            </Button>
          </>
        }
      />

      {loading ? (
        <Empty>Načítavam rozvozový layout…</Empty>
      ) : (
        <div className="zpa-stack">
          {layout.blocks.length === 0 && (
            <Empty icon={<Boxes />}>Zatiaľ nie je vytvorený žiadny rozvozový blok.</Empty>
          )}

          {layout.blocks.map((block, blockIndex) => (
            <Card
              key={block.id}
              style={{ overflow: "hidden" }}
              onDragOver={(event) => allowDrop(event, "route")}
              onDrop={(event) => {
                if (dragging?.type !== "route") return;
                event.preventDefault();
                dropRoute(block.id);
                setDragging(null);
              }}
            >
              <div className="zpa-card-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-soft)" }}>
                <div>
                  <h3>{block.name}</h3>
                  <p>{block.routes.length} trás</p>
                </div>
                <div className="actions">
                  <IconButton onClick={() => moveBlock(block.id, -1)} disabled={blockIndex === 0} title="Vyššie" aria-label="Vyššie">
                    <ArrowUp />
                  </IconButton>
                  <IconButton onClick={() => moveBlock(block.id, 1)} disabled={blockIndex === layout.blocks.length - 1} title="Nižšie" aria-label="Nižšie">
                    <ArrowDown />
                  </IconButton>
                  <Button sm variant="secondary" onClick={() => setShowRouteModalFor(block)}>
                    <Plus /> Trasa
                  </Button>
                </div>
              </div>

              {block.routes.map((route) => (
                <div
                  key={route.id}
                  style={{ borderBottom: "1px solid var(--line-soft)" }}
                  onDragOver={(event) => allowDrop(event, "route")}
                  onDrop={(event) => {
                    if (dragging?.type !== "route") return;
                    event.preventDefault();
                    event.stopPropagation();
                    dropRoute(block.id, route.id);
                    setDragging(null);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", background: "var(--bg-cream-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <IconButton
                        className="zpa-drag-handle"
                        draggable
                        title="Presunúť trasu"
                        aria-label="Presunúť trasu"
                        onDragStart={(event) => startDrag(event, { type: "route", routeId: route.id })}
                        onDragEnd={() => setDragging(null)}
                      >
                        <GripVertical />
                      </IconButton>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green-900)" }}>{route.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {[route.departure_time?.slice(0, 5), route.driver].filter(Boolean).join(" / ") || "Bez času a vodiča"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <IconButton onClick={() => requestDeleteRoute(route)} title="Odstrániť trasu" aria-label="Odstrániť trasu">
                        <Trash2 />
                      </IconButton>
                    </div>
                  </div>
                  <TableWrap
                    onDragOver={(event) => allowDrop(event, "prevadzka")}
                    onDrop={(event) => {
                      if (dragging?.type !== "prevadzka") return;
                      event.preventDefault();
                      dropPrevadzka(route.id);
                      setDragging(null);
                    }}
                  >
                    <table className="zpa-table">
                      <tbody>
                        {route.prevadzky.length === 0 ? (
                          <tr><td style={{ color: "var(--ink-mute)" }}>Žiadne prevádzky v trase.</td></tr>
                        ) : (
                          route.prevadzky.map((prevadzka) => (
                            <tr
                              key={prevadzka.id}
                              onDragOver={(event) => allowDrop(event, "prevadzka")}
                              onDrop={(event) => {
                                if (dragging?.type !== "prevadzka") return;
                                event.preventDefault();
                                event.stopPropagation();
                                dropPrevadzka(route.id, prevadzka.id);
                                setDragging(null);
                              }}
                            >
                              <td style={{ width: 48 }}>
                                <IconButton
                                  className="zpa-drag-handle"
                                  draggable
                                  title="Presunúť prevádzku"
                                  aria-label="Presunúť prevádzku"
                                  onDragStart={(event) => startDrag(event, { type: "prevadzka", prevadzkaId: prevadzka.id })}
                                  onDragEnd={() => setDragging(null)}
                                >
                                  <GripVertical />
                                </IconButton>
                              </td>
                              <td>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{prevadzka.report_alias || prevadzka.nazov}</div>
                                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{prevadzka.celok}{prevadzka.adresa ? ` · ${prevadzka.adresa}` : ""}</div>
                              </td>
                              <td className="r">
                                <Button
                                  sm
                                  variant="ghost"
                                  onClick={() => requestUnassignPrevadzka(prevadzka, () => assignPrevadzka(prevadzka.id, null))}
                                >
                                  Odobrať
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </TableWrap>
                </div>
              ))}
            </Card>
          ))}

          <Card style={{ overflow: "hidden" }}>
            <div className="zpa-card-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-soft)" }}>
              <div>
                <h3>Nepriradené prevádzky</h3>
                <p>{layout.unassigned_prevadzky.length} prevádzok mimo trás</p>
              </div>
              {layout.unassigned_prevadzky.length > 0 && <Badge tone="orange">Skontrolovať</Badge>}
            </div>
            <TableWrap
              onDragOver={(event) => allowDrop(event, "prevadzka")}
              onDrop={(event) => {
                if (dragging?.type !== "prevadzka") return;
                event.preventDefault();
                dropPrevadzka(null);
                setDragging(null);
              }}
            >
              <table className="zpa-table">
                <tbody>
                  {layout.unassigned_prevadzky.length === 0 ? (
                    <tr><td style={{ color: "var(--ink-mute)" }}>Všetky aktívne prevádzky sú zaradené.</td></tr>
                  ) : (
                    layout.unassigned_prevadzky.map((prevadzka) => (
                      <tr
                        key={prevadzka.id}
                        onDragOver={(event) => allowDrop(event, "prevadzka")}
                        onDrop={(event) => {
                          if (dragging?.type !== "prevadzka") return;
                          event.preventDefault();
                          event.stopPropagation();
                          dropPrevadzka(null, prevadzka.id);
                          setDragging(null);
                        }}
                      >
                        <td style={{ width: 48 }}>
                          <IconButton
                            className="zpa-drag-handle"
                            draggable
                            title="Presunúť prevádzku"
                            aria-label="Presunúť prevádzku"
                            onDragStart={(event) => startDrag(event, { type: "prevadzka", prevadzkaId: prevadzka.id })}
                            onDragEnd={() => setDragging(null)}
                          >
                            <GripVertical />
                          </IconButton>
                        </td>
                        <td>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{prevadzka.nazov}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{prevadzka.celok}</div>
                        </td>
                        <td className="r">
                          <Select defaultValue="" onChange={(e) => assignPrevadzka(prevadzka.id, Number(e.target.value))} style={{ width: 260 }}>
                            <option value="" disabled>Priradiť do trasy…</option>
                            {routeOptions.map(({ route, block }) => (
                              <option key={route.id} value={route.id}>{block.name} / {route.name}</option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Card>

        </div>
      )}

      {showBlockModal && (
        <Modal
          title="Nový blok"
          onClose={() => setShowBlockModal(false)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setShowBlockModal(false)}>Zrušiť</Button>
              <Button type="submit" form="new-block-form">Pridať</Button>
            </>
          }
        >
          <form id="new-block-form" onSubmit={createBlock} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Názov bloku" req>
              <Input required value={newBlockName} onChange={(e) => setNewBlockName(e.target.value)} placeholder="Napr. Bežné trasy" />
            </Field>
          </form>
        </Modal>
      )}

      {showRouteModalFor && (
        <Modal
          title={`Nová trasa - ${showRouteModalFor.name}`}
          onClose={() => setShowRouteModalFor(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setShowRouteModalFor(null)}>Zrušiť</Button>
              <Button type="submit" form="new-route-form">Pridať</Button>
            </>
          }
        >
          <form id="new-route-form" onSubmit={createRoute} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Názov trasy" req>
              <Input required value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} placeholder="TRASA 1 - Pezinská" />
            </Field>
            <div className="zpa-grid-2">
              <Field label="Vodič">
                <Input value={newRouteDriver} onChange={(e) => setNewRouteDriver(e.target.value)} />
              </Field>
              <Field label="Čas">
                <Input type="time" value={newRouteTime} onChange={(e) => setNewRouteTime(e.target.value)} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {confirmDialog && (
        <Modal
          title={confirmDialog.title}
          icon={<AlertTriangle />}
          iconKind="warn"
          onClose={() => {
            if (!confirmBusy) setConfirmDialog(null);
          }}
          foot={
            <>
              <Button variant="ghost" onClick={() => setConfirmDialog(null)} disabled={confirmBusy}>Zrušiť</Button>
              <Button onClick={() => void confirmAction()} disabled={confirmBusy}>
                {confirmBusy ? "Pracujem…" : confirmDialog.confirmLabel}
              </Button>
            </>
          }
        >
          {confirmDialog.body}
        </Modal>
      )}
    </>
  );
};

export default DeliveryLayoutAdmin;
