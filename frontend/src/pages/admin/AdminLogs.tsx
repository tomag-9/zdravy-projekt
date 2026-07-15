import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PageHead, Button, Card, Field, Select, SearchBox } from './ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const LEVELS = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

interface AdminLogEntry {
    id: number;
    timestamp: string;
    level: string;
    level_no: number;
    logger: string;
    module: string;
    line: number;
    process: number;
    thread: string;
    message: string;
    traceback: string | null;
}

interface AdminLogsResponse {
    results: AdminLogEntry[];
    count: number;
    available_loggers: string[];
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('sk-SK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
}

type BadgeTone = 'green' | 'peach' | 'teal' | 'honey' | 'coral' | 'gray' | 'orange';

function levelTone(level: string): BadgeTone {
    switch (level) {
        case 'CRITICAL':
        case 'ERROR':
            return 'coral';
        case 'WARNING':
            return 'honey';
        default:
            return 'teal';
    }
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
    const [entries, setEntries] = useState<AdminLogEntry[]>([]);
    const [availableLoggers, setAvailableLoggers] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>(['WARNING', 'ERROR', 'CRITICAL']);
    const [selectedLogger, setSelectedLogger] = useState('');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(200);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                limit: String(limit),
                ordering: '-timestamp',
            });
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
            setError('Logy sa nepodarilo načítať');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, limit, search, selectedLevels, selectedLogger]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const counts = useMemo(() => {
        return entries.reduce<Record<string, number>>((acc, entry) => {
            acc[entry.level] = (acc[entry.level] || 0) + 1;
            return acc;
        }, {});
    }, [entries]);

    const toggleLevel = (level: string) => {
        setSelectedLevels((current) =>
            current.includes(level)
                ? current.filter((item) => item !== level)
                : [...current, level],
        );
    };

    const toggleExpanded = (id: number) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <>
            <PageHead
                eyebrow="Nastavenia"
                title="Logy"
                desc="Dôležité systémové udalosti z backendu"
                actions={
                    <Button variant="secondary" onClick={() => void fetchLogs()} disabled={loading}>
                        <RefreshCw className={loading ? 'zpa-spin' : ''} />
                        Obnoviť
                    </Button>
                }
            />

            <div className="zpa-stack">
                <div className="zpa-statusgrid">
                    {LEVELS.map((level) => (
                        <div key={level} className="zpa-statcard">
                            <LevelBadge level={level} />
                            <span className="num">{counts[level] || 0}</span>
                        </div>
                    ))}
                </div>

                <Card pad>
                    <div className="zpa-grid-3">
                        <Field label="Hľadať">
                            <SearchBox value={search} onChange={setSearch} placeholder="Text správy alebo traceback" />
                        </Field>
                        <Field label="Zdroj">
                            <Select value={selectedLogger} onChange={(e) => setSelectedLogger(e.target.value)}>
                                <option value="">Všetky zdroje</option>
                                {availableLoggers.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Počet">
                            <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                                <option value={500}>500</option>
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

                {error && (
                    <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(201,46,82,0.2)', background: 'rgba(201,46,82,0.06)', padding: '12px 16px', fontSize: 14, color: 'var(--coral-600)' }}>
                        {error}
                    </div>
                )}

                <Card style={{ overflow: 'hidden' }}>
                    <div className="zpa-card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                        <h3>Záznamy ({entries.length})</h3>
                    </div>
                    {loading ? (
                        <div className="zpa-empty">Načítavam…</div>
                    ) : entries.length === 0 ? (
                        <div className="zpa-empty">Žiadne logy pre aktuálne filtre</div>
                    ) : (
                        <div>
                            {entries.map((entry) => {
                                const isExpanded = expanded.has(entry.id);
                                const hasDetail = Boolean(entry.traceback);
                                return (
                                    <div key={entry.id} className="zpa-log">
                                        <div className="ts">{formatTime(entry.timestamp)}</div>
                                        <div><LevelBadge level={entry.level} /></div>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="src" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                                <span>{entry.logger}:{entry.line}</span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-cream-soft)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>
                                                    <Bug style={{ width: 12, height: 12 }} />
                                                    PID {entry.process}
                                                </span>
                                            </div>
                                            <pre className="msg">{entry.message}</pre>
                                        </div>
                                        {hasDetail ? (
                                            <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => toggleExpanded(entry.id)}>
                                                {isExpanded ? <ChevronDown /> : <ChevronRight />}
                                                Detail
                                            </button>
                                        ) : (
                                            <span />
                                        )}
                                        {hasDetail && isExpanded && <pre className="tb">{entry.traceback}</pre>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}
