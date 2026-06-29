import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Bug,
    ChevronDown,
    ChevronRight,
    Info,
    RefreshCw,
    Search,
    XCircle,
} from 'lucide-react';

import { useAuth } from '../../context/auth';
import { logger } from '../../lib/logger';

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

function levelStyle(level: string) {
    switch (level) {
        case 'CRITICAL':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'ERROR':
            return 'bg-rose-100 text-rose-800 border-rose-200';
        case 'WARNING':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        default:
            return 'bg-blue-100 text-blue-800 border-blue-200';
    }
}

function levelIcon(level: string) {
    if (level === 'CRITICAL' || level === 'ERROR') return <XCircle className="w-4 h-4" />;
    if (level === 'WARNING') return <AlertTriangle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
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
        <div>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Logy</h1>
                    <p className="text-gray-500 mt-1 text-sm">Dôležité systémové udalosti z backendu</p>
                </div>
                <button
                    onClick={() => void fetchLogs()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Obnoviť
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
                {LEVELS.map((level) => (
                    <div key={level} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${levelStyle(level)}`}>
                                {levelIcon(level)}
                                {level}
                            </span>
                            <span className="text-xl font-bold text-gray-900">{counts[level] || 0}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_auto]">
                    <label className="block">
                        <span className="text-xs font-medium text-gray-500">Hľadať</span>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                placeholder="Text správy alebo traceback"
                            />
                        </div>
                    </label>

                    <label className="block">
                        <span className="text-xs font-medium text-gray-500">Zdroj</span>
                        <select
                            value={selectedLogger}
                            onChange={(e) => setSelectedLogger(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                            <option value="">Všetky zdroje</option>
                            {availableLoggers.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-xs font-medium text-gray-500">Počet</span>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                        </select>
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {LEVELS.map((level) => (
                        <button
                            key={level}
                            onClick={() => toggleLevel(level)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selectedLevels.includes(level)
                                    ? levelStyle(level)
                                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            {levelIcon(level)}
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                    Záznamy ({entries.length})
                </div>
                {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">Načítavam...</div>
                ) : entries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">Žiadne logy pre aktuálne filtre</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {entries.map((entry) => {
                            const isExpanded = expanded.has(entry.id);
                            const hasDetail = Boolean(entry.traceback);
                            return (
                                <div key={entry.id} className="px-4 py-3">
                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[170px_120px_minmax(0,1fr)_auto] lg:items-start">
                                        <div className="text-xs font-medium text-gray-500">{formatTime(entry.timestamp)}</div>
                                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${levelStyle(entry.level)}`}>
                                            {levelIcon(entry.level)}
                                            {entry.level}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="font-mono text-xs text-gray-500">
                                                    {entry.logger}:{entry.line}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                                    <Bug className="h-3 w-3" />
                                                    PID {entry.process}
                                                </span>
                                            </div>
                                            <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-gray-900">
                                                {entry.message}
                                            </pre>
                                        </div>
                                        {hasDetail && (
                                            <button
                                                onClick={() => toggleExpanded(entry.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                Detail
                                            </button>
                                        )}
                                    </div>
                                    {hasDetail && isExpanded && (
                                        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-950 p-4 font-mono text-xs leading-5 text-gray-100">
                                            {entry.traceback}
                                        </pre>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
