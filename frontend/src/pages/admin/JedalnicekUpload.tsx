import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileSpreadsheet, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';

const API = import.meta.env.VITE_API_URL || '/api';

interface JedalnicekUploadRecord {
    id: number;
    week_start: string;
    week_end: string;
    filename: string;
    status: 'pending' | 'processed' | 'error';
    error_message: string;
    uploaded_at: string;
    entries_count: number;
}

interface UploadResponse extends JedalnicekUploadRecord {
    warnings?: string[];
    replaced_uploads?: number;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonday(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return toIsoDate(monday);
}

function normalizeList(data: JedalnicekUploadRecord[] | { results?: JedalnicekUploadRecord[] }): JedalnicekUploadRecord[] {
    return Array.isArray(data) ? data : data.results || [];
}

const JedalnicekUpload: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();
    const [weekStart, setWeekStart] = useState(currentMonday());
    const [file, setFile] = useState<File | null>(null);
    const [uploads, setUploads] = useState<JedalnicekUploadRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    const weekLabel = useMemo(() => {
        const start = new Date(`${weekStart}T12:00:00`);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        return `${start.toLocaleDateString('sk-SK')} - ${end.toLocaleDateString('sk-SK')}`;
    }, [weekStart]);

    const fetchUploads = useCallback(async (targetWeekStart = weekStart) => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/?week_start=${targetWeekStart}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as JedalnicekUploadRecord[] | { results?: JedalnicekUploadRecord[] };
            setUploads(normalizeList(data));
        } catch (err) {
            logger.error(err);
            error('Importy jedálničkov sa nepodarilo načítať.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, error, weekStart]);

    useEffect(() => {
        void fetchUploads();
    }, [fetchUploads]);

    const handleUpload = async () => {
        if (!file) {
            error('Vyberte XLSX súbor.');
            return;
        }

        const form = new FormData();
        form.append('file', file);
        setUploading(true);
        setWarnings([]);

        try {
            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/upload/`, {
                method: 'POST',
                body: form,
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                const apiErrors = Array.isArray(payload.errors) ? payload.errors.join(' ') : payload.error;
                throw new Error(apiErrors || `HTTP ${res.status}`);
            }

            const data = payload as UploadResponse;
            setWeekStart(data.week_start);
            setWarnings(data.warnings || []);
            setFile(null);
            success(
                data.replaced_uploads && data.replaced_uploads > 0
                    ? 'Jedálniček bol nahratý a predchádzajúci import týždňa bol nahradený.'
                    : 'Jedálniček bol nahratý.',
            );
            await fetchUploads(data.week_start);
        } catch (err) {
            logger.error(err);
            error(err instanceof Error ? err.message : 'XLSX súbor sa nepodarilo nahrať.');
        } finally {
            setUploading(false);
        }
    };

    const deleteUpload = async (id: number) => {
        try {
            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/${id}/remove/`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setUploads((prev) => prev.filter((item) => item.id !== id));
            success('Import jedálnička bol odstránený.');
        } catch (err) {
            logger.error(err);
            error('Import jedálnička sa nepodarilo odstrániť.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Import jedálničkov</h2>
                    <p className="text-gray-500 mt-1">Nahrajte XLSX šablónu jedálničkov pre týždeň.</p>
                </div>
                <button
                    onClick={() => void fetchUploads()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Obnoviť
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Nahrať XLSX</h3>
                            <p className="text-sm text-gray-500">Aktívny týždeň: {weekLabel}</p>
                        </div>
                    </div>

                    <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="jedalnicek-week">
                        Pondelok týždňa
                    </label>
                    <div className="mb-5 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-gray-400" />
                        <input
                            id="jedalnicek-week"
                            type="date"
                            value={weekStart}
                            onChange={(event) => setWeekStart(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        />
                    </div>

                    <label
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-teal-300 hover:bg-teal-50"
                    >
                        <Upload className="mb-3 h-8 w-8 text-teal-600" />
                        <span className="text-sm font-semibold text-gray-800">
                            {file ? file.name : 'Vybrať XLSX súbor'}
                        </span>
                        <span className="mt-1 text-xs text-gray-500">Podporovaný formát: .xlsx</span>
                        <input
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={(event) => setFile(event.target.files?.[0] || null)}
                        />
                    </label>

                    <button
                        onClick={() => void handleUpload()}
                        disabled={!file || uploading}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Nahrávam...' : 'Nahrať a spracovať'}
                    </button>

                    {warnings.length > 0 && (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <h4 className="text-sm font-semibold text-amber-900">Upozornenia</h4>
                            <ul className="mt-2 space-y-1 text-sm text-amber-800">
                                {warnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Importy pre týždeň</h3>
                            <p className="text-sm text-gray-500">{weekLabel}</p>
                        </div>
                        {loading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />}
                    </div>

                    {uploads.length === 0 && !loading ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            Pre tento týždeň ešte nie je nahratý žiadny import.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                            {uploads.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 bg-white px-4 py-3">
                                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-teal-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900">{item.filename}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.entries_count} položiek · {new Date(item.uploaded_at).toLocaleString('sk-SK')}
                                        </p>
                                        {item.error_message && (
                                            <p className="mt-1 text-xs text-red-600">{item.error_message}</p>
                                        )}
                                    </div>
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                        Spracovaný
                                    </span>
                                    <button
                                        onClick={() => void deleteUpload(item.id)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label="Odstrániť import"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JedalnicekUpload;
