-- ============================================================
-- MIGRATION 41: Add narration column to transactions
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS narration text;
