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
        paths: ['/admin/clients'],
        items: [
            { to: '/admin/clients', label: 'Správa klientov', icon: '👥', activeColor: 'text-blue-700', activeBg: 'bg-blue-50' },
        ],
    },
    {
        id: 'settings',
        label: 'Nastavenia',
        icon: '⚙️',
        paths: ['/admin/diets', '/admin/meal-plan-templates', '/admin/portion-types', '/admin/settings', '/admin/holidays'],
        items: [
            { to: '/admin/diets', label: 'Diety', icon: '🥗', activeColor: 'text-green-700', activeBg: 'bg-green-50' },
            { to: '/admin/meal-plan-templates', label: 'Šablóny jedál', icon: '📋', activeColor: 'text-lime-700', activeBg: 'bg-lime-50' },
            { to: '/admin/portion-types', label: 'Typy porcií', icon: '🥄', activeColor: 'text-amber-700', activeBg: 'bg-amber-50' },
            { to: '/admin/settings', label: 'Systémové nastavenia', icon: '⚙️', activeColor: 'text-gray-900', activeBg: 'bg-gray-100' },
            { to: '/admin/holidays', label: 'Voľné dni', icon: '🏖️', activeColor: 'text-sky-700', activeBg: 'bg-sky-50' },
        ],
    },
    {
        id: 'communication',
        label: 'Komunikácia',
        icon: '💬',
        paths: ['/admin/push-notifications'],
        items: [
            { to: '/admin/push-notifications', label: 'Notifikácie', icon: '🔔', activeColor: 'text-indigo-700', activeBg: 'bg-indigo-50' },
        ],
    },
    {
        id: 'permissions',
        label: 'Oprávnenia',
        icon: '🛡️',
        paths: ['/admin/roles'],
        items: [
            { to: '/admin/roles', label: 'Správa adminov', icon: '🛡️', activeColor: 'text-purple-700', activeBg: 'bg-purple-50' },
        ],
    },
];

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const [openSectionId, setOpenSectionId] = React.useState<string | null>(
        () => SECTIONS.find((s) => s.paths.some((p) => location.pathname.startsWith(p)))?.id ?? null,
    );

    const isItemActive = (path: string) => location.pathname.startsWith(path);

    // Auto-expand section when navigating to a child route
    React.useEffect(() => {
        const active = SECTIONS.find((s) => s.paths.some((p) => location.pathname.startsWith(p)))?.id ?? null;
        if (active) setOpenSectionId(active);
    }, [location.pathname]);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const toggleSection = (id: string) => {
        setOpenSectionId((prev) => (prev === id ? null : id));
    };

    const navItemClass = (item: NavItem) => {
        if (item.placeholder) {
            return 'flex items-center px-4 py-2.5 rounded-xl text-gray-400 cursor-default select-none';
        }
        const active = isItemActive(item.to);
        return `flex items-center px-4 py-2.5 rounded-xl transition-all duration-150 ${
            active
                ? `${item.activeBg} ${item.activeColor} font-medium translate-x-1`
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-0.5'
        }`;
    };

    const displayName = user?.first_name || user?.last_name
        ? { first: user.first_name || '', last: user.last_name || '' }
        : { first: user?.email?.split('@')[0] || '', last: '' };

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🥗</span>
                    <span className="text-xl font-bold text-green-600">Zdravý projekt</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={isMobileMenuOpen ? 'Zavrieť menu' : 'Otvoriť menu'}
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
                {/* Logo header */}
                <div className="p-5 border-b border-gray-100 shrink-0 hidden md:flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-md shadow-green-200 shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-base font-bold text-gray-900 leading-tight">Zdravý projekt</div>
                        <div className="text-xs text-gray-400 leading-tight">Administrácia</div>
                    </div>
                </div>

                {/* Mobile header inside sidebar */}
                <div className="md:hidden p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🥗</span>
                        <span className="font-bold text-green-600">Zdravý projekt</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-gray-900">✕</button>
                </div>

                <nav className="flex-1 p-4 min-h-0">
                    {/* Top-level items */}
                    <div className="space-y-1 mb-3">
                        {TOP_ITEMS.map((item) => (
                            <Link key={item.to} to={item.to} className={navItemClass(item)}>
                                <span className="mr-3">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-0.5">
                        {SECTIONS.map((section) => {
                            const isOpen = openSectionId === section.id;
                            const isActive = section.paths.some((p) => location.pathname.startsWith(p));

                            return (
                                <div key={section.id}>
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-150 ${
                                            isActive
                                                ? 'text-gray-900'
                                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                            <span>{section.icon}</span>
                                            {section.label}
                                        </span>
                                        <svg
                                            className={`w-3.5 h-3.5 transition-transform duration-400 ${isOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2.5}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Animated accordion content */}
                                    <div
                                        className="overflow-hidden"
                                        style={{
                                            maxHeight: isOpen ? '400px' : '0px',
                                            opacity: isOpen ? 1 : 0,
                                            transition: 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease-in-out',
                                        }}
                                    >
                                        <div className="ml-2 pt-0.5 pb-1 space-y-0.5">
                                            {section.items.map((item) =>
                                                item.placeholder ? (
                                                    <div key={item.to} className={navItemClass(item)}>
                                                        <span className="mr-3 opacity-40">{item.icon}</span>
                                                        <span className="text-sm">{item.label}</span>
                                                        <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-tight">
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </nav>

                {/* User + Logout footer */}
                <div className="p-4 border-t border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-green-600 truncate leading-tight">
                                {displayName.first}
                            </div>
                            {displayName.last && (
                                <div className="text-xs text-gray-500 truncate leading-tight">
                                    {displayName.last}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            title="Odhlásiť sa"
                            aria-label="Odhlásiť sa"
                            className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
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
                        <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                            Zrušiť
                        </button>
                        <button
                            onClick={() => { setShowLogoutModal(false); void logout(); }}
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
