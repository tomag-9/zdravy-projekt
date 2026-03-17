import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Calendar, Save, Bell, Download, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../../context/auth';
import { useOnboarding } from '../../../context/OnboardingContext';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { usePWA } from '../../../hooks/usePWA';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    ico?: string;
    dic?: string;
    date_joined: string;
    groups: string[];
    profile?: UserProfileData;
}

const ProfilePage = () => {
    const { apiFetch, logout } = useAuth();
    const { resetTour } = useOnboarding();
    const navigate = useNavigate();
    const [resettingTour, setResettingTour] = useState(false);
    const {
        permission,
        isSubscribed,
        subscribe,
        unsubscribe,
        error: pushError,
    } = usePushNotifications();
    const {
        isStandalone,
        isIOS,
        isAndroid,
        canInstall,
        installPrompt,
    } = usePWA();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [pushMessage, setPushMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [pwaMessage, setPwaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        company_name: '',
        ico: '',
        dic: '',
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
                    company_name: data.company_name || data.profile?.company_name || '',
                    ico: data.ico || data.profile?.ico || '',
                    dic: data.dic || data.profile?.dic || '',
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

    const handleEnableNotifications = async () => {
        setPushLoading(true);
        setPushMessage(null);
        try {
            const ok = await subscribe();
            const currentPermission =
                typeof Notification !== 'undefined' ? Notification.permission : permission;

            if (ok) {
                setPushMessage({ type: 'success', text: 'Notifikácie boli úspešne aktivované.' });
            } else if (currentPermission === 'denied') {
                setPushMessage({
                    type: 'error',
                    text: 'Notifikácie sú zablokované v prehliadači. Povoľte ich v nastaveniach stránky.',
                });
            } else {
                setPushMessage({
                    type: 'error',
                    text: 'Notifikácie sa nepodarilo aktivovať. Skúste to prosím znova.',
                });
            }
        } catch {
            setPushMessage({
                type: 'error',
                text: 'Nepodarilo sa aktivovať notifikácie.',
            });
        } finally {
            setPushLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setPushLoading(true);
        setPushMessage(null);
        try {
            const ok = await unsubscribe();
            if (ok) {
                setPushMessage({ type: 'success', text: 'Notifikácie boli vypnuté.' });
            } else {
                setPushMessage({
                    type: 'error',
                    text: 'Notifikácie sa nepodarilo vypnúť. Skúste to prosím znova.',
                });
            }
        } catch {
            setPushMessage({
                type: 'error',
                text: 'Nepodarilo sa vypnúť notifikácie.',
            });
        } finally {
            setPushLoading(false);
        }
    };

    const handleInstallPWA = () => {
        setPwaMessage(null);

        if (isStandalone) {
            setPwaMessage({ type: 'success', text: 'Aplikácia je už nainštalovaná.' });
            return;
        }

        if (canInstall) {
            installPrompt();
            setPwaMessage({ type: 'success', text: 'Potvrďte inštaláciu v prehliadači.' });
            return;
        }

        if (isIOS) {
            setPwaMessage({
                type: 'error',
                text: 'V Safari zvoľte Zdieľať → Pridať na plochu.',
            });
            return;
        }

        if (isAndroid) {
            setPwaMessage({
                type: 'error',
                text: 'V menu prehliadača zvoľte Inštalovať aplikáciu (alebo Pridať na plochu).',
            });
            return;
        }

        setPwaMessage({
            type: 'error',
            text: 'Inštalácia PWA nie je v tomto prehliadači dostupná.',
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
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <Link to="/home" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Späť na domovskú stránku</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setShowLogoutConfirmation(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Odhlásiť sa
                        </button>
                    </div>
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
                        <div className="bg-indigo-50 rounded-lg p-4 mb-2">
                            <h3 className="font-semibold text-slate-900 mb-3">Informácie o spoločnosti</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Názov spoločnosti
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="Názov spoločnosti"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        IČO
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ico}
                                        onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="IČO"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        DIČ
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dic}
                                        onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="DIČ"
                                    />
                                </div>
                            </div>
                        </div>

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

                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Sprievodca aplikáciou</p>
                                    <p className="text-sm text-slate-600">Znovu spustiť úvodného sprievodcu aplikáciou.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={resettingTour}
                                onClick={async () => {
                                    setResettingTour(true);
                                    await resetTour();
                                    setResettingTour(false);
                                    navigate('/home');
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {resettingTour ? 'Spracúvam...' : 'Spustiť sprievodcu znovu'}
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Push notifikácie</p>
                                    <p className="text-sm text-slate-600">
                                        {isSubscribed
                                            ? 'Notifikácie sú aktívne.'
                                            : 'Ak sa výzva nezobrazí automaticky, povoľte notifikácie ručne.'}
                                    </p>
                                </div>
                            </div>

                            {permission === 'denied' && (
                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    Notifikácie sú zamietnuté. V prehliadači otvorte Nastavenia stránky a povoľte notifikácie pre túto doménu.
                                </p>
                            )}

                            {pushError && (
                                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                                    {pushError}
                                </p>
                            )}

                            {pushMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium ${
                                    pushMessage.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                    {pushMessage.text}
                                </div>
                            )}

                            {pwaMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium ${
                                    pwaMessage.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                    {pwaMessage.text}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleEnableNotifications}
                                    disabled={pushLoading || permission === 'unsupported' || isSubscribed}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    {pushLoading ? 'Spracúvam...' : 'Povoliť notifikácie'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleInstallPWA}
                                    disabled={isStandalone}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Inštalovať aplikáciu
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDisableNotifications}
                                    disabled={pushLoading || !isSubscribed}
                                    className="px-4 py-2 bg-white hover:bg-slate-100 disabled:bg-slate-100 text-slate-700 text-sm font-medium border border-slate-300 rounded-lg transition-colors"
                                >
                                    Vypnúť notifikácie
                                </button>
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

            <ConfirmationModal
                isOpen={showLogoutConfirmation}
                onClose={() => setShowLogoutConfirmation(false)}
                onConfirm={logout}
                title="Odhlásenie"
                description="Naozaj sa chcete odhlásiť z aplikácie?"
                confirmText="Odhlásiť sa"
                cancelText="Zrušiť"
                variant="danger"
            />
        </div>
    );
};

export default ProfilePage;
