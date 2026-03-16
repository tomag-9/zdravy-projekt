import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AppProvider } from "./pages/client/context/AppContext";
import { AuthProvider, useAuth } from "./context/auth";
import { ToastProvider } from "./context/ToastContext";
import { PWAProvider } from "./context/PWAContext";
import NotificationGuard from "./components/NotificationGuard";
import PWAUpdateBanner from "./components/PWAUpdateBanner";
import HomePage from "./pages/client/pages/HomePage";
import OrderPage from "./pages/client/pages/OrderPage";
import Settings from "./pages/client/pages/Settings";
import ProfilePage from "./pages/client/pages/ProfilePage";
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

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for the profile to load before deciding which layout to show
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
      <NotificationGuard>
        <Outlet />
      </NotificationGuard>
    </AppProvider>
  );
};

const AdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_staff) {
    return <Navigate to="/home" replace />;
  }

  return <AdminLayout />;
};

export default function App() {
  return (
    <BrowserRouter>
      <PWAProvider>
        <AuthProvider>
          <ToastProvider>
            <PWAUpdateBanner />
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/verify-email/:token" element={<Navigate to="/login" replace />} />
            <Route path="/resend-verification" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="clients" element={<ClientList />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="roles" element={<AdminUserList />} />
              <Route path="roles/:id" element={<AdminUserDetail />} />
              <Route path="diets" element={<DietManager />} />
              <Route path="meal-plan" element={<MealPlanCalendar />} />
              <Route path="meal-plan/:date" element={<MealPlanEditor />} />
              <Route path="meal-plan-templates" element={<MealPlanTemplates />} />
              <Route path="portion-types" element={<PortionTypes />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="push-notifications" element={<PushNotificationsAdmin />} />
            </Route>

            {/* Client Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/order"
                element={
                  <div className="min-h-screen bg-slate-50">
                    <OrderPage />
                  </div>
                }
              />
              <Route
                path="/settings"
                element={
                  <div className="min-h-screen bg-slate-50">
                    <Settings />
                  </div>
                }
              />
            </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </PWAProvider>
    </BrowserRouter>
  );
}
