import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';

interface GlobalSettings {
    deadline_breakfast: string;
    deadline_lunch: string;
    deadline_olovrant: string;
    report_email_recipients: string[];
}

const SystemSettings: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();
    const [settings, setSettings] = useState<GlobalSettings>({
        deadline_breakfast: '10:00',
        deadline_lunch: '10:00',
        deadline_olovrant: '10:00',
        report_email_recipients: [],
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
            console.error(e);
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
            console.error(e);
            error('Chyba pripojenia');
        }
    };

    if (loading) return <div className="p-8">Načítavam...</div>;

    const isValidEmail = (value: string): boolean => {
        const input = document.createElement('input');
        input.type = 'email';
        input.value = value;
        return input.checkValidity();
    };

    const addRecipient = () => {
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
        setSettings((prev) => ({
            ...prev,
            report_email_recipients: [...prev.report_email_recipients, email],
        }));
        setNewRecipient('');
    };

    const removeRecipient = (email: string) => {
        setSettings((prev) => ({
            ...prev,
            report_email_recipients: prev.report_email_recipients.filter((r) => r !== email),
        }));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Systémové nastavenia</h1>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Časy uzávierok objednávok</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Raňajky
                            </label>
                            <input
                                type="time"
                                value={settings.deadline_breakfast?.slice(0, 5)}
                                onChange={(e) => setSettings({...settings, deadline_breakfast: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Obed
                            </label>
                            <input
                                type="time"
                                value={settings.deadline_lunch?.slice(0, 5)}
                                onChange={(e) => setSettings({...settings, deadline_lunch: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Olovrant
                            </label>
                            <input
                                type="time"
                                value={settings.deadline_olovrant?.slice(0, 5)}
                                onChange={(e) => setSettings({...settings, deadline_olovrant: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-sm hover:shadow-md"
                        >
                            Uložiť zmeny
                        </button>
                    </div>
                </form>
            </div>

            {/* Report email recipients */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Príjemcovia denného reportu</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Na tieto e-mailové adresy bude automaticky zasielaný denný prehľad objednávok (XLSX).
                </p>

                <div className="flex gap-3 mb-4">
                    <input
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
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <button
                        type="button"
                        onClick={addRecipient}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                    >
                        Pridať
                    </button>
                </div>

                {settings.report_email_recipients.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Žiadni príjemcovia nie sú nakonfigurovaní.</p>
                ) : (
                    <ul className="space-y-2">
                        {settings.report_email_recipients.map((email) => (
                            <li key={email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <span className="text-sm text-gray-800">{email}</span>
                                <button
                                    type="button"
                                    onClick={() => removeRecipient(email)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                >
                                    Odstrániť
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
                    <button
                        type="button"
                        onClick={() => saveSettings()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-sm hover:shadow-md"
                    >
                        Uložiť príjemcov
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
