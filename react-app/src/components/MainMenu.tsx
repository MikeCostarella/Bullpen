import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSymbolIndex } from "../app/SymbolIndexContext";
import { env } from "../config/env";
import { fundamentalsEnabled } from "../data/fundamentals";
import { useWatchlist } from "../features/watchlist/useWatchlist";
import { defaultWatchlist } from "../config/watchlist";
import { useCredentials } from "../hooks/useCredentials";
import { fmtAgo } from "../lib/format";
import type { Tab } from "./BottomNav";

const GITHUB_REPO_URL = "https://github.com/MikeCostarella/Bullpen";
const MY_WEBSITE_URL = "https://mikecostarella.github.io/MyWebSite/";
const STATEHOUSE_HOME_URL = "https://mikecostarella.github.io/StatehouseHome/";
const ALPACA_DASHBOARD_URL = env.paper
  ? "https://app.alpaca.markets/paper/dashboard/overview"
  : "https://app.alpaca.markets/dashboard/overview";

const VIEWS: { tab: Tab; label: string }[] = [
  { tab: "watch", label: "Watchlist" },
  { tab: "discover", label: "Discover" },
  { tab: "chart", label: "Chart" },
  { tab: "trade", label: "Trade" },
  { tab: "account", label: "Account" },
  { tab: "journal", label: "Journal" },
];

const FEEDBACK_URL = `${GITHUB_REPO_URL}/issues/new`;

interface Props {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onOpenSettings: () => void;
}

/**
 * Hamburger accordion menu (left of the title), same pattern as the rest of
 * the fleet. Sections: View, Tools, Status, Links. Section headers collapse;
 * the collapsed set persists while the app is open. Opens on click; closes
 * on outside click / Escape. Tools keep the menu open so you can see the
 * result in Status.
 */
export function MainMenu({ tab, onTabChange, onOpenSettings }: Props) {
  const index = useSymbolIndex();
  const watch = useWatchlist();
  const creds = useCredentials();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["Status", "Links"]));
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      return;
    }
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickView = (t: Tab) => {
    onTabChange(t);
    setOpen(false);
  };

  const toggleSection = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const resetWatchlist = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    watch.setSymbols(defaultWatchlist);
    setConfirmReset(false);
  };

  const Section = ({ title, children }: { title: string; children: ReactNode }) => {
    const isOpen = !collapsed.has(title);
    return (
      <>
        <button
          type="button"
          className="menu-section-label menu-section-toggle"
          aria-expanded={isOpen}
          onClick={() => toggleSection(title)}
        >
          <span>{title}</span>
          <span className="menu-chevron" aria-hidden="true">
            {isOpen ? "▾" : "▸"}
          </span>
        </button>
        {isOpen && children}
      </>
    );
  };

  const link = (label: string, href: string) => (
    <a role="menuitem" className="menu-item menu-link" href={href} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
      {label} &#8599;
    </a>
  );

  return (
    <div id="main-menu" ref={ref}>
      <button
        id="main-menu-btn"
        type="button"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div id="main-menu-dropdown" role="menu">
          <Section title="View">
            {VIEWS.map((v) => (
              <button
                key={v.tab}
                type="button"
                role="menuitemradio"
                aria-checked={tab === v.tab}
                className={`menu-item${tab === v.tab ? " active" : ""}`}
                onClick={() => pickView(v.tab)}
              >
                {v.label}
              </button>
            ))}
          </Section>

          <Section title="Tools">
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                onOpenSettings();
                setOpen(false);
              }}
            >
              Settings · Alpaca keys
            </button>
            <button type="button" role="menuitem" className="menu-item" onClick={() => void index.refresh()}>
              Refresh symbol list
            </button>
            <button type="button" role="menuitem" className={`menu-item${confirmReset ? " danger" : ""}`} onClick={resetWatchlist}>
              {confirmReset ? "Tap again to restore default watchlist" : "Restore default watchlist"}
            </button>
          </Section>

          <Section title="Status">
            <div className="menu-info">
              {env.paper ? "Paper trading (Alpaca)" : "LIVE trading (Alpaca)"}
              {env.beta ? " · beta build" : ""}
            </div>
            <div className="menu-info">Keys: {creds ? "set on this device" : env.apiBase ? "not set — open Settings" : "from .env.local (dev proxy)"}</div>
            <div className="menu-info">
              {index.status === "ready"
                ? `${index.count.toLocaleString()} symbols · updated ${index.updatedAt ? fmtAgo(new Date(index.updatedAt).toISOString()) : "—"}`
                : index.status === "loading"
                  ? "Symbol list loading…"
                  : "Symbol list unavailable"}
            </div>
            <div className="menu-info">Fundamentals (Finnhub): {fundamentalsEnabled ? "on" : "off"}</div>
            <div className="menu-info">Watchlist: {watch.symbols.length} symbols</div>
          </Section>

          <Section title="Links">
            {link("Report feedback", FEEDBACK_URL)}
            {link("Alpaca Dashboard", ALPACA_DASHBOARD_URL)}
            {link("GitHub Actions", `${GITHUB_REPO_URL}/actions`)}
            {link("GitHub Repository", GITHUB_REPO_URL)}
            {link("MyWebSite", MY_WEBSITE_URL)}
            {link("Statehouse Home", STATEHOUSE_HOME_URL)}
          </Section>
        </div>
      )}
    </div>
  );
}
