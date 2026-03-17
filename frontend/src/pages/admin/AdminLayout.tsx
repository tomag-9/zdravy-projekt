import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth';

interface NavItem {
    to: string;
    label: string;
    icon: string;
    activeColor: string;
    activeBg: string;
    placeholder?: boolean;
}

interface NavSection {
    id: string;
    label: string;
    icon: string;
    paths: string[];
    items: NavItem[];
}

const TOP_ITEMS: NavItem[] = [
    { to: '/admin/dashboard', label: 'Prehľad', icon: '📊', activeColor: 'text-orange-700', activeBg: 'bg-orange-50' },
    { to: '/admin/meal-plan', label: 'Jedálniček', icon: '🗓️', activeColor: 'text-teal-700', activeBg: 'bg-teal-50' },
];

const SECTIONS: NavSection[] = [
    {
        id: 'clients',
        label: 'Klienti',
        icon: '👥',
        paths: ['/admin/clients', '/admin/orders'],
        items: [
            { to: '/admin/clients', label: 'Správa klientov', icon: '👥', activeColor: 'text-blue-700', activeBg: 'bg-blue-50' },
            { to: '/admin/orders', label: 'Objednávky', icon: '🛒', activeColor: 'text-cyan-700', activeBg: 'bg-cyan-50' },
        ],
    },
    {
        id: 'settings',
        label: 'Nastavenia',
        icon: '⚙️',
        paths: ['/admin/diets', '/admin/meal-plan-templates', '/admin/portion-types', '/admin/settings'],
        items: [
            { to: '/admin/diets', label: 'Diety', icon: '🥗', activeColor: 'text-green-700', activeBg: 'bg-green-50' },
            { to: '/admin/meal-plan-templates', label: 'Šablóny jedál', icon: '📋', activeColor: 'text-lime-700', activeBg: 'bg-lime-50' },
            { to: '/admin/portion-types', label: 'Typy porcií', icon: '🥄', activeColor: 'text-amber-700', activeBg: 'bg-amber-50' },
            { to: '/admin/settings', label: 'Systémové nastavenia', icon: '⚙️', activeColor: 'text-gray-900', activeBg: 'bg-gray-100' },
            { to: '/admin/holidays', label: 'Voľné dni', icon: '🏖️', activeColor: 'text-sky-700', activeBg: 'bg-sky-50', placeholder: true },
        ],
    },
    {
        id: 'communication',
        label: 'Komunikácia',
        icon: '💬',
        paths: ['/admin/push-notifications'],
        items: [
            { to: '/admin/push-notifications', label: 'Notifikácie', icon: '🔔', activeColor: 'text-indigo-700', activeBg: 'bg-indigo-50' },
            { to: '/admin/info', label: 'Info', icon: 'ℹ️', activeColor: 'text-violet-700', activeBg: 'bg-violet-50', placeholder: true },
        ],
    },
    {
        id: 'permissions',
        label: 'Oprávnenia',
        icon: '🛡️',
        paths: ['/admin/roles'],
        items: [
            { to: '/admin/roles', label: 'Správa adminov', icon: '🛡️', activeColor: 'text-purple-700', activeBg: 'bg-purple-50' },
            { to: '/admin/admin-notifications', label: 'Admin notifikácie', icon: '🔔', activeColor: 'text-rose-700', activeBg: 'bg-rose-50', placeholder: true },
            { to: '/admin/roles-permissions', label: 'Roly a oprávnenia', icon: '🔑', activeColor: 'text-pink-700', activeBg: 'bg-pink-50', placeholder: true },
        ],
    },
];

const AdminLayout: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const isItemActive = (path: string) => location.pathname.startsWith(path);

    const isSectionActive = (section: NavSection) =>
        section.paths.some((p) => location.pathname.startsWith(p));

    const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        SECTIONS.forEach((s) => {
            initial[s.id] = s.paths.some((p) => location.pathname.startsWith(p));
        });
        return initial;
    });

    // Auto-expand section when navigating to a child route
    React.useEffect(() => {
        setOpenSections((prev) => {
            const next = { ...prev };
            SECTIONS.forEach((s) => {
                if (isSectionActive(s)) {
                    next[s.id] = true;
                }
            });
            return next;
        });
    }, [location.pathname]);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const navItemClass = (item: NavItem) => {
        if (item.placeholder) {
            return 'flex items-center px-4 py-2.5 rounded-xl text-gray-400 cursor-default select-none';
        }
        const active = isItemActive(item.to);
        return `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${
            active
                ? `${item.activeBg} ${item.activeColor} font-medium translate-x-1`
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`;
    };

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

                <nav className="flex-1 p-4 overflow-y-auto">
                    {/* Top-level items */}
                    <div className="space-y-1 mb-4">
                        {TOP_ITEMS.map((item) => (
                            <Link key={item.to} to={item.to} className={navItemClass(item)}>
                                <span className="mr-3">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-1">
                        {SECTIONS.map((section) => {
                            const isOpen = openSections[section.id];
                            const active = isSectionActive(section);
                            return (
                                <div key={section.id}>
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                            active
                                                ? 'text-gray-900 font-semibold'
                                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                            <span>{section.icon}</span>
                                            {section.label}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {isOpen && (
                                        <div className="mt-1 ml-2 space-y-0.5">
                                            {section.items.map((item) =>
                                                item.placeholder ? (
                                                    <div key={item.to} className={navItemClass(item)}>
                                                        <span className="mr-3 opacity-50">{item.icon}</span>
                                                        <span className="text-sm">{item.label}</span>
                                                        <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                                                            čoskoro
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Link key={item.to} to={item.to} className={navItemClass(item)}>
                                                        <span className="mr-3">{item.icon}</span>
                                                        <span className="text-sm">{item.label}</span>
                                                    </Link>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
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
