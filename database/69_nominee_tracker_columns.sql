-- ============================================================
-- MIGRATION 69: Add nominee columns for the Will & Nominee Tracker
--
-- The Nominee Tracker tab has been writing `nominee`/`nomineeRelation`
-- to bank accounts, demat accounts, mutual funds, fixed/recurring
-- deposits, bonds, gold holdings, PPF/NPS/EPF, insurance policies,
-- real estate and vehicles since it shipped — but no migration ever
-- added the columns, so every "Assign Nominee" save silently failed
-- against Supabase (the app strips the unknown column and shows a
-- "DB column missing" warning) while only persisting locally.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.demat_accounts
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.mutual_funds
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.fixed_deposits
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.recurring_deposits
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.bonds
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.gold_holdings
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

-- Shared by ppf / nps / epf state keys (see TABLE_MAP in appConstants.ts)
ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.lic_policies
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.term_plans
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.investment_plans
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.real_estate_properties
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS nominee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';
