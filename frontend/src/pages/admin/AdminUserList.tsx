import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { PageHead, Card, Button, IconButton, SearchBox, TableWrap, Modal, Field, Input, Checkbox } from "./ui";

interface AdUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
}

interface AdminCreateForm {
  email: string;
  first_name: string;
  last_name: string;
}

interface ClientCreateForm {
  email: string;
  company_name: string;
  billing_name: string;
  is_edupage: boolean;
  api_identifier: string;
}

const EMPTY_ADMIN_FORM: AdminCreateForm = {
  email: "",
  first_name: "",
  last_name: "",
};

const EMPTY_CLIENT_FORM: ClientCreateForm = {
  email: "",
  company_name: "",
  billing_name: "",
  is_edupage: false,
  api_identifier: "",
};

const AdminUserList: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<AdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create modals
  const [createMode, setCreateMode] = useState<"admin" | "client" | null>(null);
  const [adminForm, setAdminForm] = useState<AdminCreateForm>(EMPTY_ADMIN_FORM);
  const [clientForm, setClientForm] = useState<ClientCreateForm>(EMPTY_CLIENT_FORM);
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/`,
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setUsers(list.filter((u: AdUser) => u.is_staff === true)); // Show only admins
      } else {
        logger.error("Failed to fetch users");
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.email.trim()) {
      toastError("Email je povinný.");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...adminForm, is_staff: true, is_active: true }),
        },
      );
      if (res.ok) {
        success("Admin účet bol úspešne vytvorený.");
        setCreateMode(null);
        setAdminForm(EMPTY_ADMIN_FORM);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.error?.details?.email?.[0] || data?.error?.message || "Nepodarilo sa vytvoriť účet.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri vytváraní účtu.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.email.trim()) {
      toastError("Email je povinný.");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...clientForm, is_staff: false, is_active: true }),
        },
      );
      if (res.ok) {
        success("Prevádzka bola úspešne vytvorená.");
        setCreateMode(null);
        setClientForm(EMPTY_CLIENT_FORM);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.error?.details?.email?.[0] || data?.error?.message || "Nepodarilo sa vytvoriť účet.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri vytváraní účtu.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${deleteTarget.id}/`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 204) {
        success(`Účet „${deleteTarget.email}“ bol vymazaný.`);
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        toastError("Nepodarilo sa vymazať účet.");
      }
    } catch (e) {
      logger.error(e);
      toastError("Chyba pri mazaní účtu.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.first_name + " " + u.last_name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <PageHead
        eyebrow="Oprávnenia"
        title="Správa adminov"
        desc="Spravujte admin účty a ich prístupové údaje."
        actions={
          <Button onClick={() => { setCreateMode("admin"); setAdminForm(EMPTY_ADMIN_FORM); }}>
            <Plus /> Pridať admina
          </Button>
        }
      />

      <div className="zpa-stack">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Hľadať používateľov…" />

        <Card style={{ overflow: "hidden" }}>
          <TableWrap>
            <table className="zpa-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th className="r">Akcie</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="c" style={{ color: "var(--ink-mute)", padding: "32px" }}>Načítavam…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={2} className="c" style={{ color: "var(--ink-mute)", padding: "32px" }}>Žiadni admini</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="zpa-avatar-sm">{user.email.charAt(0).toUpperCase()}</span>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>
                              {user.first_name || user.last_name
                                ? `${user.first_name} ${user.last_name}`.trim()
                                : user.email}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="r">
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <Link to={`/admin/roles/${user.id}`} title="Upraviť" aria-label="Upraviť" className="zpa-iconbtn">
                            <Pencil />
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

      {/* ── Create admin modal ── */}
      {createMode === "admin" && (
        <Modal
          title="Pridať admina"
          onClose={() => setCreateMode(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setCreateMode(null)}>Zrušiť</Button>
              <Button type="submit" form="create-admin-form" disabled={creating}>
                {creating ? "Vytváram…" : "Vytvoriť"}
              </Button>
            </>
          }
        >
          <form id="create-admin-form" onSubmit={handleCreateAdmin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="zpa-grid-2">
              <Field label="Meno">
                <Input value={adminForm.first_name} onChange={(e) => setAdminForm((f) => ({ ...f, first_name: e.target.value }))} />
              </Field>
              <Field label="Priezvisko">
                <Input value={adminForm.last_name} onChange={(e) => setAdminForm((f) => ({ ...f, last_name: e.target.value }))} />
              </Field>
            </div>
            <Field label="Email" req>
              <Input type="email" required value={adminForm.email} onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <p style={{ fontSize: 12.5, color: "var(--ink-mute)", margin: 0 }}>
              Admin dostane email s odkazom na nastavenie hesla.
            </p>
          </form>
        </Modal>
      )}

      {/* ── Create operation modal ── */}
      {createMode === "client" && (
        <Modal
          title="Pridať prevádzku"
          onClose={() => setCreateMode(null)}
          foot={
            <>
              <Button variant="ghost" onClick={() => setCreateMode(null)}>Zrušiť</Button>
              <Button type="submit" form="create-client-form" disabled={creating}>
                {creating ? "Vytváram…" : "Vytvoriť"}
              </Button>
            </>
          }
        >
          <form id="create-client-form" onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Názov prevádzky" req hint="(interný)">
              <Input type="text" required value={clientForm.company_name} onChange={(e) => setClientForm((f) => ({ ...f, company_name: e.target.value }))} />
            </Field>
            <Field label="Názov spoločnosti" hint="(fakturácia)">
              <Input value={clientForm.billing_name} onChange={(e) => setClientForm((f) => ({ ...f, billing_name: e.target.value }))} />
            </Field>
            <Field label="Email" req>
              <Input type="email" required value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Checkbox on={clientForm.is_edupage} onChange={(v) => setClientForm((f) => ({ ...f, is_edupage: v, api_identifier: "" }))}>
              Edupage prevádzka
            </Checkbox>
            {clientForm.is_edupage && (
              <Field label="Edupage identifikátor">
                <Input placeholder="Identifikátor pre párovanie v Edupage súboroch" value={clientForm.api_identifier} onChange={(e) => setClientForm((f) => ({ ...f, api_identifier: e.target.value }))} />
              </Field>
            )}
          </form>
        </Modal>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <Modal
          title="Vymazať účet"
          onClose={() => setDeleteTarget(null)}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Zrušiť</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Mažem…" : "Vymazať"}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj chcete vymazať účet <strong style={{ color: "var(--green-900)" }}>{deleteTarget.email}</strong>? Táto akcia je nevratná a vymaže aj všetky jeho objednávky.
          </p>
        </Modal>
      )}
    </>
  );
};

export default AdminUserList;
