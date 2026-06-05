import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  User,
  Bell,
  Users,
  Apple,
  Info,
  LogOut,
  Lock,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../../../context/auth";
import { useApp } from "../context/AppContext";
import ConfirmationModal from "../components/ui/ConfirmationModal";

type View = "main" | "portions" | "diets";

const Settings = () => {
  const [view, setView] = useState<View>("main");
  const [showLogout, setShowLogout] = useState(false);
  const { user, logout } = useAuth();
  const { enabledCategories, portionTypes, clientContactInfo, visibleDietDetails } = useApp();
  const navigate = useNavigate();
  const portionByName = new Map(portionTypes.map((portion) => [portion.name, portion]));
  const contactName = clientContactInfo.name || "Zdravý projekt";
  const contactRole = clientContactInfo.role ? ` · ${clientContactInfo.role}` : "";
  const contactEmail = clientContactInfo.email || "info@zdravyprojekt.sk";
  const contactPhone = clientContactInfo.phone || "+421 000 000 000";

  if (view === "portions") {
    return (
      <div className="zp-app">
        <div className="zp-pageheader">
          <button className="zp-iconbtn" onClick={() => setView("main")}>
            <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
          </button>
          <div>
            <h1>Dostupné porcie</h1>
            <p>{enabledCategories.length} typy aktivované pre vás</p>
          </div>
        </div>

        <div className="zp-readonly-banner">
          <Lock style={{ width: 16, height: 16 }} />
          <div>
            <strong>Iba na čítanie.</strong> Povolené typy porcií nastavujeme v Zdravom Brušku.
            Ak chcete pridať alebo upraviť typ porcie, ozvite sa nám.
          </div>
        </div>

        {enabledCategories.map((category) => (
          <div className="zp-portion-card" key={category}>
            <div className="ic">
              <Users style={{ width: 20, height: 20 }} />
            </div>
            <div className="body">
              <div className="ttl">{category}</div>
              <div className="desc">
                Porcia pre {category.toLowerCase()}.
              </div>
              <span className="coef">
                Koeficient {portionByName.get(category)?.coefficient_pct ?? 100}%
              </span>
            </div>
          </div>
        ))}

        <div className="zp-contact-card">
          <span className="eye">Potrebujete zmenu?</span>
          <h4>Kontakt pre úpravu povolených porcií</h4>
          <p>Pre rozšírenie alebo zmenu typov porcií kontaktujte zodpovednú osobu v Zdravom projekte.</p>
          <div className="contact-row">
            <User style={{ width: 14, height: 14 }} /> {contactName}{contactRole}
          </div>
          <div className="contact-row">
            <Mail style={{ width: 14, height: 14 }} /> {contactEmail}
          </div>
          <div className="contact-row">
            <Phone style={{ width: 14, height: 14 }} /> {contactPhone}
          </div>
        </div>
      </div>
    );
  }

  if (view === "diets") {
    return (
      <div className="zp-app">
        <div className="zp-pageheader">
          <button className="zp-iconbtn" onClick={() => setView("main")}>
            <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
          </button>
          <div>
            <h1>Dostupné diéty</h1>
            <p>{visibleDietDetails.length} diét · popis a alergény</p>
          </div>
        </div>

        <div className="zp-readonly-banner">
          <Lock style={{ width: 16, height: 16 }} />
          <div>
            <strong>Iba na čítanie.</strong> Zoznam diét spravujeme v Zdravom Brušku.
            Ak chcete pridať alebo upraviť diétu, ozvite sa nám.
          </div>
        </div>

        {visibleDietDetails.length === 0 && (
          <div className="zp-empty">
            <Apple />
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Nemáte povolené žiadne diéty.</p>
          </div>
        )}

        {visibleDietDetails.map((d) => (
          <div className="zp-diet-readonly" key={d.id}>
            <span className="badge">{d.name}</span>
            <div className="body">
              <div className="name">{d.name}</div>
              <div className="desc">{d.description || "Bez doplňujúceho popisu."}</div>
            </div>
          </div>
        ))}

        <div className="zp-contact-card">
          <span className="eye">Chýba vám niečo?</span>
          <h4>Kontakt pre pridanie / úpravu diéty</h4>
          <p>Ak potrebujete novú diétu, ktorá tu nie je, kontaktujte zodpovednú osobu.</p>
          <div className="contact-row">
            <User style={{ width: 14, height: 14 }} /> {contactName}{contactRole}
          </div>
          <div className="contact-row">
            <Mail style={{ width: 14, height: 14 }} /> {contactEmail}
          </div>
          <div className="contact-row">
            <Phone style={{ width: 14, height: 14 }} /> {contactPhone}
          </div>
        </div>
      </div>
    );
  }

  // Main settings screen
  return (
    <div className="zp-app">
      <div className="zp-pageheader">
        <div>
          <h1>Nastavenia</h1>
          <p>Účet, povolené porcie, diéty</p>
        </div>
      </div>

      <div className="zp-settings-section">
        <h2>Účet</h2>
        <div className="zp-settings-list">
          <button className="zp-settings-row" onClick={() => navigate("/profile")}>
            <span className="ic">
              <User style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.company_name || "Môj profil"}
              </span>
              {user?.company_name && (
                <span className="sub">{user.company_name}</span>
              )}
              {user?.email && <span className="sub">{user.email}</span>}
            </span>
            <span className="chev">
              <ChevronRight style={{ width: 18, height: 18 }} />
            </span>
          </button>
          <button className="zp-settings-row" onClick={() => navigate("/profile")}>
            <span className="ic">
              <Bell style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">Upozornenia</span>
              <span className="sub">Pripomienky a nedeľné notifikácie</span>
            </span>
            <span className="chev">
              <ChevronRight style={{ width: 18, height: 18 }} />
            </span>
          </button>
        </div>
      </div>

      <div className="zp-settings-section">
        <h2>Stravovanie</h2>
        <div className="zp-settings-list">
          <button className="zp-settings-row" onClick={() => setView("portions")}>
            <span className="ic">
              <Users style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">Dostupné porcie</span>
              <span className="sub">
                {enabledCategories.length} typy · {enabledCategories.join(", ")}
              </span>
            </span>
            <span className="chev">
              <ChevronRight style={{ width: 18, height: 18 }} />
            </span>
          </button>
          <button className="zp-settings-row" onClick={() => setView("diets")}>
            <span className="ic">
              <Apple style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">Dostupné diéty</span>
              <span className="sub">{visibleDietDetails.length} diét · popis a alergény</span>
            </span>
            <span className="chev">
              <ChevronRight style={{ width: 18, height: 18 }} />
            </span>
          </button>
        </div>
      </div>

      <div className="zp-settings-section">
        <h2>Podpora</h2>
        <div className="zp-settings-list">
          <button className="zp-settings-row" onClick={() => navigate("/about")}>
            <span className="ic">
              <Info style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">O aplikácii</span>
              <span className="sub">Zdravý projekt s. r. o.</span>
            </span>
            <span className="chev">
              <ChevronRight style={{ width: 18, height: 18 }} />
            </span>
          </button>
          <button
            className="zp-settings-row"
            onClick={() => setShowLogout(true)}
          >
            <span className="ic" style={{ background: "rgba(201,46,82,0.1)", color: "var(--coral-600)" }}>
              <LogOut style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl" style={{ color: "var(--coral-600)" }}>Odhlásiť sa</span>
              <span className="sub">Vrátite sa na prihlásenie</span>
            </span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={logout}
        title="Odhlásenie"
        description="Naozaj sa chcete odhlásiť z aplikácie?"
        confirmText="Odhlásiť sa"
        cancelText="Zrušiť"
        variant="danger"
      />
    </div>
  );
};

export default Settings;
