export type Tab = "watch" | "chart" | "trade" | "account" | "journal";

const ICONS: Record<Tab, JSX.Element> = {
  watch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 4v16M7 8h-2v8h2M12 2v20M12 6h-2v10h2M17 6v12M17 9h-2v6h2" />
    </svg>
  ),
  trade: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l4-8 4 4 5-9M4 21h16" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h11l3 3v15H5z M8 9h8M8 13h8M8 17h5" />
    </svg>
  ),
};

const LABELS: Record<Tab, string> = {
  watch: "Watch",
  chart: "Chart",
  trade: "Trade",
  account: "Account",
  journal: "Journal",
};

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="nav">
      {(Object.keys(LABELS) as Tab[]).map((t) => (
        <button key={t} className={`nav__btn ${t === tab ? "nav__btn--active" : ""}`} onClick={() => onChange(t)}>
          {ICONS[t]}
          {LABELS[t]}
        </button>
      ))}
    </nav>
  );
}
