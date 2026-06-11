import React, { useState, useEffect } from "react";
import { useAuth } from "../context/auth";
import { useNavigate, Link } from "react-router-dom";
import { useIsPC } from "../hooks/useIsPC";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [contactEmail, setContactEmail] = useState("info@zdravyprojekt.sk");
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isPC = useIsPC();

  useEffect(() => {
    fetch(`${API_URL}/admin/global-settings/`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.client_contact_email) {
          setContactEmail(data.client_contact_email);
        }
      })
      .catch(() => undefined);
  }, []);

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
        credentials: "include", // allows the httpOnly refresh cookie to be set
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

      if (!data.access) {
        setError("Prihlásenie zlyhalo. Neplatná odpoveď servera.");
        return;
      }

      // Refresh token arrives as an httpOnly cookie — only access token is in body.
      // login() fetches the profile; the useEffect above will navigate once user is set
      await login(data.access);
    } catch (err) {
      setError(
        "Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie na internet.",
      );
    }
  };

  const loginForm = (
    <>
      <h2>Vitajte späť</h2>
      <p className="sub">Prihláste sa, prosím, do svojho účtu.</p>

      <div className="zp-field">
        <label className="zp-label">Email</label>
        <input
          className="zp-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vase@meno.sk"
          required
        />
      </div>

      <div className="zp-field">
        <label className="zp-label">Heslo</label>
        <input
          className="zp-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <Link to="/forgot-password" className="zp-link">
            Zabudli ste heslo?
          </Link>
        </div>
      </div>

      {error && (
        <div className="zp-banner" style={{ marginBottom: 12, marginLeft: 0, marginRight: 0, width: "100%" }}>
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
        style={{ marginTop: 8 }}
      >
        Prihlásiť sa
      </button>

      <div className="zp-divider">Nemáte účet?</div>

      <div className="zp-login-info">
        <strong>Registráciu vykonáva poskytovateľ.</strong><br />
        Ak máte záujem o službu, napíšte nám na{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>{" "}
        a my Vám vytvoríme prístup.
      </div>
    </>
  );

  if (isPC) {
    return (
      <div className="pc-login">
        <div className="pc-login-art">
          <div className="mk">Zdravý projekt</div>
          <div className="pitch">
            <span className="script">Dobré jedlo, každý deň</span>
            <h2>Objednávky pre vašu škôlku na jednom mieste.</h2>
            <p>Plánujte raňajky, obedy a olovranty, sledujte jedálniček a spravujte diéty — prehľadne, z počítača aj mobilu.</p>
          </div>
          <div className="foot">Zdravý projekt s. r. o. · klientský portál</div>
        </div>
        <div className="pc-login-panel">
          <form className="pc-login-card" onSubmit={handleSubmit}>
            <img className="logoimg" src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
            {loginForm}
          </form>
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
          {loginForm}
        </form>

        <div style={{ height: 24 }}></div>
      </div>
    </div>
  );
};

export default LoginPage;
