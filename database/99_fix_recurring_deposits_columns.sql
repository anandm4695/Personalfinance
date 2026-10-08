-- ================================================================
-- Migration 99: Add Missing Columns to recurring_deposits Table
-- Supports RD Account / Folio No, Linked Bank Account, Auto Debit,
-- Compounding, and Paid Installments tracking for accurate cash flow.
-- ================================================================

ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS bank_account_id text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS linked_account text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS paid_installments integer DEFAULT 0;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS compounding text DEFAULT 'quarterly';
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS payout_account text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS auto_debit boolean DEFAULT true;
