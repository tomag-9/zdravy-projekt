import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Globe } from "lucide-react";
import { useApp } from "../context/AppContext";

const AboutPage = () => {
  const navigate = useNavigate();
  const { clientContactInfo } = useApp();

  const contactEmail = clientContactInfo.email || "info@zdravyprojekt.sk";
  const contactPhone = clientContactInfo.phone || "+421 000 000 000";

  return (
    <div className="zp-app">
      <div className="zp-pageheader">
        <button
          className="zp-iconbtn"
          aria-label="Späť"
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
        </button>
        <div>
          <h1>O aplikácii</h1>
          <p>Zdravý projekt s. r. o.</p>
        </div>
      </div>

      <div style={{ padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="zp-card" style={{ padding: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--green-700)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Globe style={{ width: 28, height: 28, color: "var(--bg-cream)" }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>
            Zdravý projekt
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Aplikácia pre jednoduché objednávanie stravy. Objednávajte raňajky, obed a olovrant
            priamo z telefónu — kedykoľvek a odkiaľkoľvek.
          </p>
        </div>

        <div className="zp-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Kontakt
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a
              href={`mailto:${contactEmail}`}
              style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-1)", textDecoration: "none" }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(114,136,75,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Mail style={{ width: 16, height: 16, color: "var(--green-700)" }} />
              </span>
              <span style={{ fontSize: 14 }}>{contactEmail}</span>
            </a>
            <a
              href={`tel:${contactPhone}`}
              style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-1)", textDecoration: "none" }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(114,136,75,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Phone style={{ width: 16, height: 16, color: "var(--green-700)" }} />
              </span>
              <span style={{ fontSize: 14 }}>{contactPhone}</span>
            </a>
          </div>
        </div>

        <div className="zp-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ako to funguje
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Vyberte deň a skontrolujte jedálniček.",
              "Objednajte raňajky, obed alebo olovrant pred uzávierkou.",
              "Dostanete notifikáciu pred koncom objednávky.",
              "Vaša objednávka bude pripravená na vyzdvihnutie.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--green-700)",
                    color: "var(--bg-cream)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-mute)", textAlign: "center" }}>
          © {new Date().getFullYear()} Zdravý projekt s. r. o.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
