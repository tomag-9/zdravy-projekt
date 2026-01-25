import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './pages/client/context/AppContext';
import { AuthProvider, useAuth } from './context/auth';
import HomePage from './pages/client/pages/HomePage';
import OrderPage from './pages/client/pages/OrderPage';
import Settings from './pages/client/pages/Settings';
import ProfilePage from './pages/client/pages/ProfilePage';
import LoginPage from './pages/LoginPage';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
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
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

