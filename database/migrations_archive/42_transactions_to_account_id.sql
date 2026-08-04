-- ============================================================
-- MIGRATION 42: Add to_account_id column to transactions
-- Stores the destination account for Transfer transactions
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
