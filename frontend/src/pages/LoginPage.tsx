import React, { useState, useEffect } from "react";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_URL}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
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

      login(data.access, data.refresh);
      navigate("/"); // Redirect to dashboard/home after login
    } catch (err) {
      setError("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie na internet.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Prihlásenie</h1>
          <p className="text-slate-500">Zadajte svoje prihlasovacie údaje</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Používateľské meno
            </label>
            <input
              type="text"
              placeholder="Zadajte meno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heslo
            </label>
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
