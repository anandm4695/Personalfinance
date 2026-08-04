-- ============================================================
-- MIGRATION: Add missing tables and columns
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. Add missing columns to existing tables ──────────────
ALTER TABLE public.credit_cards  ADD COLUMN IF NOT EXISTS status      text DEFAULT 'active';
ALTER TABLE public.credit_cards  ADD COLUMN IF NOT EXISTS closed_date date;
ALTER TABLE public.prepaid_cards ADD COLUMN IF NOT EXISTS status      text DEFAULT 'active';
ALTER TABLE public.prepaid_cards ADD COLUMN IF NOT EXISTS closed_date date;

-- ── 2. LIC Policies ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lic_policies (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  plan_name        text,
  policy_number    text,
  sum_assured      numeric DEFAULT 0,
  annual_premium   numeric DEFAULT 0,
  premium_paid     numeric DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now()
);

-- ── 3. Term Insurance Plans ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.term_plans (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  plan_name        text,
  insurer          text,
  cover_amount     numeric DEFAULT 0,
  annual_premium   numeric DEFAULT 0,
  premium_paid     numeric DEFAULT 0,
  term             numeric,
  start_date       date,
  maturity_date    date,
  created_at       timestamp with time zone DEFAULT now()
);

-- ── 4. Informal Loans (From People / To People) ─────────────
--    direction = 'borrowed' (From People) | 'lent' (To People)
CREATE TABLE IF NOT EXISTS public.informal_loans (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  direction        text CHECK (direction IN ('borrowed', 'lent')) NOT NULL,
  person           text NOT NULL,
  note             text,
  tranches         jsonb DEFAULT '[]'::jsonb,
  payments         jsonb DEFAULT '[]'::jsonb,
  created_at       timestamp with time zone DEFAULT now()
);

-- ── 5. Rental Properties (Rented Out / Rented In) ───────────
--    property_type = 'out' (landlord) | 'in' (tenant)
CREATE TABLE IF NOT EXISTS public.rental_properties (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users NOT NULL,
  owner               text NOT NULL DEFAULT 'self',
  property_type       text CHECK (property_type IN ('out', 'in')) NOT NULL DEFAULT 'out',
  property_name       text NOT NULL,
  address             text,
  monthly_rent        numeric DEFAULT 0,
  security_deposit    numeric DEFAULT 0,
  tenant_name         text,
  landlord_name       text,
  lease_start         date,
  lease_end           date,
  is_active           boolean DEFAULT true,
  receipts            jsonb DEFAULT '[]'::jsonb,
  payments            jsonb DEFAULT '[]'::jsonb,
  deposit_deductions  jsonb DEFAULT '[]'::jsonb,
  deposit_returned    numeric DEFAULT 0,
  created_at          timestamp with time zone DEFAULT now()
);

-- ── 6. SIP Tracker ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sips (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users NOT NULL,
  owner               text NOT NULL DEFAULT 'self',
  scheme              text NOT NULL,
  fund_type           text,
  amount              numeric DEFAULT 0,
  frequency           text DEFAULT 'monthly',
  start_date          date,
  total_installments  numeric,
  created_at          timestamp with time zone DEFAULT now()
);

-- ── 7. Stock Sell Records ────────────────────────────────────
--    id is text (not uuid) because app generates "ss-<timestamp>" ids
CREATE TABLE IF NOT EXISTS public.stock_sells (
  id               text NOT NULL PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  symbol           text NOT NULL,
  exchange         text,
  qty              numeric DEFAULT 0,
  buy_price        numeric DEFAULT 0,
  buy_date         date,
  sell_price       numeric DEFAULT 0,
  sell_date        date,
  broker           text,
  demat_id         text,
  profit           numeric DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now()
);

-- ── 8. Mutual Fund Sell Records ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.mf_sells (
  id               text NOT NULL PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  scheme           text,
  units            numeric DEFAULT 0,
  buy_nav          numeric DEFAULT 0,
  sell_nav         numeric DEFAULT 0,
  buy_date         date,
  sell_date        date,
  profit           numeric DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now()
);

-- ── 9. Net Worth History (monthly snapshots) ─────────────────
CREATE TABLE IF NOT EXISTS public.net_worth_history (
  user_id          uuid REFERENCES auth.users NOT NULL,
  month            text NOT NULL,          -- format: YYYY-MM
  net_worth        numeric DEFAULT 0,
  updated_at       timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

-- ============================================================
-- ROW LEVEL SECURITY — enable + policy for every new table
-- ============================================================

ALTER TABLE public.lic_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informal_loans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_properties   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_sells         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mf_sells            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_history   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own data" ON public.lic_policies;
CREATE POLICY "Users can access own data" ON public.lic_policies
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.term_plans;
CREATE POLICY "Users can access own data" ON public.term_plans
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.informal_loans;
CREATE POLICY "Users can access own data" ON public.informal_loans
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.rental_properties;
CREATE POLICY "Users can access own data" ON public.rental_properties
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.sips;
CREATE POLICY "Users can access own data" ON public.sips
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.stock_sells;
CREATE POLICY "Users can access own data" ON public.stock_sells
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.mf_sells;
CREATE POLICY "Users can access own data" ON public.mf_sells
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own data" ON public.net_worth_history;
CREATE POLICY "Users can access own data" ON public.net_worth_history
  FOR ALL USING (auth.uid() = user_id);
