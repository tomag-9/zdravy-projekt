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
  Toggle,
  Select,
} from "./ui";
import { LoginFields, type Login, type LoginForm } from "./facility/LoginFields";
import { PrevadzkaFields, type Prevadzka, type PrevadzkaForm } from "./facility/PrevadzkaFields";
import { EMPTY_LOGIN, EMPTY_PREVADZKA } from "./facility/constants";
import { normalizeForSearch } from "../../lib/searchNormalize";

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

// ── Celok form ──────────────────────────────────────────────────
interface CelokForm {
  nazov: string;
  billing_name: string;
  adresa: string;
  ico: string;
  dic: string;
  zdroj_objednavok: string;
}

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

  // Prevádzka add
  const [modalCelok, setModalCelok] = useState<Celok | null>(null);
  const [pForm, setPForm] = useState<PrevadzkaForm>(EMPTY_PREVADZKA);
  const [pSaving, setPSaving] = useState(false);

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

  // Login list/add/edit/delete at celok level
  const [loginListTarget, setLoginListTarget] = useState<Celok | null>(null);
  const [loginTarget, setLoginTarget] = useState<Celok | null>(null);
  const [loginEditTarget, setLoginEditTarget] = useState<Login | null>(null);
  const [loginDeleteTarget, setLoginDeleteTarget] = useState<Login | null>(null);
  const [lForm, setLForm] = useState<LoginForm>(EMPTY_LOGIN);
  const [lSaving, setLSaving] = useState(false);
  const [loginDeleting, setLoginDeleting] = useState(false);

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
    setPForm({ ...EMPTY_PREVADZKA });
  };
  const savePrevadzka = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCelok || !pForm.nazov.trim()) {
      toastError("Názov prevádzky je povinný.");
      return;
    }
    setPSaving(true);
    try {
      const res = await apiFetch(`${API}/admin/facility-prevadzky/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pForm, celok: modalCelok.id }),
      });
      if (res.ok) {
        success("Prevádzka pridaná.");
        setExpanded((prev) => new Set(prev).add(modalCelok.id));
        setModalCelok(null);
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

  // ── Login ──
  const openAddLogin = (celok: Celok) => {
    setLoginEditTarget(null);
    setLoginTarget(celok);
    setLForm({ ...EMPTY_LOGIN, company_name: celok.nazov });
  };
  const openEditLogin = (celok: Celok, login: Login) => {
    setLoginListTarget(null);
    setLoginEditTarget(login);
    setLoginTarget(celok);
    setLForm({ email: login.email, company_name: login.company_name });
  };
  const closeLoginEditor = () => {
    setLoginTarget(null);
    setLoginEditTarget(null);
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
        celok: loginTarget.id,
      };
      if (loginEditTarget) {
        body.prevadzky = loginEditTarget.prevadzka_ids;
      }
      const res = await apiFetch(
        loginEditTarget ? `${API}/admin/users/${loginEditTarget.user_id}/` : `${API}/admin/users/`,
        {
        method: loginEditTarget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        success(loginEditTarget ? "Login bol upravený." : "Login bol vytvorený.");
        setExpanded((prev) => new Set(prev).add(loginTarget.id));
        closeLoginEditor();
        fetchCelky();
      } else {
        const data = await res.json().catch(() => ({}));
        toastError(data?.error?.details?.email?.[0] || data?.email?.[0] || data?.error?.message || "Nepodarilo sa uložiť login.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri ukladaní loginu.");
    } finally {
      setLSaving(false);
    }
  };

  const doDeleteLogin = async () => {
    if (!loginDeleteTarget) return;
    setLoginDeleting(true);
    try {
      const res = await apiFetch(`${API}/admin/users/${loginDeleteTarget.user_id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        success(`Login „${loginDeleteTarget.email}“ bol odstránený.`);
        setLoginDeleteTarget(null);
        setLoginListTarget(null);
        fetchCelky();
      } else {
        toastError("Nepodarilo sa odstrániť login.");
      }
    } catch (err) {
      logger.error(err);
      toastError("Chyba pri odstraňovaní loginu.");
    } finally {
      setLoginDeleting(false);
    }
  };

  const term = normalizeForSearch(searchTerm);
  const filtered = celky.filter(
    (c) =>
      normalizeForSearch(c.nazov).includes(term) ||
      normalizeForSearch(c.billing_name ?? "").includes(term) ||
      c.prevadzky.some((p) => normalizeForSearch(p.nazov).includes(term)),
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
                      </button>
                      {celok.logins.length > 0 && (
                        <Badge
                          tone="honey"
                          role="button"
                          tabIndex={0}
                          aria-label={`Zobraziť loginy celku ${celok.nazov}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => setLoginListTarget(celok)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setLoginListTarget(celok);
                            }
                          }}
                        >
                          <Users size={12} style={{ verticalAlign: "-2px" }} /> {celok.logins.length}
                        </Badge>
                      )}
                      <div className="zpa-celok-actions">
                        <IconButton onClick={() => openEditCelok(celok)} title="Upraviť celok" aria-label="Upraviť celok"><Pencil /></IconButton>
                        <IconButton onClick={() => openAddLogin(celok)} title="Pridať login" aria-label="Pridať login"><UserPlus /></IconButton>
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
                              celok.prevadzky.map((p) => (
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
                                      </div>
                                    </td>
                                  </tr>
                              ))
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

      {/* Prevádzka add */}
      {modalCelok && (
        <Modal
          title={`Pridať prevádzku — ${modalCelok.nazov}`}
          onClose={() => setModalCelok(null)}
          foot={<>
            <Button variant="ghost" onClick={() => setModalCelok(null)}>Zrušiť</Button>
            <Button type="submit" form="prevadzka-form" disabled={pSaving}>{pSaving ? "Ukladám…" : "Pridať"}</Button>
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

      {/* Login list */}
      {loginListTarget && (
          <Modal
            title={`Loginy — ${loginListTarget.nazov}`}
            onClose={() => setLoginListTarget(null)}
            wide
            foot={<Button variant="ghost" onClick={() => setLoginListTarget(null)}>Zavrieť</Button>}
          >
            {loginListTarget.logins.map((login) => (
              <div key={login.user_id} className="zpa-listrow" style={{ paddingInline: 0 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="lr-ttl" style={{ textTransform: "none" }}>{login.company_name || login.email}</div>
                  <div className="lr-sub">{login.email}</div>
                </div>
                {login.is_edupage && <Badge tone="teal">EduPage</Badge>}
                <IconButton
                  onClick={() => openEditLogin(loginListTarget, login)}
                  title="Upraviť login"
                  aria-label={`Upraviť login ${login.email}`}
                >
                  <Pencil />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setLoginListTarget(null);
                    setLoginDeleteTarget(login);
                  }}
                  title="Odstrániť login"
                  aria-label={`Odstrániť login ${login.email}`}
                >
                  <Trash2 />
                </IconButton>
              </div>
            ))}
          </Modal>
      )}

      {/* Login add/edit */}
      {loginTarget && (
        <Modal
          title={loginEditTarget
            ? `Upraviť login — ${loginEditTarget.email}`
            : `Pridať login — ${loginTarget.nazov}`}
          onClose={closeLoginEditor}
          foot={<>
            <Button variant="ghost" onClick={closeLoginEditor}>Zrušiť</Button>
            <Button type="submit" form="login-form" disabled={lSaving}>
              {lSaving ? "Ukladám…" : loginEditTarget ? "Uložiť" : "Vytvoriť login"}
            </Button>
          </>}
        >
          {!loginEditTarget && (
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-3)" }}>
              Login bude objednávať za celý celok „{loginTarget.nazov}“ (všetky prevádzky).
            </p>
          )}
          <form id="login-form" onSubmit={saveLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <LoginFields form={lForm} setForm={setLForm} />
          </form>
        </Modal>
      )}

      {/* Login delete */}
      {loginDeleteTarget && (
        <Modal
          title="Odstrániť login"
          onClose={() => setLoginDeleteTarget(null)}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={<>
            <Button variant="ghost" onClick={() => setLoginDeleteTarget(null)} disabled={loginDeleting}>Zrušiť</Button>
            <Button variant="danger" onClick={doDeleteLogin} disabled={loginDeleting}>
              {loginDeleting ? "Odstraňujem…" : "Odstrániť"}
            </Button>
          </>}
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Naozaj odstrániť login <strong style={{ color: "var(--green-900)" }}>{loginDeleteTarget.email}</strong>?
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
