import React, { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRateLimitMsg("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setRateLimitMsg(data.detail || "Príliš veľa pokusov. Skúste neskôr.");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || "Nepodarilo sa odoslať e-mail. Skúste znova.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Skontrolujte e-mail
          </h1>
          <p className="text-slate-600 mb-2">
            Ak je adresa <strong>{email}</strong> zaregistrovaná, bol na ňu
            odoslaný odkaz na obnovu hesla.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            Ak e-mail nevidíte, skontrolujte priečinok so spamom.
          </p>
          <Link
            to="/login"
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            ← Späť na prihlásenie
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
            Obnovenie hesla
          </h1>
          <p className="text-slate-500">
            Zadajte váš e-mail a pošleme vám odkaz na obnovu hesla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Zadajte váš e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {rateLimitMsg && (
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm flex items-center gap-2">
              <span>⏳</span>
              {rateLimitMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            {isLoading ? "Odosielam…" : "Odoslať odkaz"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            ← Späť na prihlásenie
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
