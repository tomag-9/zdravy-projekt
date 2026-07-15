interface Props {
  status?: string;
}

export default function AppLoadingScreen({ status = 'Načítavam...' }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg-cream)" }}>
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <img
          src="/logo-zdravy-projekt.png"
          alt="Zdravý projekt"
          style={{ width: 200, maxWidth: "70vw", height: "auto", display: "block" }}
        />

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
