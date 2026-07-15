/* global React */
// Small set of lucide-style icons used across the client screens.

const Icon = ({ d, w = 20, sw = 1.8, fill = "none" }) => (
    <svg
        viewBox="0 0 24 24"
        width={w}
        height={w}
        fill={fill}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

window.ZpIcons = {
    User: (p) => <Icon {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    Settings: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    ),
    Plus: (p) => <Icon {...p} d="M12 5v14 M5 12h14" />,
    Minus: (p) => <Icon {...p} d="M5 12h14" />,
    Calendar: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    ),
    CalendarDays: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="8" y1="14" x2="8.01" y2="14"></line>
            <line x1="12" y1="14" x2="12.01" y2="14"></line>
            <line x1="16" y1="14" x2="16.01" y2="14"></line>
            <line x1="8" y1="18" x2="8.01" y2="18"></line>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <line x1="16" y1="18" x2="16.01" y2="18"></line>
        </svg>
    ),
    Clock: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    History: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M12 7v5l4 2"></path>
        </svg>
    ),
    Coffee: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="2" x2="6" y2="4"></line>
            <line x1="10" y1="2" x2="10" y2="4"></line>
            <line x1="14" y1="2" x2="14" y2="4"></line>
        </svg>
    ),
    Utensils: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"></path>
            <path d="M5 11v11"></path>
            <path d="M14 21V7c0-3 2-5 5-5v19"></path>
        </svg>
    ),
    Apple: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12.5C19 15.5 17 19 14.5 19c-1.5 0-2-1-2.5-1s-1 1-2.5 1C7 19 5 15.5 5 12.5 5 9.5 7 7 9.5 7c1.5 0 2 1 2.5 1s1-1 2.5-1C17 7 19 9.5 19 12.5z"></path>
            <path d="M12 8c-.5-1.5 0-3 2-4"></path>
        </svg>
    ),
    ArrowLeft: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
    ),
    ChevronLeft: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    ),
    ChevronRight: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    ),
    Bot: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
        </svg>
    ),
    PenLine: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
    ),
    XCircle: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
    ),
    Lock: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    ),
    X: (p) => <Icon {...p} d="M18 6L6 18 M6 6l12 12" sw={2} />,
    Check: (p) => <Icon {...p} d="M20 6L9 17l-5-5" sw={2} />,
    Copy: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    ),
    Trash: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    ),
    Eraser: (p) => <Icon {...p} d="M20 20H8 M14.85 4.85l4.3 4.3a2 2 0 0 1 0 2.83L9.42 21.7a2 2 0 0 1-2.83 0l-4.3-4.3a2 2 0 0 1 0-2.83L12 4.85a2 2 0 0 1 2.83 0z" />,
    FileCheck: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M9 14l2 2 4-4"></path>
        </svg>
    ),
    Sparkles: (p) => <Icon {...p} d="M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1" sw={2} />,
    Mail: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
    ),
    KeyRound: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18v3h3l3-3v-2h2v-2h2l1.4-1.4a6 6 0 1 1 2.6-2.6L2 18z"></path>
            <circle cx="16.5" cy="7.5" r="1.5"></circle>
        </svg>
    ),
    Sprout: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 20h10"></path>
            <path d="M10 20c5.5-2.5.8-6.4 3-10"></path>
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path>
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path>
        </svg>
    ),
    Home: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    ),
    Book: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
    ),
    Info: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    ),
    Phone: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2z"></path>
        </svg>
    ),
    Users: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    Bell: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
    ),
    LogOut: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
    ),
    Eye: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    PartyPopper: (p) => (
        <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none" stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 11.3 2 22l10.7-3.8"></path>
            <path d="M4 3h.01"></path>
            <path d="M22 8h.01"></path>
            <path d="M15 2h.01"></path>
            <path d="M22 20h.01"></path>
            <path d="M22 2 12.5 11.5 13 13"></path>
            <path d="M11 13l7 7"></path>
        </svg>
    ),
};
