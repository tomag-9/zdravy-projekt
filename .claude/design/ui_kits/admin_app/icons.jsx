/* global React */
// Lucide-style outline icons for the Zdravý projekt admin. No emoji anywhere —
// the brand's icon family is Lucide (stroke, thin, two-tone friendly).

const AIcon = ({ d, w = 20, sw = 1.8, fill = "none" }) => (
    <svg viewBox="0 0 24 24" width={w} height={w} fill={fill} stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);

const wrap = (children) => (p) => (
    <svg viewBox="0 0 24 24" width={p?.w || 20} height={p?.w || 20} fill="none"
        stroke="currentColor" strokeWidth={p?.sw || 1.8} strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

window.AdIcons = {
    // ── Nav ──
    Gauge: wrap(<>{[<path key="1" d="M12 14l4-4" />, <path key="2" d="M3.34 19a10 10 0 1 1 17.32 0" />]}</>),
    CalendarDays: wrap(<>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </>),
    BookOpen: wrap(<>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>),
    Building: wrap(<>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </>),
    Upload: wrap(<>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5M12 3v12" />
    </>),
    Salad: wrap(<>
        <path d="M7 21h10M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z" />
        <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7" />
        <path d="M13 12a2.4 2.4 0 0 0-2.6-3.4" />
    </>),
    Sliders: wrap(<>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M1 14h6M9 8h6M17 16h6" />
    </>),
    Bell: wrap(<>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>),
    Shield: wrap(<>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>),
    Umbrella: wrap(<>
        <path d="M12 12v8a2 2 0 0 0 4 0" />
        <path d="M12 2v2M2 12a10 10 0 0 1 20 0z" />
    </>),
    Scroll: wrap(<>
        <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    </>),
    Cog: wrap(<>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>),

    // ── Meals ──
    Coffee: wrap(<>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <path d="M6 2v2M10 2v2M14 2v2" />
    </>),
    Soup: wrap(<>
        <path d="M12 3a1 1 0 0 0-1 1M7 3a1 1 0 0 0-1 1M17 3a1 1 0 0 0-1 1" />
        <path d="M3 10h18M4 10a8 8 0 0 0 16 0M6 18h12" />
    </>),
    Utensils: wrap(<>
        <path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2M5 11v11" />
        <path d="M14 21V7c0-3 2-5 5-5v19" />
    </>),
    Cookie: wrap(<>
        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
        <path d="M8.5 8.5h.01M15 12h.01M11 15h.01M8 13h.01" />
    </>),

    // ── Actions & UI ──
    Plus: (p) => <AIcon {...p} d="M12 5v14M5 12h14" sw={p?.sw || 2} />,
    Minus: (p) => <AIcon {...p} d="M5 12h14" sw={2} />,
    X: (p) => <AIcon {...p} d="M18 6L6 18M6 6l12 12" sw={p?.sw || 2} />,
    Check: (p) => <AIcon {...p} d="M20 6L9 17l-5-5" sw={p?.sw || 2} />,
    ChevronLeft: (p) => <AIcon {...p} d="M15 18l-6-6 6-6" sw={p?.sw || 2} />,
    ChevronRight: (p) => <AIcon {...p} d="M9 18l6-6-6-6" sw={p?.sw || 2} />,
    ChevronDown: (p) => <AIcon {...p} d="M6 9l6 6 6-6" sw={p?.sw || 2} />,
    Search: wrap(<>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </>),
    Pencil: (p) => <AIcon {...p} d="M17 3a2.85 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
    Trash: wrap(<>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6M14 11v6" />
    </>),
    Download: wrap(<>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5M12 15V3" />
    </>),
    FileText: wrap(<>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
    </>),
    FileSpreadsheet: wrap(<>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h2v5H8zM14 13h2v5h-2z" />
    </>),
    LogOut: wrap(<>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
    </>),
    Mail: wrap(<>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 6L2 7" />
    </>),
    Phone: wrap(<>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2z" />
    </>),
    User: wrap(<>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </>),
    Info: wrap(<>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
    </>),
    AlertTriangle: wrap(<>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
    </>),
    XCircle: wrap(<>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
    </>),
    CheckCircle: wrap(<>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
    </>),
    RefreshCw: wrap(<>
        <path d="M21 2v6h-6M3 22v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0 0 20.49 15" />
    </>),
    Send: wrap(<>
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </>),
    Clock: wrap(<>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </>),
    Sprout: wrap(<>
        <path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </>),
    Bug: wrap(<>
        <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </>),
    Folder: wrap(<>
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
    </>),
    Link: wrap(<>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>),
    Menu: (p) => <AIcon {...p} d="M3 12h18M3 6h18M3 18h18" sw={2} />,
};
