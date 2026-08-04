-- ============================================================
-- MIGRATION 37: Add shared credit pool columns to credit_cards
--
-- sharedGroup / shared_group_limit enable grouping multiple cards
-- (e.g. HDFC Regalia + HDFC Diners) under a single shared credit limit,
-- so utilisation is not double-counted across the pool.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS shared_group       text;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS shared_group_limit numeric DEFAULT 0;

COMMENT ON COLUMN public.credit_cards.shared_group       IS 'Pool name for cards sharing a single credit limit (e.g. "HDFC Pool")';
COMMENT ON COLUMN public.credit_cards.shared_group_limit IS 'Total shared pool limit — set on any one card in the group; app takes the max across the group';
