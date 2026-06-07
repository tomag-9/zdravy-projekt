import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { AppProvider } from "./pages/client/context/AppContext";
import { AuthProvider, useAuth } from "./context/auth";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ToastProvider } from "./context/ToastContext";
import { PWAProvider } from "./context/PWAContext";
import { usePWA } from "./hooks/usePWA";
import { ErrorBoundary } from "./components/ErrorBoundary";
import NotificationGuard from "./components/NotificationGuard";
import PWAUpdateBanner from "./components/PWAUpdateBanner";
import AppLoadingScreen from "./components/AppLoadingScreen";
import HomePage from "./pages/client/pages/HomePage";
import OrderPage from "./pages/client/pages/OrderPage";
import SuccessPage from "./pages/client/pages/SuccessPage";
import MenuPage from "./pages/client/pages/MenuPage";
import Settings from "./pages/client/pages/Settings";
import ProfilePage from "./pages/client/pages/ProfilePage";
import AboutPage from "./pages/client/pages/AboutPage";
import ClientLayout from "./pages/client/components/ClientLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DietManager from "./pages/admin/DietManager";
import ClientList from "./pages/admin/ClientList";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminUserList from "./pages/admin/AdminUserList";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemSettings from "./pages/admin/SystemSettings";
import MealPlanCalendar from "./pages/admin/MealPlanCalendar";
import MealPlanEditor from "./pages/admin/MealPlanEditor";
import MealPlanTemplates from "./pages/admin/MealPlanTemplates";
import PortionTypes from "./pages/admin/PortionTypes";
import PushNotificationsAdmin from "./pages/admin/PushNotifications";
import HolidaysAdmin from "./pages/admin/HolidaysAdmin";

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

  // If user is admin (is_staff), they shouldn't be accessing client routes
  if (user?.is_staff) {
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

  if (!user?.is_staff) {
    return <Navigate to="/home" replace />;
  }

  return <ErrorBoundary><AdminLayout /></ErrorBoundary>;
};

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
                <Route path="clients" element={<ErrorBoundary><ClientList /></ErrorBoundary>} />
                <Route path="clients/:id" element={<ErrorBoundary><ClientDetail /></ErrorBoundary>} />
                <Route path="roles" element={<ErrorBoundary><AdminUserList /></ErrorBoundary>} />
                <Route path="roles/:id" element={<ErrorBoundary><AdminUserDetail /></ErrorBoundary>} />
                <Route path="diets" element={<ErrorBoundary><DietManager /></ErrorBoundary>} />
                <Route path="meal-plan" element={<ErrorBoundary><MealPlanCalendar /></ErrorBoundary>} />
                <Route path="meal-plan/:date" element={<ErrorBoundary><MealPlanEditor /></ErrorBoundary>} />
                <Route path="meal-plan-templates" element={<ErrorBoundary><MealPlanTemplates /></ErrorBoundary>} />
                <Route path="portion-types" element={<ErrorBoundary><PortionTypes /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><SystemSettings /></ErrorBoundary>} />
                <Route path="push-notifications" element={<ErrorBoundary><PushNotificationsAdmin /></ErrorBoundary>} />
                <Route path="holidays" element={<ErrorBoundary><HolidaysAdmin /></ErrorBoundary>} />
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
