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

const ALL_MENUS = ['A', 'B', 'C', 'V'];
const ALL_MEALS = ['breakfast', 'lunch', 'olovrant'];

const UserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { apiFetch } = useAuth();
    
    const [user, setUser] = useState<AdminUser | null>(null);
    const [allDiets, setAllDiets] = useState<Diet[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [isStaff, setIsStaff] = useState(false);

    const [menus, setMenus] = useState<Set<string>>(new Set());
    const [meals, setMeals] = useState<Set<string>>(new Set());
    const [userDiets, setUserDiets] = useState<Set<number>>(new Set());

    const fetchUser = useCallback(async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/users/${id}/`);
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                
                // Initialize form state
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
                setUserEmail(data.email || '');
                setIsStaff(data.is_staff || false);

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

    useEffect(() => {
        Promise.all([
            fetchUser(),
            fetchDiets()
        ]).finally(() => setLoading(false));
    }, [fetchUser, fetchDiets, id]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                email: userEmail,
                is_staff: isStaff,
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
                navigate('/admin/users');
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
    if (!user) return <div className="p-8 text-center text-red-500">Používateľ nenájdený</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <button onClick={() => navigate('/admin/users')} className="text-gray-500 hover:text-gray-900 mb-4 flex items-center">
                    ← Späť na zoznam
                </button>
                <h2 className="text-3xl font-bold text-gray-900">Úprava používateľa: {user.username}</h2>
            </div>

            {/* Personal Info & Role Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">👤</span>
                    Osobné údaje a Rola
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Meno</label>
                        <input 
                            type="text" 
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priezvisko</label>
                        <input 
                            type="text" 
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={userEmail}
                            onChange={e => setUserEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900">Administrátorské práva</h4>
                            <p className="text-sm text-gray-500">Administrátori majú prístup do tohto panela, ale nemôžu vytvárať objednávky.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isStaff} 
                                onChange={e => setIsStaff(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {!isStaff && (
                <>
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
                </>
            )}

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                    {saving ? 'Ukladám...' : 'Uložiť nastavenia'}
                </button>
            </div>
        </div>
    );
};

export default UserDetail;
