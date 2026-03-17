interface Props {
  status?: string;
}

export default function AppLoadingScreen({ status = 'Načítavam...' }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
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
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
              fillOpacity="0.3"
            />
          </svg>
        </div>

        {/* App name */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-800">Zdravý Projekt</h1>
        </div>

        {/* Bouncing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>

        {/* Status text */}
        <p role="status" aria-live="polite" className="text-slate-400 text-sm h-5 text-center">{status}</p>
      </div>
    </div>
  );
}
