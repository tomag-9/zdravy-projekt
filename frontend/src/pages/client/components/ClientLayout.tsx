import { useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Plus } from "lucide-react";

const tabs = [
  { to: "/menu", label: "Jedálniček", icon: BookOpen },
  { to: "/home", label: "Domov", icon: Home },
  { to: "/order", label: "Nová objednávka", icon: Plus, action: true },
];

// left position of the indicator pill for each tab index.
// Derived from: padding=8px, gap=4px, 3 equal tabs.
// Tab 0: left=8px
// Tab 1: left = (W-24px)/3 + 12px = W/3 + 4px = calc(33.333% + 4px)
// Tab 2: left = 2(W-24px)/3 + 16px = 2W/3 = calc(66.667%)
const INDICATOR_LEFT = ["8px", "calc(33.333% + 4px)", "calc(66.667%)"];

const ClientLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTabIdx = tabs.findIndex(
      (t) =>
        location.pathname === t.to ||
        location.pathname.startsWith(t.to + "/"),
  );
  const activeIdx = activeTabIdx >= 0 ? activeTabIdx : 1;

  // Track direction for page slide animation.
  // Computed in render body so it's ready before React commits the new DOM.
  const prevPathnameRef = useRef(location.pathname);
  const prevIdxRef = useRef(activeIdx);
  const dirRef = useRef<"right" | "left">("right");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (location.pathname !== prevPathnameRef.current) {
    dirRef.current = activeIdx >= prevIdxRef.current ? "right" : "left";
    prevPathnameRef.current = location.pathname;
    prevIdxRef.current = activeIdx;
  }

  const navigateBySwipe = (deltaX: number, deltaY: number) => {
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
      return;
    }

    const nextIdx = deltaX < 0 ? activeIdx + 1 : activeIdx - 1;
    if (nextIdx < 0 || nextIdx >= tabs.length) return;
    navigate(tabs[nextIdx].to);
  };

  return (
    <div
      className="zp-phone"
      style={{ width: "100%", height: "100vh", borderRadius: 0, boxShadow: "none" }}
    >
      <div
        className="zp-route-body"
        onTouchStart={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(".zp-centered-modal, .zp-sheet-scrim, [role='dialog']")
          ) {
            touchStartRef.current = null;
            return;
          }
          const touch = event.touches[0];
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          const touch = event.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !touch) return;
          navigateBySwipe(touch.clientX - start.x, touch.clientY - start.y);
        }}
      >
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

        {tabs.map(({ to, label, icon: Icon, action }) => {
          const isActive =
            location.pathname === to ||
            location.pathname.startsWith(to + "/");
          return (
            <NavLink
              key={to}
              to={to}
              className={`zp-tab${isActive ? " zp-tab--active" : ""}${action ? " zp-tab--action" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default ClientLayout;
