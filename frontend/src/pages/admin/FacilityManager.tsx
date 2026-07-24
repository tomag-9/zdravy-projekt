import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  Eye,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from "../../lib/logger";
import {
  PageHead,
  Card,
  Button,
  IconButton,
  Badge,
  SearchBox,
  Modal,
  Field,
  Input,
  Textarea,
  Toggle,
  Select,
} from "./ui";

interface Login {
  user_id: number;
  email: string;
  company_name: string;
  is_edupage: boolean;
  prevadzka_ids: number[];
}

interface Prevadzka {
  id: number;
  celok: number;
  celok_nazov: string;
  nazov: string;
  adresa: string;
  edupage_connection: number | null;
  edupage_connection_name: string | null;
  edupage_match: string;
  report_alias: string;
  delivery_note: string;
  sort_order: number;
  is_active: boolean;
  billing_portion_coefficients: Record<string, string>;
  orders_count: number | null;
  client_user_id: number | null;
}

interface EdupageConnection {
  id: number;
  name: string;
  mealsguest_url: string;
  api_identifier: string;
  is_active: boolean;
}

interface EdupageConnectionForm {
  name: string;
  mealsguest_url: string;
  api_identifier: string;
  is_active: boolean;
}

const EMPTY_CONNECTION: EdupageConnectionForm = {
  name: "",
  mealsguest_url: "",
  api_identifier: "",
  is_active: true,
};

interface Celok {
  id: number;
  nazov: string;
  billing_name: string;
  adresa: string;
  ico: string;
  dic: string;
  zdroj_objednavok: string;
  prevadzky_count: number;
  prevadzky: Prevadzka[];
  logins: Login[];
}

const API = import.meta.env.VITE_API_URL || "/api";

// ── Prevádzka form ──────────────────────────────────────────────
interface PrevadzkaForm {
  nazov: string;
  adresa: string;
  edupage_connection: number | null;
  edupage_match: string;
  report_alias: string;
  delivery_note: string;
  sort_order: number;
  is_active: boolean;
}
const EMPTY_PREVADZKA: PrevadzkaForm = {
  nazov: "",
  adresa: "",
  edupage_connection: null,
  edupage_match: "",
  report_alias: "",
  delivery_note: "",
  sort_order: 0,
  is_active: true,
};

// ── Celok form ──────────────────────────────────────────────────
interface CelokForm {
  nazov: string;
  billing_name: string;
  adresa: string;
  ico: string;
  dic: string;
  zdroj_objednavok: string;
}

// ── Login form ──────────────────────────────────────────────────
interface LoginForm {
  email: string;
  company_name: string;
}
const EMPTY_LOGIN: LoginForm = {
  email: "",
  company_name: "",
};

const PrevadzkaFields: React.FC<{
  form: PrevadzkaForm;
  setForm: React.Dispatch<React.SetStateAction<PrevadzkaForm>>;
  connections: EdupageConnection[];
  showEdupage: boolean;
}> = ({ form, setForm, connections, showEdupage }) => (
  <>
    <Field label="Názov prevádzky" req>
      <Input required value={form.nazov} onChange={(e) => setForm((f) => ({ ...f, nazov: e.target.value }))} />
    </Field>
    <Field label="Adresa výdaja">
      <Input value={form.adresa} onChange={(e) => setForm((f) => ({ ...f, adresa: e.target.value }))} />
    </Field>
    {showEdupage && (
      <Field label="EduPage spojenie">
        <Select
          value={form.edupage_connection ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, edupage_connection: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">Bez spojenia</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name}{connection.is_active ? "" : " (neaktívne)"}
            </option>
          ))}
        </Select>
      </Field>
    )}
    <Field label="Edupage match" hint="(prefix; ; oddeľuje viac)">
      <Input placeholder="napr. Les alebo mšHey; mšMal,Hey" value={form.edupage_match} onChange={(e) => setForm((f) => ({ ...f, edupage_match: e.target.value }))} />
    </Field>
    <Field label="Report alias" hint="(názov vo výkazoch)">
      <Input value={form.report_alias} onChange={(e) => setForm((f) => ({ ...f, report_alias: e.target.value }))} />
    </Field>
    <Field label="Poznámka k rozvozu">
      <Textarea rows={2} value={form.delivery_note} onChange={(e) => setForm((f) => ({ ...f, delivery_note: e.target.value }))} />
    </Field>
    <div className="zpa-grid-2">
      <Field label="Poradie">
        <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))} />
      </Field>
      <Field label="Aktívna">
        <Toggle on={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} ariaLabel="Aktívna prevádzka" />
      </Field>
    </div>
  </>
);

const LoginFields: React.FC<{
  form: LoginForm;
  setForm: React.Dispatch<React.SetStateAction<LoginForm>>;
}> = ({ form, setForm }) => (
  <>
    <Field label="Názov loginu" req>
      <Input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
    </Field>
    <Field label="Email" req>
      <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
    </Field>
  </>
);

const FacilityManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [celky, setCelky] = useState<Celok[]>([]);
  const [connections, setConnections] = useState<EdupageConnection[]>([]);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionEditorOpen, setConnectionEditorOpen] = useState(false);
  const [connectionTarget, setConnectionTarget] = useState<EdupageConnection | null>(null);
  const [connectionForm, setConnectionForm] = useState<EdupageConnectionForm>(EMPTY_CONNECTION);
  const [connectionSaving, setConnectionSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Prevádzka add/edit
  const [modalCelok, setModalCelok] = useState<Celok | null>(null);
  const [editTarget, setEditTarget] = useState<Prevadzka | null>(null);
  const [pForm, setPForm] = useState<PrevadzkaForm>(EMPTY_PREVADZKA);
  const [pSaving, setPSaving] = useState(false);

  // Prevádzka delete
  const [deleteTarget, setDeleteTarget] = useState<Prevadzka | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Celok edit
  const [celokEdit, setCelokEdit] = useState<Celok | null>(null);
  const [cForm, setCForm] = useState<CelokForm>({
    nazov: "",
    billing_name: "",
    adresa: "",
    ico: "",
    dic: "",
    zdroj_objednavok: "app",
  });
  const [cSaving, setCSaving] = useState(false);

  // Login add (target: celok, optional prevádzka)
  const [loginTarget, setLoginTarget] = useState<{ celok: Celok; prevadzka: Prevadzka | null } | null>(null);
  const [lForm, setLForm] = useState<LoginForm>(EMPTY_LOGIN);
  const [lSaving, setLSaving] = useState(false);

  const fetchCelky = useCallback(async () => {
    try {
      const [res, connectionsRes] = await Promise.all([
        apiFetch(`${API}/admin/celky/`),
        apiFetch(`${API}/admin/edupage-connections/`),
      ]);
      if (res.ok) {
        const data = await res.json();
        setCelky(Array.isArray(data) ? data : data.results || []);
      }
      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchCelky();
  }, [fetchCelky]);

  const openConnectionEditor = (connection: EdupageConnection | null) => {
    setConnectionsOpen(false);
    setConnectionTarget(connection);
    setConnectionForm(connection ? {
      name: connection.name,
      mealsguest_url: connection.mealsguest_url,
      api_identifier: connection.api_identifier,
      is_active: connection.is_active,
    } : { ...EMPTY_CONNECTION });
    setConnectionEditorOpen(true);
  };

  const closeConnectionEditor = () => {
    setConnectionEditorOpen(false);
    setConnectionTarget(null);
    setConnectionsOpen(true);
  };

  const saveConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    setConnectionSaving(true);
    try {
      const url = connectionTarget
        ? `${API}/admin/edupage-connections/${connectionTarget.id}/`
        : `${API}/admin/edupage-connections/`;
      const res = await apiFetch(url, {
        method: connectionTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(data?.mealsguest_url?.[0] || data?.error?.message || "Nepodarilo sa uložiť EduPage spojenie.");
        return;
      }
      success(connectionTarget ? "EduPage spojenie upravené." : "EduPage spojenie pridané.");
      await fetchCelky();
      closeConnectionEditor();
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri ukladaní EduPage spojenia.");
    } finally {
      setConnectionSaving(false);
    }
  };

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Prevádzka ──
  const openAddPrevadzka = (celok: Celok) => {
    setModalCelok(celok);
    setEditTarget(null);
    setPForm({ ...EMPTY_PREVADZKA });
  };
  const openEditPrevadzka = (celok: Celok, p: Prevadzka) => {
    setModalCelok(celok);
    setEditTarget(p);
    setPForm({
      nazov: p.nazov,
      adresa: p.adresa,
      edupage_connection: p.edupage_connection,
      edupage_match: p.edupage_match,
      report_alias: p.report_alias,
      delivery_note: p.delivery_note,
      sort_order: p.sort_order,
      is_active: p.is_active,
    });
  };
  const savePrevadzka = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCelok || !pForm.nazov.trim()) {
      toastError("Názov prevádzky je povinný.");
      return;
    }
    setPSaving(true);
    try {
      const url = editTarget ? `${API}/admin/facility-prevadzky/${editTarget.id}/` : `${API}/admin/facility-prevadzky/`;
      const res = await apiFetch(url, {
        method: editTarget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTarget ? pForm : { ...pForm, celok: modalCelok.id }),
      });
      if (res.ok) {
        success(editTarget ? "Prevádzka upravená." : "Prevádzka pridaná.");
        setExpanded((prev) => new Set(prev).add(modalCelok.id));
        setModalCelok(null);
        setEditTarget(null);
        fetchCelky();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.nazov?.[0] || data?.error?.message || "Nepodarilo sa uložiť prevádzku.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri ukladaní.");
    } finally {
      setPSaving(false);
    }
  };
  const doDeletePrevadzka = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API}/admin/facility-prevadzky/${deleteTarget.id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        success(`Prevádzka „${deleteTarget.nazov}“ bola odstránená.`);
        setDeleteTarget(null);
        fetchCelky();
      } else {
        toastError("Nepodarilo sa odstrániť prevádzku.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri odstraňovaní.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Celok edit ──
  const openEditCelok = (celok: Celok) => {
    setCelokEdit(celok);
    setCForm({
      nazov: celok.nazov,
      billing_name: celok.billing_name || "",
      adresa: celok.adresa || "",
      ico: celok.ico || "",
      dic: celok.dic || "",
      zdroj_objednavok: celok.zdroj_objednavok || "app",
    });
  };
  const saveCelok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celokEdit || !cForm.nazov.trim()) {
      toastError("Názov celku je povinný.");
      return;
    }
    setCSaving(true);
    try {
      const res = await apiFetch(`${API}/admin/celky/${celokEdit.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cForm),
      });
      if (res.ok) {
        success("Celok upravený.");
        setCelokEdit(null);
        fetchCelky();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.nazov?.[0] || data?.error?.message || "Nepodarilo sa uložiť celok.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri ukladaní.");
    } finally {
      setCSaving(false);
    }
  };

  // ── Login add ──
  const openAddLogin = (celok: Celok, prevadzka: Prevadzka | null) => {
    setLoginTarget({ celok, prevadzka });
    setLForm({ ...EMPTY_LOGIN, company_name: prevadzka?.nazov || celok.nazov });
  };
  const saveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTarget || !lForm.company_name.trim() || !lForm.email.trim()) {
      toastError("Názov a email loginu sú povinné.");
      return;
    }
    setLSaving(true);
    try {
      const body: Record<string, unknown> = {
        email: lForm.email,
        company_name: lForm.company_name,
        is_staff: false,
        is_active: true,
        celok: loginTarget.celok.id,
      };
      if (loginTarget.prevadzka) body.prevadzky = [loginTarget.prevadzka.id];
      const res = await apiFetch(`${API}/admin/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        success("Login bol vytvorený.");
        setExpanded((prev) => new Set(prev).add(loginTarget.celok.id));
        setLoginTarget(null);
        fetchCelky();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.error?.details?.email?.[0] || data?.email?.[0] || data?.error?.message || "Nepodarilo sa vytvoriť login.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri vytváraní loginu.");
    } finally {
      setLSaving(false);
    }
  };

  const term = searchTerm.toLowerCase();
  const filtered = celky.filter(
    (c) =>
      c.nazov.toLowerCase().includes(term) ||
      (c.billing_name ?? "").toLowerCase().includes(term) ||
      c.prevadzky.some((p) => p.nazov.toLowerCase().includes(term)),
  );

  return (
    <>
      <PageHead
        eyebrow="Prevádzky"
        title="Správa prevádzok"
        desc="Celky a ich prevádzky — rozbaľte celok pre správu prevádzok"
        actions={<Button variant="secondary" onClick={() => setConnectionsOpen(true)}>EduPage spojenia</Button>}
      />

      <div className="zpa-stack">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Hľadať celok alebo prevádzku…" />

        <Card pad={false} style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="c" style={{ color: "var(--ink-mute)", padding: 32 }}>Načítavam…</div>
          ) : filtered.length === 0 ? (
            <div className="c" style={{ color: "var(--ink-mute)", padding: 32 }}>Žiadne celky</div>
          ) : (
            <div className="zpa-celok-list">
              {filtered.map((celok) => {
                const open = expanded.has(celok.id);
                return (
                  <div key={celok.id} className="zpa-celok">
                    <div className={`zpa-celok-row${open ? " open" : ""}`}>
                      <button type="button" className="zpa-celok-toggle" onClick={() => toggle(celok.id)}>
                        <ChevronRight className="chev" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
                        <Building2 style={{ flexShrink: 0, opacity: 0.6 }} />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)" }}>{celok.nazov}</span>
                        <Badge tone="gray">
                          {celok.prevadzky_count} {celok.prevadzky_count === 1 ? "prevádzka" : "prevádzky"}
                        </Badge>
                        {celok.zdroj_objednavok === "edupage" && <Badge tone="teal">Edupage</Badge>}
                        {celok.logins.length > 0 && (
                          <Badge tone="honey"><Users size={12} style={{ verticalAlign: "-2px" }} /> {celok.logins.length}</Badge>
                        )}
                      </button>
                      <div className="zpa-celok-actions">
                        <IconButton onClick={() => openEditCelok(celok)} title="Upraviť celok" aria-label="Upraviť celok"><Pencil /></IconButton>
                        <IconButton onClick={() => openAddLogin(celok, null)} title="Pridať login" aria-label="Pridať login"><UserPlus /></IconButton>
                        <IconButton onClick={() => openAddPrevadzka(celok)} title="Pridať prevádzku" aria-label="Pridať prevádzku"><Plus /></IconButton>
                      </div>
                    </div>

                    {open && (
                      <div className="zpa-celok-body">
                        <table className="zpa-table">
                          <thead>
                            <tr>
                              <th>Prevádzka</th>
                              <th>Adresa</th>
                              <th>Edupage match</th>
                              <th className="r">Obj.</th>
                              <th className="r">Akcie</th>
                            </tr>
                          </thead>
                          <tbody>
                            {celok.prevadzky.length === 0 ? (
                              <tr><td colSpan={5} className="c" style={{ color: "var(--ink-mute)", padding: 16 }}>Žiadne prevádzky</td></tr>
                            ) : (
                              celok.prevadzky.map((p) => {
                                return (
                                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                                    <td>
                                      {p.nazov}
                                      {!p.is_active && <Badge tone="gray" style={{ marginLeft: 8 }}>neaktívna</Badge>}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.adresa || "—"}</td>
                                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.edupage_match || "—"}</td>
                                    <td className="r" style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.orders_count ?? "—"}</td>
                                    <td className="r">
                                      <div style={{ display: "inline-flex", gap: 4 }}>
                                        <Link to={`/admin/facilities/${p.id}`} className="zpa-iconbtn" title="Otvoriť detail" aria-label="Otvoriť detail">
                                          <Eye />
                                        </Link>
                                        <IconButton onClick={() => openAddLogin(celok, p)} title="Pridať login" aria-label="Pridať login"><UserPlus /></IconButton>
                                        <IconButton onClick={() => openEditPrevadzka(celok, p)} title="Upraviť" aria-label="Upraviť"><Pencil /></IconButton>
                                        <IconButton onClick={() => setDeleteTarget(p)} title="Odstrániť" aria-label="Odstrániť"><Trash2 /></IconButton>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                        <div style={{ padding: 12 }}>
                          <Button variant="secondary" onClick={() => openAddPrevadzka(celok)}><Plus /> Pridať prevádzku</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Prevádzka add/edit */}
      {modalCelok && (
        <Modal
          title={editTarget ? `Upraviť prevádzku — ${modalCelok.nazov}` : `Pridať prevádzku — ${modalCelok.nazov}`}
          onClose={() => { setModalCelok(null); setEditTarget(null); }}
          foot={<>
            <Button variant="ghost" onClick={() => { setModalCelok(null); setEditTarget(null); }}>Zrušiť</Button>
            <Button type="submit" form="prevadzka-form" disabled={pSaving}>{pSaving ? "Ukladám…" : editTarget ? "Uložiť" : "Pridať"}</Button>
          </>}
        >
          <form id="prevadzka-form" onSubmit={savePrevadzka} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <PrevadzkaFields
              form={pForm}
              setForm={setPForm}
              connections={connections}
              showEdupage={modalCelok.zdroj_objednavok === "edupage"}
            />
          </form>
        </Modal>
      )}

      {/* Celok edit */}
      {celokEdit && (
        <Modal
          title={`Upraviť celok — ${celokEdit.nazov}`}
          onClose={() => setCelokEdit(null)}
          foot={<>
            <Button variant="ghost" onClick={() => setCelokEdit(null)}>Zrušiť</Button>
            <Button type="submit" form="celok-form" disabled={cSaving}>{cSaving ? "Ukladám…" : "Uložiť"}</Button>
          </>}
        >
          <form id="celok-form" onSubmit={saveCelok} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Názov celku" req>
              <Input required value={cForm.nazov} onChange={(e) => setCForm((f) => ({ ...f, nazov: e.target.value }))} />
            </Field>
            <Field label="Fakturačný názov">
              <Input value={cForm.billing_name} onChange={(e) => setCForm((f) => ({ ...f, billing_name: e.target.value }))} />
            </Field>
            <Field label="Fakturačná adresa">
              <Input value={cForm.adresa} onChange={(e) => setCForm((f) => ({ ...f, adresa: e.target.value }))} />
            </Field>
            <div className="zpa-grid-2">
              <Field label="IČO">
                <Input value={cForm.ico} onChange={(e) => setCForm((f) => ({ ...f, ico: e.target.value }))} />
              </Field>
              <Field label="DIČ">
                <Input value={cForm.dic} onChange={(e) => setCForm((f) => ({ ...f, dic: e.target.value }))} />
              </Field>
            </div>
            <Field label="Zdroj objednávok">
              <Select value={cForm.zdroj_objednavok} onChange={(e) => setCForm((f) => ({ ...f, zdroj_objednavok: e.target.value }))}>
                <option value="app">Aplikácia</option>
                <option value="edupage">EduPage</option>
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {/* Login add */}
      {loginTarget && (
        <Modal
          title={loginTarget.prevadzka ? `Pridať login — ${loginTarget.prevadzka.nazov}` : `Pridať login — ${loginTarget.celok.nazov}`}
          onClose={() => setLoginTarget(null)}
          foot={<>
            <Button variant="ghost" onClick={() => setLoginTarget(null)}>Zrušiť</Button>
            <Button type="submit" form="login-form" disabled={lSaving}>{lSaving ? "Vytváram…" : "Vytvoriť login"}</Button>
          </>}
        >
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-3)" }}>
            {loginTarget.prevadzka
              ? `Login bude objednávať len za prevádzku „${loginTarget.prevadzka.nazov}“.`
              : `Login bude objednávať za celý celok „${loginTarget.celok.nazov}“ (všetky prevádzky).`}
          </p>
          <form id="login-form" onSubmit={saveLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <LoginFields form={lForm} setForm={setLForm} />
          </form>
        </Modal>
      )}

      {/* Prevádzka delete */}
      {deleteTarget && (
        <Modal
          title="Odstrániť prevádzku"
          onClose={() => setDeleteTarget(null)}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={<>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Zrušiť</Button>
            <Button variant="danger" onClick={doDeletePrevadzka} disabled={deleting}>{deleting ? "Odstraňujem…" : "Odstrániť"}</Button>
          </>}
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj odstrániť prevádzku <strong style={{ color: "var(--green-900)" }}>{deleteTarget.nazov}</strong>?
            {(deleteTarget.orders_count ?? 0) > 0 && (
              <> Táto akcia je nevratná a vymaže aj jej <strong>{deleteTarget.orders_count}</strong> objednávok.</>
            )}
          </p>
        </Modal>
      )}

      {connectionsOpen && (
        <Modal
          title="EduPage spojenia"
          onClose={() => setConnectionsOpen(false)}
          wide
          foot={<>
            <Button variant="ghost" onClick={() => setConnectionsOpen(false)}>Zavrieť</Button>
            <Button onClick={() => openConnectionEditor(null)}><Plus /> Pridať spojenie</Button>
          </>}
        >
          {connections.length === 0 ? (
            <div className="zpa-empty">Žiadne EduPage spojenia</div>
          ) : (
            <div>
              {connections.map((connection) => (
                <div key={connection.id} className="zpa-listrow" style={{ paddingInline: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="lr-ttl" style={{ textTransform: "none" }}>{connection.name}</div>
                    <div className="lr-sub" style={{ overflowWrap: "anywhere" }}>{connection.mealsguest_url}</div>
                  </div>
                  <Badge tone={connection.is_active ? "green" : "gray"}>
                    {connection.is_active ? "Aktívne" : "Neaktívne"}
                  </Badge>
                  <IconButton onClick={() => openConnectionEditor(connection)} title="Upraviť spojenie" aria-label="Upraviť spojenie">
                    <Pencil />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {connectionEditorOpen && (
        <Modal
          title={connectionTarget ? "Upraviť EduPage spojenie" : "Pridať EduPage spojenie"}
          onClose={closeConnectionEditor}
          foot={<>
            <Button variant="ghost" onClick={closeConnectionEditor}>Zrušiť</Button>
            <Button type="submit" form="edupage-connection-form" disabled={connectionSaving}>
              {connectionSaving ? "Ukladám…" : "Uložiť"}
            </Button>
          </>}
        >
          <form id="edupage-connection-form" onSubmit={saveConnection} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Názov" req>
              <Input required value={connectionForm.name} onChange={(e) => setConnectionForm((form) => ({ ...form, name: e.target.value }))} />
            </Field>
            <Field label="mealsGuest URL" req>
              <Input required type="url" value={connectionForm.mealsguest_url} onChange={(e) => setConnectionForm((form) => ({ ...form, mealsguest_url: e.target.value }))} />
            </Field>
            <Field label="API identifikátor">
              <Input value={connectionForm.api_identifier} onChange={(e) => setConnectionForm((form) => ({ ...form, api_identifier: e.target.value }))} />
            </Field>
            <Field label="Aktívne">
              <Toggle on={connectionForm.is_active} onChange={(value) => setConnectionForm((form) => ({ ...form, is_active: value }))} ariaLabel="Aktívne EduPage spojenie" />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
};

export default FacilityManager;
