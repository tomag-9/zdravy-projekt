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
      <div className="zp-app" style={{ minHeight: "100vh" }}>
        <div className="zp-login">
          <div className="zp-login-brand">
            <img className="logoimg" src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
          </div>
          <div className="zp-login-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <h2>Skontrolujte e-mail</h2>
            <p className="sub" style={{ marginBottom: 8 }}>
              Ak je adresa <strong>{email}</strong> zaregistrovaná, bol na ňu
              odoslaný odkaz na obnovu hesla.
            </p>
            <p className="sub" style={{ marginBottom: 24 }}>
              Ak e-mail nevidíte, skontrolujte priečinok so spamom.
            </p>
            <Link to="/login" className="zp-link">← Späť na prihlásenie</Link>
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
          <h2>Obnovenie hesla</h2>
          <p className="sub">Zadajte váš e-mail a pošleme vám odkaz na obnovu hesla.</p>

          <div className="zp-field">
            <label className="zp-label">Email</label>
            <input
              className="zp-input"
              type="email"
              placeholder="vase@meno.sk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="zp-banner" style={{ marginBottom: 12, marginLeft: 0, marginRight: 0, width: "100%" }}>
              ⚠ {error}
            </div>
          )}

          {rateLimitMsg && (
            <div className="zp-banner" style={{ marginBottom: 12, marginLeft: 0, marginRight: 0, width: "100%", background: "rgba(234,167,113,0.15)", color: "var(--mustard-700)" }}>
              ⏳ {rateLimitMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
            style={{ marginTop: 8 }}
          >
            {isLoading ? "Odosielam…" : "Odoslať odkaz"}
          </button>

          <div className="zp-divider" />
          <div style={{ textAlign: "center" }}>
            <Link to="/login" className="zp-link">← Späť na prihlásenie</Link>
          </div>
        </form>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
