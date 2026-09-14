import type { BrokerAdapter } from "../broker/BrokerAdapter";
import { BrokerError } from "../broker/BrokerAdapter";
import type { Order, OrderIntent } from "../broker/types";
import { riskLimits, type RiskLimits } from "../config/risk";
import { newClientOrderId } from "./attribution";
import { journal, type JournalEntry } from "./journal";
import { evaluateRisk, type RiskVerdict } from "./riskGuard";

/**
 * THE one path an order can take:
 *
 *   source (manual UI | strategy) --> OrderIntent
 *     --> riskGuard   (pure, uses a fresh snapshot of account/positions/clock)
 *     --> journal     (always, whatever the outcome)
 *     --> broker      (only if the guard said ok)
 *
 * Nothing else may call adapter.submitOrder(). Both the manual ticket and
 * every future strategy call pipeline.submit().
 */
export interface PipelineResult {
  verdict: RiskVerdict;
  entry: JournalEntry;
  order?: Order;
}

export class OrderPipeline {
  constructor(
    private readonly broker: BrokerAdapter,
    private readonly limits: RiskLimits = riskLimits,
  ) {}

  /** Dry run: evaluate the guard without journaling or submitting. For live previews in the ticket. */
  async preview(intent: OrderIntent): Promise<RiskVerdict> {
    const ctx = await this.snapshot(intent);
    return evaluateRisk(this.normalize(intent), ctx, this.limits);
  }

  async submit(rawIntent: OrderIntent): Promise<PipelineResult> {
    const intent = this.normalize(rawIntent);
    const ctx = await this.snapshot(intent);
    const verdict = evaluateRisk(intent, ctx, this.limits);

    if (!verdict.ok) {
      const entry = journal.add({
        intent,
        outcome: "guard_rejected",
        notional: verdict.notional,
        violations: verdict.violations,
        warnings: verdict.warnings,
      });
      return { verdict, entry };
    }

    const clientOrderId = newClientOrderId(intent.source);
    try {
      const order = await this.broker.submitOrder(intent, clientOrderId);
      const entry = journal.add({
        intent,
        outcome: "accepted",
        orderId: order.id,
        clientOrderId,
        notional: verdict.notional,
        warnings: verdict.warnings,
      });
      return { verdict, entry, order };
    } catch (e) {
      const error = e instanceof BrokerError ? `${e.status}: ${e.message}` : (e as Error).message;
      const entry = journal.add({
        intent,
        outcome: "broker_rejected",
        clientOrderId,
        notional: verdict.notional,
        warnings: verdict.warnings,
        error,
      });
      return { verdict, entry };
    }
  }

  private normalize(i: OrderIntent): OrderIntent {
    return {
      ...i,
      symbol: i.symbol.trim().toUpperCase(),
      reason: i.reason.trim(),
      qty: Number(i.qty),
      limitPrice: i.type === "limit" || i.type === "stop_limit" ? i.limitPrice : undefined,
      stopPrice: i.type === "stop" || i.type === "stop_limit" ? i.stopPrice : undefined,
    };
  }

  private async snapshot(intent: OrderIntent) {
    const [account, positions, clock, quotes] = await Promise.all([
      this.broker.getAccount(),
      this.broker.getPositions(),
      this.broker.getClock(),
      this.broker.getQuotes([intent.symbol]).catch(() => []),
    ]);
    return { account, positions, clock, referencePrice: quotes[0]?.last };
  }
}
