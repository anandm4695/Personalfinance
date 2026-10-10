-- ================================================================
-- Migration 101: Comprehensive Sync for RD Maturity Payout in recurring_deposits
-- Adds columns for payout_status, payout_amount, payout_date,
-- payout_bank_account_id, and tds_deducted.
-- ================================================================

ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_amount numeric DEFAULT 0;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_date date;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_bank_account_id text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS tds_deducted numeric DEFAULT 0;

-- Ensure index on payout_bank_account_id for fast linked queries
CREATE INDEX IF NOT EXISTS idx_recurring_deposits_payout_bank ON public.recurring_deposits (payout_bank_account_id);
