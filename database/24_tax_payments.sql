-- ============================================================
-- MIGRATION 24: Create tax_payments table for Tax Vault payment tracking
--
-- The TaxVaultTab allows users to record TDS, Advance Tax, Self-Assessment,
-- and Professional Tax payments. These are stored in state.taxPayments but
-- have no Supabase table, so they are lost on cross-device login or reload.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Create tax_payments table
CREATE TABLE IF NOT EXISTS public.tax_payments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL DEFAULT 'self',
  date        date,
  type        text,              -- TDS, Advance Tax, Self-Assessment, Professional Tax
  amount      numeric DEFAULT 0,
  note        text,
  created_at  timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy
DROP POLICY IF EXISTS "Users can access own data" ON public.tax_payments;
CREATE POLICY "Users can access own data" ON public.tax_payments
  FOR ALL USING (auth.uid() = user_id);

-- 4. Add helpful comment
COMMENT ON TABLE public.tax_payments IS 'Tax payment log for TDS, advance tax, self-assessment, and professional tax entries';
