import { useState, type FormEvent } from "react";
import { useBroker } from "../../app/BrokerContext";
import { BrokerError } from "../../broker/BrokerAdapter";
import { maskKey, setCredentials } from "../../config/credentials";
import { env } from "../../config/env";
import { useCredentials } from "../../hooks/useCredentials";
import { fmtMoney } from "../../lib/format";
import { openHelp } from "../help/helpEvents";

interface Props {
  onBack: () => void;
}

/**
 * Settings: where a beta tester pastes their own Alpaca PAPER keys. The keys
 * stay in this browser and ride along on every API call; the relay is
 * paper-only, so a live key pasted here simply fails.
 */
export function SettingsPanel({ onBack }: Props) {
  const { broker } = useBroker();
  const stored = useCredentials();
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const save = (e: FormEvent) => {
    e.preventDefault();
    setCredentials({ keyId, secretKey: secret });
    setKeyId("");
    setSecret("");
    setResult(undefined);
  };
  const clear = () => {
    setCredentials(undefined);
    setResult(undefined);
  };
  const test = async () => {
    setTesting(true);
    setResult(undefined);
    try {
      const a = await broker.getAccount();
      setResult({ ok: true, text: `Connected. Account ${a.status}, equity ${fmtMoney(a.equity, 0)}, buying power ${fmtMoney(a.buyingPower, 0)}.` });
    } catch (e) {
      const msg =
        e instanceof BrokerError && e.unauthorized
          ? "Alpaca rejected these keys. Check they're the PAPER keys (app.alpaca.markets → Paper Trading → API Keys) and that you copied the whole secret."
          : (e as Error).message;
      setResult({ ok: false, text: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="detail-bar">
        <button className="btn btn--ghost" type="button" onClick={onBack}>
          ‹ Back
        </button>
        <span className="sym">Settings</span>
        <span />
      </div>

      <div className="card">
        <div className="card__title">
          <span>Alpaca paper keys</span>
          <span className={`pill ${stored ? "pill--ok" : "pill--muted"}`}>{stored ? "Set on this device" : env.paper ? "Not set" : "Not set"}</span>
        </div>
        {stored ? (
          <>
            <div className="sub" style={{ marginBottom: 10 }}>
              Key ID <code>{maskKey(stored.keyId)}</code> · secret <code>{maskKey(stored.secretKey)}</code>. Stored only in this
              browser and sent with each request; nothing is saved on a server.
            </div>
            <div className="field-row">
              <button className="btn btn--ghost" type="button" onClick={test} disabled={testing}>
                {testing ? "Testing…" : "Test connection"}
              </button>
              <button className="btn btn--danger" type="button" onClick={clear}>
                Remove keys
              </button>
            </div>
          </>
        ) : (
          <div className="sub" style={{ marginBottom: 10 }}>
            Bullpen trades a <strong>paper</strong> account — pretend money, real prices. Get free keys at{" "}
            <a href="https://app.alpaca.markets/signup" target="_blank" rel="noreferrer">
              app.alpaca.markets
            </a>
            : after signing up, switch to <em>Paper Trading</em> (top-left), open <em>API Keys</em>, generate a pair and paste
            both here. Live-trading keys will not work.{" "}
            <button type="button" className="linklike" onClick={() => openHelp("alpaca")}>
              Full step-by-step in Help
            </button>
          </div>
        )}

        <form onSubmit={save} autoComplete="off">
          <div className="field">
            <label htmlFor="set-key">{stored ? "Replace key ID" : "Key ID"}</label>
            <input id="set-key" value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="PK…" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="set-secret">{stored ? "Replace secret key" : "Secret key"}</label>
            <input id="set-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="paste the secret" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </div>
          <button className="btn" type="submit" disabled={!keyId.trim() || !secret.trim()}>
            Save keys on this device
          </button>
        </form>

        {result && (
          <div className={`verdict ${result.ok ? "verdict--ok" : "verdict--bad"}`} style={{ marginBottom: 0 }}>
            {result.text}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">About this build</div>
        <div className="sub">
          {env.beta ? "Beta build. " : ""}
          {env.paper ? "Paper trading only." : "LIVE trading build."} API: <code>{env.apiBase || "same origin (dev proxy)"}</code>.
          Built {env.buildTime ? new Date(env.buildTime).toLocaleString() : "—"}.
        </div>
        <div className="sub" style={{ marginTop: 8 }}>
          Found a bug or have an idea? Use the <strong>Report feedback</strong> link in the menu — please mention what you tapped
          and the build time above.
        </div>
      </div>
    </>
  );
}
