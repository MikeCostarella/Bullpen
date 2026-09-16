import { BrokerError } from "../broker/BrokerAdapter";
import { getCredentials } from "../config/credentials";
import { env } from "../config/env";
import { openHelp } from "../features/help/helpEvents";

export function ErrorBanner({ error }: { error: Error | undefined }) {
  if (!error) return null;
  if (error instanceof BrokerError) {
    if (error.unauthorized) {
      if (getCredentials()) {
        return (
          <div className="banner banner--warn">
            Alpaca rejected the keys saved on this device. Open <strong>Menu → Settings</strong> and check they're your{" "}
            <em>paper</em> keys.{" "}
            <button type="button" className="linklike" onClick={() => openHelp("alpaca")}>
              Step-by-step
            </button>
          </div>
        );
      }
      if (env.apiBase) {
        return (
          <div className="banner banner--warn">
            No Alpaca keys yet. Open <strong>Menu → Settings</strong> and paste your free paper-trading keys to get started.{" "}
            <button type="button" className="linklike" onClick={() => openHelp("alpaca")}>
              How do I get keys?
            </button>
          </div>
        );
      }
      return (
        <div className="banner banner--warn">
          Alpaca rejected the API keys. Put your paper keys in <code>react-app/.env.local</code> (see{" "}
          <code>.env.example</code>) and restart <code>npm run dev</code> — or open <strong>Menu → Settings</strong> and paste
          keys there.
        </div>
      );
    }
    if (error.status === 0 || error.status === 404 || error.status === 502 || error.status === 504) {
      return (
        <div className="banner banner--error">
          Can't reach the API ({error.message}).{" "}
          {env.apiBase
            ? "The Bullpen relay may be down — try again in a minute."
            : "In development the Vite dev server proxies /api/* to Alpaca — is it running?"}
        </div>
      );
    }
    if (error.status === 429) {
      return <div className="banner banner--warn">Rate-limited by Alpaca (200 calls/min on the free plan). Backing off.</div>;
    }
  }
  return <div className="banner banner--error">{error.message}</div>;
}
