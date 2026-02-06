import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth';

const AdminLayout: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-xl z-10 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Administrácia
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        to="/admin/users"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/users')
                                ? 'bg-indigo-50 text-indigo-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">👥</span>
                        Používatelia
                    </Link>
                    <Link
                        to="/admin/diets"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/diets')
                                ? 'bg-indigo-50 text-indigo-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">🥗</span>
                        Správa diét
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Odhlásiť sa
                    </button>
                    {/* Admins shouldn't really go back to App as they can't do anything, but for testing maybe useful. 
                        User requested: "client can not access the admin menu", "admin can not order".
                        It is better to remove "Back to App" if admin shouldn't be there.
                        But user might want to check how it looks? No, "there is no way i will see order page".
                        So remove it.
                    */}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
