import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { fetchAllPages } from '../../lib/pagination';
import { PageHead, Card, Button, IconButton, SearchBox, TableWrap, Modal, Field, Input } from "./ui";

interface AdUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  role?: ManagedRole;
}

/** Role spravované na tejto obrazovke (#483). Klienti sem nepatria. */
type ManagedRole = 'admin' | 'superadmin' | 'kuchyna';

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: 'Admin',
  superadmin: 'Superadmin',
  kuchyna: 'Kuchyňa',
};

/** Kuchyňa nie je `is_staff` — do admin rozhrania nevidí, má vlastnú cestu. */
/** Mapovanie na existujúce badge modifikátory v admin.css. */
const ROLE_BADGE: Record<ManagedRole, string> = {
  admin: 'zpa-badge--green',
  superadmin: 'zpa-badge--peach',
  kuchyna: 'zpa-badge--teal',
};

const ROLE_IS_STAFF: Record<ManagedRole, boolean> = {
  admin: true,
  superadmin: true,
  kuchyna: false,
};

interface AdminCreateForm {
  email: string;
  first_name: string;
  last_name: string;
  role: ManagedRole;
}

const EMPTY_ADMIN_FORM: AdminCreateForm = {
  email: "",
  first_name: "",
  last_name: "",
  role: "admin",
};

const AdminUserList: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<AdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create modals
  const [createMode, setCreateMode] = useState<"admin" | null>(null);
  const [adminForm, setAdminForm] = useState<AdminCreateForm>(EMPTY_ADMIN_FORM);
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      // Dva dopyty: kuchyňa nie je `is_staff`, takže by ju prvý filter minul.
      const base = `${import.meta.env.VITE_API_URL || "/api"}/admin/users/`;
      const [staff, kuchyna] = await Promise.all([
        fetchAllPages<AdUser>(apiFetch, `${base}?is_staff=true&page_size=100`),
        fetchAllPages<AdUser>(apiFetch, `${base}?role=kuchyna&page_size=100`),
      ]);
      const byId = new Map<number, AdUser>();
      for (const u of [...staff, ...kuchyna]) byId.set(u.id, u);
      setUsers([...byId.values()].sort((a, b) => a.email.localeCompare(b.email)));
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
          body: JSON.stringify({
            ...adminForm,
            is_staff: ROLE_IS_STAFF[adminForm.role],
            is_active: true,
          }),
        },
      );
      if (res.ok) {
        success(`${ROLE_LABELS[adminForm.role]} účet bol úspešne vytvorený.`);
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
        title="Správa prístupov"
        desc="Spravujte admin, superadmin a kuchyňa účty a ich prístupové údaje."
        actions={
          <Button onClick={() => { setCreateMode("admin"); setAdminForm(EMPTY_ADMIN_FORM); }}>
            <Plus /> Pridať účet
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
                  <th>Účet</th>
                  <th>Rola</th>
                  <th className="r">Akcie</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="c" style={{ color: "var(--ink-mute)", padding: "32px" }}>Načítavam…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={3} className="c" style={{ color: "var(--ink-mute)", padding: "32px" }}>Žiadne účty</td></tr>
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
                      <td>
                        {(() => {
                          // `role` môže chýbať, kým beží staršia verzia backendu.
                          const r = user.role ?? (user.is_staff ? "admin" : "kuchyna");
                          return <span className={`zpa-badge ${ROLE_BADGE[r]}`}>{ROLE_LABELS[r]}</span>;
                        })()}
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
          title="Pridať účet"
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
            <Field label="Rola" req>
              <select
                className="zpa-input"
                value={adminForm.role}
                onChange={(e) => setAdminForm((f) => ({ ...f, role: e.target.value as ManagedRole }))}
              >
                {(Object.keys(ROLE_LABELS) as ManagedRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
            <p style={{ fontSize: 12.5, color: "var(--ink-mute)", margin: 0 }}>
              {adminForm.role === "kuchyna"
                ? "Kuchyňa vidí len prehľad nakladania, nie admin sekcie."
                : adminForm.role === "superadmin"
                  ? "Superadmin má navyše správu prístupov, logy a systémové nastavenia."
                  : "Admin nevidí správu prístupov, logy ani systémové nastavenia."}
              {" "}Účet dostane email s odkazom na nastavenie hesla.
            </p>
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
