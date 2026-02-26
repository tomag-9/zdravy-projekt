import React, { useState, useEffect } from "react";
import { useAuth } from "../context/auth";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Navigate once user profile is loaded — this fires AFTER React commits state,
  // so user.is_staff is guaranteed to be correct
  useEffect(() => {
    if (isAuthenticated && user !== null) {
      navigate(user.is_staff ? "/admin" : "/home", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_URL}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Nesprávne meno alebo heslo");
        } else if (response.status >= 500) {
          setError("Chyba servera. Skúste to prosím znova neskôr.");
        } else {
          setError("Prihlásenie zlyhalo. Skúste to prosím znova.");
        }
        return;
      }

      const data = await response.json();

      if (!data.access || !data.refresh) {
        setError("Prihlásenie zlyhalo. Neplatná odpoveď servera.");
        return;
      }

      // login() fetches the profile; the useEffect above will navigate once user is set
      await login(data.access, data.refresh);
    } catch (err) {
      setError(
        "Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie na internet.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Prihlásenie
          </h1>
          <p className="text-slate-500">Zadajte svoje prihlasovacie údaje</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Zadajte email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Heslo
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Zabudli ste heslo?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Zadajte heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            Prihlásiť sa
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
