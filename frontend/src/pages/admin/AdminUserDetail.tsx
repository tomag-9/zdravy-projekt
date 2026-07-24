import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/auth";
import { useToast } from "../../context/ToastContext";
import { logger } from '../../lib/logger';
import { Card, Button, Field, Input } from "./ui";

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
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setUserEmail(data.email || "");
      }
    } catch (e) {
      logger.error(e);
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
      if (!firstName.trim() || !lastName.trim() || !userEmail.trim()) {
        toastWarning("Meno, priezvisko a email sú povinné údaje.");
        setSaving(false);
        return;
      }

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: userEmail,
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
      logger.error(e);
      toastError("Chyba pri ukladaní údajov používateľa.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="zpa-empty">Načítavam…</div>;
  if (!user) return <div className="zpa-empty" style={{ color: "var(--coral-600)" }}>Používateľ nenájdený</div>;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => navigate("/admin/roles")} style={{ marginBottom: 16, paddingLeft: 0 }}>
          <ChevronLeft /> Späť na zoznam rolí
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="zpa-avatar-sm" style={{ width: 60, height: 60, fontSize: 24 }}>
            {user.email.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--green-900)", margin: 0 }}>
              {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.email}
            </h1>
            <p style={{ color: "var(--ink-3)", margin: "4px 0 0" }}>Úprava osobných údajov a rolí</p>
          </div>
        </div>
      </div>

      <Card pad>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--green-900)", margin: "0 0 20px" }}>
          Osobné údaje a rola
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="zpa-grid-2">
            <Field label="Meno">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Priezvisko">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          </Field>

          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 20 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(114,136,75,0.10)", borderRadius: "var(--radius-md)", color: "var(--green-700)" }}>
              <ShieldCheck style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Rola: Administrátor</span>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Ukladám…" : "Uložiť zmeny"}
        </Button>
      </div>
    </div>
  );
};

export default AdminUserDetail;
