import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';

interface GlobalSettings {
    deadline_breakfast: string;
    deadline_lunch: string;
    deadline_olovrant: string;
}

const SystemSettings: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();
    const [settings, setSettings] = useState<GlobalSettings>({
        deadline_breakfast: '10:00',
        deadline_lunch: '10:00',
        deadline_olovrant: '10:00',
    });
    const [loading, setLoading] = useState(true);

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
        </div>
    );
};

export default SystemSettings;
