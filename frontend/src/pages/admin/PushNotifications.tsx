import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AdminUser {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Push Notifikácie</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Odošlite push notifikáciu jednému používateľovi alebo všetkým
                    aktívnym odberateľom.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-5">
                    Odoslať notifikáciu
                </h2>

                <form onSubmit={handleSend} className="space-y-4">
                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Príjemca
                        </label>
                        <select
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Všetci aktívni odberatelia</option>
                            {users.map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                    {u.email}
                                    {(u.first_name || u.last_name)
                                        ? ` (${[u.first_name, u.last_name].filter(Boolean).join(' ')})`
                                        : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nadpis
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Napr. Pripomienka objednávky"
                            maxLength={100}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Správa
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Text notifikácie..."
                            rows={3}
                            maxLength={250}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            required
                        />
                    </div>

                    {/* URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cieľová stránka (URL)
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="/home"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Na ktorú stránku aplikácie sa otvorí po kliknutí na notifikáciu.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors text-sm"
                    >
                        {sending ? 'Odosielam...' : 'Odoslať notifikáciu'}
                    </button>
                </form>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-medium mb-1">Informácie</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                    <li>
                        Notifikácie sa odosielajú iba používateľom, ktorí si nainštalovali
                        aplikáciu a povolili notifikácie.
                    </li>
                    <li>
                        Automatické pripomienky sa odosielajú 15 minút pred uzávierkou
                        objednávky (nakonfigurujte v Nastaveniach).
                    </li>
                    <li>
                        Neplatné subscriptions (napr. po odinštalovaní) sú automaticky
                        odstraňované pri odosielaní.
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default PushNotifications;
