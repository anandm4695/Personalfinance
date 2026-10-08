-- ================================================================
-- Migration 99: Comprehensive Sync for recurring_deposits Table
-- Ensures all columns, types, defaults, indexes, and RLS policies
-- exist for Recurring Deposits in Supabase.
-- Safe to run multiple times (idempotent).
-- ================================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.recurring_deposits (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users NOT NULL,
  owner             text NOT NULL DEFAULT 'self',
  created_at        timestamp with time zone DEFAULT now()
);

-- 2. Add All Columns Idempotently
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'self';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS bank text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS monthly numeric DEFAULT 0;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS tenure_months numeric;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS maturity_date date;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS rd_number text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS bank_account_id text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS linked_account text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS paid_installments integer DEFAULT 0;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS debit_day integer DEFAULT 5;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS compounding text DEFAULT 'quarterly';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_account text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS auto_debit boolean DEFAULT true;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS nominee text DEFAULT '';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

-- 3. Ensure Row Level Security (RLS) and Policies
ALTER TABLE public.recurring_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own data" ON public.recurring_deposits;
CREATE POLICY "Users can access own data" ON public.recurring_deposits
  FOR ALL USING (auth.uid() = user_id);

-- 4. Ensure Index for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_recurring_deposits_user ON public.recurring_deposits (user_id);

-- 5. Extra Compatibility for Transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;
