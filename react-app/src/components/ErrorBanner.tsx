import { BrokerError } from "../broker/BrokerAdapter";

export function ErrorBanner({ error }: { error: Error | undefined }) {
  if (!error) return null;
  if (error instanceof BrokerError) {
    if (error.unauthorized) {
      return (
        <div className="banner banner--warn">
          Alpaca rejected the API keys. Put your paper keys in <code>react-app/.env.local</code> (see{" "}
          <code>.env.example</code>) and restart <code>npm run dev</code>.
        </div>
      );
    }
    if (error.status === 0 || error.status === 404 || error.status === 502 || error.status === 504) {
      return (
        <div className="banner banner--error">
          Can't reach the API ({error.message}). In development the Vite dev server proxies{" "}
          <code>/api/*</code> to Alpaca — is it running? On a deployed build, set <code>VITE_API_BASE</code> to
          the Bullpen backend.
        </div>
      );
    }
    if (error.status === 429) {
      return <div className="banner banner--warn">Rate-limited by Alpaca (200 calls/min on the free plan). Backing off.</div>;
    }
  }
  return <div className="banner banner--error">{error.message}</div>;
}
