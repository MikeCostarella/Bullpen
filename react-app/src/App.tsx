import { useState } from "react";
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

  return (
    <BrokerProvider>
      <SymbolIndexProvider>
        <div className="app">
          <header className="app__header">
            <div className="app__header-left">
              <MainMenu tab={tab} onTabChange={changeTab} onOpenSettings={() => setSettings(true)} />
              <div className="app__title">Bullpen</div>
            </div>
            <div className="app__pills">
              {env.beta && <span className="pill pill--warn">Beta</span>}
              <span className={`pill ${env.paper ? "pill--paper" : "pill--live"}`}>{env.paper ? "Paper" : "LIVE"}</span>
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

          <BuildStamp />
        <BottomNav tab={tab} onChange={changeTab} />
        </div>
      </SymbolIndexProvider>
    </BrokerProvider>
  );
}
