import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, Check, Square, FileText, X, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { PageHead, Card, Button, Field, Input, Select, Badge, Empty } from './ui';

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

    const statusBadge = (status: Upload['status']) =>
        status === 'processed' ? <Badge tone="green">Spracovaný</Badge>
            : status === 'error' ? <Badge tone="coral">Chyba</Badge>
            : <Badge tone="honey">Čaká</Badge>;

    const fileIcon = (item: QueuedFile) =>
        item.done ? <CheckCircle style={{ color: 'var(--green-600)' }} />
            : item.error ? <XCircle style={{ color: 'var(--coral-600)' }} />
            : item.uploading ? <Loader2 className="zpa-spin" style={{ color: 'var(--ink-mute)' }} />
            : <FileText style={{ color: 'var(--ink-3)' }} />;

    return (
        <>
            <PageHead
                eyebrow="Import"
                title="Objednávky (Edupage)"
                desc="Nahrávanie objednávok z Edupage exportov"
                actions={
                    <Field label="Dátum objednávok">
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
                    </Field>
                }
            />

            <div className="zpa-stack">
                {/* Status summary */}
                {statusData && !loadingStatus && (
                    <Card pad>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                            <span style={{
                                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, lineHeight: 1,
                                color: statusData.uploaded_schools === statusData.total_schools && statusData.total_schools > 0 ? 'var(--green-600)' : 'var(--green-900)',
                            }}>
                                {statusData.uploaded_schools}/{statusData.total_schools}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>prevádzok nahratých</span>
                        </div>

                        {statusData.total_schools > 0 && (
                            <div className="zpa-statusgrid" style={{ marginTop: 16 }}>
                                {statusData.schools.map((s) => (
                                    <div key={s.id} className={`zpa-statuschip ${s.uploaded ? 'done' : 'wait'}`}>
                                        <span className="ck">{s.uploaded ? <Check /> : <Square />}</span>
                                        <span className="nm">{s.name}</span>
                                        {s.upload_count > 1 && <span className="n">{s.upload_count}×</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}
                {loadingStatus && <Empty>Načítavam…</Empty>}

                {statusData && statusData.total_schools === 0 && (
                    <div style={{ fontSize: 13.5, color: 'var(--mustard-700)', background: 'rgba(255,201,92,0.14)', border: '1px solid rgba(255,201,92,0.4)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                        Žiadne prevádzky nie sú označené ako Edupage. Označte ich v <strong>Prevádzky → Správa prevádzok</strong>.
                    </div>
                )}

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`zpa-dropzone${isDragging ? ' drag' : ''}`}
                >
                    <div className="ic"><FolderOpen /></div>
                    <div className="t">Presuňte súbory sem alebo kliknite pre výber</div>
                    <div className="s">Môžete nahrať viac súborov naraz</div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => e.target.files && addFiles(e.target.files)}
                    />
                </div>

                {/* Queue */}
                {queue.length > 0 && (
                    <Card style={{ overflow: 'hidden' }}>
                        <div className="zpa-card-head" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                            <h3>Fronta ({pendingCount} čakajú{doneCount > 0 ? `, ${doneCount} hotových` : ''})</h3>
                            <div className="actions">
                                {doneCount > 0 && <Button variant="ghost" sm onClick={clearDone}>Zmazať hotové</Button>}
                                {pendingCount > 0 && <Button sm onClick={() => void uploadAll()}>Nahrať všetky ({pendingCount})</Button>}
                            </div>
                        </div>
                        <div>
                            {queue.map((item) => (
                                <div key={item.id} className="zpa-listrow">
                                    <span style={{ display: 'inline-flex', flexShrink: 0 }}>{fileIcon(item)}</span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div className="lr-ttl" style={{ textTransform: 'none' }}>{item.file.name}</div>
                                        {item.error && <div className="lr-sub" style={{ color: 'var(--coral-600)' }}>{item.error}</div>}
                                    </div>
                                    {!item.done && (
                                        <Select
                                            value={item.operationId}
                                            onChange={(e) =>
                                                setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, operationId: e.target.value } : q)))
                                            }
                                            disabled={item.uploading}
                                            style={{ width: 'auto' }}
                                        >
                                            <option value="">-- prevádzka --</option>
                                            {operations.map((op) => (
                                                <option key={op.id} value={String(op.id)}>{operationName(op)}</option>
                                            ))}
                                        </Select>
                                    )}
                                    {!item.done && !item.uploading && (
                                        <Button sm onClick={() => void uploadFile(item)}>Nahrať</Button>
                                    )}
                                    {!item.uploading && (
                                        <button className="zpa-iconbtn" onClick={() => removeFromQueue(item.id)} aria-label="Odstrániť">
                                            <X />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Already uploaded files for this date */}
                {uploads.length > 0 && (
                    <Card style={{ overflow: 'hidden' }}>
                        <div className="zpa-card-head" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                            <h3>Nahrané súbory pre {date}</h3>
                        </div>
                        <div>
                            {uploads.map((u) => (
                                <div key={u.id} className="zpa-listrow">
                                    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                                        {u.status === 'processed' ? <CheckCircle style={{ color: 'var(--green-600)' }} />
                                            : u.status === 'error' ? <XCircle style={{ color: 'var(--coral-600)' }} />
                                            : <Loader2 style={{ color: 'var(--ink-mute)' }} />}
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div className="lr-ttl" style={{ textTransform: 'none' }}>{u.filename}</div>
                                        <div className="lr-sub">
                                            {u.operation_name ?? <em>bez prevádzky</em>} · {new Date(u.uploaded_at).toLocaleString('sk-SK')}
                                        </div>
                                        {u.error_message && <div className="lr-sub" style={{ color: 'var(--coral-600)' }}>{u.error_message}</div>}
                                    </div>
                                    {statusBadge(u.status)}
                                    <button className="zpa-iconbtn" onClick={() => void deleteUpload(u.id)} aria-label="Zmazať" title="Zmazať">
                                        <Trash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
}
