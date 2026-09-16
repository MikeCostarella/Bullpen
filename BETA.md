# Bullpen beta — getting started

Bullpen is a paper-trading app: real market prices, pretend money. Nothing
you do in it can spend a cent. It runs in your browser and installs like an
app on your phone.

**App:** https://mikecostarella.github.io/Bullpen/

## 1. Get free Alpaca paper-trading keys (2 minutes)

1. Go to https://app.alpaca.markets/signup and create an account with an
   email and password. Confirm the verification email.
2. You may be invited to open a real brokerage account (ID, funding, etc.).
   **Skip that** — paper trading works without it.
3. In the dashboard, use the account switcher at the **top-left** to make sure
   **Paper Trading** is selected. The paper dashboard shows a $100,000 balance.
4. On the right side of the paper Overview page, find the **Your API Keys**
   panel. Click **View** if it's collapsed, then **Generate New Keys** (or
   **Regenerate**).
5. Copy both values: the **API Key ID** (starts with `PK`) and the **Secret
   Key**. The secret is shown **once** — copy it now. Lose it? Just regenerate.

## 2. Put the keys in Bullpen

Open the app, tap the **☰ menu** (top-left) → **Settings · Alpaca keys**,
paste both values, tap **Save keys on this device**, then **Test
connection**. You should see your account status and $100,000 of paper
equity.

The keys stay in your browser; they are never stored on a server. They are
paper keys, so even if someone got them they could only place pretend trades.
Fundamentals (market cap, P/E, earnings dates) are already set up on the
hosted app — nothing extra to do.

**Stuck?** The app has a full walkthrough: ☰ → **Help & getting started**,
including what every screen does and a glossary.

## 3. Install it on your phone (optional but nicer)

- **iPhone:** open the link in Safari → Share button → **Add to Home Screen**.
- **Android:** open in Chrome → ⋮ menu → **Add to Home screen** / **Install app**.

Do step 2 again inside the installed app — it keeps its own settings.

## What to try

- **Watch:** add symbols by ticker or company name; tap a row for details.
- **Discover:** today's movers, sectors, the Dow 30, and companies by
  headquarters location (try Mahoning Valley or your own state).
- **Chart** and **Trade:** buy a few shares of something, then check
  **Account** and **Journal**.

## Sending feedback

☰ menu → **Report feedback** opens a GitHub issue form. Please include what
you tapped, what you expected, what happened, and the **Build** time from
the footer (or Settings → About this build). Screenshots help.

Thanks for testing!
