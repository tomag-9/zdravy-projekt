import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { PageHead, Card, CardHead, Button, Field, Input, Toggle } from './ui';

interface GlobalSettings {
    deadline_breakfast: string;
    deadline_breakfast_is_day_before: boolean;
    deadline_lunch: string;
    deadline_lunch_is_day_before: boolean;
    deadline_olovrant: string;
    deadline_olovrant_is_day_before: boolean;
    edupage_auto_scrape_enabled: boolean;
    report_email_recipients: string[];
    client_contact_name: string;
    client_contact_role: string;
    client_contact_email: string;
    client_contact_phone: string;
}

const SystemSettings: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();
    const [settings, setSettings] = useState<GlobalSettings>({
        deadline_breakfast: '10:00',
        deadline_breakfast_is_day_before: false,
        deadline_lunch: '10:00',
        deadline_lunch_is_day_before: false,
        deadline_olovrant: '10:00',
        deadline_olovrant_is_day_before: false,
        edupage_auto_scrape_enabled: true,
        report_email_recipients: [],
        client_contact_name: '',
        client_contact_role: '',
        client_contact_email: '',
        client_contact_phone: '',
    });
    const [loading, setLoading] = useState(true);
    const [newRecipient, setNewRecipient] = useState('');

    const fetchSettings = React.useCallback(async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/global-settings/`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (e) {
            logger.error(e);
            error('Nepodarilo sa načítať nastavenia');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, error]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveSettings();
    };

    const saveSettings = async () => {
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/global-settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                success('Nastavenia boli úspešne uložené');
            } else {
                error('Chyba pri ukladaní nastavení');
            }
        } catch (e) {
            logger.error(e);
            error('Chyba pripojenia');
        }
    };

    if (loading) return <div className="zpa-empty">Načítavam…</div>;

    const isValidEmail = (value: string): boolean => {
        const input = document.createElement('input');
        input.type = 'email';
        input.value = value;
        return input.checkValidity();
    };

    const addRecipient = async () => {
        const email = newRecipient.trim().toLowerCase();
        if (!email) return;
        if (!isValidEmail(email)) {
            error('Neplatná e-mailová adresa');
            return;
        }
        if (settings.report_email_recipients.includes(email)) {
            error('Táto adresa je už v zozname');
            return;
        }

        const newSettings: GlobalSettings = {
            ...settings,
            report_email_recipients: [...settings.report_email_recipients, email],
        };
        setSettings(newSettings);
        setNewRecipient('');

        // Auto-save only the recipients field after adding
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/global-settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_email_recipients: newSettings.report_email_recipients }),
            });
            if (res.ok) {
                success('Príjemca bol úspešne pridaný');
            } else {
                error('Chyba pri pridávaní príjemcu');
                await fetchSettings();
            }
        } catch (e) {
            logger.error(e);
            error('Chyba pripojenia');
            await fetchSettings();
        }
    };

    const removeRecipient = async (email: string) => {
        const newSettings: GlobalSettings = {
            ...settings,
            report_email_recipients: settings.report_email_recipients.filter((r) => r !== email),
        };
        setSettings(newSettings);

        // Auto-save only the recipients field after removing
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/global-settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_email_recipients: newSettings.report_email_recipients }),
            });
            if (res.ok) {
                success('Príjemca bol úspešne odstránený');
            } else {
                error('Chyba pri odstraňovaní príjemcu');
                await fetchSettings();
            }
        } catch (e) {
            logger.error(e);
            error('Chyba pripojenia');
            await fetchSettings();
        }
    };

    const deadlineField = (
        label: string,
        timeKey: 'deadline_breakfast' | 'deadline_lunch' | 'deadline_olovrant',
        dayBeforeKey: 'deadline_breakfast_is_day_before' | 'deadline_lunch_is_day_before' | 'deadline_olovrant_is_day_before',
    ) => (
        <div>
            <Field label={label}>
                <Input
                    type="time"
                    value={settings[timeKey]?.slice(0, 5)}
                    onChange={(e) => setSettings({ ...settings, [timeKey]: e.target.value })}
                />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', userSelect: 'none' }}>
                <input
                    type="checkbox"
                    checked={settings[dayBeforeKey]}
                    onChange={(e) => setSettings({ ...settings, [dayBeforeKey]: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--green-600)' }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Uzávierka deň vopred</span>
            </label>
        </div>
    );

    return (
        <>
            <PageHead eyebrow="Nastavenia" title="Systémové nastavenia" />

            <div className="zpa-stack" style={{ maxWidth: 860 }}>
                {/* Deadlines */}
                <Card pad>
                    <CardHead title="Časy uzávierok objednávok" />
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
                        <div className="zpa-grid-3">
                            {deadlineField('Raňajky', 'deadline_breakfast', 'deadline_breakfast_is_day_before')}
                            {deadlineField('Obed', 'deadline_lunch', 'deadline_lunch_is_day_before')}
                            {deadlineField('Olovrant', 'deadline_olovrant', 'deadline_olovrant_is_day_before')}
                        </div>
                        <div style={{ paddingTop: 24, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit">Uložiť zmeny</Button>
                        </div>
                    </form>
                </Card>

                {/* EduPage automation */}
                <Card pad>
                    <CardHead title="EduPage automatika" />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginTop: 8 }}>
                        <div>
                            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
                                Automatické čítanie objednávok z EduPage pred uzávierkami.
                            </p>
                            <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 8 }}>
                                Manuálne načítanie zostane dostupné.
                            </p>
                        </div>
                        <Toggle
                            on={settings.edupage_auto_scrape_enabled}
                            onChange={(v) => setSettings({ ...settings, edupage_auto_scrape_enabled: v })}
                            ariaLabel="Automatické čítanie EduPage"
                        />
                    </div>
                    <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="button" onClick={saveSettings}>Uložiť EduPage</Button>
                    </div>
                </Card>

                {/* Contact */}
                <Card pad>
                    <CardHead title="Kontakt pre prevádzky" desc="Tieto údaje sa zobrazujú prevádzkam pri porciách a diétach." />
                    <div className="zpa-grid-2" style={{ marginTop: 8 }}>
                        <Input value={settings.client_contact_name} onChange={(e) => setSettings({ ...settings, client_contact_name: e.target.value })} placeholder="Meno kontaktnej osoby" />
                        <Input value={settings.client_contact_role} onChange={(e) => setSettings({ ...settings, client_contact_role: e.target.value })} placeholder="Rola / poznámka" />
                        <Input type="email" value={settings.client_contact_email} onChange={(e) => setSettings({ ...settings, client_contact_email: e.target.value })} placeholder="kontakt@priklad.sk" />
                        <Input type="tel" value={settings.client_contact_phone} onChange={(e) => setSettings({ ...settings, client_contact_phone: e.target.value })} placeholder="+421..." />
                    </div>
                    <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="button" onClick={saveSettings}>Uložiť kontakt</Button>
                    </div>
                </Card>

                {/* Report email recipients */}
                <Card pad>
                    <CardHead title="Príjemcovia denného reportu" desc="Na tieto e-mailové adresy bude automaticky zasielaný denný prehľad objednávok (XLSX)." />
                    <div style={{ display: 'flex', gap: 12, margin: '8px 0 16px' }}>
                        <Input
                            type="email"
                            value={newRecipient}
                            onChange={(e) => setNewRecipient(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addRecipient();
                                }
                            }}
                            placeholder="email@priklad.sk"
                        />
                        <Button type="button" onClick={addRecipient}><Plus /> Pridať</Button>
                    </div>

                    {settings.report_email_recipients.length === 0 ? (
                        <p style={{ fontSize: 14, color: 'var(--ink-mute)', fontStyle: 'italic', margin: 0 }}>
                            Žiadni príjemcovia nie sú nakonfigurovaní.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {settings.report_email_recipients.map((email) => (
                                <li key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-cream-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                                    <span style={{ fontSize: 14, color: 'var(--green-900)' }}>{email}</span>
                                    <button type="button" onClick={() => removeRecipient(email)} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--coral-600)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                                        Odstrániť
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
};

export default SystemSettings;
