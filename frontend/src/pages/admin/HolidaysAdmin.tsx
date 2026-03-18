import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Holiday {
    id: number;
    date: string;
    reason: string;
}

type Tab = 'single' | 'range';

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(`${dateStr}T12:00:00`)
    );

const HolidaysAdmin: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();

    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('single');

    // Single day form
    const [singleDate, setSingleDate] = useState('');
    const [singleReason, setSingleReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Range form
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [rangeReason, setRangeReason] = useState('');
    const [rangeSaving, setRangeSaving] = useState(false);

    const fetchHolidays = React.useCallback(async () => {
        setLoading(true);
        try {
            const allHolidays: Holiday[] = [];
            let url: string | null = `${API_URL}/admin/holidays/`;
            while (url) {
                const res = await apiFetch(url);
                if (!res.ok) {
                    error('Nepodarilo sa načítať voľné dni');
                    return;
                }
                const data: Holiday[] | { results: Holiday[]; next: string | null } = await res.json();
                if (Array.isArray(data)) {
                    allHolidays.push(...data);
                    url = null;
                } else {
                    allHolidays.push(...(data.results ?? []));
                    url = data.next ?? null;
                }
            }
            setHolidays(allHolidays);
        } catch {
            error('Nepodarilo sa načítať voľné dni');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, error]);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const handleAddSingle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!singleDate) return;
        setSubmitting(true);
        try {
            const res = await apiFetch(`${API_URL}/admin/holidays/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: singleDate, reason: singleReason }),
            });
            if (res.ok) {
                success('Voľný deň bol pridaný');
                setSingleDate('');
                setSingleReason('');
                fetchHolidays();
            } else {
                const data: { error?: { message?: string; details?: { date?: string[] } } } = await res.json().catch(() => ({}));
                const dateError = data?.error?.details?.date;
                if (dateError) {
                    error('Tento deň je už nastavený ako voľný');
                } else if (typeof data?.error?.message === 'string' && data.error.message.trim()) {
                    error(data.error.message);
                } else {
                    error('Nepodarilo sa pridať voľný deň');
                }
            }
        } catch {
            error('Nepodarilo sa pridať voľný deň');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rangeStart || !rangeEnd) return;
        setRangeSaving(true);
        try {
            const res = await apiFetch(`${API_URL}/admin/holidays/bulk/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_date: rangeStart, end_date: rangeEnd, reason: rangeReason }),
            });
            if (res.ok) {
                const data = await res.json();
                const count = data.created?.length ?? 0;
                const skipped = data.skipped?.length ?? 0;
                success(`Pridaných: ${count} dní${skipped ? `, preskočených (už existujú): ${skipped}` : ''}`);
                setRangeStart('');
                setRangeEnd('');
                setRangeReason('');
                fetchHolidays();
            } else {
                error('Nepodarilo sa pridať voľné dni');
            }
        } catch {
            error('Nepodarilo sa pridať voľné dni');
        } finally {
            setRangeSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await apiFetch(`${API_URL}/admin/holidays/${id}/`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                success('Voľný deň bol odstránený');
                setHolidays((prev) => prev.filter((h) => h.id !== id));
            } else {
                error('Nepodarilo sa odstrániť voľný deň');
            }
        } catch {
            error('Nepodarilo sa odstrániť voľný deň');
        }
    };

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const upcoming = holidays.filter((h) => h.date >= today);
    const past = holidays.filter((h) => h.date < today);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Voľné dni</h1>
                <p className="text-sm text-gray-500 mt-1">
                    V tieto dni nie je možné zadať objednávku. Nastavte jednotlivé dni alebo celý úsek.
                </p>
            </div>

            {/* Add form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {(['single', 'range'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab
                                    ? 'text-sky-700 border-b-2 border-sky-600 bg-sky-50/50'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {tab === 'single' ? '+ Pridať deň' : '+ Pridať úsek dní'}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 'single' ? (
                        <form onSubmit={handleAddSingle} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={(e) => setSingleDate(e.target.value)}
                                        required
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Poznámka <span className="text-gray-400 font-normal">(nepovinné)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={singleReason}
                                        onChange={(e) => setSingleReason(e.target.value)}
                                        placeholder="napr. Sviatok, dovolenka…"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !singleDate}
                                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                            >
                                {submitting ? 'Ukladám…' : 'Pridať deň'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAddRange} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Od</label>
                                    <input
                                        type="date"
                                        value={rangeStart}
                                        onChange={(e) => setRangeStart(e.target.value)}
                                        required
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Do</label>
                                    <input
                                        type="date"
                                        value={rangeEnd}
                                        min={rangeStart || undefined}
                                        onChange={(e) => setRangeEnd(e.target.value)}
                                        required
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Poznámka <span className="text-gray-400 font-normal">(nepovinné)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={rangeReason}
                                        onChange={(e) => setRangeReason(e.target.value)}
                                        placeholder="napr. Vianočné sviatky"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={rangeSaving || !rangeStart || !rangeEnd}
                                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                            >
                                {rangeSaving ? 'Ukladám…' : 'Pridať úsek'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-800">Nastavené voľné dni</h2>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Načítavam…</div>
                ) : holidays.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Žiadne voľné dni nie sú nastavené.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {upcoming.length > 0 && (
                            <>
                                <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                                    Nadchádzajúce
                                </div>
                                {upcoming.map((h) => (
                                    <HolidayRow key={h.id} holiday={h} onDelete={handleDelete} />
                                ))}
                            </>
                        )}
                        {past.length > 0 && (
                            <>
                                <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                                    Minulé
                                </div>
                                {past.map((h) => (
                                    <HolidayRow key={h.id} holiday={h} onDelete={handleDelete} past />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const HolidayRow: React.FC<{ holiday: Holiday; onDelete: (id: number) => void; past?: boolean }> = ({
    holiday,
    onDelete,
    past = false,
}) => {
    const [confirming, setConfirming] = useState(false);

    return (
        <div className={`flex items-center justify-between px-6 py-3 ${past ? 'opacity-50' : ''}`}>
            <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 capitalize">{formatDate(holiday.date)}</div>
                {holiday.reason && <div className="text-xs text-gray-500 mt-0.5">{holiday.reason}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
                {confirming ? (
                    <>
                        <span className="text-xs text-red-600 font-medium">Naozaj odstrániť?</span>
                        <button
                            onClick={() => onDelete(holiday.id)}
                            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Áno
                        </button>
                        <button
                            onClick={() => setConfirming(false)}
                            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Nie
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setConfirming(true)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Odstrániť"
                        aria-label="Odstrániť"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default HolidaysAdmin;
