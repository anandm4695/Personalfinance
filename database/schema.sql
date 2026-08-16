-- ================================================================
-- PERSONAL FINANCE BY ANAND MOHTA — CONSOLIDATED SCHEMA
-- ================================================================
-- Generated 2026-08-04 by merging migrations 01_initial_schema.sql
-- through 89_sip_status_stepup.sql (91 files) into a single file that
-- reflects the FINAL state of every table.
--
-- WHAT THIS FILE IS FOR
--   Run this once, top to bottom, in the Supabase SQL Editor to stand
--   up a brand-new project (fresh demo/test project, disaster
--   recovery, etc.) with the exact schema the app expects — instead
--   of hand-running 91 files in order.
--
-- WHAT THIS FILE IS NOT
--   It does not replace the historical migration files, which are
--   preserved under database/migrations_archive/ for reference. It is
--   also NOT auto-applied anywhere — there is no migration runner in
--   this project; schema changes are still run by hand in the
--   Supabase SQL Editor (see database/README.md).
--
-- IDEMPOTENCY
--   Every statement uses IF NOT EXISTS / IF EXISTS / DROP-then-CREATE
--   guards, so this file is safe to run multiple times, including
--   against a project that already has some or all of these tables.
--   RLS policy names have been standardized to "Users can access own
--   data" across every table (the original migrations used a mix of
--   names — this is a cosmetic normalization only, the auth.uid() =
--   user_id behavior is unchanged).
--
-- KNOWN QUIRKS PRESERVED FROM THE LIVE SCHEMA (not "fixed" here)
--   - ppf_nps.uan: added in migration 07, superseded by account_number
--     for EPF's UAN field in migration 08, but never dropped. Kept for
--     fidelity with the live database.
--   - transactions.type CHECK only allows ('credit','debit') — there
--     is no 'transfer' value even though to_account_id (migration 42)
--     implies transfer support. No migration ever changed this
--     constraint, so it's reproduced as-is.
--   - credit_cards.owner is NOT NULL with no default (migration 04's
--     attempt to add a default was a no-op since the column already
--     existed from migration 01).
--
-- PENDING AT TIME OF WRITING (2026-08-04)
--   Per project notes, migrations 85, 86, 88, and 89 (budget rollover,
--   subscriptions.last_paid_amount, health_insurance.room_rent_limit,
--   sips.status/step_up_pct) may not yet be applied to the live or
--   demo Supabase projects. This file includes them. Running this
--   file against live/demo will safely add anything missing — it will
--   not touch or duplicate anything already present.
-- ================================================================


-- ================================================================
-- 1. PROFILES & SETTINGS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id         uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  name            text,
  fy              text DEFAULT '2025-26',
  regime          text DEFAULT 'new',
  savings_target  numeric DEFAULT 20,
  updated_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.profiles;
CREATE POLICY "Users can access own data" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id             uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  dark_mode           boolean DEFAULT false,
  accent_key          text DEFAULT 'blue',
  density             text DEFAULT 'normal',
  sidebar_nav         boolean DEFAULT true,
  radius_key          text DEFAULT 'modern',
  font_key            text DEFAULT 'inter',
  bg_style            text DEFAULT 'plain',
  anim_speed          text DEFAULT 'smooth',
  chart_style         text DEFAULT 'monotone',
  master_data         jsonb,                                 -- 05
  email_enabled       boolean DEFAULT false,                 -- 29
  email_frequency     text DEFAULT 'weekly',                 -- 29
  email_day           integer DEFAULT 1,                     -- 29
  email_hour          integer DEFAULT 8,                     -- 29
  email_address       text DEFAULT '',                       -- 29
  gemini_api_key      text DEFAULT '',                       -- 30
  dismissed_alerts    jsonb DEFAULT '{}'::jsonb,              -- 36
  from_email          text DEFAULT NULL,                     -- 40
  gold_price_per_gram numeric DEFAULT 7200,                  -- 63
  last_email_sent_at  timestamp with time zone,               -- 92
  last_email_status   text,                                  -- 92: 'sent' | 'failed'
  last_email_error    text,                                  -- 92
  updated_at          timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.user_settings;
CREATE POLICY "Users can access own data" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);


-- ================================================================
-- 2. BANK & DEMAT MASTER
-- ================================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  bank_name        text NOT NULL,
  account_number   text,
  balance          numeric DEFAULT 0,
  account_type     text DEFAULT 'Savings',                   -- 62
  nominee          text DEFAULT '',                          -- 69
  nominee_relation text DEFAULT '',                           -- 69
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.bank_accounts;
CREATE POLICY "Users can access own data" ON public.bank_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts (user_id);


CREATE TABLE IF NOT EXISTS public.demat_accounts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  broker           text NOT NULL,
  dp_id            text,
  client_id        text,
  nominee          text DEFAULT '',                          -- 69
  nominee_relation text DEFAULT '',                           -- 69
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.demat_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.demat_accounts;
CREATE POLICY "Users can access own data" ON public.demat_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_demat_accounts_user ON public.demat_accounts (user_id);


-- ================================================================
-- 3. TRANSACTIONS (depends on bank_accounts)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users NOT NULL,
  owner                   text NOT NULL,
  date                    date NOT NULL,
  account_id              uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  amount                  numeric NOT NULL,
  type                    text CHECK (type IN ('credit', 'debit')),
  category                text,
  note                    text,
  narration               text,                              -- 41 (narration)
  to_account_id           uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL, -- 42
  linked_type             text,                               -- 43
  linked_id               text,                               -- 43
  reference_number        text,                               -- 46
  linked_principal_amount numeric,                            -- 82
  statement_balance       numeric,                             -- 93 (bank-stated closing balance from CSV)
  created_at              timestamp with time zone DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.transactions;
CREATE POLICY "Users can access own data" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions (user_id, type);


-- ================================================================
-- 4. MARKET INVESTMENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.mutual_funds (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  scheme           text NOT NULL,
  type             text,
  units            numeric DEFAULT 0,
  current_nav      numeric DEFAULT 0,
  invested         numeric DEFAULT 0,
  folio_number     text,                                     -- 50
  buy_nav          numeric DEFAULT 0,                         -- 50
  buy_date         date,                                      -- 50
  mf_code          text,                                      -- 50
  mf_type          text,                                      -- 51
  nominee          text DEFAULT '',                           -- 69
  nominee_relation text DEFAULT '',                            -- 69
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.mutual_funds;
CREATE POLICY "Users can access own data" ON public.mutual_funds
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mutual_funds_user ON public.mutual_funds (user_id);


CREATE TABLE IF NOT EXISTS public.stocks (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  symbol        text NOT NULL,
  demat_id      uuid REFERENCES public.demat_accounts(id) ON DELETE SET NULL,
  qty           numeric DEFAULT 0,
  current_price numeric DEFAULT 0,
  avg_price     numeric DEFAULT 0,
  exchange      text NOT NULL DEFAULT 'NSE',                  -- 11
  buy_date      date,                                         -- 11
  sector        text,                                         -- 13
  market_cap    numeric,                                      -- 13
  created_at    timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stocks_exchange_check'
  ) THEN
    ALTER TABLE public.stocks ADD CONSTRAINT stocks_exchange_check CHECK (exchange IN ('NSE', 'BSE')); -- 77
  END IF;
END $$;

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.stocks;
CREATE POLICY "Users can access own data" ON public.stocks
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stocks_user ON public.stocks (user_id);


-- id is text (not uuid) because the app generates "ss-<timestamp>" ids
CREATE TABLE IF NOT EXISTS public.stock_sells (
  id         text NOT NULL PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  symbol     text NOT NULL,
  exchange   text NOT NULL DEFAULT 'NSE',                     -- default+NOT NULL set in 77
  qty        numeric DEFAULT 0,
  buy_price  numeric DEFAULT 0,
  buy_date   date,
  sell_price numeric DEFAULT 0,
  sell_date  date,
  broker     text,
  demat_id   text,
  profit     numeric DEFAULT 0,
  sector     text,                                            -- 13
  market_cap numeric,                                         -- 13
  created_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_sells_exchange_check'
  ) THEN
    ALTER TABLE public.stock_sells ADD CONSTRAINT stock_sells_exchange_check CHECK (exchange IN ('NSE', 'BSE')); -- 77
  END IF;
END $$;

ALTER TABLE public.stock_sells ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.stock_sells;
CREATE POLICY "Users can access own data" ON public.stock_sells
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stock_sells_user ON public.stock_sells (user_id);


CREATE TABLE IF NOT EXISTS public.mf_sells (
  id         text NOT NULL PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  scheme     text,
  units      numeric DEFAULT 0,
  buy_nav    numeric DEFAULT 0,
  sell_nav   numeric DEFAULT 0,
  buy_date   date,
  sell_date  date,
  profit     numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  category   text                                                 -- 94 (Equity/Debt, for capital-gains tax classification)
);

ALTER TABLE public.mf_sells ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.mf_sells;
CREATE POLICY "Users can access own data" ON public.mf_sells
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mf_sells_user ON public.mf_sells (user_id);


CREATE TABLE IF NOT EXISTS public.corporate_actions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL DEFAULT 'self',
  symbol        text NOT NULL,
  exchange      text NOT NULL DEFAULT 'NSE',
  action_type   text NOT NULL CHECK (action_type IN ('split', 'bonus')),
  ratio_n       numeric NOT NULL,
  ratio_m       numeric NOT NULL,
  action_date   date,
  old_qty       numeric,
  new_qty       numeric,
  old_avg_price numeric,
  new_avg_price numeric,
  created_at    timestamp with time zone DEFAULT now()
);

ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.corporate_actions;
CREATE POLICY "Users can access own data" ON public.corporate_actions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_user   ON public.corporate_actions (user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_symbol ON public.corporate_actions (symbol, exchange);


CREATE TABLE IF NOT EXISTS public.watchlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner       text NOT NULL DEFAULT 'self',
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#6366f1',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.watchlists;
CREATE POLICY "Users can access own data" ON public.watchlists
  FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner        text NOT NULL DEFAULT 'self',
  watchlist_id uuid NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  symbol       text NOT NULL,
  exchange     text NOT NULL DEFAULT 'NSE',
  target_price numeric(14,2),
  notes        text,
  added_on     date DEFAULT CURRENT_DATE
);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.watchlist_items;
CREATE POLICY "Users can access own data" ON public.watchlist_items
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items (watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id      ON public.watchlist_items (user_id);


CREATE TABLE IF NOT EXISTS public.dividends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  owner        text NOT NULL DEFAULT 'self',
  symbol       text,
  fund_name    text,
  type         text NOT NULL DEFAULT 'stock',                 -- 'stock' | 'mf'
  amount       numeric NOT NULL DEFAULT 0,
  tds          numeric DEFAULT 0,
  record_date  date,
  payment_date date,
  fy           text,
  note         text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.dividends;
CREATE POLICY "Users can access own data" ON public.dividends
  FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.sips (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            uuid REFERENCES auth.users NOT NULL,
  owner              text NOT NULL DEFAULT 'self',
  scheme             text NOT NULL,
  fund_type          text,
  amount             numeric DEFAULT 0,
  frequency          text DEFAULT 'monthly',
  start_date         date,
  total_installments numeric,
  broker             text DEFAULT NULL,                       -- 41 (broker)
  status             text DEFAULT 'active',                   -- 89
  step_up_pct        numeric DEFAULT 0,                       -- 89
  created_at         timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sips_status_check'
  ) THEN
    ALTER TABLE public.sips ADD CONSTRAINT sips_status_check
      CHECK (status IN ('active', 'paused', 'stopped'));       -- 89
  END IF;
END $$;

ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.sips;
CREATE POLICY "Users can access own data" ON public.sips
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sips_user ON public.sips (user_id);


-- ================================================================
-- 5. FIXED INCOME, SAVINGS & GOLD
-- ================================================================

CREATE TABLE IF NOT EXISTS public.fixed_deposits (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  bank             text,
  principal        numeric DEFAULT 0,
  rate             numeric DEFAULT 0,
  years            numeric,
  start_date       date,
  maturity_date    date,
  nominee          text DEFAULT '',                           -- 69
  nominee_relation text DEFAULT '',                             -- 69
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.fixed_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.fixed_deposits;
CREATE POLICY "Users can access own data" ON public.fixed_deposits
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fixed_deposits_user ON public.fixed_deposits (user_id);


CREATE TABLE IF NOT EXISTS public.recurring_deposits (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  bank             text,
  monthly          numeric DEFAULT 0,
  rate             numeric DEFAULT 0,
  tenure_months    numeric,
  start_date       date,
  nominee          text DEFAULT '',                           -- 69
  nominee_relation text DEFAULT '',                             -- 69
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.recurring_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.recurring_deposits;
CREATE POLICY "Users can access own data" ON public.recurring_deposits
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_deposits_user ON public.recurring_deposits (user_id);


CREATE TABLE IF NOT EXISTS public.bonds (
  id                         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                    uuid REFERENCES auth.users NOT NULL,
  owner                      text NOT NULL,
  name                       text NOT NULL,
  type                       text,
  face_value                 numeric DEFAULT 0,
  coupon                     numeric DEFAULT 0,
  maturity_date              date,
  issuer                     text,                             -- 27
  order_id                   text,                              -- 26
  isin                       text,                              -- 26
  security_name              text,                              -- 26
  security_nature            text,                              -- 26
  ytm_rate                   numeric,                           -- 26
  buyer_name                 text,                              -- 26
  seller_name                text,                              -- 26
  face_value_per_unit        numeric,                           -- 26
  number_of_units            numeric,                           -- 26
  principal_repayment        text,                              -- 26
  interest_payment_date      text,                              -- 26
  order_date                 text,                              -- 26
  clean_price_per_unit       numeric,                           -- 26
  accrued_interest_per_unit  numeric,                           -- 26
  total_principal_amount     numeric,                           -- 26
  total_accrued_interest     numeric,                           -- 26
  total_consideration        numeric,                           -- 26
  brokerage                  numeric DEFAULT 0,                 -- 26
  stamp_duty                 numeric DEFAULT 0,                 -- 26
  total_investment_amount    numeric,                           -- 26
  nominee                    text DEFAULT '',                   -- 69
  nominee_relation           text DEFAULT '',                    -- 69
  created_at                 timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bonds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.bonds;
CREATE POLICY "Users can access own data" ON public.bonds
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bonds_user ON public.bonds (user_id);


-- Shared table for PPF, NPS, and EPF accounts, discriminated by `type`.
-- EPF-specific fields: uan (superseded, see header note), establishments
-- (service/employment history). NPS-specific fields: pran, tier, epf_type,
-- employer_contribution.
CREATE TABLE IF NOT EXISTS public.ppf_nps (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES auth.users NOT NULL,
  owner                  text NOT NULL,
  type                   text,
  bank                   text,
  balance                numeric DEFAULT 0,
  open_date              date,
  this_year_contribution numeric DEFAULT 0,
  transactions           jsonb DEFAULT '[]'::jsonb,             -- 06/08/09/10
  account_number         text,                                  -- 06/08/09/10, also 55
  uan                    text,                                  -- 07 (superseded, kept for fidelity)
  establishments         jsonb DEFAULT '[]'::jsonb,              -- 28, also 55
  pran                   text,                                  -- 54
  tier                   text DEFAULT 'I',                      -- 54
  epf_type               text,                                  -- 55
  employer_contribution  numeric DEFAULT 0,                     -- 55
  nominee                text DEFAULT '',                        -- 69
  nominee_relation       text DEFAULT '',                         -- 69
  created_at             timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

ALTER TABLE public.ppf_nps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.ppf_nps;
CREATE POLICY "Users can access own data" ON public.ppf_nps
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ppf_nps_user ON public.ppf_nps (user_id);


CREATE TABLE IF NOT EXISTS public.gold_holdings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  name             text,
  type             text NOT NULL DEFAULT 'physical',           -- physical, sgb, digital, etf, mf
  grams            numeric NOT NULL DEFAULT 0,
  purchase_price   numeric DEFAULT 0,
  purchase_date    date,
  maturity_date    date,
  interest_rate    numeric DEFAULT 2.5,
  purity           text DEFAULT '24K',
  nominee          text DEFAULT '',                             -- 69
  nominee_relation text DEFAULT '',                               -- 69
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.gold_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.gold_holdings;
CREATE POLICY "Users can access own data" ON public.gold_holdings
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gold_holdings_user_id ON public.gold_holdings (user_id);  -- 70


CREATE TABLE IF NOT EXISTS public.govt_schemes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_type         text NOT NULL DEFAULT 'APY',              -- APY|SSY|PMJJBY|PMSBY|PMKISAN|NPS_LITE|SCSS|NSC|KVP|POST_MIS|RBI_BOND
  scheme_name         text NOT NULL DEFAULT '',
  account_number      text DEFAULT '',
  member_name         text DEFAULT '',
  owner               text NOT NULL DEFAULT 'self',
  start_date          date,
  maturity_date       date,
  contribution_amount numeric DEFAULT 0,
  frequency           text DEFAULT 'annual',
  current_balance     numeric DEFAULT 0,
  interest_rate       numeric DEFAULT 0,
  pension_amount      numeric DEFAULT 0,
  coverage_amount     numeric DEFAULT 0,
  premium             numeric DEFAULT 0,
  nominee             text DEFAULT '',
  nominee_relation    text DEFAULT '',
  bank_account        text DEFAULT '',
  notes               text DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.govt_schemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.govt_schemes;
CREATE POLICY "Users can access own data" ON public.govt_schemes
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_govt_schemes_user_id ON public.govt_schemes (user_id);
CREATE INDEX IF NOT EXISTS idx_govt_schemes_type    ON public.govt_schemes (scheme_type);


-- ================================================================
-- 6. INSURANCE & INVESTMENT PLANS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lic_policies (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            uuid REFERENCES auth.users NOT NULL,
  owner              text NOT NULL DEFAULT 'self',
  plan_name          text,
  policy_number      text,
  sum_assured        numeric DEFAULT 0,
  annual_premium     numeric DEFAULT 0,
  premium_paid       numeric DEFAULT 0,
  maturity_date      date,                                     -- 14
  commencement_date  date,                                     -- 18
  transactions       jsonb DEFAULT '[]'::jsonb,                 -- 18
  policy_term        integer,                                  -- 19
  nominee            text DEFAULT '',                            -- 69
  nominee_relation   text DEFAULT '',                             -- 69
  created_at         timestamp with time zone DEFAULT now()
);

ALTER TABLE public.lic_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.lic_policies;
CREATE POLICY "Users can access own data" ON public.lic_policies
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lic_policies_user ON public.lic_policies (user_id);


CREATE TABLE IF NOT EXISTS public.term_plans (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users NOT NULL,
  owner               text NOT NULL DEFAULT 'self',
  plan_name           text,
  insurer             text,
  cover_amount        numeric DEFAULT 0,
  annual_premium      numeric DEFAULT 0,
  premium_paid        numeric DEFAULT 0,
  term                numeric,
  start_date          date,
  maturity_date       date,
  expiry_date         date,                                    -- 14
  premium_paying_term integer,                                 -- 20
  transactions        jsonb DEFAULT '[]'::jsonb,                -- 21
  nominee             text DEFAULT '',                           -- 69
  nominee_relation    text DEFAULT '',                            -- 69
  created_at          timestamp with time zone DEFAULT now()
);

ALTER TABLE public.term_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.term_plans;
CREATE POLICY "Users can access own data" ON public.term_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_term_plans_user ON public.term_plans (user_id);


CREATE TABLE IF NOT EXISTS public.investment_plans (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  uuid REFERENCES auth.users NOT NULL,
  owner                    text NOT NULL DEFAULT 'self',
  insurer                  text NOT NULL,
  plan_name                text NOT NULL,
  policy_number            text,
  sum_assured              numeric DEFAULT 0,
  annual_premium           numeric DEFAULT 0,
  premium_paid             numeric DEFAULT 0,
  policy_term              integer DEFAULT 0,
  premium_paying_term      integer DEFAULT 0,
  commencement_date        date,
  maturity_date            date,
  expected_maturity_amount numeric DEFAULT 0,
  transactions             jsonb DEFAULT '[]'::jsonb,
  nominee                  text DEFAULT '',                     -- 69
  nominee_relation         text DEFAULT '',                      -- 69
  created_at               timestamp with time zone DEFAULT now()
);

ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.investment_plans;
CREATE POLICY "Users can access own data" ON public.investment_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_investment_plans_user ON public.investment_plans (user_id);

COMMENT ON TABLE public.investment_plans IS 'Endowment plans, ULIPs, and other premium-paying investment schemes';


CREATE TABLE IF NOT EXISTS public.health_insurance (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurer              text NOT NULL DEFAULT '',
  policy_name          text NOT NULL DEFAULT '',
  policy_number        text NOT NULL DEFAULT '',
  policy_type          text NOT NULL DEFAULT 'family_floater', -- family_floater|individual|corporate|top_up|super_top_up|critical_illness
  owner                text NOT NULL DEFAULT 'self',
  insured_members      jsonb NOT NULL DEFAULT '[]',            -- [{ name, relation, dob }]
  sum_insured          numeric NOT NULL DEFAULT 0,
  premium              numeric NOT NULL DEFAULT 0,
  premium_frequency    text NOT NULL DEFAULT 'annual',         -- monthly|quarterly|semi_annual|annual
  start_date           date,
  renewal_date         date,
  hospital_network     text DEFAULT '',
  cashless             boolean NOT NULL DEFAULT true,
  pre_existing_covered boolean NOT NULL DEFAULT false,
  waiting_period_years numeric DEFAULT 0,
  no_claim_bonus       numeric DEFAULT 0,
  claims               jsonb NOT NULL DEFAULT '[]',            -- [{ date, amount, description, settled }]
  room_rent_limit      text DEFAULT '',                        -- 88
  notes                text DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.health_insurance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.health_insurance;
CREATE POLICY "Users can access own data" ON public.health_insurance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_insurance_user_id ON public.health_insurance (user_id);
CREATE INDEX IF NOT EXISTS idx_health_insurance_renewal ON public.health_insurance (renewal_date);


-- ================================================================
-- 7. LIABILITIES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.prepaid_cards (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users NOT NULL,
  owner                 text NOT NULL,
  card_name             text NOT NULL,
  card_type             text,
  last4                 text,
  transactions          jsonb DEFAULT '[]'::jsonb,
  status                text DEFAULT 'active',                 -- 02
  closed_date           date,                                  -- 02
  expiry_date           date,                                  -- 80
  low_balance_threshold numeric(12,2),                         -- 80
  created_at            timestamp with time zone DEFAULT now()
);

ALTER TABLE public.prepaid_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.prepaid_cards;
CREATE POLICY "Users can access own data" ON public.prepaid_cards
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prepaid_cards_user ON public.prepaid_cards (user_id);


CREATE TABLE IF NOT EXISTS public.credit_cards (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users NOT NULL,
  owner                 text NOT NULL,
  issuer                text NOT NULL,
  network               text,
  last4                 text,
  card_limit            numeric DEFAULT 0,
  outstanding           numeric DEFAULT 0,
  bill_date             text,
  due_day               text,
  annual_fee            numeric DEFAULT 0,
  helpline              text,
  status                text DEFAULT 'active',                 -- 02
  closed_date           date,                                  -- 02
  transactions          jsonb DEFAULT '[]'::jsonb,              -- 03
  waiver_info           text,                                  -- 03
  shared_group          text,                                  -- 37
  shared_group_limit    numeric DEFAULT 0,                     -- 37
  fee_month             integer,                                -- 44
  fee_day               integer,                                -- 44
  auto_pay              boolean DEFAULT false,                 -- 79
  reward_points_balance numeric DEFAULT 0,                     -- 79
  reward_point_value    numeric DEFAULT 0,                     -- 79
  created_at            timestamp with time zone DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.credit_cards;
CREATE POLICY "Users can access own data" ON public.credit_cards
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards (user_id);

COMMENT ON COLUMN public.credit_cards.shared_group       IS 'Pool name for cards sharing a single credit limit (e.g. "HDFC Pool")';
COMMENT ON COLUMN public.credit_cards.shared_group_limit IS 'Total shared pool limit — set on any one card in the group; app takes the max across the group';
COMMENT ON COLUMN public.credit_cards.fee_month IS 'Month (1–12) when annual fee is deducted each year';
COMMENT ON COLUMN public.credit_cards.fee_day   IS 'Day of month (1–31) when annual fee is deducted';
COMMENT ON COLUMN public.credit_cards.auto_pay IS 'When true, due-date urgency reminders are muted for this card';
COMMENT ON COLUMN public.credit_cards.reward_points_balance IS 'Current reward/loyalty points balance';
COMMENT ON COLUMN public.credit_cards.reward_point_value IS 'Redemption value per point (₹) — used to estimate redeemable value';


CREATE TABLE IF NOT EXISTS public.loans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users NOT NULL,
  owner           text NOT NULL,
  lender_borrower text NOT NULL,
  type            text,                                        -- Car, Home, Personal, etc.
  is_lent         boolean DEFAULT false,                       -- true if user lent money to others
  principal       numeric DEFAULT 0,
  outstanding     numeric DEFAULT 0,
  emi             numeric DEFAULT 0,
  rate            numeric DEFAULT 0,
  months_remaining numeric,
  due_day         integer CHECK (due_day BETWEEN 1 AND 31),    -- 81
  note            text,                                        -- 81
  given_date      date,                                        -- 81
  due_date        date,                                        -- 81
  payments        jsonb DEFAULT '[]'::jsonb,                    -- 83
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.loans;
CREATE POLICY "Users can access own data" ON public.loans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans (user_id);


CREATE TABLE IF NOT EXISTS public.informal_loans (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  direction  text CHECK (direction IN ('borrowed', 'lent')) NOT NULL,
  person     text NOT NULL,
  note       text,
  tranches   jsonb DEFAULT '[]'::jsonb,
  payments   jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.informal_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.informal_loans;
CREATE POLICY "Users can access own data" ON public.informal_loans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_informal_loans_user ON public.informal_loans (user_id);


CREATE TABLE IF NOT EXISTS public.credit_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      integer NOT NULL CHECK (score BETWEEN 300 AND 900),
  bureau     text NOT NULL DEFAULT 'CIBIL',                    -- CIBIL|Experian|CRIF|Equifax
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  owner      text NOT NULL DEFAULT 'self',
  source     text DEFAULT 'manual',                            -- manual|oneScore|paisa bazaar|bank_app
  notes      text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.credit_scores;
CREATE POLICY "Users can access own data" ON public.credit_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON public.credit_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_date    ON public.credit_scores (check_date);


-- ================================================================
-- 8. REAL ESTATE
-- ================================================================

CREATE TABLE IF NOT EXISTS public.real_estate_properties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner                 text NOT NULL DEFAULT 'self',
  name                  text NOT NULL,
  type                  text NOT NULL DEFAULT 'residential',
  status                text NOT NULL DEFAULT 'owned',
  location              text,
  developer_name        text,
  seller_name           text,
  rera_number           text,
  area_sqft             numeric(14,2),
  purchase_date         date,
  registration_date     date,
  possession_date       date,
  agreement_value       numeric(14,2),
  stamp_duty            numeric(14,2),
  tds_value             numeric(14,2),
  market_value          numeric(14,2),
  sale_date             date,
  sale_price            numeric(14,2),
  sale_stamp_duty       numeric(14,2),
  sale_tds              numeric(14,2),
  nominee               text DEFAULT '',                       -- 69
  nominee_relation      text DEFAULT '',                        -- 69
  owners                jsonb NOT NULL DEFAULT '[]'::jsonb,     -- 74 — [{id, sharePct}]
  tds_amount            numeric(14,2),                          -- 75 — total TDS liability (tds_value = paid so far)
  agreement_value_paid  numeric(14,2),                          -- 76
  stamp_duty_paid       numeric(14,2),                          -- 76
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_properties;
CREATE POLICY "Users can access own data" ON public.real_estate_properties
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_properties_user_id ON public.real_estate_properties (user_id);


CREATE TABLE IF NOT EXISTS public.real_estate_demands (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner        text NOT NULL DEFAULT 'self',
  property_id  uuid NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
  demand_date  date,
  due_date     date,
  milestone    text,
  amount       numeric(14,2),
  gst_amount   numeric(14,2),
  total_amount numeric(14,2),
  status       text NOT NULL DEFAULT 'pending',
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_demands;
CREATE POLICY "Users can access own data" ON public.real_estate_demands
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_demands_user_id     ON public.real_estate_demands (user_id);
CREATE INDEX IF NOT EXISTS idx_re_demands_property_id ON public.real_estate_demands (property_id);


CREATE TABLE IF NOT EXISTS public.real_estate_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner            text NOT NULL DEFAULT 'self',
  property_id      uuid NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
  demand_id        uuid REFERENCES public.real_estate_demands(id) ON DELETE SET NULL,
  payment_date     date,
  amount           numeric(14,2),
  payment_mode     text DEFAULT 'NEFT',
  reference_number text,
  note             text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_payments;
CREATE POLICY "Users can access own data" ON public.real_estate_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_payments_user_id     ON public.real_estate_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_re_payments_property_id ON public.real_estate_payments (property_id);
CREATE INDEX IF NOT EXISTS idx_re_payments_demand_id   ON public.real_estate_payments (demand_id);


-- ================================================================
-- 9. VEHICLES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner                      text NOT NULL DEFAULT 'self',

  vehicle_type               text NOT NULL DEFAULT 'two-wheeler', -- two-wheeler|four-wheeler|commercial
  make                       text NOT NULL,
  model                      text NOT NULL,
  year                       integer,
  color                      text,
  fuel_type                  text DEFAULT 'petrol',              -- petrol|diesel|electric|cng|hybrid

  registration_number        text,
  chassis_number             text,
  engine_number              text,

  purchase_date              date,
  purchase_price             numeric(14,2),
  current_value              numeric(14,2),

  insurance_expiry           date,
  puc_expiry                 date,

  -- [{id, date, type, description, cost, odometer, serviceCenter, notes}]
  service_history            jsonb NOT NULL DEFAULT '[]'::jsonb,

  rc_document_url            text,                                -- 56
  insurance_policy_url       text,                                -- 56
  puc_certificate_url        text,                                -- 56

  nominee                    text DEFAULT '',                     -- 69
  nominee_relation           text DEFAULT '',                      -- 69

  next_service_due_date      date,                                -- 72
  next_service_due_odometer  numeric(12,2),                       -- 72

  purchase_basic_cost        numeric(14,2),                       -- 73
  purchase_cgst_amount       numeric(14,2),                       -- 73
  purchase_sgst_amount       numeric(14,2),                       -- 73
  rto_charges                numeric(14,2),                       -- 73
  accessories_charges        numeric(14,2),                       -- 73
  -- [{id, policyType, insurer, policyNumber, tenure, fromDate, toDate, basicCost, cgstAmount, sgstAmount, totalPremium, notes}]
  insurance_history          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 73

  current_odometer           numeric(12,2),                       -- 78

  notes                      text,
  created_at                 timestamptz DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.vehicles;
CREATE POLICY "Users can access own data" ON public.vehicles
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles (user_id);


-- ================================================================
-- 10. RENTAL PROPERTIES (landlord "out" / tenant "in", discriminated
--     by property_type)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.rental_properties (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES auth.users NOT NULL,
  owner                  text NOT NULL DEFAULT 'self',
  property_type          text CHECK (property_type IN ('out', 'in')) NOT NULL DEFAULT 'out',
  property_name          text NOT NULL,
  address                text,
  monthly_rent           numeric DEFAULT 0,
  security_deposit       numeric DEFAULT 0,
  tenant_name            text,
  landlord_name          text,
  lease_start            date,
  lease_end              date,
  is_active              boolean DEFAULT true,
  receipts               jsonb DEFAULT '[]'::jsonb,
  payments               jsonb DEFAULT '[]'::jsonb,
  deposit_deductions     jsonb DEFAULT '[]'::jsonb,
  deposit_returned       numeric DEFAULT 0,
  tenants                jsonb DEFAULT '[]'::jsonb,              -- 15
  tenant_phone           text,                                  -- 15
  agreement_start        date,                                  -- 15
  agreement_end          date,                                  -- 15
  property_type_detail   text,                                  -- 15
  municipal_tax          numeric DEFAULT 0,                     -- 15
  landlords              jsonb DEFAULT '[]'::jsonb,              -- 15
  landlord_phone         text,                                  -- 15
  landlord_pan           text,                                  -- 15
  deposit_paid_date      date,                                  -- 16
  deposit_received_date  date,                                  -- 16
  deposit_transactions   jsonb DEFAULT '[]'::jsonb,              -- 23
  due_day                integer DEFAULT 5,                     -- 25
  escalation_tiers       jsonb DEFAULT '[]'::jsonb,              -- 39
  property_value         numeric DEFAULT 0,                     -- 45
  created_at             timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.rental_properties;
CREATE POLICY "Users can access own data" ON public.rental_properties
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rental_properties_user ON public.rental_properties (user_id);

COMMENT ON COLUMN public.rental_properties.due_day IS 'The day of the month when rent is due (e.g. 5 for the 5th)';
COMMENT ON COLUMN public.rental_properties.deposit_transactions
  IS 'Ledger of partial security deposit payments/receipts with date, amount, and note per entry';


-- ================================================================
-- 11. PLANNING & GOALS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users NOT NULL,
  owner          text NOT NULL,
  name           text NOT NULL,
  category       text,
  target_amount  numeric DEFAULT 0,
  current_amount numeric DEFAULT 0,
  priority       text CHECK (priority IN ('Low', 'Medium', 'High')),
  start_date     date,
  target_date    date,
  created_at     timestamp with time zone DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.goals;
CREATE POLICY "Users can access own data" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id);


CREATE TABLE IF NOT EXISTS public.budgets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  category      text NOT NULL,
  monthly_limit numeric DEFAULT 0,
  budget_month  text,                                          -- 35 — NULL = global/template budget
  rollover      boolean NOT NULL DEFAULT false,                -- 85
  created_at    timestamp with time zone DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.budgets;
CREATE POLICY "Users can access own data" ON public.budgets
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets (user_id);

COMMENT ON COLUMN public.budgets.rollover IS 'When true, unused budget from the previous month (an explicit record for the same category+owner) carries forward into this month''s effective limit.';


CREATE TABLE IF NOT EXISTS public.subscriptions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL,
  name             text NOT NULL,
  category         text,
  amount           numeric DEFAULT 0,
  cycle            text CHECK (cycle IN ('monthly', 'quarterly', 'yearly')),
  renewal_date     date,
  paused           boolean DEFAULT false,
  remark           text,                                        -- 17
  website          text,                                        -- 47
  last_paid_amount numeric,                                     -- 86
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.subscriptions;
CREATE POLICY "Users can access own data" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);


CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  name       text NOT NULL,
  category   text NOT NULL,
  amount     numeric NOT NULL DEFAULT 0,
  frequency  text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'weekly')),
  due_day    integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  start_date date NOT NULL,
  end_date   date,
  account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  is_active  boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.recurring_expenses;
CREATE POLICY "Users can access own data" ON public.recurring_expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recurring_expenses_user_idx ON public.recurring_expenses (user_id);

COMMENT ON TABLE public.recurring_expenses IS 'List of fixed/recurring expenses (rent, maid, insurance, etc.) with due dates and ranges.';


CREATE TABLE IF NOT EXISTS public.reminders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  title         text NOT NULL,
  reminder_date date,
  priority      text,
  owner         text DEFAULT 'self',                            -- 31
  amount        numeric DEFAULT NULL,                            -- 31
  note          text DEFAULT NULL,                                -- 31
  category      text DEFAULT 'Reminder',                        -- 38
  created_at    timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.reminders;
CREATE POLICY "Users can access own data" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_user_date ON public.reminders (user_id, reminder_date);


CREATE TABLE IF NOT EXISTS public.income_entries (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  date       date NOT NULL,
  amount     numeric NOT NULL DEFAULT 0,
  source     text,                                              -- e.g. Salary, Freelance, Dividend, Bonus
  category   text,                                              -- e.g. active, passive
  note       text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.income_entries;
CREATE POLICY "Users can access own data" ON public.income_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS income_entries_user_date_idx ON public.income_entries (user_id, date DESC);

COMMENT ON TABLE public.income_entries IS 'Explicit income ledger — salary, freelance, bonus, dividend entries per user';


CREATE TABLE IF NOT EXISTS public.life_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) NOT NULL,
  owner          text NOT NULL DEFAULT 'self',
  name           text NOT NULL,
  type           text NOT NULL DEFAULT 'other',                 -- education|home|car|wedding|vacation|baby|retirement|other
  target_date    date,
  estimated_cost numeric DEFAULT 0,
  current_saved  numeric DEFAULT 0,
  priority       text DEFAULT 'medium',                          -- high|medium|low
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.life_events;
CREATE POLICY "Users can access own data" ON public.life_events
  FOR ALL USING (auth.uid() = user_id);


-- ================================================================
-- 12. BILLS (depends on bank_accounts)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.bill_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        text NOT NULL DEFAULT 'electricity',          -- electricity|gas|water|broadband|mobile|cable_tv|ott|maintenance|other
  provider        text NOT NULL DEFAULT '',
  account_number  text DEFAULT '',
  nickname        text DEFAULT '',
  amount          numeric NOT NULL DEFAULT 0,                   -- typical/expected amount
  due_day         integer CHECK (due_day BETWEEN 1 AND 31),
  auto_pay        boolean NOT NULL DEFAULT false,
  bank_account_id uuid,
  owner           text NOT NULL DEFAULT 'self',
  notes           text DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bill_payments DROP CONSTRAINT IF EXISTS bill_payments_bank_account_id_fkey;
ALTER TABLE public.bill_payments
  ADD CONSTRAINT bill_payments_bank_account_id_fkey
  FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL; -- 71

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.bill_payments;
CREATE POLICY "Users can access own data" ON public.bill_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_user_id ON public.bill_payments (user_id);


CREATE TABLE IF NOT EXISTS public.bill_payment_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id        uuid NOT NULL REFERENCES public.bill_payments(id) ON DELETE CASCADE,
  paid_date      date NOT NULL,
  amount         numeric NOT NULL DEFAULT 0,
  units_consumed numeric,                                       -- electricity/gas — kWh / cubic meters
  payment_method text DEFAULT '',                                -- UPI|NEFT|auto-debit|cash
  receipt_number text DEFAULT '',
  notes          text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bill_payment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.bill_payment_history;
CREATE POLICY "Users can access own data" ON public.bill_payment_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bill_payment_history_user_id ON public.bill_payment_history (user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_history_bill_id ON public.bill_payment_history (bill_id);


-- ================================================================
-- 13. TAX
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tax_payments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  date       date,
  type       text,                                              -- TDS, Advance Tax, Self-Assessment, Professional Tax
  amount     numeric DEFAULT 0,
  note       text,
  fy         text,                                              -- e.g. "2026-27" — added because TaxFilingHelperTab.tsx
                                                                  -- and TaxToolsTab.tsx both filter payments by `t.fy === fy`,
                                                                  -- but the column never existed, so every payment ever
                                                                  -- recorded was invisible to the advance-tax-paid trackers
                                                                  -- on both tabs. ALTER TABLE below applies this to an
                                                                  -- existing (already-created) tax_payments table.
  created_at timestamp with time zone DEFAULT now()
);

-- Idempotent — safe to run against an existing tax_payments table that
-- predates the `fy` column above.
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS fy text;

ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.tax_payments;
CREATE POLICY "Users can access own data" ON public.tax_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tax_payments_user ON public.tax_payments (user_id);

COMMENT ON TABLE public.tax_payments IS 'Tax payment log for TDS, advance tax, self-assessment, and professional tax entries';


CREATE TABLE IF NOT EXISTS public.form_26as (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users NOT NULL,
  owner           text NOT NULL DEFAULT 'self',
  fy              text,
  deductor        text,
  tan             text,
  section         text,
  date_of_payment date,
  amount          numeric DEFAULT 0,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.form_26as ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.form_26as;
CREATE POLICY "Users can access own data" ON public.form_26as
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_form_26as_user ON public.form_26as (user_id);

COMMENT ON TABLE public.form_26as IS 'Manually-entered Form 26AS line items (TDS deductor records) used to reconcile against self-tracked tax_payments entries';


-- ================================================================
-- 14. SALARY
-- ================================================================

CREATE TABLE IF NOT EXISTS public.salary_slips (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner             text NOT NULL DEFAULT 'self',
  employer          text DEFAULT '',
  slip_month        text NOT NULL,                              -- YYYY-MM
  basic             numeric DEFAULT 0,
  hra               numeric DEFAULT 0,
  da                numeric DEFAULT 0,
  special_allowance numeric DEFAULT 0,
  lta               numeric DEFAULT 0,
  bonus             numeric DEFAULT 0,
  other_earnings    numeric DEFAULT 0,
  employer_nps_contribution numeric DEFAULT 0,
  gross_salary      numeric DEFAULT 0,
  pf_employee       numeric DEFAULT 0,
  pf_employer       numeric DEFAULT 0,
  esi_employee      numeric DEFAULT 0,
  professional_tax  numeric DEFAULT 0,
  tds               numeric DEFAULT 0,
  income_tax        numeric DEFAULT 0,
  nps_deduction     numeric DEFAULT 0,
  other_deductions  numeric DEFAULT 0,
  total_deductions  numeric DEFAULT 0,
  net_salary        numeric DEFAULT 0,
  raw_text          text DEFAULT '',
  notes             text DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, owner, slip_month)
);

ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.salary_slips;
CREATE POLICY "Users can access own data" ON public.salary_slips
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_salary_slips_user_id ON public.salary_slips (user_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_month   ON public.salary_slips (slip_month);


-- ================================================================
-- 15. DOCUMENT VAULT
-- ================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  owner          text NOT NULL DEFAULT 'self',
  name           text NOT NULL,
  file_path      text,                                            -- nullable: Will/Key-Contact records below have no uploaded file
  file_size      integer,
  mime_type      text,
  linked_type    text,                                            -- 'stock','mf','fd','insurance','tax','property','vehicle', etc.
  linked_id      uuid,
  tags           text[],
  -- Will & Nominee Tracker also stores its "Will Document" and "Key Contact"
  -- records in this table (discriminated by `type`), reusing it as a
  -- generic metadata store rather than only a file vault.
  type           text DEFAULT '',                                 -- 'will' | 'key_contact' (blank = an actual Document Vault file upload)
  date           date,                                             -- will: date the will was made/updated
  location       text DEFAULT '',                                 -- will: physical location (bank locker, home safe, ...)
  witnesses      text DEFAULT '',                                  -- will: witness names
  lawyer_name    text DEFAULT '',
  lawyer_contact text DEFAULT '',
  notes          text DEFAULT '',
  role           text DEFAULT '',                                  -- key contact: Lawyer/CA/Financial Advisor/...
  phone          text DEFAULT '',                                  -- key contact
  email          text DEFAULT '',                                  -- key contact
  uploaded_at    timestamptz DEFAULT NOW(),
  -- Document Vault (DocumentVaultTab.tsx) fields — blank `type` rows only.
  category          text DEFAULT '',
  subcategory       text DEFAULT '',
  document_number   text DEFAULT '',
  issuer            text DEFAULT '',
  issue_date        text DEFAULT '',                                -- text, not date: form sends '' when left blank
  expiry_date       text DEFAULT '',
  url               text DEFAULT '',
  linked_asset_type text DEFAULT '',
  linked_asset      text DEFAULT ''
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.documents;
CREATE POLICY "Users can access own data" ON public.documents
  FOR ALL USING (auth.uid() = user_id);

-- Private Storage bucket backing file_path/file_size/mime_type above —
-- lets Document Vault store real uploaded files, not just pasted URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own vault files" ON storage.objects;
CREATE POLICY "Users can read own vault files" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own vault files" ON storage.objects;
CREATE POLICY "Users can upload own vault files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own vault files" ON storage.objects;
CREATE POLICY "Users can update own vault files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;
CREATE POLICY "Users can delete own vault files" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ================================================================
-- 16. NET WORTH HISTORY
-- ================================================================

CREATE TABLE IF NOT EXISTS public.net_worth_history (
  user_id      uuid REFERENCES auth.users NOT NULL,
  month        text NOT NULL,                                   -- format: YYYY-MM
  net_worth    numeric DEFAULT 0,
  cash         numeric DEFAULT 0,                                -- 59
  equity       numeric DEFAULT 0,                                -- 59
  debt         numeric DEFAULT 0,                                -- 59
  real_estate  numeric DEFAULT 0,                                -- 59
  vehicles     numeric DEFAULT 0,                                -- 59
  liabilities  numeric DEFAULT 0,                                -- 59
  breakdown    jsonb,                                             -- 59
  updated_at   timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.net_worth_history;
CREATE POLICY "Users can access own data" ON public.net_worth_history
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_month ON public.net_worth_history (user_id, month DESC);


-- ================================================================
-- 17. ACTIVITY LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  action_type text NOT NULL,
  description text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.activity_logs;
CREATE POLICY "Users can access own data" ON public.activity_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_logs_user_time_idx ON public.activity_logs (user_id, created_at DESC);

-- ================================================================
-- END OF CONSOLIDATED SCHEMA
-- ================================================================
