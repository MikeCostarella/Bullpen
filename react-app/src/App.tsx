import { useState } from "react";
import { BrokerProvider } from "./app/BrokerContext";
import { BottomNav, type Tab } from "./components/BottomNav";
import { env } from "./config/env";
import { benchmarkSymbol } from "./config/watchlist";
import { AccountPanel } from "./features/account/AccountPanel";
import { CandleChart } from "./features/chart/CandleChart";
import { JournalView } from "./features/journal/JournalView";
import { Watchlist } from "./features/watchlist/Watchlist";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { OrderTicket } from "./sources/manual/OrderTicket";

export default function App() {
  const [tab, setTab] = useState<Tab>("watch");
  const [symbol, setSymbol] = useLocalStorage<string>("bullpen.symbol.v1", benchmarkSymbol);

  const goChart = (s: string) => {
    setSymbol(s);
    setTab("chart");
  };
  const goTrade = (s: string) => {
    setSymbol(s);
    setTab("trade");
  };

  return (
    <BrokerProvider>
      <div className="app">
        <header className="app__header">
          <div className="app__title">Bullpen</div>
          <span className={`pill ${env.paper ? "pill--paper" : "pill--live"}`}>{env.paper ? "Paper" : "LIVE"}</span>
        </header>

        <main className="app__main">
          {!env.paper && (
            <div className="banner banner--error">
              This build is pointed at LIVE trading. Real money. Are you sure?
            </div>
          )}
          {tab === "watch" && <Watchlist onSelect={goChart} />}
          {tab === "chart" && <CandleChart symbol={symbol} onTrade={goTrade} />}
          {tab === "trade" && (
            <OrderTicket symbol={symbol} onSymbolChange={setSymbol} onSubmitted={(r) => r.order && setTab("account")} />
          )}
          {tab === "account" && <AccountPanel onSelect={goChart} />}
          {tab === "journal" && <JournalView />}
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </BrokerProvider>
  );
}
