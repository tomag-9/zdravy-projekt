import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Calendar, Save, Bell, Download, BookOpen, LogOut
} from 'lucide-react';
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
    const { isStandalone, isIOS, isAndroid, canInstall, installPrompt } = usePWA();
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

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const response = await apiFetch(`${API_URL}/user/profile/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setMessage({ type: 'success', text: 'Profil bol úspešne aktualizovaný' });
            } else {
                setMessage({ type: 'error', text: 'Nepodarilo sa aktualizovať profil' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Chyba pri ukladaní zmien' });
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('sk-SK', { year: 'numeric', month: 'long', day: 'numeric' });

    const handleEnableNotifications = async () => {
        setPushLoading(true);
        setPushMessage(null);
        try {
            const ok = await subscribe();
            const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : permission;
            if (ok) {
                setPushMessage({ type: 'success', text: 'Notifikácie boli úspešne aktivované.' });
            } else if (currentPermission === 'denied') {
                setPushMessage({ type: 'error', text: 'Notifikácie sú zablokované v prehliadači. Povoľte ich v nastaveniach stránky.' });
            } else {
                setPushMessage({ type: 'error', text: 'Notifikácie sa nepodarilo aktivovať. Skúste to prosím znova.' });
            }
        } catch {
            setPushMessage({ type: 'error', text: 'Nepodarilo sa aktivovať notifikácie.' });
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
                setPushMessage({ type: 'error', text: 'Notifikácie sa nepodarilo vypnúť. Skúste to prosím znova.' });
            }
        } catch {
            setPushMessage({ type: 'error', text: 'Nepodarilo sa vypnúť notifikácie.' });
        } finally {
            setPushLoading(false);
        }
    };

    const handleInstallPWA = () => {
        setPwaMessage(null);
        if (isStandalone) { setPwaMessage({ type: 'success', text: 'Aplikácia je už nainštalovaná.' }); return; }
        if (canInstall) { installPrompt(); setPwaMessage({ type: 'success', text: 'Potvrďte inštaláciu v prehliadači.' }); return; }
        if (isIOS) { setPwaMessage({ type: 'error', text: 'V Safari zvoľte Zdieľať → Pridať na plochu.' }); return; }
        if (isAndroid) { setPwaMessage({ type: 'error', text: 'V menu prehliadača zvoľte Inštalovať aplikáciu (alebo Pridať na plochu).' }); return; }
        setPwaMessage({ type: 'error', text: 'Inštalácia PWA nie je v tomto prehliadači dostupná.' });
    };

    if (loading) {
        return (
            <div className="zp-app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, border: "4px solid var(--green-600)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--ink-3)" }}>Načítavam profil...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="zp-app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--coral-600)", marginBottom: 16 }}>{message?.text || 'Nepodarilo sa načítať profil.'}</p>
                    <button className="zp-btn zp-btn--secondary" onClick={() => navigate("/home")}>Späť na domovskú stránku</button>
                </div>
            </div>
        );
    }

    return (
        <div className="zp-app" style={{ minHeight: "100vh" }}>
            {/* Page header */}
            <div className="zp-pageheader">
                <button className="zp-iconbtn" onClick={() => navigate("/settings")}>
                    <ArrowLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
                </button>
                <div>
                    <h1>Môj profil</h1>
                    <p>Spravujte svoje osobné údaje</p>
                </div>
                <button
                    type="button"
                    className="zp-iconbtn"
                    onClick={() => setShowLogoutConfirmation(true)}
                    aria-label="Odhlásiť sa"
                >
                    <LogOut style={{ width: 18, height: 18, strokeWidth: 2 }} />
                </button>
            </div>

            {/* User info summary */}
            <div style={{ padding: "0 20px 20px" }}>
                <div className="zp-card zp-card--padded" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--green-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User style={{ width: 26, height: 26, color: "var(--bg-cream)" }} />
                    </div>
                    <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green-900)", fontSize: 16 }}>
                            {profile?.company_name || profile?.email}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{profile?.email}</div>
                    </div>
                </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSubmit}>
                {/* Company info section */}
                <div className="zp-settings-section">
                    <h2>Informácie o spoločnosti</h2>
                    <div className="zp-settings-list" style={{ padding: "16px" }}>
                        <div className="zp-field">
                            <label className="zp-label">Názov spoločnosti</label>
                            <input
                                className="zp-input"
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="Názov spoločnosti"
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="zp-field" style={{ marginBottom: 0 }}>
                                <label className="zp-label">IČO</label>
                                <input
                                    className="zp-input"
                                    type="text"
                                    value={formData.ico}
                                    onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                                    placeholder="IČO"
                                />
                            </div>
                            <div className="zp-field" style={{ marginBottom: 0 }}>
                                <label className="zp-label">DIČ</label>
                                <input
                                    className="zp-input"
                                    type="text"
                                    value={formData.dic}
                                    onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                                    placeholder="DIČ"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact person section */}
                <div className="zp-settings-section">
                    <h2>Kontaktná osoba</h2>
                    <div className="zp-settings-list" style={{ padding: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div className="zp-field" style={{ marginBottom: 0 }}>
                                <label className="zp-label">Krstné meno</label>
                                <input
                                    className="zp-input"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    placeholder="Krstné meno"
                                />
                            </div>
                            <div className="zp-field" style={{ marginBottom: 0 }}>
                                <label className="zp-label">Priezvisko</label>
                                <input
                                    className="zp-input"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder="Priezvisko"
                                />
                            </div>
                        </div>
                        <div className="zp-field" style={{ marginBottom: 0 }}>
                            <label className="zp-label">
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Mail style={{ width: 12, height: 12 }} /> Email
                                </span>
                            </label>
                            <input
                                className="zp-input"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="vas@email.sk"
                            />
                        </div>
                    </div>
                </div>

                {/* Registration date */}
                <div className="zp-settings-section">
                    <div className="zp-settings-list">
                        <div className="zp-settings-row" style={{ cursor: "default" }}>
                            <span className="ic">
                                <Calendar style={{ width: 18, height: 18 }} />
                            </span>
                            <span className="body">
                                <span className="ttl">Dátum registrácie</span>
                                <span className="sub">{profile?.date_joined && formatDate(profile.date_joined)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* App guide */}
                <div className="zp-settings-section">
                    <h2>Aplikácia</h2>
                    <div className="zp-settings-list" style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                            <BookOpen style={{ width: 18, height: 18, color: "var(--green-700)", flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", fontSize: 14 }}>Sprievodca aplikáciou</div>
                                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Znovu spustiť úvodného sprievodcu aplikáciou.</div>
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
                            className="zp-btn zp-btn--secondary zp-btn--sm"
                        >
                            {resettingTour ? 'Spracúvam...' : 'Spustiť sprievodcu znovu'}
                        </button>
                    </div>
                </div>

                {/* Push notifications */}
                <div className="zp-settings-section">
                    <h2>Push notifikácie</h2>
                    <div className="zp-settings-list" style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                            <Bell style={{ width: 18, height: 18, color: "var(--green-700)", flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", fontSize: 14 }}>Push notifikácie</div>
                                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                                    {isSubscribed ? 'Notifikácie sú aktívne.' : 'Ak sa výzva nezobrazí automaticky, povoľte notifikácie ručne.'}
                                </div>
                            </div>
                        </div>

                        {permission === 'denied' && (
                            <div className="zp-banner" style={{ marginBottom: 10, marginLeft: 0, marginRight: 0, width: "100%" }}>
                                Notifikácie sú zamietnuté. V prehliadači otvorte Nastavenia stránky a povoľte notifikácie.
                            </div>
                        )}

                        {pushError && (
                            <div className="zp-banner" style={{ marginBottom: 10, marginLeft: 0, marginRight: 0, width: "100%", background: "rgba(201,46,82,0.1)", color: "var(--coral-600)" }}>
                                {pushError}
                            </div>
                        )}

                        {pushMessage && (
                            <div className="zp-banner" style={{ marginBottom: 10, marginLeft: 0, marginRight: 0, width: "100%", background: pushMessage.type === 'success' ? "rgba(114,136,75,0.12)" : "rgba(201,46,82,0.1)", color: pushMessage.type === 'success' ? "var(--green-700)" : "var(--coral-600)" }}>
                                {pushMessage.text}
                            </div>
                        )}

                        {pwaMessage && (
                            <div className="zp-banner" style={{ marginBottom: 10, marginLeft: 0, marginRight: 0, width: "100%" }}>
                                {pwaMessage.text}
                            </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <button
                                type="button"
                                onClick={handleEnableNotifications}
                                disabled={pushLoading || permission === 'unsupported' || isSubscribed}
                                className="zp-btn zp-btn--secondary zp-btn--sm"
                            >
                                {pushLoading ? 'Spracúvam...' : 'Povoliť notifikácie'}
                            </button>
                            <button
                                type="button"
                                onClick={handleInstallPWA}
                                disabled={isStandalone}
                                className="zp-btn zp-btn--secondary zp-btn--sm"
                            >
                                <Download style={{ width: 12, height: 12 }} />
                                Inštalovať aplikáciu
                            </button>
                            <button
                                type="button"
                                onClick={handleDisableNotifications}
                                disabled={pushLoading || !isSubscribed}
                                className="zp-btn zp-btn--ghost zp-btn--sm"
                            >
                                Vypnúť notifikácie
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status message */}
                {message && (
                    <div style={{ padding: "0 20px 12px" }}>
                        <div className="zp-banner" style={{ marginLeft: 0, marginRight: 0, width: "100%", background: message.type === 'success' ? "rgba(114,136,75,0.12)" : "rgba(201,46,82,0.1)", color: message.type === 'success' ? "var(--green-700)" : "var(--coral-600)" }}>
                            {message.type === 'success' ? '✓' : '⚠'} {message.text}
                        </div>
                    </div>
                )}

                {/* Save button */}
                <div style={{ padding: "0 20px 32px" }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
                    >
                        <Save style={{ width: 16, height: 16 }} />
                        {saving ? 'Ukladám...' : 'Uložiť zmeny'}
                    </button>
                </div>
            </form>

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
