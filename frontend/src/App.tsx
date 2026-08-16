import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useEffect } from "react";

import { AppProvider } from "./pages/client/context/AppContext";
import { AuthProvider, useAuth } from "./context/auth";
import { isAdminOrAbove, isSuperadmin } from "./lib/roles";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ToastProvider } from "./context/ToastContext";
import { PWAProvider } from "./context/PWAContext";
import { usePWA } from "./hooks/usePWA";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { ErrorBoundary } from "./components/ErrorBoundary";
import NotificationGuard from "./components/NotificationGuard";
import PWAInstallBanner from "./components/PWAInstallBanner";
import PWAUpdateBanner from "./components/PWAUpdateBanner";
import AppLoadingScreen from "./components/AppLoadingScreen";
import HomePage from "./pages/client/pages/HomePage";
import OrderPage from "./pages/client/pages/OrderPage";
import SuccessPage from "./pages/client/pages/SuccessPage";
import MenuPage from "./pages/client/pages/MenuPage";
import Settings from "./pages/client/pages/Settings";
import ProfilePage from "./pages/client/pages/ProfilePage";
import AboutPage from "./pages/client/pages/AboutPage";
import InboxPage from "./pages/client/pages/InboxPage";
import ClientLayout from "./pages/client/components/ClientLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DietManager from "./pages/admin/DietManager";
import ClientDetail from "./pages/admin/ClientDetail";
import FacilityManager from "./pages/admin/FacilityManager";
import AdminUserList from "./pages/admin/AdminUserList";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PrevadzkaOverview from "./pages/admin/PrevadzkaOverview";
import DeliveryLayoutAdmin from "./pages/admin/DeliveryLayoutAdmin";
import SystemSettings from "./pages/admin/SystemSettings";
import MealPlanCalendar from "./pages/admin/MealPlanCalendar";
import MealCatalogAdmin from "./pages/admin/MealCatalogAdmin";
import PushNotificationsAdmin from "./pages/admin/PushNotifications";
import HolidaysAdmin from "./pages/admin/HolidaysAdmin";
import AdminLogs from "./pages/admin/AdminLogs";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  // Never treat an authenticated user with an unresolved/failed profile load
  // as a client user. That could send admins into the client UI after reload.
  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  // Admin/superadmin nepatrí na klientske cesty. Rovnaký predikát ako
  // `AdminRoute`, inak by sa pri nesúlade `role`/`is_staff` točil redirect.
  if (isAdminOrAbove(user)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppProvider>
      <OnboardingProvider>
        <NotificationGuard>
          <Outlet />
        </NotificationGuard>
      </OnboardingProvider>
    </AppProvider>
  );
};

const AdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminOrAbove(user)) {
    return <Navigate to="/home" replace />;
  }

  return <ErrorBoundary><AdminLayout /></ErrorBoundary>;
};

/**
 * Sekcie presunuté na superadmina (#483). Admin, ktorý si URL napíše ručne,
 * skončí na dashboarde; backend na tie endpointy aj tak vracia 403.
 */
const SuperadminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!isSuperadmin(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

function PushSubscriptionReconciler() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { ensureSubscriptionRegistration } = usePushNotifications();

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !user ||
      user.is_staff ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    ensureSubscriptionRegistration();
  }, [ensureSubscriptionRegistration, isAuthenticated, isLoading, user]);

  return null;
}

export function ClientInstallPrompt() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user || user.is_staff) {
    return null;
  }

  // Both this banner and the onboarding tour auto-show for the same
  // first-time-mobile-user condition with no coordination between them —
  // the banner's full-screen modal would sit on top of the tour tooltip
  // and block its Next/Skip buttons. Defer the banner until onboarding
  // has been completed or skipped.
  if (user.onboarding_completed === false) {
    return null;
  }

  return <PWAInstallBanner />;
}

/**
 * AppContent — shown inside all providers.
 * Displays AppLoadingScreen while auth is initialising.
 * In standalone (PWA) mode, SW updates are applied automatically as a
 * fire-and-forget (page reloads when ready; no risk of blocking the UI).
 */
function AppContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { updateAvailable, applyUpdate, isStandalone } = usePWA();

  // Fire-and-forget: no state involved, so a stuck loading screen is impossible
  if (updateAvailable && isStandalone) {
    applyUpdate();
  }

  if (isLoading) {
    return <AppLoadingScreen status="Načítavam..." />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <PWAProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent>
              <PushSubscriptionReconciler />
              <ClientInstallPrompt />
              {/* Banner only shown in browser (non-standalone) mode */}
              <PWAUpdateBanner />
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify-email/:token" element={<Navigate to="/login" replace />} />
              <Route path="/resend-verification" element={<Navigate to="/login" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/set-password" element={<SetPasswordPage />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                <Route path="prevadzka-overview" element={<ErrorBoundary><PrevadzkaOverview /></ErrorBoundary>} />
                <Route path="delivery-layout" element={<ErrorBoundary><DeliveryLayoutAdmin /></ErrorBoundary>} />
                <Route path="facilities" element={<ErrorBoundary><FacilityManager /></ErrorBoundary>} />
                <Route path="facilities/:id" element={<ErrorBoundary><ClientDetail /></ErrorBoundary>} />
                <Route path="roles" element={<SuperadminRoute><AdminUserList /></SuperadminRoute>} />
                <Route path="roles/:id" element={<SuperadminRoute><AdminUserDetail /></SuperadminRoute>} />
                <Route path="diets" element={<ErrorBoundary><DietManager /></ErrorBoundary>} />
                <Route path="meal-plan" element={<ErrorBoundary><MealPlanCalendar /></ErrorBoundary>} />
                <Route path="meal-catalog" element={<ErrorBoundary><MealCatalogAdmin /></ErrorBoundary>} />
                <Route path="settings" element={<SuperadminRoute><SystemSettings /></SuperadminRoute>} />
                <Route path="push-notifications" element={<ErrorBoundary><PushNotificationsAdmin /></ErrorBoundary>} />
                <Route path="holidays" element={<ErrorBoundary><HolidaysAdmin /></ErrorBoundary>} />
                <Route path="logs" element={<SuperadminRoute><AdminLogs /></SuperadminRoute>} />
              </Route>

              {/* Client Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route element={<ClientLayout />}>
                  <Route path="/home" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                  <Route path="/menu" element={<ErrorBoundary><MenuPage /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                  <Route path="/order" element={<ErrorBoundary><OrderPage /></ErrorBoundary>} />
                  <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
                  <Route path="/about" element={<ErrorBoundary><AboutPage /></ErrorBoundary>} />
                  <Route path="/inbox" element={<ErrorBoundary><InboxPage /></ErrorBoundary>} />
                </Route>
                <Route path="/success" element={<ErrorBoundary><SuccessPage /></ErrorBoundary>} />
              </Route>
              </Routes>
            </AppContent>
          </ToastProvider>
        </AuthProvider>
      </PWAProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
