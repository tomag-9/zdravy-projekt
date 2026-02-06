import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth';

const AdminLayout: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const isActive = (path: string) => location.pathname.startsWith(path);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Administrácia
                </h1>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <span className="text-2xl">☰</span>
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out
                md:static md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-gray-100 hidden md:block">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Administrácia
                    </h1>
                </div>
                
                {/* Mobile Close Button */}
                <div className="md:hidden p-4 flex justify-end">
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-900"
                    >
                        ✕
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <Link
                        to="/admin/dashboard"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/dashboard')
                                ? 'bg-orange-50 text-orange-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">📊</span>
                        Prehľad
                    </Link>
                    <Link
                        to="/admin/clients"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/clients')
                                ? 'bg-blue-50 text-blue-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">👥</span>
                        Správa klientov
                    </Link>
                    <Link
                        to="/admin/roles"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/roles')
                                ? 'bg-purple-50 text-purple-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">🛡️</span>
                        Správa účtov
                    </Link>
                    <Link
                        to="/admin/diets"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/diets')
                                ? 'bg-green-50 text-green-700 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">🥗</span>
                        Správa diét
                    </Link>
                    <Link
                        to="/admin/settings"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive('/admin/settings')
                                ? 'bg-gray-100 text-gray-900 font-medium translate-x-1'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span className="mr-3">⚙️</span>
                        Systém
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Odhlásiť sa
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto p-4 md:p-8 mt-14 md:mt-0">
                    <Outlet />
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity ${showLogoutModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all ${showLogoutModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Naozaj sa chcete odhlásiť?</h3>
                    <p className="text-gray-500 mb-6">Budete presmerovaný na prihlasovaciu obrazovku.</p>
                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowLogoutModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Zrušiť
                        </button>
                        <button 
                            onClick={() => {
                                setShowLogoutModal(false);
                                logout();
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            Odhlásiť sa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
