import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';

interface Diet {
    id: number;
    name: string;
}

interface UserSettings {
    visible_menus: string[];
    visible_meals: string[];
    visible_diets: number[]; // IDs
}

interface AdminUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
    settings: UserSettings | null;
}

interface OrderData {
    lunch?: string;
    soup?: string;
    breakfast?: string;
    olovrant?: boolean | string;
}

interface DailyOrder {
    id: number;
    date: string;
    status: string;
    data: OrderData;
}

const ALL_MENUS = ['A', 'B', 'C', 'V'];
const ALL_MEALS = ['breakfast', 'lunch', 'olovrant'];

const ClientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { apiFetch } = useAuth();
    
    const [user, setUser] = useState<AdminUser | null>(null);
    const [allDiets, setAllDiets] = useState<Diet[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

    // Settings State
    const [menus, setMenus] = useState<Set<string>>(new Set());
    const [meals, setMeals] = useState<Set<string>>(new Set());
    const [userDiets, setUserDiets] = useState<Set<number>>(new Set());

    // Dashboard State
    const [recentOrders, setRecentOrders] = useState<DailyOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const fetchUser = useCallback(async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/users/${id}/`);
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                
                const settings = data.settings || {};
                setMenus(new Set(settings.visible_menus || ['A']));
                setMeals(new Set(settings.visible_meals || []));
                setUserDiets(new Set(settings.visible_diets || []));
            }
        } catch (e) {
            console.error(e);
        }
    }, [apiFetch, id]);

    const fetchDiets = useCallback(async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/diets/`);
            if (res.ok) {
                const data = await res.json();
                setAllDiets(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) {
            console.error(e);
        }
    }, [apiFetch]);

    const fetchOrders = useCallback(async () => {
        if (!id) return;
        setOrdersLoading(true);
        try {
            // Fetch orders for this user
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/orders/?user_id=${id}`);
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.results || [];
                // Sort by date desc
                list.sort((a: DailyOrder, b: DailyOrder) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setRecentOrders(list);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setOrdersLoading(false);
        }
    }, [apiFetch, id]);

    useEffect(() => {
        Promise.all([
            fetchUser(),
            fetchDiets()
        ]).finally(() => setLoading(false));
    }, [fetchUser, fetchDiets]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchOrders();
        }
    }, [activeTab, fetchOrders]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const payload = {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                is_staff: user.is_staff,
                settings: {
                    visible_menus: Array.from(menus),
                    visible_meals: Array.from(meals),
                    visible_diets: Array.from(userDiets)
                }
            };

            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/users/${user.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                navigate('/admin/clients');
            } else {
                alert("Failed to save settings");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        setter(newSet);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Načítavam...</div>;
    if (!user) return <div className="p-8 text-center text-red-500">Klient nenájdený</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            <div>
                <button onClick={() => navigate('/admin/clients')} className="text-gray-500 hover:text-gray-900 mb-4 flex items-center">
                    ← Späť na zoznam klientov
                </button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">{user.username}</h2>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'dashboard' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Prehľad objednávok
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'settings' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Nastavenia
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">História objednávok</h3>
                        </div>
                        {ordersLoading ? (
                             <div className="p-12 text-center text-gray-400">Načítavam objednávky...</div>
                        ) : recentOrders.length === 0 ? (
                             <div className="p-12 text-center text-gray-400">Tento klient zatiaľ nemá žiadne objednávky.</div>
                        ) : (
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4">Dátum</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Obed</th>
                                        <th className="px-6 py-4">Polievka</th>
                                        <th className="px-6 py-4">Raňajky/Olovrant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{order.date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    order.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {order.status === 'submitted' ? 'Potvrdené' : 'Rozpracované'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const lunchData = order.data.lunch;
                                                    if (!lunchData) return '-';
                                                    // Handle legacy string format or new object format
                                                    if (typeof lunchData === 'string') return <span className="font-bold text-blue-600">Menu {lunchData}</span>;
                                                    
                                                    // Aggregate from object
                                                    const counts: Record<string, number> = {};
                                                    Object.values(lunchData).forEach((cat: any) => {
                                                        if (cat.menuCounts) {
                                                            Object.entries(cat.menuCounts).forEach(([menu, count]) => {
                                                                counts[menu] = (counts[menu] || 0) + Number(count);
                                                            });
                                                        }
                                                    });
                                                    
                                                    const summary = Object.entries(counts)
                                                        .filter(([_, c]) => c > 0)
                                                        .map(([m, c]) => `${c}x ${m}`)
                                                        .join(', ');
                                                        
                                                    return summary ? <span className="font-bold text-blue-600">{summary}</span> : '-';
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                 {/* Soup logic - assuming it might be gone or aggregated? For now check if 'soup' exists in root or ignore */}
                                                 {typeof order.data.soup === 'string' ? order.data.soup : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                 <div className="flex space-x-2">
                                                    {order.data.breakfast && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">R</span>}
                                                    {order.data.olovrant && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">O</span>}
                                                    {!order.data.breakfast && !order.data.olovrant && '-'}
                                                 </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                     </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
                        {/* Menus Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">📋</span>
                                Viditeľné menu
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Vyberte, ktoré typy menu sa zobrazia pre tohto klienta.</p>
                            <div className="space-y-3">
                                {ALL_MENUS.map(menu => (
                                    <label key={menu} className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200">
                                        <input
                                            type="checkbox"
                                            checked={menus.has(menu)}
                                            onChange={() => toggleSet(menus, menu, setMenus)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-3"
                                        />
                                        <span className="font-medium text-gray-700">Menu {menu}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Meals Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="bg-amber-100 text-amber-600 p-2 rounded-lg mr-3">🍽️</span>
                                Viditeľné jedlá
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Nastavte, ktoré chody dňa sú dostupné.</p>
                            <div className="space-y-3">
                                {ALL_MEALS.map(meal => (
                                    <label key={meal} className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-amber-50 has-[:checked]:border-amber-200">
                                        <input
                                            type="checkbox"
                                            checked={meals.has(meal)}
                                            onChange={() => toggleSet(meals, meal, setMeals)}
                                            className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-gray-300 mr-3"
                                        />
                                        <span className="font-medium text-gray-700 capitalize">{meal}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Diets Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3">🥗</span>
                            Povolené diéty
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Obmedzte, ktoré špeciálne diéty si klient môže vybrať.</p>
                        
                        {allDiets.length === 0 ? (
                            <p className="text-gray-400 italic">V systéme nie sú definované žiadne diéty.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {allDiets.map(diet => (
                                    <label key={diet.id} className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:bg-green-50 has-[:checked]:border-green-200">
                                        <input
                                            type="checkbox"
                                            checked={userDiets.has(diet.id)}
                                            onChange={() => toggleSet(userDiets, diet.id, setUserDiets)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300 mr-3"
                                        />
                                        <span className="text-gray-700">{diet.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-8">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {saving ? 'Ukladám...' : 'Uložiť nastavenia'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetail;
