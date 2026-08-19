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
  Send,
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
import { LoginPasswordStatusBadge } from "./facility/LoginPasswordStatus";
import { resendLoginInvite } from "./facility/loginInvite";
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

// Issue #504 — zoznam celkov sa renderoval celý naraz, bez stránkovania.
// Zoznam ide cez jeden (cachovaný) API request, takže stránkovanie je len
// klientske — netreba pre pár desiatok celkov riešiť server-side limit/offset.
const CELKY_PAGE_SIZE = 20;

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
  const [page, setPage] = useState(1);

  // Prevádzka add
  const [modalCelok, setModalCelok] = useState<Celok | null>(null);
  const [pForm, setPForm] = useState<PrevadzkaForm>(EMPTY_PREVADZKA);
  const [pSaving, setPSaving] = useState(false);

  // Celok create/edit — rovnaký formulár (cForm), rozlíšené cez celokCreateOpen.
  const [celokEdit, setCelokEdit] = useState<Celok | null>(null);
  const [celokCreateOpen, setCelokCreateOpen] = useState(false);
  const [cForm, setCForm] = useState<CelokForm>({
    nazov: "",
    billing_name: "",
    adresa: "",
    ico: "",
    dic: "",
    zdroj_objednavok: "app",
  });
  const [cSaving, setCSaving] = useState(false);
  // Onboarding nového celku (issue #463): po vytvorení celku rovno navedieme
  // admina cez existujúce "pridať prevádzku" a "pridať login" modály, aby
  // založenie novej škôlky nevyžadovalo prepínanie do django shellu.
  const [onboardingCelokId, setOnboardingCelokId] = useState<number | null>(null);

  // Celok delete
  const [celokDeleteTarget, setCelokDeleteTarget] = useState<Celok | null>(null);
  const [celokDeleting, setCelokDeleting] = useState(false);
  const [celokDeleteError, setCelokDeleteError] = useState("");

  // Login list/add/edit/delete at celok level
  const [loginListTarget, setLoginListTarget] = useState<Celok | null>(null);
  const [loginTarget, setLoginTarget] = useState<Celok | null>(null);
  const [loginEditTarget, setLoginEditTarget] = useState<Login | null>(null);
  const [loginDeleteTarget, setLoginDeleteTarget] = useState<Login | null>(null);
  const [lForm, setLForm] = useState<LoginForm>(EMPTY_LOGIN);
  const [lSaving, setLSaving] = useState(false);
  const [loginDeleting, setLoginDeleting] = useState(false);
  const [resendingLoginId, setResendingLoginId] = useState<number | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

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
  const closeAddPrevadzka = () => {
    if (modalCelok && onboardingCelokId === modalCelok.id) setOnboardingCelokId(null);
    setModalCelok(null);
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
        const onboardingTarget = onboardingCelokId === modalCelok.id ? modalCelok : null;
        setModalCelok(null);
        await fetchCelky();
        if (onboardingTarget) {
          // Onboarding nového celku (issue #463) pokračuje pridaním prvého loginu.
          openAddLogin(onboardingTarget);
        } else {
          setOnboardingCelokId(null);
        }
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
  // ── Celok create/edit ──
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
  const openCreateCelok = () => {
    setCForm({ nazov: "", billing_name: "", adresa: "", ico: "", dic: "", zdroj_objednavok: "app" });
    setCelokCreateOpen(true);
  };
  const closeCelokModal = () => {
    setCelokEdit(null);
    setCelokCreateOpen(false);
  };
  const saveCelok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cForm.nazov.trim()) {
      toastError("Názov celku je povinný.");
      return;
    }
    setCSaving(true);
    try {
      const url = celokCreateOpen ? `${API}/admin/celky/` : `${API}/admin/celky/${celokEdit!.id}/`;
      const res = await apiFetch(url, {
        method: celokCreateOpen ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cForm),
      });
      if (res.ok) {
        const data: Celok = await res.json();
        closeCelokModal();
        await fetchCelky();
        if (celokCreateOpen) {
          success(`Celok „${data.nazov}“ bol vytvorený. Pridajte prvú prevádzku.`);
          setExpanded((prev) => new Set(prev).add(data.id));
          setOnboardingCelokId(data.id);
          openAddPrevadzka(data);
        } else {
          success("Celok upravený.");
        }
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
  const doDeleteCelok = async () => {
    if (!celokDeleteTarget) return;
    setCelokDeleting(true);
    setCelokDeleteError("");
    try {
      const res = await apiFetch(`${API}/admin/celky/${celokDeleteTarget.id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        success(`Celok „${celokDeleteTarget.nazov}“ bol odstránený.`);
        setCelokDeleteTarget(null);
        fetchCelky();
      } else {
        const data = await res.json().catch(() => ({}));
        setCelokDeleteError(data?.error?.message || "Nepodarilo sa odstrániť celok.");
      }
    } catch (err) {
      logger.error(err);
      setCelokDeleteError("Chyba pri odstraňovaní celku.");
    } finally {
      setCelokDeleting(false);
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
    // Zrušenie posledného kroku onboardingu nesmie nechať "zaseknutý" stav —
    // ďalšie bežné pridanie prevádzky do toho istého celku by inak omylom
    // znova otvorilo krok "pridať login".
    if (loginTarget && onboardingCelokId === loginTarget.id) setOnboardingCelokId(null);
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
        const wasOnboarding = onboardingCelokId === loginTarget.id;
        success(
          wasOnboarding
            ? "Hotovo — celok, prevádzka aj login sú založené."
            : loginEditTarget
              ? "Login bol upravený."
              : "Login bol vytvorený.",
        );
        setExpanded((prev) => new Set(prev).add(loginTarget.id));
        if (wasOnboarding) setOnboardingCelokId(null);
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

  const handleResendInvite = async (login: Login) => {
    setResendingLoginId(login.user_id);
    const result = await resendLoginInvite(apiFetch, API, login);
    if (result.ok) {
      success(`Pozvánka bola znova odoslaná na ${login.email}.`);
      fetchCelky();
    } else {
      toastError(result.detail || "Nepodarilo sa odoslať pozvánku.");
    }
    setResendingLoginId(null);
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
  const pageCount = Math.max(1, Math.ceil(filtered.length / CELKY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * CELKY_PAGE_SIZE, safePage * CELKY_PAGE_SIZE);

  return (
    <>
      <PageHead
        eyebrow="Prevádzky"
        title="Správa prevádzok"
        desc="Celky a ich prevádzky — rozbaľte celok pre správu prevádzok"
        actions={<>
          <Button variant="secondary" onClick={() => setConnectionsOpen(true)}>EduPage spojenia</Button>
          <Button onClick={openCreateCelok}><Plus /> Nový celok</Button>
        </>}
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
              {paged.map((celok) => {
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
                        <IconButton
                          onClick={() => {
                            setCelokDeleteError("");
                            setCelokDeleteTarget(celok);
                          }}
                          title="Vymazať celok"
                          aria-label={`Vymazať celok ${celok.nazov}`}
                        >
                          <Trash2 />
                        </IconButton>
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

        {pageCount > 1 && (
          <div className="c" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Button variant="secondary" sm onClick={() => setPage((p) => p - 1)} disabled={safePage <= 1}>
              Predchádzajúca
            </Button>
            <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>
              Strana {safePage} / {pageCount} ({filtered.length} {filtered.length === 1 ? "celok" : "celkov"})
            </span>
            <Button variant="secondary" sm onClick={() => setPage((p) => p + 1)} disabled={safePage >= pageCount}>
              Ďalšia
            </Button>
          </div>
        )}
      </div>

      {/* Prevádzka add */}
      {modalCelok && (
        <Modal
          title={`Pridať prevádzku — ${modalCelok.nazov}`}
          onClose={closeAddPrevadzka}
          foot={<>
            <Button variant="ghost" onClick={closeAddPrevadzka}>Zrušiť</Button>
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

      {/* Celok create/edit */}
      {(celokEdit || celokCreateOpen) && (
        <Modal
          title={celokCreateOpen ? "Nový celok" : `Upraviť celok — ${celokEdit!.nazov}`}
          onClose={closeCelokModal}
          foot={<>
            <Button variant="ghost" onClick={closeCelokModal}>Zrušiť</Button>
            <Button type="submit" form="celok-form" disabled={cSaving}>
              {cSaving ? "Ukladám…" : celokCreateOpen ? "Vytvoriť celok" : "Uložiť"}
            </Button>
          </>}
        >
          <form id="celok-form" onSubmit={saveCelok} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {celokCreateOpen && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
                Po vytvorení celku vás rovno prevedieme založením prvej prevádzky a loginu.
              </p>
            )}
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

      {/* Celok delete */}
      {celokDeleteTarget && (
        <Modal
          title="Vymazať celok"
          onClose={() => {
            if (!celokDeleting) {
              setCelokDeleteTarget(null);
              setCelokDeleteError("");
            }
          }}
          icon={<AlertTriangle />}
          iconKind="danger"
          foot={<>
            <Button
              variant="ghost"
              onClick={() => { setCelokDeleteTarget(null); setCelokDeleteError(""); }}
              disabled={celokDeleting}
            >
              Zrušiť
            </Button>
            <Button variant="danger" onClick={doDeleteCelok} disabled={celokDeleting}>
              {celokDeleting ? "Odstraňujem…" : "Odstrániť"}
            </Button>
          </>}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Naozaj odstrániť celok „<strong style={{ color: "var(--green-900)" }}>{celokDeleteTarget.nazov}</strong>“?
              Táto akcia je nevratná.
            </p>
            {celokDeleteTarget.prevadzky.length > 0 && (
              <div
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--coral-50, #fef2f2)",
                  border: "1px solid var(--coral-200, #fecaca)",
                  color: "var(--coral-700)",
                  lineHeight: 1.6,
                }}
              >
                <strong>Zmažú sa aj:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  <li>
                    {celokDeleteTarget.prevadzky.length}{" "}
                    {celokDeleteTarget.prevadzky.length === 1 ? "prevádzka" : "prevádzok"}
                  </li>
                  <li>
                    {celokDeleteTarget.prevadzky.reduce((sum, p) => sum + (p.orders_count || 0), 0)} objednávok
                  </li>
                  {celokDeleteTarget.logins.length > 0 && (
                    <li>
                      prístup pre {celokDeleteTarget.logins.length}{" "}
                      {celokDeleteTarget.logins.length === 1 ? "login" : "loginy/loginov"} (samotné loginy ostanú,
                      len prídu o prístup k tomuto celku)
                    </li>
                  )}
                </ul>
              </div>
            )}
            {celokDeleteError && (
              <p role="alert" style={{ margin: 0, color: "var(--coral-700)", lineHeight: 1.6 }}>
                {celokDeleteError}
              </p>
            )}
          </div>
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
                <LoginPasswordStatusBadge status={login.password_status} />
                {(login.password_status === "pending" || login.password_status === "failed") && (
                  <IconButton
                    onClick={() => handleResendInvite(login)}
                    disabled={resendingLoginId === login.user_id}
                    title="Znova odoslať pozvánku na nastavenie hesla"
                    aria-label={`Znova odoslať pozvánku pre ${login.email}`}
                  >
                    <Send />
                  </IconButton>
                )}
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
