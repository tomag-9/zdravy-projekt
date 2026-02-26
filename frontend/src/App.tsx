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
import HomePage from "./pages/client/pages/HomePage";
import OrderPage from "./pages/client/pages/OrderPage";
import Settings from "./pages/client/pages/Settings";
import ProfilePage from "./pages/client/pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DietManager from "./pages/admin/DietManager";
import ClientList from "./pages/admin/ClientList";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminUserList from "./pages/admin/AdminUserList";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemSettings from "./pages/admin/SystemSettings";

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

  // If user is admin (is_staff), they shouldn't be accessing client routes
  if (user?.is_staff) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppProvider>
      <Outlet />
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

  if (!user?.is_staff) {
    return <Navigate to="/home" replace />;
  }

  return <AdminLayout />;
};

export default function App() {
  console.log("App initialized");
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="clients" element={<ClientList />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="roles" element={<AdminUserList />} />
              <Route path="roles/:id" element={<AdminUserDetail />} />
              <Route path="diets" element={<DietManager />} />
              <Route path="settings" element={<SystemSettings />} />
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
    </BrowserRouter>
  );
}
