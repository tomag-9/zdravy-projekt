import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, Settings } from "lucide-react";

const ClientLayout = () => {
  const location = useLocation();

  const tabs = [
    { to: "/home", label: "Domov", icon: Home },
    { to: "/menu", label: "Jedálniček", icon: BookOpen },
    { to: "/settings", label: "Nastavenia", icon: Settings },
  ];

  return (
    <div
      className="zp-phone"
      style={{ width: "100%", height: "100vh", borderRadius: 0, boxShadow: "none" }}
    >
      <div className="zp-route-body">
        <Outlet />
      </div>
      <div className="zp-tabbar">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <NavLink
              key={to}
              to={to}
              className={`zp-tab${isActive ? " zp-tab--active" : ""}`}
            >
              <Icon />
              {label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default ClientLayout;
