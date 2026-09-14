import { useEffect, useState } from "react";
import { journal, type JournalEntry } from "../../pipeline/journal";
import { fmtMoney, fmtQty, fmtTime } from "../../lib/format";

const OUTCOME_LABEL: Record<JournalEntry["outcome"], { label: string; cls: string }> = {
  accepted: { label: "Sent", cls: "pill--ok" },
  guard_rejected: { label: "Guard blocked", cls: "pill--warn" },
  broker_rejected: { label: "Broker refused", cls: "pill--live" },
};

export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => journal.all());
  useEffect(() => journal.subscribe(setEntries), []);

  const download = () => {
    const blob = new Blob([journal.exportCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bullpen-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="card">
        <div className="card__title">
          <span>Trade journal · {entries.length}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn btn--ghost" onClick={download} disabled={entries.length === 0}>
              Export CSV
            </button>
            <button
              className="btn btn--danger"
              onClick={() => confirm("Clear the whole journal on this device?") && journal.clear()}
              disabled={entries.length === 0}
            >
              Clear
            </button>
          </span>
        </div>
        {entries.length === 0 && (
          <div className="empty">
            Every order intent lands here — sent, blocked or refused — with the reason you wrote.
          </div>
        )}
        {entries.map((e) => {
          const o = OUTCOME_LABEL[e.outcome];
          const i = e.intent;
          return (
            <div key={e.id} className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div>
                  <span className={`sym ${i.side === "buy" ? "up" : "down"}`}>{i.side.toUpperCase()}</span>{" "}
                  <span className="sym">
                    {fmtQty(i.qty)} {i.symbol}
                  </span>{" "}
                  <span className={`pill ${o.cls}`}>{o.label}</span> <span className="pill pill--muted">{i.source}</span>
                </div>
                <div className="sub">
                  {i.type}
                  {i.limitPrice ? ` @ ${fmtMoney(i.limitPrice)}` : ""}
                  {i.stopPrice ? ` stop ${fmtMoney(i.stopPrice)}` : ""} · {i.timeInForce}
                  {e.notional ? ` · ~${fmtMoney(e.notional, 0)}` : ""} · {fmtTime(e.at)}
                </div>
                <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{i.reason}</div>
                {e.violations && e.violations.length > 0 && (
                  <div className="sub" style={{ color: "var(--accent)", marginTop: 4 }}>
                    {e.violations.join(" · ")}
                  </div>
                )}
                {e.error && (
                  <div className="sub" style={{ color: "var(--down)", marginTop: 4 }}>
                    {e.error}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="footer-note">Stored on this device only for now; the backend will own the journal later.</div>
    </>
  );
}
