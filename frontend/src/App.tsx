import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './pages/client/context/AppContext';
import HomePage from './pages/client/pages/HomePage';
import OrderPage from './pages/client/pages/OrderPage';
import Settings from './pages/client/pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
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
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

