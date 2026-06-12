import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Plus, Settings, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../../../context/auth';
import ConfirmationModal from './ui/ConfirmationModal';

const NAV: { to: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; cta?: boolean }[] = [
  { to: '/home', label: 'Domov', icon: Home },
  { to: '/order', label: 'Nová objednávka', icon: Plus, cta: true },
  { to: '/menu', label: 'Jedálniček', icon: BookOpen },
  { to: '/settings', label: 'Nastavenia', icon: Settings },
];

const PAGE_TITLES: Record<string, { eye: string; h1: string }> = {
  '/home':     { eye: 'Prehľad týždňa', h1: 'Domov' },
  '/menu':     { eye: 'Jedálniček týždňa', h1: 'Jedálniček' },
  '/order':    { eye: 'Plánovanie objednávky', h1: 'Nová objednávka' },
  '/inbox':    { eye: 'Vaše notifikácie', h1: 'Správy' },
  '/settings': { eye: 'Účet a stravovanie', h1: 'Nastavenia' },
  '/success':  { eye: 'Hotovo', h1: 'Objednávka odoslaná' },
};

export default function ClientLayoutPC() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  const title = PAGE_TITLES[location.pathname] ?? PAGE_TITLES['/home'];

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user?.first_name
    ? user.first_name.slice(0, 2).toUpperCase()
    : 'ZP';

  return (
    <div className="pc-app">
      <aside className="pc-side">
        <div className="pc-side-logo">
          <img src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
        </div>
        <div className="pc-nav-label">Navigácia</div>
        <nav className="pc-nav">
          {NAV.map(({ to, label, icon: Icon, cta }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'pc-navbtn' + (cta ? ' pc-navbtn--cta' : '') + (isActive ? ' active' : '')
              }
            >
              <Icon style={{ width: 21, height: 21, strokeWidth: 1.8 }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="pc-side-spacer" />
        <button
          className="pc-side-foot"
          style={{ background: 'transparent', border: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}
          onClick={() => navigate('/settings')}
        >
          <span className="av">{initials}</span>
          <span className="who">
            <span className="n">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.first_name || user?.company_name || 'Používateľ'}
            </span>
            <span className="o">{user?.company_name || ''}</span>
          </span>
        </button>
      </aside>

      <main className="pc-main">
        <header className="pc-topbar">
          <div className="crumb">
            <div className="eye">{title.eye}</div>
            <h1>{title.h1}</h1>
          </div>
          <div className="pc-topbar-actions">
            <NavLink
              to="/inbox"
              className="pc-iconbtn"
              aria-label="Správy"
              title="Správy"
            >
              <Mail style={{ width: 20, height: 20 }} />
            </NavLink>
            <button
              className="pc-iconbtn"
              aria-label="Odhlásiť sa"
              title="Odhlásiť sa"
              onClick={() => setShowLogout(true)}
            >
              <LogOut style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </header>
        <div className="pc-scroll" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <ConfirmationModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => { logout(); navigate('/login'); }}
        title="Odhlásenie"
        description="Naozaj sa chcete odhlásiť z aplikácie?"
        confirmText="Odhlásiť sa"
        cancelText="Zrušiť"
        variant="danger"
      />
    </div>
  );
}
