import React, { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface PasswordRequirement {
  met: boolean;
  text: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    company_name: "",
    ico: "",
    dic: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation requirements
  const getPasswordRequirements = (password: string): PasswordRequirement[] => {
    return [
      {
        met: password.length >= 8,
        text: "Aspoň 8 znakov",
      },
      {
        met: /\d/.test(password),
        text: "Aspoň jedno číslo",
      },
    ];
  };

  const passwordRequirements = getPasswordRequirements(formData.password);
  const passwordValid = passwordRequirements.every((req) => req.met);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.password_confirm) {
      setError("Heslá sa nezhodujú");
      setLoading(false);
      return;
    }

    // Validate password requirements
    if (!passwordValid) {
      setError("Heslo nespĺňa požiadavky");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.email) {
          setError(data.email[0]);
        } else if (data.password) {
          setError(data.password[0]);
        } else if (data.company_name) {
          setError(data.company_name[0]);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError("Registrácia zlyhala. Skúste to prosím znova.");
        }
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(
        "Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie na internet."
      );
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-green-100">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Registrácia úspešná!
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-slate-700 mb-3">
                Na váš email <strong>{formData.email}</strong> sme odoslali
                odkaz na overenie.
              </p>
              <p className="text-sm text-slate-600">
                Po overení emailu bude váš účet odoslaný na schválenie
                administrátorovi. Po schválení vám príde notifikačný email a
                budete sa môcť prihlásiť.
              </p>
            </div>
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Späť na prihlásenie
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-indigo-50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Registrácia
          </h1>
          <p className="text-slate-500">Vytvorte si účet v systéme Zdravý projekt</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Information */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              🏢 Informácie o spoločnosti
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Názov spoločnosti <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  placeholder="Názov vašej spoločnosti"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    IČO
                  </label>
                  <input
                    type="text"
                    name="ico"
                    placeholder="IČO"
                    value={formData.ico}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    DIČ
                  </label>
                  <input
                    type="text"
                    name="dic"
                    placeholder="DIČ"
                    value={formData.dic}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Person (Optional) */}
          <div>
            <h2 className="font-semibold text-slate-700 mb-3 text-sm">
              Kontaktná osoba (nepovinné)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Krstné meno
                </label>
                <input
                  type="text"
                  name="first_name"
                  placeholder="Krstné meno"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priezvisko
                </label>
                <input
                  type="text"
                  name="last_name"
                  placeholder="Priezvisko"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              🔐 Prihlasovacie údaje
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="vas@email.sk"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Heslo <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Zadajte heslo"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, idx) => (
                      <div
                        key={idx}
                        className={`text-sm flex items-center gap-2 ${
                          req.met ? "text-green-600" : "text-slate-500"
                        }`}
                      >
                        <span>{req.met ? "✓" : "○"}</span>
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Potvrdiť heslo <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password_confirm"
                  placeholder="Zopakujte heslo"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
                {formData.password_confirm && (
                  <div
                    className={`text-sm mt-2 ${
                      formData.password === formData.password_confirm
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formData.password === formData.password_confirm
                      ? "✓ Heslá sa zhodujú"
                      : "✗ Heslá sa nezhodujú"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            {loading ? "Registrácia..." : "Zaregistrovať sa"}
          </button>

          <div className="text-center text-sm text-slate-600">
            Už máte účet?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Prihlásiť sa
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
