import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { Link } from 'react-router-dom';

interface AdUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
}

const UserList: React.FC = () => {
    const { apiFetch } = useAuth();
    const [users, setUsers] = useState<AdUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/users/`);
            if (res.ok) {
                const data = await res.json();
                // Handle pagination if present, otherwise assume array
                const list = Array.isArray(data) ? data : data.results || [];
                setUsers(list);
            } else {
                console.error("Failed to fetch users");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Správa používateľov</h2>
                    <p className="text-gray-500 mt-1">Spravujte používateľov a viditeľnosť menu/jedál</p>
                </div>
                {/* <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                    + Add New User
                </button> */}
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Hľadať používateľov..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                />
                <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Používateľ</th>
                                <th className="px-6 py-4">Stav</th>
                                <th className="px-6 py-4">Rola</th>
                                <th className="px-6 py-4 text-right">Akcie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Načítavam používateľov...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Žiadni používatelia</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold mr-3 shadow-md shadow-indigo-200">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{user.username}</div>
                                                    <div className="text-xs text-gray-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.is_active ? 'Aktívny' : 'Neaktívny'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_staff ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Klient
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/admin/users/${user.id}`}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                            >
                                                Upraviť nastavenia
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserList;
