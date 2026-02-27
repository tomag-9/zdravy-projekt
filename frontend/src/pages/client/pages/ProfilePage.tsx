import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Calendar, Save } from 'lucide-react';
import { useAuth } from '../../../context/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface UserProfileData {
    company_name: string;
    ico?: string;
    dic?: string;
    registration_status: string;
    email_verified: boolean;
    registration_date: string;
}

interface UserProfile {
    email: string;
    first_name: string;
    last_name: string;
    company_name: string;
    date_joined: string;
    groups: string[];
    profile?: UserProfileData;
}

const ProfilePage = () => {
    const { apiFetch } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });

    const fetchProfile = useCallback(async () => {
        try {
            const response = await apiFetch(`${API_URL}/user/profile/`);

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || ''
                });
            } else {
                setMessage({ type: 'error', text: 'Nepodarilo sa načítať profil' });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setMessage({ type: 'error', text: 'Chyba pri načítaní profilu' });
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const response = await apiFetch(`${API_URL}/user/profile/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setMessage({ type: 'success', text: 'Profil bol úspešne aktualizovaný' });
            } else {
                setMessage({ type: 'error', text: 'Nepodarilo sa aktualizovať profil' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Chyba pri ukladaní zmien' });
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('sk-SK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Načítavam profil...</p>
                </div>
            </div>
        );

    }

    if (!profile) {
        return (
             <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{message?.text || 'Nepodarilo sa načítať profil.'}</p>
                    <Link to="/home" className="text-indigo-600 hover:underline">Späť na domovskú stránku</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-20">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 pt-4">
                    <Link to="/home" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Späť na domovskú stránku</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Môj profil</h1>
                    <p className="text-slate-600">Spravujte svoje osobné údaje</p>
                </div>

                {/* Profile Info Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 p-8 mb-6">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                {profile?.company_name || profile?.email}
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">{profile?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Shield className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm text-slate-600">
                                    {profile?.groups && profile.groups.length > 0 ? profile.groups.join(', ') : 'Používateľ'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {profile?.profile && (
                            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-slate-900 mb-3">Informácie o spoločnosti</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="font-medium text-slate-700">Názov:</span>{" "}
                                        <span className="text-slate-600">{profile.profile.company_name}</span>
                                    </div>
                                    {profile.profile.ico && (
                                        <div>
                                            <span className="font-medium text-slate-700">IČO:</span>{" "}
                                            <span className="text-slate-600">{profile.profile.ico}</span>
                                        </div>
                                    )}
                                    {profile.profile.dic && (
                                        <div>
                                            <span className="font-medium text-slate-700">DIČ:</span>{" "}
                                            <span className="text-slate-600">{profile.profile.dic}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder="vas@email.sk"
                            />
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Kontaktná osoba (nepovinné)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Krstné meno
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="Vaše krstné meno"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Priezvisko
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="Vaše priezvisko"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-slate-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-700">Dátum registrácie</p>
                                <p className="text-sm text-slate-600">{profile?.date_joined && formatDate(profile.date_joined)}</p>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-lg flex items-center gap-2 ${
                                message.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
                                <span className="text-sm font-medium">{message.text}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Ukladám...' : 'Uložiť zmeny'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
