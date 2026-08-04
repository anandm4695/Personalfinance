-- ============================================================
-- MIGRATION 44: Add annual fee deduction date to credit_cards
--
-- fee_month (1–12) + fee_day (1–31) store the recurring annual
-- fee charge date so the app can show a countdown and alert
-- before the fee is auto-deducted each year.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS fee_month integer;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS fee_day integer;

COMMENT ON COLUMN public.credit_cards.fee_month IS 'Month (1–12) when annual fee is deducted each year';
COMMENT ON COLUMN public.credit_cards.fee_day   IS 'Day of month (1–31) when annual fee is deducted';
