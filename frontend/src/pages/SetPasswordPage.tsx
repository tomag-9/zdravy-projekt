import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const SetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Chybajúci alebo neplatný odkaz na nastavenie hesla.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.detail || "Nepodarilo sa nastaviť heslo. Odkaz mohol vypršať.",
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch {
      setError("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Heslo bolo nastavené
          </h1>
          <p className="text-slate-600 mb-6">
            Môžete sa prihlásiť. Presmerujeme vás…
          </p>
          <Link
            to="/login"
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Prejsť na prihlásenie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Nastavte si heslo
          </h1>
          <p className="text-slate-500">Zvolte heslo pre váš nový účet.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heslo
            </label>
            <input
              type="password"
              placeholder="Minimálne 8 znakov"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Potvrďte heslo
            </label>
            <input
              type="password"
              placeholder="Zopakujte heslo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            {isLoading ? "Ukladám…" : "Nastaviť heslo"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;
