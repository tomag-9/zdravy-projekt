import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Umbrella } from "lucide-react";
import { useAuth } from "../../../context/auth";
import { useToast } from "../../../context/ToastContext";
import { logger } from "../../../lib/logger";
import { fetchAllPages } from "../../../lib/pagination";
import { toDateKey } from "../../../lib/businessDay";
import { Button, Card, CardHead, Empty, Field, IconButton, Input, Modal } from "../ui";

const API = import.meta.env.VITE_API_URL || "/api";

export interface PrevadzkaClosure {
  id: number;
  prevadzka: number;
  date_from: string;
  date_to: string;
  reason: string;
}

interface ClosureForm {
  date_from: string;
  date_to: string;
  reason: string;
}

const EMPTY_FORM: ClosureForm = { date_from: "", date_to: "", reason: "" };

const formatRange = (closure: PrevadzkaClosure): string => {
  const fmt = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  return closure.date_from === closure.date_to
    ? fmt(closure.date_from)
    : `${fmt(closure.date_from)} – ${fmt(closure.date_to)}`;
};

/**
 * Voľno prevádzky (#490) — jeden deň alebo rozsah, počas ktorého sa za túto
 * prevádzku neobjednáva. Nezamieňať s „Voľné dni" (`Holiday`) v hlavnom menu:
 * tie zavrú celú kuchyňu, toto len túto jednu prevádzku.
 */
export const PrevadzkaClosures: React.FC<{ prevadzkaId: number }> = ({ prevadzkaId }) => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [closures, setClosures] = useState<PrevadzkaClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ClosureForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrevadzkaClosure | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClosures = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages<PrevadzkaClosure>(
        apiFetch,
        `${API}/admin/prevadzka-closures/?prevadzka=${prevadzkaId}`,
      );
      setClosures(rows);
    } catch (e) {
      logger.error(e);
      toastError("Nepodarilo sa načítať voľná prevádzky.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, prevadzkaId, toastError]);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const today = useMemo(() => toDateKey(new Date()), []);
  // Prebiehajúce a budúce voľno je to, čo admin rieši; minulé len archív.
  const upcoming = closures.filter((c) => c.date_to >= today);
  const past = closures.filter((c) => c.date_to < today);

  const openEditor = () => {
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date_from) {
      toastError("Zadajte dátum od.");
      return;
    }
    // Jednodňové voľno: admin vyplní len „od" a „do" doplníme naň, aby nemusel
    // ten istý dátum klikať dvakrát.
    const dateTo = form.date_to || form.date_from;
    if (dateTo < form.date_from) {
      toastError("Koniec voľna nesmie byť pred jeho začiatkom.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/admin/prevadzka-closures/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prevadzka: prevadzkaId,
          date_from: form.date_from,
          date_to: dateTo,
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(
          data?.date_to?.[0] || data?.error?.message || "Nepodarilo sa uložiť voľno.",
        );
        return;
      }
      success("Voľno pridané.");
      setEditorOpen(false);
      await fetchClosures();
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri ukladaní voľna.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API}/admin/prevadzka-closures/${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        success("Voľno odstránené.");
        setDeleteTarget(null);
        await fetchClosures();
      } else {
        toastError("Nepodarilo sa odstrániť voľno.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri odstraňovaní voľna.");
    } finally {
      setDeleting(false);
    }
  };

  const row = (closure: PrevadzkaClosure, isPast = false) => (
    <div
      key={closure.id}
      className="zpa-listrow"
      style={{ paddingInline: 0, opacity: isPast ? 0.55 : 1 }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="lr-ttl" style={{ textTransform: "none" }}>{formatRange(closure)}</div>
        <div className="lr-sub">{closure.reason || "Bez dôvodu"}</div>
      </div>
      <IconButton
        onClick={() => setDeleteTarget(closure)}
        title="Odstrániť voľno"
        aria-label={`Odstrániť voľno ${formatRange(closure)}`}
      >
        <Trash2 />
      </IconButton>
    </div>
  );

  return (
    <>
      <Card pad>
        <CardHead
          title="Voľno prevádzky"
          desc="Dni, počas ktorých táto prevádzka neobjednáva — jednorazový deň alebo rozsah (napr. prázdniny). Platí len pre túto prevádzku; celoplošné voľno kuchyne sa nastavuje v sekcii Voľné dni."
          actions={<Button sm onClick={openEditor}><Plus /> Pridať voľno</Button>}
        />
        {loading ? (
          <Empty>Načítavam…</Empty>
        ) : closures.length === 0 ? (
          <Empty icon={<Umbrella />}>Prevádzka nemá nastavené žiadne voľno.</Empty>
        ) : (
          <div style={{ marginTop: 8 }}>
            {upcoming.map((closure) => row(closure))}
            {past.length > 0 && (
              <>
                <div
                  style={{
                    marginTop: 16,
                    marginBottom: 4,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    color: "var(--ink-mute)",
                  }}
                >
                  Uplynulé
                </div>
                {past.map((closure) => row(closure, true))}
              </>
            )}
          </div>
        )}
      </Card>

      {editorOpen && (
        <Modal
          title="Pridať voľno"
          onClose={() => setEditorOpen(false)}
          foot={<>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Zrušiť</Button>
            <Button type="submit" form="closure-form" disabled={saving}>
              {saving ? "Ukladám…" : "Pridať"}
            </Button>
          </>}
        >
          <form
            id="closure-form"
            onSubmit={save}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div className="zpa-grid-2">
              <Field label="Od" req>
                <Input
                  required
                  type="date"
                  value={form.date_from}
                  onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                />
              </Field>
              <Field label="Do">
                <Input
                  type="date"
                  min={form.date_from || undefined}
                  value={form.date_to}
                  onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                />
              </Field>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
              Pre jeden deň stačí vyplniť „Od“.
            </p>
            <Field label="Dôvod">
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="napr. Jarné prázdniny"
              />
            </Field>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Odstrániť voľno"
          onClose={() => setDeleteTarget(null)}
          foot={<>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Zrušiť
            </Button>
            <Button variant="danger" onClick={doDelete} disabled={deleting}>
              {deleting ? "Odstraňujem…" : "Odstrániť"}
            </Button>
          </>}
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj odstrániť voľno <strong>{formatRange(deleteTarget)}</strong>? Prevádzka
            bude v tieto dni opäť objednávať.
          </p>
        </Modal>
      )}
    </>
  );
};

export default PrevadzkaClosures;
