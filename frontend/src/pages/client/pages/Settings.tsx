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
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../../../context/auth";
import { useApp } from "../context/AppContext";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useIsPC } from "../../../hooks/useIsPC";

type View = "main" | "portions" | "diets";

const Settings = () => {
  const [view, setView] = useState<View>("main");
  const [showLogout, setShowLogout] = useState(false);
  const { user, logout } = useAuth();
  const { enabledCategories, clientContactInfo, visibleDietDetails } = useApp();
  const navigate = useNavigate();
  const isPC = useIsPC();
  const contactName = clientContactInfo.name || "Zdravý projekt";
  const contactRole = clientContactInfo.role ? ` · ${clientContactInfo.role}` : "";
  const contactEmail = clientContactInfo.email || "info@zdravyprojekt.sk";
  const contactPhone = clientContactInfo.phone || "+421 000 000 000";
  const contactPhoneHref = contactPhone.replace(/[^\d+]/g, "");

  const portionsContent = (
    <>
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
          </div>
        </div>
      ))}
    </>
  );

  const dietsContent = (
    <>
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
    </>
  );

  const mainContent = (
    <>
      <div className="zp-settings-section">
        <h2>Účet</h2>
        <div className="zp-settings-list">
          <button className="zp-settings-row" onClick={() => navigate("/profile")}>
            <span className="ic">
              <User style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">
                {user?.billing_name || "Môj profil"}
              </span>
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
        <h2>Kontakt</h2>
        <div className="zp-settings-list">
          <a className="zp-settings-row" href={`tel:${contactPhoneHref}`}>
            <span className="ic">
              <Phone style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">{contactName}{contactRole}</span>
              <span className="sub">{contactPhone}</span>
            </span>
          </a>
          <a className="zp-settings-row" href={`mailto:${contactEmail}`}>
            <span className="ic">
              <Mail style={{ width: 18, height: 18 }} />
            </span>
            <span className="body">
              <span className="ttl">Napísať správu</span>
              <span className="sub">{contactEmail}</span>
            </span>
          </a>
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
    </>
  );

  const confirmationModal = (
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
  );

  if (isPC) {
    const activeContent = view === "portions" ? portionsContent : view === "diets" ? dietsContent : mainContent;
    return (
      <div className="pc-wrap">
        <div className="pc-settings-grid">
          <aside className="pc-settings-side">
            <button className={view === "main" ? "active" : ""} onClick={() => setView("main")}>
              <User style={{ width: 18, height: 18 }} /><span>Účet</span>
            </button>
            <button className={view === "portions" ? "active" : ""} onClick={() => setView("portions")}>
              <Users style={{ width: 18, height: 18 }} /><span>Dostupné porcie</span>
            </button>
            <button className={view === "diets" ? "active" : ""} onClick={() => setView("diets")}>
              <Apple style={{ width: 18, height: 18 }} /><span>Dostupné diéty</span>
            </button>
          </aside>
          <div>
            {activeContent}
          </div>
        </div>
        {confirmationModal}
      </div>
    );
  }

  // Mobile: full-screen sub-views
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
        {portionsContent}
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
        {dietsContent}
      </div>
    );
  }

  // Main settings screen (mobile)
  return (
    <div className="zp-app">
      <div className="zp-pageheader">
        <div>
          <h1>Nastavenia</h1>
          <p>Účet, povolené porcie, diéty</p>
        </div>
      </div>
      {mainContent}
      {confirmationModal}
    </div>
  );
};

export default Settings;
