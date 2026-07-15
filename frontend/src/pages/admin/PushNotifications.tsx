import React, { useEffect, useState } from 'react';
import { Send, Info } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { PageHead, Card, CardHead, Button, Field, Input, Textarea, Select } from './ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AdminUser {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    profile?: {
        company_name?: string;
    };
}

const PushNotifications: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('/home');
    const [targetUserId, setTargetUserId] = useState<string>('all');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        apiFetch(`${API_URL}/admin/users/?page_size=200`)
            .then((r) => r.json())
            .then((data) => {
                const results = data.results ?? data;
                setUsers(Array.isArray(results) ? results : []);
            })
            .catch(() => {});
    }, [apiFetch]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            error('Vyplňte nadpis aj správu.');
            return;
        }

        setSending(true);
        try {
            const payload: Record<string, string> = { title, body, url };
            if (targetUserId !== 'all') payload.user_id = targetUserId;

            const res = await apiFetch(`${API_URL}/admin/push/send/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                const sent = data.sent ?? 0;
                const failed = data.failed ?? data.stale_removed ?? 0;
                success(
                    `Odoslané: ${sent} notifikácií${failed > 0 ? `, neúspešných: ${failed}` : ''}`
                );
                setTitle('');
                setBody('');
            } else {
                error(data.detail ?? 'Nastala chyba pri odosielaní.');
            }
        } catch {
            error('Nepodarilo sa odoslať notifikáciu.');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <PageHead
                eyebrow="Komunikácia"
                title="Push notifikácie"
                desc="Odošlite push notifikáciu jednému používateľovi alebo všetkým aktívnym odberateľom."
            />

            <div className="zpa-stack" style={{ maxWidth: 640 }}>
                <Card pad>
                    <CardHead title="Odoslať notifikáciu" />
                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                        <Field label="Príjemca">
                            <Select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
                                <option value="all">Všetci aktívni odberatelia</option>
                                {users.map((u) => (
                                    <option key={u.id} value={String(u.id)}>
                                        {u.email}
                                        {u.profile?.company_name
                                            ? ` (${u.profile.company_name})`
                                            : (u.first_name || u.last_name)
                                            ? ` (${[u.first_name, u.last_name].filter(Boolean).join(' ')})`
                                            : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Nadpis" req>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Napr. Pripomienka objednávky"
                                maxLength={100}
                                required
                            />
                        </Field>

                        <Field label="Správa" req>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Text notifikácie…"
                                rows={3}
                                maxLength={250}
                                required
                            />
                        </Field>

                        <Field label="Cieľová stránka (URL)" hint="kam sa aplikácia otvorí po kliknutí">
                            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/home" />
                        </Field>

                        <div>
                            <Button type="submit" disabled={sending}>
                                <Send /> {sending ? 'Odosielam…' : 'Odoslať notifikáciu'}
                            </Button>
                        </div>
                    </form>
                </Card>

                <div style={{ background: 'rgba(0,151,167,0.06)', border: '1px solid rgba(0,151,167,0.16)', borderRadius: 'var(--radius-md)', padding: 16, fontSize: 13.5, color: 'var(--ink-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal-500)', marginBottom: 8 }}>
                        <Info style={{ width: 16, height: 16 }} /> Informácie
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <li>Notifikácie sa odosielajú iba používateľom, ktorí si nainštalovali aplikáciu a povolili notifikácie.</li>
                        <li>Automatické pripomienky sa odosielajú 15 minút pred uzávierkou objednávky (nakonfigurujte v Nastaveniach).</li>
                        <li>Neplatné subscriptions (napr. po odinštalovaní) sú automaticky odstraňované pri odosielaní.</li>
                    </ul>
                </div>
            </div>
        </>
    );
};

export default PushNotifications;
