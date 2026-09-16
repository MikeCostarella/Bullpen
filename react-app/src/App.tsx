import { useEffect, useState } from "react";
import { BrokerProvider } from "./app/BrokerContext";
import { SymbolIndexProvider } from "./app/SymbolIndexContext";
import { BottomNav, type Tab } from "./components/BottomNav";
import { BuildStamp } from "./components/BuildStamp";
import { MainMenu } from "./components/MainMenu";
import { env } from "./config/env";
import { benchmarkSymbol } from "./config/watchlist";
import { AccountPanel } from "./features/account/AccountPanel";
import { CandleChart } from "./features/chart/CandleChart";
import { Discover } from "./features/discover/Discover";
import { JournalView } from "./features/journal/JournalView";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { HelpPanel } from "./features/help/HelpPanel";
import { HELP_EVENT, SETTINGS_EVENT, type HelpSection } from "./features/help/helpEvents";
import { SymbolDetail } from "./features/symbol/SymbolDetail";
import { Watchlist } from "./features/watchlist/Watchlist";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { OrderTicket } from "./sources/manual/OrderTicket";

export default function App() {
  const [tab, setTab] = useState<Tab>("watch");
  const [symbol, setSymbol] = useLocalStorage<string>(
    "bullpen.symbol.v1",
    benchmarkSymbol,
  );
  /** When set, the symbol detail panel covers the current tab. */
  const [detail, setDetail] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  /** Help overlay; the string is the section to open at. */
  const [help, setHelp] = useState<HelpSection | null | undefined>(undefined);
  const helpOpen = help !== undefined;

  // Banners and other leaf components ask for help via a window event.
  useEffect(() => {
    const onHelp = (e: Event) => setHelp((e as CustomEvent<HelpSection | undefined>).detail ?? null);
    const onSettings = () => setSettings(true);
    window.addEventListener(HELP_EVENT, onHelp);
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => {
      window.removeEventListener(HELP_EVENT, onHelp);
      window.removeEventListener(SETTINGS_EVENT, onSettings);
    };
  }, []);

  const goChart = (s: string) => {
    setSymbol(s);
    setDetail(null);
    setTab("chart");
  };
  const goTrade = (s: string) => {
    setSymbol(s);
    setDetail(null);
    setTab("trade");
  };
  const goDetail = (s: string) => {
    setSymbol(s);
    setDetail(s);
  };
  const changeTab = (t: Tab) => {
    setDetail(null);
    setSettings(false);
    setTab(t);
  };
  /** Help is a side drawer, so opening Settings leaves it in place. */
  const openSettings = () => setSettings(true);

  return (
    <BrokerProvider>
      <SymbolIndexProvider>
        <div className={`app${helpOpen ? " app--help" : ""}`}>
          <header className="app__header">
            <div className="app__header-left">
              <MainMenu tab={tab} onTabChange={changeTab} onOpenSettings={openSettings} onOpenHelp={() => setHelp(null)} />
              <div className="app__title">Bullpen</div>
            </div>
            <div className="app__pills">
              {env.beta && <span className="pill pill--warn">Beta</span>}
              <span className={`pill ${env.paper ? "pill--paper" : "pill--live"}`}>{env.paper ? "Paper" : "LIVE"}</span>
              <button
                type="button"
                className={`help-btn${helpOpen ? " help-btn--on" : ""}`}
                aria-label={helpOpen ? "Close help" : "Open help"}
                aria-pressed={helpOpen}
                title={helpOpen ? "Close help" : "Help & getting started"}
                onClick={() => setHelp(helpOpen ? undefined : null)}
              >
                ?
              </button>
            </div>
          </header>

          <main className="app__main">
            {!env.paper && (
              <div className="banner banner--error">
                This build is pointed at LIVE trading. Real money. Are you sure?
              </div>
            )}
            {settings ? (
              <SettingsPanel onBack={() => setSettings(false)} />
            ) : detail ? (
              <SymbolDetail
                symbol={detail}
                onBack={() => setDetail(null)}
                onChart={goChart}
                onTrade={goTrade}
              />
            ) : (
              <>
                {tab === "watch" && <Watchlist onSelect={goDetail} />}
              {tab === "discover" && <Discover onSelect={goDetail} />}
                {tab === "chart" && (
                  <CandleChart
                    symbol={symbol}
                    onTrade={goTrade}
                    onDetail={goDetail}
                  />
                )}
                {tab === "trade" && (
                  <OrderTicket
                    symbol={symbol}
                    onSymbolChange={setSymbol}
                    onDetail={goDetail}
                    onSubmitted={(r) => r.order && setTab("account")}
                  />
                )}
                {tab === "account" && <AccountPanel onSelect={goDetail} />}
                {tab === "journal" && <JournalView />}
              </>
            )}
          </main>

          {helpOpen && (
            <HelpPanel onBack={() => setHelp(undefined)} onOpenSettings={openSettings} section={help ?? undefined} />
          )}
          <BuildStamp />
          <BottomNav tab={tab} onChange={changeTab} />
        </div>
      </SymbolIndexProvider>
    </BrokerProvider>
  );
}
