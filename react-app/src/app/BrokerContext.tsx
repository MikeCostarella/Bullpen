import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BrokerAdapter } from "../broker/BrokerAdapter";
import { AlpacaAdapter } from "../broker/alpaca/AlpacaAdapter";
import { OrderPipeline } from "../pipeline/orderPipeline";

interface BrokerCtx {
  broker: BrokerAdapter;
  pipeline: OrderPipeline;
}

const Ctx = createContext<BrokerCtx | null>(null);

export function BrokerProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const broker = new AlpacaAdapter();
    return { broker, pipeline: new OrderPipeline(broker) };
  }, []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBroker(): BrokerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBroker must be used inside BrokerProvider");
  return v;
}
