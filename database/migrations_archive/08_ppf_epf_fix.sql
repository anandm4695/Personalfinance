-- Migration 08: Fix PPF/EPF DB integration (consolidated — run this in Supabase SQL Editor)
-- This replaces migrations 06 and 07. Run this ONCE if you haven't run them yet,
-- or run it even if you have — all statements use IF NOT EXISTS / IF EXISTS safely.

-- 1. Add transaction ledger and account_number columns to ppf_nps
ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS account_number text;

-- 2. Update type constraint to allow EPF (required for EPF accounts to save)
ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- NOTE: UAN is now stored in the account_number column for EPF accounts.
-- The separate 'uan' column from migration 07 is no longer needed.
-- If you already added a 'uan' column, you can keep it — it won't cause issues.
