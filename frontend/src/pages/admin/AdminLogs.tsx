import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Bug,
    ChevronDown,
    ChevronRight,
    Info,
    RefreshCw,
    XCircle,
} from 'lucide-react';

import { useAuth } from '../../context/auth';
import { logger } from '../../lib/logger';
import { PageHead, Button, Card, Field, Input, Select, SearchBox } from './ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const LEVELS = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;
const EVENT_TYPES = [
    ['order_admin_create', 'Admin vytvoril objednávku'],
    ['order_admin_update', 'Admin upravil objednávku'],
    ['order_admin_delete', 'Admin vymazal objednávku'],
    ['auto_order_run', 'Spustenie auto-objednávok'],
    ['push_broadcast', 'Odoslanie push notifikácie'],
    ['settings_change', 'Zmena nastavení'],
] as const;

type ActiveTab = 'events' | 'system';

interface AdminLogEntry {
    id: number;
    timestamp: string;
    level: string;
    logger: string;
    line: number;
    process: number;
    message: string;
    traceback: string | null;
}

interface AdminLogsResponse {
    results: AdminLogEntry[];
    available_loggers: string[];
}

interface EventLogEntry {
    id: number;
    event_type: string;
    event_type_label: string;
    actor: number | null;
    actor_email?: string;
    actor_label: string;
    target_user: number | null;
    target_user_email?: string;
    summary: string;
    payload: Record<string, unknown>;
    created_at: string;
}

interface EventLogsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: EventLogEntry[];
}

interface FieldChange {
    from?: unknown;
    to?: unknown;
}

function formatDiffValue(value: unknown) {
    if (
        value == null
        || value === ''
        || (Array.isArray(value) && value.length === 0)
        || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
    ) return '(prázdne)';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export function EventPayloadDetails({ payload }: { payload: Record<string, unknown> }) {
    const changes = payload.changes;
    if (changes && typeof changes === 'object' && !Array.isArray(changes)) {
        const lines = Object.entries(changes as Record<string, FieldChange>).map(
            ([field, change]) => (
                `${field}: ${formatDiffValue(change?.from)} -> ${formatDiffValue(change?.to)}`
            ),
        );
        return <pre className="tb">{lines.join('\n')}</pre>;
    }
    return <pre className="tb">{JSON.stringify(payload, null, 2)}</pre>;
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('sk-SK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(date);
}

type BadgeTone = 'green' | 'peach' | 'teal' | 'honey' | 'coral' | 'gray' | 'orange';

function levelTone(level: string): BadgeTone {
    if (level === 'CRITICAL' || level === 'ERROR') return 'coral';
    if (level === 'WARNING') return 'honey';
    return 'teal';
}

function levelIcon(level: string) {
    if (level === 'CRITICAL' || level === 'ERROR') return <XCircle />;
    if (level === 'WARNING') return <AlertTriangle />;
    return <Info />;
}

function LevelBadge({ level, muted }: { level: string; muted?: boolean }) {
    return (
        <span className={`zpa-badge zpa-badge--${muted ? 'gray' : levelTone(level)}`}>
            {levelIcon(level)}
            {level}
        </span>
    );
}

export default function AdminLogs() {
    const { apiFetch } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('events');

    const [events, setEvents] = useState<EventLogEntry[]>([]);
    const [eventCount, setEventCount] = useState(0);
    const [eventType, setEventType] = useState('');
    const [actor, setActor] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [eventPage, setEventPage] = useState(1);
    const [eventHasNext, setEventHasNext] = useState(false);
    const [eventLoading, setEventLoading] = useState(true);
    const [eventError, setEventError] = useState<string | null>(null);
    const [expandedEvents, setExpandedEvents] = useState<Set<number>>(() => new Set());

    const [entries, setEntries] = useState<AdminLogEntry[]>([]);
    const [availableLoggers, setAvailableLoggers] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>(['WARNING', 'ERROR', 'CRITICAL']);
    const [selectedLogger, setSelectedLogger] = useState('');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(200);
    const [systemLoading, setSystemLoading] = useState(true);
    const [systemError, setSystemError] = useState<string | null>(null);
    const [expandedSystem, setExpandedSystem] = useState<Set<number>>(() => new Set());

    const fetchEvents = useCallback(async () => {
        setEventLoading(true);
        setEventError(null);
        try {
            const params = new URLSearchParams({ ordering: '-created_at', page: String(eventPage) });
            if (eventType) params.set('event_type', eventType);
            if (actor.trim()) params.set('actor', actor.trim());
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            const res = await apiFetch(`${API_URL}/admin/event-logs/?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as EventLogsResponse;
            setEvents(data.results);
            setEventCount(data.count);
            setEventHasNext(Boolean(data.next));
        } catch (e) {
            logger.error(e);
            setEventError('Udalosti sa nepodarilo načítať');
        } finally {
            setEventLoading(false);
        }
    }, [actor, apiFetch, dateFrom, dateTo, eventPage, eventType]);

    const fetchSystemLogs = useCallback(async () => {
        setSystemLoading(true);
        setSystemError(null);
        try {
            const params = new URLSearchParams({ limit: String(limit), ordering: '-timestamp' });
            if (selectedLevels.length > 0) params.set('level', selectedLevels.join(','));
            if (selectedLogger) params.set('logger', selectedLogger);
            if (search.trim()) params.set('search', search.trim());
            const res = await apiFetch(`${API_URL}/admin/logs/?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as AdminLogsResponse;
            setEntries(data.results);
            setAvailableLoggers(data.available_loggers);
        } catch (e) {
            logger.error(e);
            setSystemError('Systémové logy sa nepodarilo načítať');
        } finally {
            setSystemLoading(false);
        }
    }, [apiFetch, limit, search, selectedLevels, selectedLogger]);

    useEffect(() => { void fetchEvents(); }, [fetchEvents]);
    useEffect(() => { void fetchSystemLogs(); }, [fetchSystemLogs]);
    useEffect(() => { setEventPage(1); }, [actor, dateFrom, dateTo, eventType]);

    const counts = useMemo(() => entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.level] = (acc[entry.level] || 0) + 1;
        return acc;
    }, {}), [entries]);

    const toggleLevel = (level: string) => setSelectedLevels((current) =>
        current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);

    const toggleExpanded = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
        setter((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const loading = activeTab === 'events' ? eventLoading : systemLoading;

    return (
        <>
            <PageHead
                eyebrow="Nastavenia"
                title="Logy"
                desc="Audit administrátorských udalostí a technické logy backendu"
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => void (activeTab === 'events' ? fetchEvents() : fetchSystemLogs())}
                        disabled={loading}
                    >
                        <RefreshCw className={loading ? 'zpa-spin' : ''} />
                        Obnoviť
                    </Button>
                }
            />

            <div className="zpa-stack">
                <Card style={{ overflow: 'hidden' }}>
                    <div className="zpa-tabs">
                        <button type="button" onClick={() => setActiveTab('events')} className={`zpa-tab${activeTab === 'events' ? ' active' : ''}`}>
                            Udalosti (audit)
                        </button>
                        <button type="button" onClick={() => setActiveTab('system')} className={`zpa-tab${activeTab === 'system' ? ' active' : ''}`}>
                            Systémové logy
                        </button>
                    </div>
                </Card>

                {activeTab === 'events' ? (
                    <>
                        <Card pad>
                            <div className="zpa-grid-3">
                                <Field label="Typ udalosti">
                                    <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                                        <option value="">Všetky typy</option>
                                        {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </Select>
                                </Field>
                                <Field label="ID aktora">
                                    <Input type="number" min="1" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Všetci aktéri" />
                                </Field>
                                <div className="zpa-grid-2">
                                    <Field label="Od"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
                                    <Field label="Do"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
                                </div>
                            </div>
                        </Card>

                        {eventError && <div className="zpa-empty">{eventError}</div>}
                        <Card style={{ overflow: 'hidden' }}>
                            <div className="zpa-card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                                <h3>Udalosti ({eventCount})</h3>
                            </div>
                            {eventLoading ? <div className="zpa-empty">Načítavam…</div> : events.length === 0 ? (
                                <div className="zpa-empty">Žiadne udalosti pre aktuálne filtre</div>
                            ) : (
                                <div className="zpa-table-wrap">
                                    <table className="zpa-table">
                                        <thead><tr><th>Čas</th><th>Typ</th><th>Kto</th><th>Cieľ</th><th>Súhrn</th><th /></tr></thead>
                                        <tbody>
                                            {events.map((entry) => {
                                                const isExpanded = expandedEvents.has(entry.id);
                                                return (
                                                    <Fragment key={entry.id}>
                                                        <tr>
                                                            <td>{formatTime(entry.created_at)}</td>
                                                            <td><span className="zpa-badge zpa-badge--teal">{entry.event_type_label}</span></td>
                                                            <td>{entry.actor_label || entry.actor_email || 'system'}</td>
                                                            <td>{entry.target_user_email || (entry.target_user ? `#${entry.target_user}` : '—')}</td>
                                                            <td>{entry.summary}</td>
                                                            <td className="r">
                                                                <Button variant="ghost" sm onClick={() => toggleExpanded(setExpandedEvents, entry.id)}>
                                                                    {isExpanded ? <ChevronDown /> : <ChevronRight />} Detail
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={6}><EventPayloadDetails payload={entry.payload} /></td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--line-soft)' }}>
                                <Button variant="secondary" sm disabled={eventPage === 1 || eventLoading} onClick={() => setEventPage((page) => page - 1)}>Predchádzajúca</Button>
                                <span>Strana {eventPage}</span>
                                <Button variant="secondary" sm disabled={!eventHasNext || eventLoading} onClick={() => setEventPage((page) => page + 1)}>Ďalšia</Button>
                            </div>
                        </Card>
                    </>
                ) : (
                    <>
                        <div className="zpa-statusgrid">
                            {LEVELS.map((level) => <div key={level} className="zpa-statcard"><LevelBadge level={level} /><span className="num">{counts[level] || 0}</span></div>)}
                        </div>
                        <Card pad>
                            <div className="zpa-grid-3">
                                <Field label="Hľadať"><SearchBox value={search} onChange={setSearch} placeholder="Text správy alebo traceback" /></Field>
                                <Field label="Zdroj">
                                    <Select value={selectedLogger} onChange={(e) => setSelectedLogger(e.target.value)}>
                                        <option value="">Všetky zdroje</option>
                                        {availableLoggers.map((item) => <option key={item} value={item}>{item}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Počet">
                                    <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                                        <option value={100}>100</option><option value={200}>200</option><option value={500}>500</option>
                                    </Select>
                                </Field>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {LEVELS.map((level) => (
                                    <button key={level} type="button" onClick={() => toggleLevel(level)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
                                        <LevelBadge level={level} muted={!selectedLevels.includes(level)} />
                                    </button>
                                ))}
                            </div>
                        </Card>
                        {systemError && <div className="zpa-empty">{systemError}</div>}
                        <Card style={{ overflow: 'hidden' }}>
                            <div className="zpa-card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}><h3>Záznamy ({entries.length})</h3></div>
                            {systemLoading ? <div className="zpa-empty">Načítavam…</div> : entries.length === 0 ? <div className="zpa-empty">Žiadne logy pre aktuálne filtre</div> : (
                                <div>{entries.map((entry) => {
                                    const isExpanded = expandedSystem.has(entry.id);
                                    return (
                                        <div key={entry.id} className="zpa-log">
                                            <div className="ts">{formatTime(entry.timestamp)}</div>
                                            <div><LevelBadge level={entry.level} /></div>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="src" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                                    <span>{entry.logger}:{entry.line}</span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-cream-soft)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}><Bug style={{ width: 12, height: 12 }} /> PID {entry.process}</span>
                                                </div>
                                                <pre className="msg">{entry.message}</pre>
                                            </div>
                                            {entry.traceback ? <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => toggleExpanded(setExpandedSystem, entry.id)}>{isExpanded ? <ChevronDown /> : <ChevronRight />} Detail</button> : <span />}
                                            {entry.traceback && isExpanded && <pre className="tb">{entry.traceback}</pre>}
                                        </div>
                                    );
                                })}</div>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </>
    );
}
