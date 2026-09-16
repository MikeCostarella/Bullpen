import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { env } from "../../config/env";
import { riskLimits } from "../../config/risk";
import { fmtMoney } from "../../lib/format";
import type { HelpSection } from "./helpEvents";

interface Props {
  onBack: () => void;
  onOpenSettings: () => void;
  /** Section to expand and scroll to on open. */
  section?: HelpSection;
}

const FEEDBACK_URL = "https://github.com/MikeCostarella/Bullpen/issues/new";

interface SectionProps {
  id: HelpSection;
  title: string;
  isOpen: boolean;
  onToggle: (id: HelpSection, open: boolean) => void;
  detailsRef?: RefObject<HTMLDetailsElement>;
  children: ReactNode;
}

/** Hoisted so re-renders don't remount every <details> (which resets their open state). */
function Section({ id, title, isOpen, onToggle, detailsRef, children }: SectionProps) {
  return (
    <details
      className="help"
      open={isOpen}
      onToggle={(e) => {
        const now = (e.currentTarget as HTMLDetailsElement).open;
        if (now !== isOpen) onToggle(id, now);
      }}
      ref={detailsRef}
      id={`help-${id}`}
    >
      <summary className="help__title">{title}</summary>
      <div className="help__body">{children}</div>
    </details>
  );
}

/**
 * In-app help: what Bullpen is, exact setup steps, what each screen does,
 * and a short glossary. Sections are <details> so they collapse like the
 * fleet's accordion menus and deep-link by id. Update as features land —
 * the "Placing orders" section in particular is a first draft.
 */
export function HelpPanel({ onBack, onOpenSettings, section }: Props) {
  const [open, setOpen] = useState<Set<HelpSection>>(() => new Set(section ? [section] : ["start"]));
  const target = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!section) return;
    setOpen((s) => new Set(s).add(section));
    // Let the section render open, then bring it into view.
    const t = window.setTimeout(() => target.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
    return () => window.clearTimeout(t);
  }, [section]);

  const toggle = (id: HelpSection, isOpen: boolean) =>
    setOpen((s) => {
      const next = new Set(s);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });

  const hosted = !!env.apiBase;
  const sectionProps = (id: HelpSection) => ({
    id,
    isOpen: open.has(id),
    onToggle: toggle,
    detailsRef: id === section ? target : undefined,
  });

  return (
    <>
      <div className="detail-bar">
        <button className="btn btn--ghost" type="button" onClick={onBack}>
          ‹ Back
        </button>
        <span className="sym">Help</span>
        <span />
      </div>

      <div className="card">
        <Section {...sectionProps("start")} title="What Bullpen is">
          <p>
            Bullpen is a <strong>paper-trading</strong> app: real market prices, pretend money. You get a $100,000 practice
            account at Alpaca, a US brokerage, and every order you place here goes to that practice account — nothing can
            ever spend a real cent. The point is to learn how orders, positions and P&amp;L actually behave before risking
            money anywhere.
          </p>
          <p>
            You need one thing to start: a free Alpaca paper-trading key pair, pasted into ☰ → Settings. The next section
            walks through it.
          </p>
        </Section>

        <Section {...sectionProps("alpaca")} title="Getting your Alpaca paper keys (step by step)">
          <ol>
            <li>
              Go to{" "}
              <a href="https://app.alpaca.markets/signup" target="_blank" rel="noreferrer">
                app.alpaca.markets/signup
              </a>{" "}
              and create an account with an email and password. Confirm the verification email.
            </li>
            <li>
              You may be invited to open a real brokerage account (ID, funding, etc.). <strong>Skip that.</strong> Paper
              trading works without it.
            </li>
            <li>
              In the dashboard, find the account switcher at the <strong>top-left</strong> and make sure{" "}
              <strong>Paper Trading</strong> is selected. The paper dashboard shows a $100,000 balance.
            </li>
            <li>
              On the right side of the paper Overview page there's a panel titled <strong>Your API Keys</strong>. Click{" "}
              <strong>View</strong> if it's collapsed, then <strong>Generate New Keys</strong> (or <strong>Regenerate</strong>).
            </li>
            <li>
              Copy both values: the <strong>API Key ID</strong> (starts with <code>PK</code>) and the{" "}
              <strong>Secret Key</strong>. The secret is shown <em>once</em> — copy it now. If you lose it, just regenerate.
            </li>
            <li>
              In Bullpen: ☰ → <strong>Settings · Alpaca keys</strong>, paste both, <strong>Save keys on this device</strong>,
              then <strong>Test connection</strong>. You should see your account status and equity.
            </li>
          </ol>
          <p>
            <button className="btn btn--ghost" type="button" onClick={onOpenSettings}>
              Open Settings
            </button>
          </p>
          <p className="sub">
            Your keys stay in this browser and are sent only to Bullpen's relay, which forwards them to Alpaca's paper
            server and nowhere else. Live-trading keys are refused by design. If you install Bullpen on your phone, paste
            the keys there too — each device keeps its own.
          </p>
        </Section>

        <Section {...sectionProps("screens")} title="The six screens">
          <dl className="help__dl">
            <dt>Watch</dt>
            <dd>
              Your watchlist with live prices. Type a ticker or a company name in the box to add one; tap a row for the
              detail panel; Edit to remove rows.
            </dd>
            <dt>Discover</dt>
            <dd>Ways to find companies you don't already know — see the next section.</dd>
            <dt>Chart</dt>
            <dd>Candlestick chart of the current symbol. The pills switch timeframes (5m, 15m, 1h, 1D); ⓘ opens details.</dd>
            <dt>Trade</dt>
            <dd>The order ticket. Every order needs a written reason and passes a risk check before it's sent.</dd>
            <dt>Account</dt>
            <dd>Equity, cash, buying power, today's P&amp;L, open positions, open and recent orders (with cancel).</dd>
            <dt>Journal</dt>
            <dd>Every order you tried — sent, blocked or refused — with the reason you gave. Read it back after a week.</dd>
          </dl>
          <p className="sub">
            Tapping any symbol anywhere opens the <strong>detail panel</strong>: today's stats, 52-week range, performance,
            news and (when available) fundamentals, with Chart and Trade one tap away.
          </p>
        </Section>

        <Section {...sectionProps("discover")} title="Discover: finding companies">
          <ul>
            <li>
              <strong>Search box</strong> — ticker or company name ("apple", "s&amp;p 500"). Picking a result opens its detail
              panel.
            </li>
            <li>
              <strong>Today's movers</strong> — biggest gainers, losers and most-traded names across the whole US market.
              Big percentage moves are almost always tiny companies; look before you judge.
            </li>
            <li>
              <strong>By location</strong> — companies by headquarters, from their SEC filings. Pick a region chip (Mahoning
              Valley, Northeast Ohio, Pittsburgh…) or a state and city. Warrants, units and SPAC shells are hidden by
              default.
            </li>
            <li>
              <strong>Index ETFs, Sectors, Magnificent 7, Dow 30, Bonds &amp; gold</strong> — curated starting lists with
              live quotes and an "Add all" button.
            </li>
          </ul>
          <p className="sub">
            Every row has a <strong>+</strong> to add it to your watchlist (✓ means it's already there; tap to remove).
          </p>
        </Section>

        <Section {...sectionProps("orders")} title="Placing orders (first draft)">
          <p>
            On <strong>Trade</strong>: choose Buy or Sell, a quantity in shares, an order type, and write a one-line reason
            — the ticket refuses to send without one, because the reason is what you'll learn from later.
          </p>
          <ul>
            <li>
              <strong>Market</strong> — fills right away at whatever the current price is. Simplest; fine for liquid
              stocks.
            </li>
            <li>
              <strong>Limit</strong> — fills only at your price or better. May never fill.
            </li>
            <li>
              <strong>Stop</strong> — becomes a market order once the price crosses your stop; commonly used to cap a loss.
            </li>
            <li>
              <strong>Stop-limit</strong> — becomes a limit order once the stop is crossed.
            </li>
          </ul>
          <p>
            <strong>Day</strong> orders expire at the close; <strong>GTC</strong> (good 'til cancelled) orders wait for up
            to 90 days. Market hours are 9:30 AM – 4:00 PM Eastern; orders placed outside them queue for the open.
          </p>
          <p>
            A <strong>risk guard</strong> checks every order before it goes out. Current limits: {fmtMoney(riskLimits.maxOrderNotional, 0)} per
            order, {fmtMoney(riskLimits.maxPositionNotional, 0)} per position, {riskLimits.maxOrderQty} shares per order, no short selling, and no new buys for the rest of the
            day once you're down {fmtMoney(riskLimits.maxDailyLoss, 0)}. Blocked orders still land in the Journal so you can see why.
          </p>
        </Section>

        <Section {...sectionProps("fundamentals")} title="Fundamentals (market cap, P/E, earnings date)">
          <p>
            Alpaca supplies prices but not company fundamentals. Those come from a second free service,{" "}
            <a href="https://finnhub.io" target="_blank" rel="noreferrer">
              Finnhub
            </a>
            , and appear on the detail panel under <strong>Fundamentals</strong>.
          </p>
          {hosted ? (
            <p>
              On this hosted build the Finnhub key is already configured on Bullpen's relay — <strong>you don't need to do
              anything</strong>. If the section says fundamentals are off, that's a relay configuration issue; report it.
            </p>
          ) : (
            <>
              <p>You're running the development build, so the key comes from your own <code>.env.local</code>:</p>
              <ol>
                <li>
                  Go to{" "}
                  <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
                    finnhub.io/register
                  </a>{" "}
                  and sign up (email, or GitHub/Google). The free plan is enough: 60 calls per minute.
                </li>
                <li>The dashboard shows your <strong>API key</strong> on its first page. Copy it.</li>
                <li>
                  Add <code>FINNHUB_KEY=your_key</code> to <code>react-app/.env.local</code> and restart the dev server (the
                  key is read at startup).
                </li>
              </ol>
            </>
          )}
          <p className="sub">ETFs like SPY show very little here — Finnhub has almost no data on funds. That's expected.</p>
        </Section>

        <Section {...sectionProps("phone")} title="Installing on your phone">
          <ul>
            <li>
              <strong>iPhone:</strong> open the app's address in Safari → Share button → <strong>Add to Home Screen</strong>.
            </li>
            <li>
              <strong>Android:</strong> open it in Chrome → ⋮ menu → <strong>Add to Home screen</strong> / <strong>Install app</strong>.
            </li>
          </ul>
          <p>
            The installed app keeps its own settings, so open ☰ → Settings inside it and paste your keys again. Quotes
            refresh every 15 seconds while the app is on screen and pause when it isn't.
          </p>
        </Section>

        <Section {...sectionProps("data")} title="Where the data comes from, and its limits">
          <ul>
            <li>
              <strong>Prices</strong>: Alpaca's free plan uses the IEX exchange feed — real-time, but IEX handles only a
              few percent of US volume, so volume figures are lower than what you'd see on a full feed and prices can
              differ by a cent or two. Fine for learning.
            </li>
            <li>
              <strong>Movers &amp; most active</strong>: Alpaca's screener, refreshed each minute during market hours.
            </li>
            <li>
              <strong>Headquarters</strong>: business address on each company's latest SEC filing, rebuilt quarterly.
              Foreign-domiciled companies show their foreign address and won't appear under a US state.
            </li>
            <li>
              <strong>Fundamentals &amp; logos</strong>: Finnhub.
            </li>
            <li>
              <strong>Rate limit</strong>: 200 API calls per minute per Alpaca account. Normal use is well under that; if
              you see a "rate-limited" banner, wait a minute.
            </li>
          </ul>
        </Section>

        <Section {...sectionProps("glossary")} title="Glossary">
          <dl className="help__dl">
            <dt>Bid / Ask / Spread</dt>
            <dd>
              Highest price a buyer will pay / lowest a seller will take / the gap between them. Wide spreads mean thin
              trading and worse fills.
            </dd>
            <dt>Buying power</dt>
            <dd>How much you can spend right now. It's usually more than your cash because margin is simulated; Bullpen's risk guard keeps you well inside it.</dd>
            <dt>Equity</dt>
            <dd>Cash plus the current value of everything you hold. The number that matters.</dd>
            <dt>Position</dt>
            <dd>Shares you currently own, with the average price you paid and the unrealized gain or loss.</dd>
            <dt>P&amp;L</dt>
            <dd>Profit and loss. Unrealized while you hold; realized once you sell.</dd>
            <dt>Prev close</dt>
            <dd>Yesterday's closing price — the reference point for today's change.</dd>
            <dt>Relative volume</dt>
            <dd>Today's volume divided by the recent average. Above 1× means unusual interest.</dd>
            <dt>52-week range</dt>
            <dd>Lowest and highest prices over the past year, and where today sits between them.</dd>
            <dt>Fractionable</dt>
            <dd>Can be bought in fractions of a share. Bullpen currently trades whole shares.</dd>
            <dt>Shortable</dt>
            <dd>Can be sold before you own it, to bet on a fall. Possible in paper; not something to start with.</dd>
          </dl>
        </Section>

        <Section {...sectionProps("feedback")} title="Reporting a problem or idea">
          <p>
            Use ☰ → Links → <strong>Report feedback</strong> (or{" "}
            <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">
              this link
            </a>
            ). Please include what you tapped, what you expected, what happened, and the <strong>Build</strong> time from
            the footer. Screenshots help enormously.
          </p>
        </Section>
      </div>
    </>
  );
}
