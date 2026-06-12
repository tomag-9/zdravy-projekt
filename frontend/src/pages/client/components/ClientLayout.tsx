import { useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Plus, Bell } from "lucide-react";
import { useStableViewportHeight } from "../../../hooks/useStableViewportHeight";
import { useIsPC } from "../../../hooks/useIsPC";
import ClientLayoutPC from "./ClientLayoutPC";

const tabs = [
  { to: "/menu", label: "Jedálniček", icon: BookOpen },
  { to: "/home", label: "Domov", icon: Home },
  { to: "/order", label: "Objednávka", icon: Plus, action: true },
  { to: "/inbox", label: "Správy", icon: Bell },
];

// left position of the indicator pill for each tab index.
// Derived from: padding=8px, gap=4px, 4 equal tabs.
// Each tab width = (W-28px)/4  (28 = 16px padding + 12px gaps)
// Tab 0: 8px
// Tab 1: (W-28)/4 + 12 = W/4 + 5 = calc(25% + 5px)
// Tab 2: 2*(W-28)/4 + 16 = W/2 + 2 = calc(50% + 2px)
// Tab 3: 3*(W-28)/4 + 20 = 3W/4 - 1 = calc(75% - 1px)
const INDICATOR_LEFT = ["8px", "calc(25% + 5px)", "calc(50% + 2px)", "calc(75% - 1px)"];

const ClientLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isPC = useIsPC();
  useStableViewportHeight();

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

  if (isPC) {
    return <ClientLayoutPC />;
  }

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
      style={{
        width: "100%",
        height: "var(--zp-app-height, 100dvh)",
        borderRadius: 0,
        boxShadow: "none",
      }}
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
