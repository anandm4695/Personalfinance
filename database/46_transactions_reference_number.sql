-- ============================================================
-- MIGRATION 46: Add reference_number column to transactions
-- Stores Cheque / Reference number for transactions
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reference_number text;
