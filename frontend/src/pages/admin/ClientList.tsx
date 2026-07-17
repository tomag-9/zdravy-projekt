import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Settings, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Card, Button, IconButton, SearchBox, TableWrap, Modal, Field, Input, Checkbox } from "./ui";

interface AdUser {
  id: number;
  email: string;
  profile?: { company_name: string; billing_name: string };
  is_active: boolean;
  is_staff: boolean;
}

interface OperationForm {
  email: string;
  company_name: string;
  billing_name: string;
  ico: string;
  dic: string;
  is_edupage: boolean;
  api_identifier: string;
  mealsguest_url: string;
}

const EMPTY_OPERATION_FORM: OperationForm = {
  email: "",
  company_name: "",
  billing_name: "",
  ico: "",
  dic: "",
  is_edupage: false,
  api_identifier: "",
  mealsguest_url: "",
};

interface OperationFieldsProps {
  form: OperationForm;
  setForm: React.Dispatch<React.SetStateAction<OperationForm>>;
  source: "create" | "edit";
  testingUrl: "create" | "edit" | null;
  urlTestResult: { ok: boolean; message: string } | null;
  onClearUrlTestResult: () => void;
  onTestMealsguestUrl: (url: string, source: "create" | "edit") => void;
}

const OperationFields: React.FC<OperationFieldsProps> = ({
  form,
  setForm,
  source,
  testingUrl,
  urlTestResult,
  onClearUrlTestResult,
  onTestMealsguestUrl,
}) => (
  <>
    <Field label="Názov prevádzky" req hint="(interný)">
      <Input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
    </Field>
    <Field label="Názov spoločnosti" hint="(fakturácia)">
      <Input value={form.billing_name} onChange={(e) => setForm((f) => ({ ...f, billing_name: e.target.value }))} />
    </Field>
    <Field label="Email" req>
      <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
    </Field>
    <div className="zpa-grid-2">
      <Field label="IČO">
        <Input value={form.ico} onChange={(e) => setForm((f) => ({ ...f, ico: e.target.value }))} />
      </Field>
      <Field label="DIČ">
        <Input value={form.dic} onChange={(e) => setForm((f) => ({ ...f, dic: e.target.value }))} />
      </Field>
    </div>
    <Checkbox
      on={form.is_edupage}
      onChange={(v) => {
        setForm((f) => ({ ...f, is_edupage: v, ...(!v && { api_identifier: "", mealsguest_url: "" }) }));
        onClearUrlTestResult();
      }}
    >
      Edupage prevádzka
    </Checkbox>
    {form.is_edupage && (
      <>
        <Field label="Edupage identifikátor">
          <Input
            placeholder="Identifikátor pre párovanie v Edupage súboroch"
            value={form.api_identifier}
            onChange={(e) => setForm((f) => ({ ...f, api_identifier: e.target.value }))}
          />
        </Field>
        <Field label="MealsGuest URL">
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              placeholder="https://skola.edupage.org/menu/mealsGuest?id=TOKEN"
              value={form.mealsguest_url}
              onChange={(e) => {
                setForm((f) => ({ ...f, mealsguest_url: e.target.value }));
                onClearUrlTestResult();
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={testingUrl === source}
              onClick={() => onTestMealsguestUrl(form.mealsguest_url, source)}
            >
              {testingUrl === source ? "Testujem…" : "Test"}
            </Button>
          </div>
          {urlTestResult && (
            <p style={{ marginTop: 6, fontSize: 12, color: urlTestResult.ok ? "var(--green-600)" : "var(--coral-600)" }}>
              {urlTestResult.message}
            </p>
          )}
        </Field>
      </>
    )}
  </>
);

const ClientList: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<AdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [clientForm, setClientForm] = useState<OperationForm>(EMPTY_OPERATION_FORM);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const editRequestRef = useRef<number | null>(null);
  const [editTarget, setEditTarget] = useState<AdUser | null>(null);
  const [editForm, setEditForm] = useState<OperationForm>(EMPTY_OPERATION_FORM);
  const [saving, setSaving] = useState(false);
  const [testingUrl, setTestingUrl] = useState<"create" | "edit" | null>(null);
  const [urlTestResult, setUrlTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AdUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setUsers(list.filter((u: AdUser) => u.is_staff === false));
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.email.trim()) { toastError("Email je povinný."); return; }
    setCreating(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...clientForm, is_staff: false, is_active: true }),
      });
      if (res.ok) {
        success("Prevádzka bola úspešne vytvorená.");
        setShowCreate(false);
        setClientForm(EMPTY_OPERATION_FORM);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.error?.details?.email?.[0] || data?.error?.message || "Nepodarilo sa vytvoriť prevádzku.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri vytváraní prevádzky.");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = async (user: AdUser) => {
    setEditTarget(user);
    setEditForm({
      ...EMPTY_OPERATION_FORM,
      email: user.email,
      company_name: user.profile?.company_name || "",
      billing_name: user.profile?.billing_name || "",
    });
    setUrlTestResult(null);
    editRequestRef.current = user.id;
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/${user.id}/`);
      if (!res.ok) return;
      const data = await res.json();
      if (editRequestRef.current !== user.id) return;
      setEditForm({
        email: data.email,
        company_name: data.profile?.company_name || "",
        billing_name: data.profile?.billing_name || "",
        ico: data.profile?.ico || "",
        dic: data.profile?.dic || "",
        is_edupage: data.profile?.is_edupage ?? false,
        api_identifier: data.profile?.api_identifier || "",
        mealsguest_url: data.profile?.mealsguest_url || "",
      });
      setUrlTestResult(null);
    } catch (e) {
      logger.error(e);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/${editTarget.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        success("Prevádzka bola upravená.");
        setEditTarget(null);
        fetchUsers();
      } else {
        toastError("Nepodarilo sa upraviť prevádzku.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri ukladaní.");
    } finally {
      setSaving(false);
    }
  };

  const testMealsguestUrl = async (url: string, source: "create" | "edit") => {
    if (!url.trim()) { setUrlTestResult({ ok: false, message: "URL je prázdna." }); return; }
    setTestingUrl(source);
    setUrlTestResult(null);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/edupage-uploads/test-url/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setUrlTestResult({ ok: true, message: `✓ OK — ${data.total_portions} porcií (${(data.meals || []).join(", ")})${data.warnings?.length ? ` · ${data.warnings.join("; ")}` : ""}` });
      } else {
        setUrlTestResult({ ok: false, message: data.error || "Nepodarilo sa načítať URL." });
      }
    } catch {
      setUrlTestResult({ ok: false, message: "Chyba siete." });
    } finally {
      setTestingUrl(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        success(`Prevádzka „${deleteTarget.profile?.company_name || deleteTarget.email}“ bola odstránená.`);
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        toastError("Nepodarilo sa odstrániť prevádzku.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri odstraňovaní.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.profile?.company_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.profile?.billing_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <PageHead
        eyebrow="Prevádzky"
        title="Správa prevádzok"
        desc="Nastavenia jedál a menu pre prevádzky"
        actions={
          <Button onClick={() => { setShowCreate(true); setClientForm(EMPTY_OPERATION_FORM); }}>
            <Plus /> Pridať prevádzku
          </Button>
        }
      />

      <div className="zpa-stack">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Hľadať prevádzky…" />

        <Card style={{ overflow: "hidden" }}>
          <TableWrap>
            <table className="zpa-table">
              <thead>
                <tr>
                  <th>Prevádzka</th>
                  <th className="r">Akcie</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="c" style={{ color: "var(--ink-mute)", padding: 32 }}>Načítavam prevádzky…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={2} className="c" style={{ color: "var(--ink-mute)", padding: 32 }}>Žiadne prevádzky</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="zpa-avatar-sm">{user.email.charAt(0).toUpperCase()}</span>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>
                              {user.profile?.company_name || user.email}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{user.email}</div>
                            {user.profile?.billing_name && (
                              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Fakturácia: {user.profile.billing_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="r">
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <IconButton onClick={() => openEdit(user)} title="Upraviť" aria-label="Upraviť">
                            <Pencil />
                          </IconButton>
                          <Link to={`/admin/clients/${user.id}`} title="Nastavenia" aria-label="Nastavenia" className="zpa-iconbtn">
                            <Settings />
                          </Link>
                          <IconButton onClick={() => setDeleteTarget(user)} title="Odstrániť" aria-label="Odstrániť">
                            <Trash2 />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>

      {/* ── Create operation modal ── */}
      {showCreate && (
        <Modal
          title="Pridať prevádzku"
          onClose={() => setShowCreate(false)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Zrušiť</Button>
              <Button type="submit" form="create-op-form" disabled={creating}>
                {creating ? "Vytváram…" : "Pridať"}
              </Button>
            </>
          }
        >
          <form id="create-op-form" onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <OperationFields
              form={clientForm}
              setForm={setClientForm}
              source="create"
              testingUrl={testingUrl}
              urlTestResult={urlTestResult}
              onClearUrlTestResult={() => setUrlTestResult(null)}
              onTestMealsguestUrl={testMealsguestUrl}
            />
          </form>
        </Modal>
      )}

      {/* ── Edit operation modal ── */}
      {editTarget && (
        <Modal
          title="Upraviť prevádzku"
          onClose={() => setEditTarget(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setEditTarget(null)}>Zrušiť</Button>
              <Button type="submit" form="edit-op-form" disabled={saving}>
                {saving ? "Ukladám…" : "Uložiť"}
              </Button>
            </>
          }
        >
          <form id="edit-op-form" onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <OperationFields
              form={editForm}
              setForm={setEditForm}
              source="edit"
              testingUrl={testingUrl}
              urlTestResult={urlTestResult}
              onClearUrlTestResult={() => setUrlTestResult(null)}
              onTestMealsguestUrl={testMealsguestUrl}
            />
          </form>
        </Modal>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <Modal
          title="Odstrániť prevádzku"
          onClose={() => setDeleteTarget(null)}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Zrušiť</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Odstraňujem…" : "Odstrániť"}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj chcete odstrániť prevádzku <strong style={{ color: "var(--green-900)" }}>{deleteTarget.profile?.company_name || deleteTarget.email}</strong>?
            Táto akcia je nevratná a vymaže aj všetky jej objednávky.
          </p>
        </Modal>
      )}
    </>
  );
};

export default ClientList;
