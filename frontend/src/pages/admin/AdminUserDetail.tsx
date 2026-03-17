import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";

interface UserSettings {
  visible_menus: string[];
  visible_meals: string[];
  visible_diets: number[];
}

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  settings: UserSettings | null;
}

const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { error: toastError, warning: toastWarning } = useToast();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${id}/`,
      );
      if (res.ok) {
        const data = await res.json();
        setUser(data);

        // Initialize form state
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setUserEmail(data.email || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Check required fields
      if (!firstName.trim() || !lastName.trim() || !userEmail.trim()) {
        toastWarning("Meno, priezvisko a email sú povinné údaje.");
        setSaving(false);
        return;
      }

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: userEmail,
        settings: user.settings, // Preserve existing settings
      };

      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${user.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        navigate("/admin/roles");
      } else {
        toastError("Nepodarilo sa uložiť údaje používateľa.");
      }
    } catch (e) {
      console.error(e);
      toastError("Chyba pri ukladaní údajov používateľa.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Načítavam...</div>;
  if (!user)
    return (
      <div className="p-8 text-center text-red-500">Používateľ nenájdený</div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <button
          onClick={() => navigate("/admin/roles")}
          className="text-gray-500 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Späť na zoznam rolí
        </button>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {user.first_name || user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.email}
            </h2>
            <p className="text-gray-500">Úprava osobných údajov a rolí</p>
          </div>
        </div>
      </div>

      {/* Personal Info & Role Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">
            👤
          </span>
          Osobné údaje a Rola
        </h3>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meno
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priezvisko
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="border-t border-gray-100 pt-6 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
              <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs text-purple-700 font-medium">Rola: Administrátor</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {saving ? "Ukladám..." : "Uložiť zmeny"}
        </button>
      </div>
    </div>
  );
};

export default AdminUserDetail;
