import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useAuth } from "../../../context/auth";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface InboxMessage {
    id: number;
    title: string;
    body: string;
    url: string;
    created_at: string;
    read_at: string | null;
    is_read: boolean;
}

const InboxPage = () => {
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await apiFetch(`${API_URL}/inbox/`);
            if (!res.ok) return;
            const data = await res.json();
            const results: InboxMessage[] = data.results ?? data;
            setMessages(results);
            setUnreadCount(data.unread_count ?? 0);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        if (user) fetchMessages();
    }, [user, fetchMessages]);

    const markRead = async (id: number) => {
        const res = await apiFetch(`${API_URL}/inbox/${id}/read/`, { method: "POST" });
        if (res.ok) {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllRead = async () => {
        const res = await apiFetch(`${API_URL}/inbox/read-all/`, { method: "POST" });
        if (res.ok) {
            setMessages(prev => prev.map(m => ({ ...m, is_read: true, read_at: m.read_at ?? new Date().toISOString() })));
            setUnreadCount(0);
        }
    };

    const handleMessageClick = (msg: InboxMessage) => {
        if (!msg.is_read) markRead(msg.id);
        if (msg.url && msg.url !== "/home") {
            navigate(msg.url);
        }
    };

    const fmt = (iso: string) => {
        const d = new Date(iso);
        return new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
    };

    return (
        <div className="zp-app">
            <div className="zp-orderpage">
                <div className="zp-orderbar">
                    <div>
                        <h1>Správy</h1>
                        <p>Vaše notifikácie a správy</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="zp-btn zp-btn--secondary zp-btn--sm"
                            style={{ marginLeft: "auto" }}
                            onClick={markAllRead}
                        >
                            <CheckCheck style={{ width: 14, height: 14 }} />
                            Označiť všetko
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 14 }}>
                        Načítavam…
                    </div>
                ) : messages.length === 0 ? (
                    <div className="zp-meal" style={{ textAlign: "center", padding: "40px 24px" }}>
                        <Bell style={{ width: 36, height: 36, color: "var(--ink-3)", margin: "0 auto 12px" }} />
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink-2)" }}>
                            Žiadne správy
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                            Tu sa zobrazia vaše notifikácie.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {messages.map(msg => (
                            <button
                                key={msg.id}
                                className={`zp-inbox-msg${msg.is_read ? "" : " zp-inbox-msg--unread"}`}
                                onClick={() => handleMessageClick(msg)}
                            >
                                <div className="zp-inbox-msg-dot" />
                                <div className="zp-inbox-msg-body">
                                    <div className="zp-inbox-msg-title">{msg.title}</div>
                                    <div className="zp-inbox-msg-text">{msg.body}</div>
                                    <div className="zp-inbox-msg-meta">
                                        {fmt(msg.created_at)}
                                        {msg.url && msg.url !== "/home" && (
                                            <ExternalLink style={{ width: 11, height: 11, marginLeft: 4 }} />
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InboxPage;
