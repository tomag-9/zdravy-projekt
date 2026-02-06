import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './pages/client/context/AppContext';
import { AuthProvider, useAuth } from './context/auth';
import HomePage from './pages/client/pages/HomePage';
import OrderPage from './pages/client/pages/OrderPage';
import Settings from './pages/client/pages/Settings';
import ProfilePage from './pages/client/pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import UserList from './pages/admin/UserList';
import DietManager from './pages/admin/DietManager';
import UserDetail from './pages/admin/UserDetail';

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Weak check: wait until user is loaded.
    // Ideally AuthProvider should expose 'isLoading'.
    // If not loaded yet, we might render a loader or just nothing.
    if (!user) {
        return <div className="p-10 text-center">Loading...</div>; 
    }

    if (!user.is_staff) {
        return <Navigate to="/home" replace />;
    }

    return <AdminLayout />;
};

export default function App() {
  console.log("App initialized");
  return (
    <BrowserRouter>
      <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
                 <Route index element={<Navigate to="users" replace />} />
                 <Route path="users" element={<UserList />} />
                 <Route path="users/:id" element={<UserDetail />} />
                 <Route path="diets" element={<DietManager />} />
            </Route>

            {/* Client Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/order" element={
                <div className="min-h-screen bg-slate-50">
                  <OrderPage />
                </div>
              } />
              <Route path="/settings" element={
                <div className="min-h-screen bg-slate-50">
                  <Settings />
                </div>
              } />
            </Route>
          </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

