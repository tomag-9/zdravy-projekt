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
  username: string;
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
  const [role, setRole] = useState<"client" | "admin">("client");
  const [isActive, setIsActive] = useState(true);

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
        setRole(data.is_staff ? "admin" : "client");
        setIsActive(data.is_active ?? true);
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
        is_staff: role === "admin",
        is_active: isActive,
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
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {user.username}
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rola v systéme
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "client" | "admin")
                  }
                  className="block w-full px-4 py-3 pr-8 leading-tight text-gray-700 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent accent-purple-600"
                >
                  <option value="client">Klient</option>
                  <option value="admin">Administrátor</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                <strong>Klient:</strong> Má prístup len k objednávaniu (ak je
                povolené). <br />
                <strong>Administrátor:</strong> Má prístup k tomuto admin
                panelu.
              </p>
            </div>

            <div className="flex items-center mt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Účet je aktívny
                </span>
              </label>
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
