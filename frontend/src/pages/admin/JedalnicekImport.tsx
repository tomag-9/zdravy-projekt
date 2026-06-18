import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/auth';

const API = import.meta.env.VITE_API_URL || '/api';

interface JedalnicekUpload {
    id: number;
    week_start: string;
    week_end: string;
    filename: string;
    status: 'pending' | 'processed' | 'error';
    error_message: string;
    uploaded_at: string;
    entry_count: number;
}

interface QueuedFile {
    id: string;
    file: File;
    weekStart: string;
    uploading: boolean;
    done: boolean;
    error: string | null;
}

const getMondayOfWeek = (date: Date): string => {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const fmt = (d: Date) =>
        d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
};

const STATUS_LABEL: Record<string, string> = {
    pending: 'Čaká',
    processed: 'Spracovaný',
    error: 'Chyba',
};

const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
};

export default function JedalnicekImport() {
    const { apiFetch } = useAuth();
    const [uploads, setUploads] = useState<JedalnicekUpload[]>([]);
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultWeekStart = getMondayOfWeek(new Date());

    const loadUploads = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/`);
            if (!res.ok) return;
            const data: JedalnicekUpload[] = await res.json();
            setUploads(data);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        void loadUploads();
    }, [loadUploads]);

    const addFiles = (files: FileList | File[]) => {
        const newItems: QueuedFile[] = Array.from(files).map((f) => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            file: f,
            weekStart: defaultWeekStart,
            uploading: false,
            done: false,
            error: null,
        }));
        setQueue((prev) => [...prev, ...newItems]);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    };

    const uploadFile = async (item: QueuedFile) => {
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, uploading: true, error: null } : q)));
        try {
            const form = new FormData();
            form.append('week_start', item.weekStart);
            form.append('file', item.file);

            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/upload/`, {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({})) as Record<string, string>;
                const msg = err.error || err.detail || res.statusText || 'Neznáma chyba';
                setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, uploading: false, error: msg } : q)));
                return;
            }
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, uploading: false, done: true } : q)));
            await loadUploads();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Neznáma chyba';
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, uploading: false, error: msg } : q)));
        }
    };

    const uploadAll = async () => {
        const pending = queue.filter((q) => !q.done && !q.uploading);
        for (const item of pending) {
            await uploadFile(item);
        }
    };

    const deleteUpload = async (id: number) => {
        try {
            const res = await apiFetch(`${API}/admin/jedalnicek-uploads/${id}/remove/`, { method: 'DELETE' });
            if (!res.ok) {
                alert('Nepodarilo sa zmazať súbor');
                return;
            }
            await loadUploads();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Nepodarilo sa zmazať súbor');
        }
    };

    const removeFromQueue = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));
    const clearDone = () => setQueue((prev) => prev.filter((q) => !q.done));

    const pendingCount = queue.filter((q) => !q.done).length;
    const doneCount = queue.filter((q) => q.done).length;

    // Group uploads by week
    const byWeek = uploads.reduce<Record<string, JedalnicekUpload[]>>((acc, u) => {
        const key = u.week_start;
        if (!acc[key]) acc[key] = [];
        acc[key].push(u);
        return acc;
    }, {});

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Jedálniček – import</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Nahrávanie týždenných jedálničkov s gramážami pre všetky diety
                </p>
            </div>

            {/* Drop zone */}
            <div className="mb-8">
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-colors ${
                        isDragging
                            ? 'border-teal-400 bg-teal-50'
                            : 'border-gray-300 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                >
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-600 font-medium">Presuň súbory s jedálničkom sem alebo klikni pre výber</p>
                    <p className="text-xs text-gray-400 mt-1">Jeden súbor = jeden týždeň · môžeš nahrať viacero naraz</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && addFiles(e.target.files)}
                    />
                </div>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Fronta ({pendingCount} čakajú{doneCount > 0 ? `, ${doneCount} hotových` : ''})
                        </h2>
                        <div className="flex gap-2">
                            {doneCount > 0 && (
                                <button
                                    onClick={clearDone}
                                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                                >
                                    Zmazať hotové
                                </button>
                            )}
                            {pendingCount > 0 && (
                                <button
                                    onClick={() => void uploadAll()}
                                    className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                    Nahrať všetky ({pendingCount})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {queue.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                    item.done
                                        ? 'bg-green-50 border-green-200'
                                        : item.error
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <span className="text-lg shrink-0">
                                    {item.done ? '✅' : item.error ? '❌' : item.uploading ? '⏳' : '📄'}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                                    {item.error && <p className="text-xs text-red-600 mt-0.5">{item.error}</p>}
                                </div>

                                {!item.done && (
                                    <div className="shrink-0">
                                        <label className="text-xs text-gray-500 mr-1">Týždeň od:</label>
                                        <input
                                            type="date"
                                            value={item.weekStart}
                                            onChange={(e) => {
                                                // noon prevents UTC midnight → wrong weekday in UTC- timezones
                                                const d = new Date(e.target.value + 'T12:00:00');
                                                const monday = getMondayOfWeek(d);
                                                setQueue((prev) =>
                                                    prev.map((q) =>
                                                        q.id === item.id ? { ...q, weekStart: monday } : q
                                                    )
                                                );
                                            }}
                                            disabled={item.uploading}
                                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                        />
                                    </div>
                                )}

                                {!item.done && !item.uploading && (
                                    <button
                                        onClick={() => void uploadFile(item)}
                                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
                                    >
                                        Nahrať
                                    </button>
                                )}

                                {!item.uploading && (
                                    <button
                                        onClick={() => removeFromQueue(item.id)}
                                        className="text-gray-400 hover:text-gray-700 p-1 shrink-0"
                                        aria-label="Odstrániť"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Uploaded weeks */}
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                    Nahrané jedálničky
                    {loading && <span className="ml-2 text-gray-400 font-normal">Načítavam...</span>}
                </h2>

                {!loading && uploads.length === 0 && (
                    <p className="text-sm text-gray-400">Zatiaľ žiadne nahrané jedálničky.</p>
                )}

                {Object.entries(byWeek)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([weekStart, weekUploads]) => {
                        const weekEnd = weekUploads[0].week_end;
                        const processedCount = weekUploads.filter((u) => u.status === 'processed').length;
                        const totalEntries = weekUploads.reduce((s, u) => s + u.entry_count, 0);

                        return (
                            <div key={weekStart} className="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="text-base">📅</span>
                                    <div className="flex-1">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {formatWeekRange(weekStart, weekEnd)}
                                        </span>
                                        {totalEntries > 0 && (
                                            <span className="ml-2 text-xs text-teal-600 font-medium">
                                                {totalEntries} položiek
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {processedCount}/{weekUploads.length} spracovaných
                                    </span>
                                </div>

                                {weekUploads.map((u) => (
                                    <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                                        <span className="text-sm shrink-0">📄</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-800 truncate">{u.filename}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(u.uploaded_at).toLocaleString('sk-SK')}
                                                {u.entry_count > 0 && ` · ${u.entry_count} položiek`}
                                            </p>
                                            {u.error_message && (
                                                <p className="text-xs text-red-500 mt-0.5">{u.error_message}</p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[u.status]}`}>
                                            {STATUS_LABEL[u.status]}
                                        </span>
                                        <button
                                            onClick={() => void deleteUpload(u.id)}
                                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors shrink-0"
                                        >
                                            Zmazať
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
