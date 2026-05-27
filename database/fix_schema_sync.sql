-- ============================================================
-- SCHEMA SYNC FIX — Run this in demo Supabase SQL Editor
-- Applies ALL 41 migrations idempotently (safe to run multiple times).
-- Uses IF NOT EXISTS / DO blocks so nothing is dropped or overwritten.
-- ============================================================


-- ── TABLES (from migrations 01 + 02 + 12 + 22 + 24 + 34 + 35) ───────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id         uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  name            text,
  fy              text DEFAULT '2025-26',
  regime          text DEFAULT 'new',
  savings_target  numeric DEFAULT 20,
  updated_at      timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id     uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  dark_mode   boolean DEFAULT false,
  accent_key  text DEFAULT 'blue',
  density     text DEFAULT 'normal',
  sidebar_nav boolean DEFAULT true,
  radius_key  text DEFAULT 'modern',
  font_key    text DEFAULT 'inter',
  bg_style    text DEFAULT 'plain',
  anim_speed  text DEFAULT 'smooth',
  chart_style text DEFAULT 'monotone',
  updated_at  timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  owner        text NOT NULL,
  bank_name    text NOT NULL,
  account_number text,
  balance      numeric DEFAULT 0,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demat_accounts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL,
  broker     text NOT NULL,
  dp_id      text,
  client_id  text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL,
  date       date NOT NULL,
  account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  amount     numeric NOT NULL,
  type       text CHECK (type IN ('credit', 'debit')),
  category   text,
  note       text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mutual_funds (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL,
  scheme      text NOT NULL,
  type        text,
  units       numeric DEFAULT 0,
  current_nav numeric DEFAULT 0,
  invested    numeric DEFAULT 0,
  created_at  timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stocks (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  symbol        text NOT NULL,
  demat_id      uuid REFERENCES public.demat_accounts(id) ON DELETE SET NULL,
  qty           numeric DEFAULT 0,
  current_price numeric DEFAULT 0,
  avg_price     numeric DEFAULT 0,
  created_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fixed_deposits (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  bank          text,
  principal     numeric DEFAULT 0,
  rate          numeric DEFAULT 0,
  years         numeric,
  start_date    date,
  maturity_date date,
  created_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_deposits (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users NOT NULL,
  owner          text NOT NULL,
  bank           text,
  monthly        numeric DEFAULT 0,
  rate           numeric DEFAULT 0,
  tenure_months  numeric,
  start_date     date,
  created_at     timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bonds (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  name          text NOT NULL,
  type          text,
  face_value    numeric DEFAULT 0,
  coupon        numeric DEFAULT 0,
  maturity_date date,
  created_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ppf_nps (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users NOT NULL,
  owner                   text NOT NULL,
  type                    text,
  bank                    text,
  balance                 numeric DEFAULT 0,
  open_date               date,
  this_year_contribution  numeric DEFAULT 0,
  created_at              timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prepaid_cards (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  owner        text NOT NULL,
  card_name    text NOT NULL,
  card_type    text,
  last4        text,
  transactions jsonb DEFAULT '[]'::jsonb,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL,
  issuer      text NOT NULL,
  network     text,
  last4       text,
  card_limit  numeric DEFAULT 0,
  outstanding numeric DEFAULT 0,
  bill_date   text,
  due_day     text,
  annual_fee  numeric DEFAULT 0,
  helpline    text,
  created_at  timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loans (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users NOT NULL,
  owner             text NOT NULL,
  lender_borrower   text NOT NULL,
  type              text,
  is_lent           boolean DEFAULT false,
  principal         numeric DEFAULT 0,
  outstanding       numeric DEFAULT 0,
  emi               numeric DEFAULT 0,
  rate              numeric DEFAULT 0,
  months_remaining  numeric,
  created_at        timestamp with time zone DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.budgets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  owner         text NOT NULL,
  category      text NOT NULL,
  monthly_limit numeric DEFAULT 0,
  created_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  owner        text NOT NULL,
  name         text NOT NULL,
  category     text,
  amount       numeric DEFAULT 0,
  cycle        text CHECK (cycle IN ('monthly', 'quarterly', 'yearly')),
  renewal_date date,
  paused       boolean DEFAULT false,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  title         text NOT NULL,
  reminder_date date,
  priority      text,
  created_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  action_type text NOT NULL,
  description text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lic_policies (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users NOT NULL,
  owner           text NOT NULL DEFAULT 'self',
  plan_name       text,
  policy_number   text,
  sum_assured     numeric DEFAULT 0,
  annual_premium  numeric DEFAULT 0,
  premium_paid    numeric DEFAULT 0,
  created_at      timestamp with time zone DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.stock_sells (
  id          text NOT NULL PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL DEFAULT 'self',
  symbol      text NOT NULL,
  exchange    text,
  qty         numeric DEFAULT 0,
  buy_price   numeric DEFAULT 0,
  buy_date    date,
  sell_price  numeric DEFAULT 0,
  sell_date   date,
  broker      text,
  demat_id    text,
  profit      numeric DEFAULT 0,
  created_at  timestamp with time zone DEFAULT now()
);

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
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.net_worth_history (
  user_id    uuid REFERENCES auth.users NOT NULL,
  month      text NOT NULL,
  net_worth  numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.corporate_actions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  symbol     text NOT NULL,
  exchange   text DEFAULT 'NSE',
  type       text NOT NULL,
  date       date NOT NULL,
  details    jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

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
  created_at               timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_payments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  date       date,
  type       text,
  amount     numeric DEFAULT 0,
  note       text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.income_entries (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  owner      text NOT NULL DEFAULT 'self',
  date       date NOT NULL,
  amount     numeric NOT NULL DEFAULT 0,
  source     text,
  category   text,
  note       text,
  created_at timestamp with time zone DEFAULT now()
);

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


-- ── ADD COLUMNS (all migrations 02–41) ─────────────────────────────────────

-- credit_cards
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS status           text DEFAULT 'active';
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS closed_date      date;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS ledger           jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS statement_date   text;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS grace_days       integer DEFAULT 0;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS reward_type      text;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS reward_rate      numeric DEFAULT 0;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS lounge_count     integer DEFAULT 0;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS notes            text;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS shared_group       text;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS shared_group_limit numeric DEFAULT 0;

-- prepaid_cards
ALTER TABLE public.prepaid_cards ADD COLUMN IF NOT EXISTS status      text DEFAULT 'active';
ALTER TABLE public.prepaid_cards ADD COLUMN IF NOT EXISTS closed_date date;

-- user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS master_data      jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email_enabled    boolean DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email_frequency  text    DEFAULT 'weekly';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email_day        integer DEFAULT 1;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email_hour       integer DEFAULT 8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email_address    text    DEFAULT '';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS gemini_api_key   text    DEFAULT '';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS dismissed_alerts jsonb   DEFAULT '{}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS from_email       text    DEFAULT NULL;

-- ppf_nps (PPF transactions, EPF support, establishments)
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS transactions          jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS epf_type             text;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS employee_contribution numeric DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS employer_contribution numeric DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS epf_balance          numeric DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS pension_balance      numeric DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS establishments       jsonb DEFAULT '[]'::jsonb;

-- Fix ppf_nps type check constraint to include EPF
ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- stocks
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS day_low    numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS day_high   numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS week_52_low  numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS week_52_high numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS pe_ratio   numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS market_cap numeric;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS sector     text;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS isin       text;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS exchange   text DEFAULT 'NSE';

-- stock_sells
ALTER TABLE public.stock_sells ADD COLUMN IF NOT EXISTS exchange text;

-- lic_policies
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS maturity_date      date;
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS commencement_date  date;
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS transactions       jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS policy_term        integer;

-- term_plans
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS expiry_date          date;
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS premium_paying_term  integer;
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS transactions         jsonb DEFAULT '[]'::jsonb;

-- rental_properties
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS deposit_amount       numeric DEFAULT 0;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS deposit_date         date;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS deposit_ledger       jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS rent_ledger          jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS deposit_transactions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS due_day              integer DEFAULT 1;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS escalation_tiers     jsonb DEFAULT '[]'::jsonb;

-- subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS remark text;

-- bonds (migrations 26 + 27)
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS issuer                    text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS order_id                  text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS isin                      text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS security_name             text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS security_nature           text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS ytm_rate                  numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS buyer_name                text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS seller_name               text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS face_value_per_unit       numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS number_of_units           numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS principal_repayment       text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS interest_payment_date     text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS order_date                text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS clean_price_per_unit      numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS accrued_interest_per_unit numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS total_principal_amount    numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS total_accrued_interest    numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS total_consideration       numeric;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS brokerage                 numeric DEFAULT 0;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS stamp_duty                numeric DEFAULT 0;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS total_investment_amount   numeric;

-- reminders
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS owner    text    DEFAULT 'self';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS amount   numeric DEFAULT NULL;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS note     text    DEFAULT NULL;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS category text    DEFAULT 'Reminder';

-- budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'budget_month'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN budget_month text;
  END IF;
END;
$$;

-- sips
ALTER TABLE public.sips ADD COLUMN IF NOT EXISTS broker text DEFAULT NULL;


-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

-- Generic RLS policy helper — creates "Users can access own data" if missing
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','user_settings','bank_accounts','demat_accounts',
    'transactions','mutual_funds','stocks','fixed_deposits','recurring_deposits',
    'bonds','ppf_nps','credit_cards','prepaid_cards','loans','goals',
    'budgets','subscriptions','reminders','activity_logs','lic_policies',
    'term_plans','informal_loans','rental_properties','sips','stock_sells',
    'mf_sells','net_worth_history','corporate_actions','investment_plans',
    'tax_payments','income_entries','recurring_expenses'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='Users can access own data'
    ) THEN
      EXECUTE format($pol$CREATE POLICY "Users can access own data" ON public.%I FOR ALL USING (auth.uid() = user_id)$pol$, t);
    END IF;
  END LOOP;
END;
$$;


-- ── INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_transactions_user_date       ON public.transactions       (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type       ON public.transactions       (user_id, type);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user           ON public.bank_accounts      (user_id);
CREATE INDEX IF NOT EXISTS idx_mutual_funds_user            ON public.mutual_funds       (user_id);
CREATE INDEX IF NOT EXISTS idx_stocks_user                  ON public.stocks             (user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_user          ON public.fixed_deposits     (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deposits_user      ON public.recurring_deposits (user_id);
CREATE INDEX IF NOT EXISTS idx_bonds_user                   ON public.bonds              (user_id);
CREATE INDEX IF NOT EXISTS idx_ppf_nps_user                 ON public.ppf_nps            (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user            ON public.credit_cards       (user_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_cards_user           ON public.prepaid_cards      (user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user                   ON public.loans              (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user                   ON public.goals              (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user                 ON public.budgets            (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user           ON public.subscriptions      (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_date          ON public.reminders          (user_id, reminder_date);
CREATE INDEX IF NOT EXISTS idx_lic_policies_user            ON public.lic_policies       (user_id);
CREATE INDEX IF NOT EXISTS idx_term_plans_user              ON public.term_plans         (user_id);
CREATE INDEX IF NOT EXISTS idx_investment_plans_user        ON public.investment_plans   (user_id);
CREATE INDEX IF NOT EXISTS idx_informal_loans_user          ON public.informal_loans     (user_id);
CREATE INDEX IF NOT EXISTS idx_rental_properties_user       ON public.rental_properties  (user_id);
CREATE INDEX IF NOT EXISTS idx_sips_user                    ON public.sips               (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_sells_user             ON public.stock_sells        (user_id);
CREATE INDEX IF NOT EXISTS idx_mf_sells_user                ON public.mf_sells           (user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_user       ON public.corporate_actions  (user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_symbol     ON public.corporate_actions  (symbol, exchange);
CREATE INDEX IF NOT EXISTS idx_tax_payments_user            ON public.tax_payments       (user_id);
CREATE INDEX IF NOT EXISTS idx_demat_accounts_user          ON public.demat_accounts     (user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_month ON public.net_worth_history  (user_id, month DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_time_idx      ON public.activity_logs      (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS income_entries_user_date_idx     ON public.income_entries     (user_id, date DESC);
CREATE INDEX IF NOT EXISTS recurring_expenses_user_idx      ON public.recurring_expenses (user_id);
