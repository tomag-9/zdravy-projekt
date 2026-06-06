import React, { useState, useEffect, useRef } from "react";
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
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setError(token ? "" : "Chybajúci alebo neplatný odkaz na nastavenie hesla.");
  }, [token]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

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
        setError(data.detail || "Nepodarilo sa nastaviť heslo. Odkaz mohol vypršať.");
        return;
      }

      setSuccess(true);
      redirectTimer.current = setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch {
      setError("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="zp-app" style={{ minHeight: "100vh" }}>
        <div className="zp-login">
          <div className="zp-login-brand">
            <img className="logoimg" src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
          </div>
          <div className="zp-login-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2>Heslo bolo nastavené</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              Môžete sa prihlásiť. Presmerujeme vás…
            </p>
            <Link to="/login" className="zp-link">Prejsť na prihlásenie</Link>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="zp-app" style={{ minHeight: "100vh" }}>
      <div className="zp-login">
        <div className="zp-login-brand">
          <img className="logoimg" src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
        </div>

        <form className="zp-login-card" onSubmit={handleSubmit}>
          <h2>Nastavte si heslo</h2>
          <p className="sub">Zvolte heslo pre váš nový účet.</p>

          <div className="zp-field">
            <label className="zp-label">Heslo</label>
            <input
              className="zp-input"
              type="password"
              placeholder="Minimálne 8 znakov"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="zp-field">
            <label className="zp-label">Potvrďte heslo</label>
            <input
              className="zp-input"
              type="password"
              placeholder="Zopakujte heslo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="zp-banner" style={{ marginBottom: 12, marginLeft: 0, marginRight: 0, width: "100%" }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !token}
            className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
            style={{ marginTop: 8 }}
          >
            {isLoading ? "Ukladám…" : "Nastaviť heslo"}
          </button>
        </form>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};

export default SetPasswordPage;
