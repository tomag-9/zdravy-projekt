import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { Link } from "react-router-dom";
import { logger } from '../../lib/logger';

interface AdUser {
  id: number;
  email: string;
  profile?: { company_name: string; billing_name: string };
  is_active: boolean;
  is_staff: boolean;
}

interface OperationCreateForm {
  email: string;
  company_name: string;
  billing_name: string;
  ico: string;
  dic: string;
  is_edupage: boolean;
  api_identifier: string;
  mealsguest_url: string;
}

interface OperationEditForm {
  email: string;
  company_name: string;
  billing_name: string;
  ico: string;
  dic: string;
  is_edupage: boolean;
  api_identifier: string;
  mealsguest_url: string;
}

const EMPTY_OPERATION_FORM: OperationCreateForm = {
  email: "",
  company_name: "",
  billing_name: "",
  ico: "",
  dic: "",
  is_edupage: false,
  api_identifier: "",
  mealsguest_url: "",
};

// SVG icons
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconGear = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClientList: React.FC = () => {
  const { apiFetch } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<AdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [clientForm, setClientForm] = useState<OperationCreateForm>(EMPTY_OPERATION_FORM);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const editRequestRef = useRef<number | null>(null);
  const [editTarget, setEditTarget] = useState<AdUser | null>(null);
  const [editForm, setEditForm] = useState<OperationEditForm>({ email: "", company_name: "", billing_name: "", ico: "", dic: "", is_edupage: false, api_identifier: "", mealsguest_url: "" });
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
      email: user.email,
      company_name: user.profile?.company_name || "",
      billing_name: user.profile?.billing_name || "",
      ico: "",
      dic: "",
      is_edupage: false,
      api_identifier: "",
      mealsguest_url: "",
    });
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
    } catch (e) {
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
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Správa prevádzok</h2>
            <p className="text-gray-500 mt-1">Nastavenia jedál a menu pre prevádzky</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setClientForm(EMPTY_OPERATION_FORM); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all"
          >
            <span className="text-lg leading-none">+</span> Pridať prevádzku
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Hľadať prevádzky..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Prevádzka</th>
                  <th className="px-6 py-4 text-right">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">Načítavam prevádzky...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">Žiadne prevádzky</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold mr-3 shadow-md shadow-blue-200">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.profile?.company_name || user.email}
                            </div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                            {user.profile?.billing_name && (
                              <div className="text-xs text-gray-400">
                                Fakturácia: {user.profile.billing_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            title="Upraviť"
                            aria-label="Upraviť"
                            className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <IconEdit />
                          </button>
                          <Link
                            to={`/admin/clients/${user.id}`}
                            title="Nastavenia"
                            aria-label="Nastavenia"
                            className="p-2 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            <IconGear />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            title="Odstrániť"
                            aria-label="Odstrániť"
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create operation modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Pridať prevádzku</h3>
              <button type="button" aria-label="Zavrieť" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov prevádzky <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-400 font-normal">(interný)</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.company_name}
                  onChange={(e) => setClientForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov spoločnosti
                  <span className="ml-1 text-xs text-gray-400 font-normal">(fakturácia)</span>
                </label>
                <input
                  type="text"
                  value={clientForm.billing_name}
                  onChange={(e) => setClientForm((f) => ({ ...f, billing_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={clientForm.email}
                  onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IČO</label>
                  <input
                    type="text"
                    value={clientForm.ico}
                    onChange={(e) => setClientForm((f) => ({ ...f, ico: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DIČ</label>
                  <input
                    type="text"
                    value={clientForm.dic}
                    onChange={(e) => setClientForm((f) => ({ ...f, dic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <input
                  id="create-is-edupage"
                  type="checkbox"
                  checked={clientForm.is_edupage}
                  onChange={(e) => setClientForm((f) => ({ ...f, is_edupage: e.target.checked, api_identifier: "", mealsguest_url: "" }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="create-is-edupage" className="text-sm font-medium text-gray-700">
                  Edupage prevádzka
                </label>
              </div>
              {clientForm.is_edupage && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edupage identifikátor</label>
                    <input
                      type="text"
                      placeholder="Identifikátor pre párovanie v Edupage súboroch"
                      value={clientForm.api_identifier}
                      onChange={(e) => setClientForm((f) => ({ ...f, api_identifier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MealsGuest URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://skola.edupage.org/menu/mealsGuest?id=TOKEN"
                        value={clientForm.mealsguest_url}
                        onChange={(e) => { setClientForm((f) => ({ ...f, mealsguest_url: e.target.value })); setUrlTestResult(null); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <button
                        type="button"
                        disabled={testingUrl === "create"}
                        onClick={() => testMealsguestUrl(clientForm.mealsguest_url, "create")}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        {testingUrl === "create" ? "Testujem…" : "Test"}
                      </button>
                    </div>
                    {urlTestResult && (
                      <p className={`mt-1.5 text-xs ${urlTestResult.ok ? "text-green-600" : "text-red-600"}`}>{urlTestResult.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                  Zrušiť
                </button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all">
                  {creating ? "Vytváram..." : "+ Pridať"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit operation modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Upraviť prevádzku</h3>
              <button type="button" aria-label="Zavrieť" onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov prevádzky <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-400 font-normal">(interný)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov spoločnosti
                  <span className="ml-1 text-xs text-gray-400 font-normal">(fakturácia)</span>
                </label>
                <input
                  type="text"
                  value={editForm.billing_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, billing_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IČO</label>
                  <input
                    type="text"
                    value={editForm.ico}
                    onChange={(e) => setEditForm((f) => ({ ...f, ico: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DIČ</label>
                  <input
                    type="text"
                    value={editForm.dic}
                    onChange={(e) => setEditForm((f) => ({ ...f, dic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <input
                  id="edit-is-edupage"
                  type="checkbox"
                  checked={editForm.is_edupage}
                  onChange={(e) => { setEditForm((f) => ({ ...f, is_edupage: e.target.checked, ...(!e.target.checked && { api_identifier: "", mealsguest_url: "" }) })); setUrlTestResult(null); }}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit-is-edupage" className="text-sm font-medium text-gray-700">
                  Edupage prevádzka
                </label>
              </div>
              {editForm.is_edupage && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edupage identifikátor</label>
                    <input
                      type="text"
                      placeholder="Identifikátor pre párovanie v Edupage súboroch"
                      value={editForm.api_identifier}
                      onChange={(e) => setEditForm((f) => ({ ...f, api_identifier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MealsGuest URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://skola.edupage.org/menu/mealsGuest?id=TOKEN"
                        value={editForm.mealsguest_url}
                        onChange={(e) => { setEditForm((f) => ({ ...f, mealsguest_url: e.target.value })); setUrlTestResult(null); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <button
                        type="button"
                        disabled={testingUrl === "edit"}
                        onClick={() => testMealsguestUrl(editForm.mealsguest_url, "edit")}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        {testingUrl === "edit" ? "Testujem…" : "Test"}
                      </button>
                    </div>
                    {urlTestResult && (
                      <p className={`mt-1.5 text-xs ${urlTestResult.ok ? "text-green-600" : "text-red-600"}`}>{urlTestResult.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                  Zrušiť
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all">
                  {saving ? "Ukladám..." : "Uložiť"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Odstrániť prevádzku</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Naozaj chcete odstrániť prevádzku <strong className="text-gray-800">{deleteTarget.profile?.company_name || deleteTarget.email}</strong>?
                Táto akcia je nevratná a vymaže aj všetky jej objednávky.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                  Zrušiť
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-red-200 transition-all">
                  {deleting ? "Odstraňujem..." : "Odstrániť"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientList;
