import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { PageHead, Card, CardHead, Button, Field, Input } from './ui';

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
        <>
            <PageHead
                eyebrow="Nastavenia"
                title="Voľné dni"
                desc="V tieto dni nie je možné zadať objednávku. Nastavte jednotlivé dni alebo celý úsek."
            />

            <div className="zpa-stack">
                {/* Add form */}
                <Card style={{ overflow: 'hidden' }}>
                    <div className="zpa-tabs">
                        {(['single', 'range'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`zpa-tab${activeTab === tab ? ' active' : ''}`}
                            >
                                {tab === 'single' ? 'Pridať deň' : 'Pridať úsek dní'}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: 24 }}>
                        {activeTab === 'single' ? (
                            <form onSubmit={handleAddSingle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="zpa-grid-2">
                                    <Field label="Dátum" req>
                                        <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} required />
                                    </Field>
                                    <Field label="Poznámka" hint="(nepovinné)">
                                        <Input value={singleReason} onChange={(e) => setSingleReason(e.target.value)} placeholder="napr. Sviatok, dovolenka…" />
                                    </Field>
                                </div>
                                <div>
                                    <Button type="submit" disabled={submitting || !singleDate}>
                                        {submitting ? 'Ukladám…' : 'Pridať deň'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleAddRange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="zpa-grid-3">
                                    <Field label="Od" req>
                                        <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} required />
                                    </Field>
                                    <Field label="Do" req>
                                        <Input type="date" value={rangeEnd} min={rangeStart || undefined} onChange={(e) => setRangeEnd(e.target.value)} required />
                                    </Field>
                                    <Field label="Poznámka" hint="(nepovinné)">
                                        <Input value={rangeReason} onChange={(e) => setRangeReason(e.target.value)} placeholder="napr. Vianočné sviatky" />
                                    </Field>
                                </div>
                                <div>
                                    <Button type="submit" disabled={rangeSaving || !rangeStart || !rangeEnd}>
                                        {rangeSaving ? 'Ukladám…' : 'Pridať úsek'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </Card>

                {/* List */}
                <Card style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                        <CardHead title="Nastavené voľné dni" />
                    </div>

                    {loading ? (
                        <div className="zpa-empty">Načítavam…</div>
                    ) : holidays.length === 0 ? (
                        <div className="zpa-empty">Žiadne voľné dni nie sú nastavené.</div>
                    ) : (
                        <div>
                            {upcoming.length > 0 && (
                                <>
                                    <div className="zpa-listgroup-label">Nadchádzajúce</div>
                                    {upcoming.map((h) => (
                                        <HolidayRow key={h.id} holiday={h} onDelete={handleDelete} />
                                    ))}
                                </>
                            )}
                            {past.length > 0 && (
                                <>
                                    <div className="zpa-listgroup-label">Minulé</div>
                                    {past.map((h) => (
                                        <HolidayRow key={h.id} holiday={h} onDelete={handleDelete} past />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
};

const HolidayRow: React.FC<{ holiday: Holiday; onDelete: (id: number) => void; past?: boolean }> = ({
    holiday,
    onDelete,
    past = false,
}) => {
    const [confirming, setConfirming] = useState(false);

    return (
        <div className={`zpa-listrow${past ? ' past' : ''}`}>
            <div style={{ minWidth: 0 }}>
                <div className="lr-ttl">{formatDate(holiday.date)}</div>
                {holiday.reason && <div className="lr-sub">{holiday.reason}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {confirming ? (
                    <>
                        <span style={{ fontSize: 12.5, color: 'var(--coral-600)', fontWeight: 600 }}>Naozaj odstrániť?</span>
                        <Button variant="danger" sm onClick={() => onDelete(holiday.id)}>Áno</Button>
                        <Button variant="ghost" sm onClick={() => setConfirming(false)}>Nie</Button>
                    </>
                ) : (
                    <button className="zpa-iconbtn" onClick={() => setConfirming(true)} title="Odstrániť" aria-label="Odstrániť">
                        <Trash2 />
                    </button>
                )}
            </div>
        </div>
    );
};

export default HolidaysAdmin;
