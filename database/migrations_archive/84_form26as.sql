-- ============================================================
-- MIGRATION 84: Create form_26as table for Form 26AS reconciliation entries
--
-- TaxToolsTab's Form 26AS section stored entries in a raw localStorage key
-- ("finance_form26as") completely outside the app's Supabase-synced state.
-- That meant entries didn't sync across devices, weren't included in
-- Import/Export backups, and weren't profile-scoped — the same bug class
-- migration 24 fixed for tax_payments. This gives Form 26AS entries a real
-- table so they follow the same load/save/backup path as every other
-- collection.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Create form_26as table
CREATE TABLE IF NOT EXISTS public.form_26as (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  owner            text NOT NULL DEFAULT 'self',
  fy               text,
  deductor         text,
  tan              text,
  section          text,
  date_of_payment  date,
  amount           numeric DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.form_26as ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy
DROP POLICY IF EXISTS "Users can access own data" ON public.form_26as;
CREATE POLICY "Users can access own data" ON public.form_26as
  FOR ALL USING (auth.uid() = user_id);

-- 4. Helpful index (mirrors 33_performance_indexes.sql pattern)
CREATE INDEX IF NOT EXISTS idx_form_26as_user ON public.form_26as (user_id);

-- 5. Add helpful comment
COMMENT ON TABLE public.form_26as IS 'Manually-entered Form 26AS line items (TDS deductor records) used to reconcile against self-tracked tax_payments entries';
