interface Props {
  status?: string;
}

export default function AppLoadingScreen({ status = 'Načítavam...' }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg-cream)" }}>
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "var(--green-700)", boxShadow: "0 8px 24px rgba(23,53,5,0.2)" }}>
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Leaf shape */}
            <path
              d="M22 6C22 6 10 14 10 24C10 30.627 15.373 36 22 36C28.627 36 34 30.627 34 24C34 14 22 6 22 6Z"
              fill="white"
              fillOpacity="0.9"
            />
            {/* Stem */}
            <path
              d="M22 36V40"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Vein */}
            <path
              d="M22 14C22 14 16 22 16 28"
              stroke="var(--green-900)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fillOpacity="0.3"
            />
          </svg>
        </div>

        {/* App name */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink-1)" }}>Zdravý Projekt</h1>
        </div>

        {/* Bouncing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ background: "var(--green-600)", animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>

        {/* Status text */}
        <p role="status" aria-live="polite" className="text-sm h-5 text-center" style={{ color: "var(--ink-3)" }}>{status}</p>
      </div>
    </div>
  );
}
