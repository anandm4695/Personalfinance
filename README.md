# ArthaDrishti by Anand Mohta

A comprehensive personal finance dashboard built with React and TypeScript — track every rupee, grow every investment, and hit every goal.

## Features

- **Net Worth Tracker** — Real-time view of assets, liabilities, and wealth growth
- **Investment Portfolio** — Mutual Funds, Stocks, FDs, RDs, PPF, NPS, Bonds, LIC in one place
- **Demat & Stocks** — Holdings with buy/sell lots, split/bonus tracking, live price refresh
- **Credit & Loans** — Credit cards, EMI tracking, outstanding balances, due date alerts
- **Tax Planning** — FY 2025-26 New & Old regime comparison with slab-wise breakdown
- **Budget Control** — Category budgets with over-spend alerts
- **Financial Goals** — Progress tracking with schedule alerts
- **SIP Tracker** — Systematic Investment Plan performance
- **Rental Details** — Rental income, deductions, security deposits
- **Calculators** — SIP, EMI, FIRE, CAGR, FD/RD maturity, Loan vs Invest, Net Worth Projection
- **Multi-profile** — Self / Wife / Daughter / HUF
- **Dark mode + 6 accent palettes + 3 density modes**
- **Cloud sync** via Supabase (optional) with localStorage offline fallback

## Quick Start

```bash
git clone https://github.com/anandm4695/Personalfinance.git
cd Personalfinance
npm install
cp .env.example .env   # add your Supabase credentials
npm start
```

Open [http://localhost:3000](http://localhost:3000). If Supabase is not configured, the app runs in offline/demo mode automatically.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | Optional | Your Supabase project URL — enables cloud sync and auth |
| `REACT_APP_SUPABASE_ANON_KEY` | Optional | Your Supabase anon key |

> Without these variables the app works fully in offline/local mode — data is stored in `localStorage` only.

## Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase_setup.sql` in the Supabase SQL editor
3. Copy **Project URL** and **anon/public key** from **Settings → API** into your `.env`

## Build & Deploy

```bash
# Production build
npm run build

# Deploy to Vercel (one command)
npx vercel --prod
```

**Live URL:** [https://personal-finance-by-anand-mohta.vercel.app](https://personal-finance-by-anand-mohta.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anandm4695/Personalfinance)

## Tech Stack

- **React 18** + **TypeScript**
- **Recharts** for all charts
- **Lucide React** for icons
- **Supabase** for auth + cloud sync
- **Vercel** for deployment
