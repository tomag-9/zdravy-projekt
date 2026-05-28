import { useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, Settings } from "lucide-react";

const tabs = [
  { to: "/home", label: "Domov", icon: Home },
  { to: "/menu", label: "Jedálniček", icon: BookOpen },
  { to: "/settings", label: "Nastavenia", icon: Settings },
];

// left position of the indicator pill for each tab index.
// Derived from: padding=8px, gap=4px, 3 equal tabs.
// Tab 0: left=8px
// Tab 1: left = (W-24px)/3 + 12px = W/3 + 4px = calc(33.333% + 4px)
// Tab 2: left = 2(W-24px)/3 + 16px = 2W/3 = calc(66.667%)
const INDICATOR_LEFT = ["8px", "calc(33.333% + 4px)", "calc(66.667%)"];

const ClientLayout = () => {
  const location = useLocation();

  const activeIdx = Math.max(
    tabs.findIndex(
      (t) =>
        location.pathname === t.to ||
        location.pathname.startsWith(t.to + "/"),
    ),
    0,
  );

  // Track direction for page slide animation.
  // Computed in render body so it's ready before React commits the new DOM.
  const prevPathnameRef = useRef(location.pathname);
  const prevIdxRef = useRef(activeIdx);
  const dirRef = useRef<"right" | "left">("right");

  if (location.pathname !== prevPathnameRef.current) {
    dirRef.current = activeIdx >= prevIdxRef.current ? "right" : "left";
    prevPathnameRef.current = location.pathname;
    prevIdxRef.current = activeIdx;
  }

  return (
    <div
      className="zp-phone"
      style={{ width: "100%", height: "100vh", borderRadius: 0, boxShadow: "none" }}
    >
      <div className="zp-route-body">
        {/* key triggers remount and restarts CSS animation on every navigation */}
        <div key={location.pathname} className={`zp-page-enter-${dirRef.current}`}>
          <Outlet />
        </div>
      </div>

      <div className="zp-tabbar">
        {/* Sliding active-tab indicator */}
        <div
          className="zp-tab-indicator"
          style={{ left: INDICATOR_LEFT[activeIdx] }}
        />

        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive =
            location.pathname === to ||
            location.pathname.startsWith(to + "/");
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
