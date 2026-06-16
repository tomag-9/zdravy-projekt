import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';

interface EdupageOperation {
    id: number;
    email: string;
    profile: {
        company_name: string;
        is_edupage: boolean;
        api_identifier: string;
    } | null;
}

interface OperationStatus {
    id: number;
    name: string;
    uploaded: boolean;
    upload_count: number;
}

interface StatusByDate {
    date: string;
    total_schools: number;
    uploaded_schools: number;
    schools: OperationStatus[];
}

interface Upload {
    id: number;
    operation: number | null;
    operation_name: string | null;
    date: string;
    filename: string;
    status: 'pending' | 'processed' | 'error';
    error_message: string;
    uploaded_at: string;
}

interface QueuedFile {
    id: string;
    file: File;
    operationId: string;
    uploading: boolean;
    done: boolean;
    error: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function EdupageUpload() {
    const [date, setDate] = useState(today());
    const [statusData, setStatusData] = useState<StatusByDate | null>(null);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [operations, setOperations] = useState<EdupageOperation[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const operationName = (op: EdupageOperation) =>
        op.profile?.company_name || op.email;

    const loadOperations = useCallback(async () => {
        const data = await apiClient.get<EdupageOperation[]>('/admin/users/?is_edupage=true');
        setOperations(data);
    }, []);

    const loadStatusAndUploads = useCallback(async (d: string) => {
        setLoadingStatus(true);
        try {
            const [s, u] = await Promise.all([
                apiClient.get<StatusByDate>(`/admin/edupage-uploads/status_by_date/?date=${d}`),
                apiClient.get<Upload[]>(`/admin/edupage-uploads/?date=${d}`),
            ]);
            setStatusData(s);
            setUploads(u);
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    useEffect(() => {
        void loadOperations();
    }, [loadOperations]);

    useEffect(() => {
        void loadStatusAndUploads(date);
    }, [date, loadStatusAndUploads]);

    const addFiles = (files: FileList | File[]) => {
        const newItems: QueuedFile[] = Array.from(files).map((f) => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            file: f,
            operationId: '',
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
            form.append('date', date);
            form.append('file', item.file);
            if (item.operationId) form.append('operation_id', item.operationId);

            await apiClient.postForm('/admin/edupage-uploads/upload/', form);
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, uploading: false, done: true } : q)));
            await loadStatusAndUploads(date);
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

    const removeFromQueue = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));
    const clearDone = () => setQueue((prev) => prev.filter((q) => !q.done));

    const deleteUpload = async (id: number) => {
        try {
            await apiClient.delete(`/admin/edupage-uploads/${id}/remove/`);
            await loadStatusAndUploads(date);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Nepodarilo sa zmazať súbor');
        }
    };

    const pendingCount = queue.filter((q) => !q.done && !q.uploading).length;
    const doneCount = queue.filter((q) => q.done).length;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edupage</h1>
                <p className="text-gray-500 mt-1 text-sm">Nahrávanie objednávok z Edupage exportov</p>
            </div>

            <div className="space-y-6">
                {/* Date picker + status summary */}
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Dátum objednávok</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {statusData && !loadingStatus && (
                        <div className="flex items-center gap-2 mt-4">
                            <span className={`text-2xl font-bold ${statusData.uploaded_schools === statusData.total_schools && statusData.total_schools > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {statusData.uploaded_schools}/{statusData.total_schools}
                            </span>
                            <span className="text-sm text-gray-500">prevádzok nahratých</span>
                        </div>
                    )}
                    {loadingStatus && <div className="mt-4 text-sm text-gray-400">Načítavam...</div>}
                </div>

                {/* Operation status grid */}
                {statusData && statusData.total_schools > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Stav prevádzok pre {date}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {statusData.schools.map((s) => (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                                        s.uploaded
                                            ? 'bg-green-50 border-green-200 text-green-800'
                                            : 'bg-gray-50 border-gray-200 text-gray-600'
                                    }`}
                                >
                                    <span className="text-base">{s.uploaded ? '✅' : '⬜'}</span>
                                    <span className="truncate font-medium">{s.name}</span>
                                    {s.upload_count > 1 && (
                                        <span className="ml-auto shrink-0 text-xs bg-green-200 text-green-800 px-1.5 rounded-full">
                                            {s.upload_count}×
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {statusData && statusData.total_schools === 0 && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        Žiadne prevádzky nie sú označené ako Edupage. Označ ich v <strong>Prevádzky → Správa prevádzok</strong>.
                    </div>
                )}

                {/* Drop zone */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Nahrať súbory</h2>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-colors ${
                            isDragging
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                    >
                        <div className="text-4xl mb-3">📂</div>
                        <p className="text-gray-600 font-medium">Presuň súbory sem alebo klikni pre výber</p>
                        <p className="text-xs text-gray-400 mt-1">Môžeš nahrať viac súborov naraz</p>
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
                    <div>
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
                                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
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
                                        {item.error && (
                                            <p className="text-xs text-red-600 mt-0.5">{item.error}</p>
                                        )}
                                    </div>

                                    {!item.done && (
                                        <select
                                            value={item.operationId}
                                            onChange={(e) =>
                                                setQueue((prev) =>
                                                    prev.map((q) =>
                                                        q.id === item.id ? { ...q, operationId: e.target.value } : q
                                                    )
                                                )
                                            }
                                            disabled={item.uploading}
                                            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            <option value="">-- prevádzka --</option>
                                            {operations.map((op) => (
                                                <option key={op.id} value={op.profile?.company_name ? String(op.id) : String(op.id)}>
                                                    {operationName(op)}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {!item.done && !item.uploading && (
                                        <button
                                            onClick={() => void uploadFile(item)}
                                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
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

                {/* Already uploaded files for this date */}
                {uploads.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Nahrané súbory pre {date}</h2>
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
                            {uploads.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                                    <span className="text-base shrink-0">
                                        {u.status === 'processed' ? '✅' : u.status === 'error' ? '❌' : '⏳'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{u.filename}</p>
                                        <p className="text-xs text-gray-400">
                                            {u.operation_name ?? <em>bez prevádzky</em>} · {new Date(u.uploaded_at).toLocaleString('sk-SK')}
                                        </p>
                                        {u.error_message && (
                                            <p className="text-xs text-red-500 mt-0.5">{u.error_message}</p>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        u.status === 'processed' ? 'bg-green-100 text-green-700'
                                        : u.status === 'error' ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {u.status === 'processed' ? 'Spracovaný' : u.status === 'error' ? 'Chyba' : 'Čaká'}
                                    </span>
                                    <button
                                        onClick={() => void deleteUpload(u.id)}
                                        className="ml-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors shrink-0"
                                    >
                                        Zmazať
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
