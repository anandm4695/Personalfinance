-- ============================================================
-- MIGRATION 23: Add deposit_transactions JSONB column to rental_properties
-- 
-- The app (RentalTab.tsx) tracks partial security deposit payments/receipts
-- via a `depositTransactions` array (camelCase → deposit_transactions in DB).
-- This column was never created in the database, so Supabase silently strips
-- it on every upsert (PGRST204 auto-recovery), causing data loss.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Add deposit_transactions JSONB column
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS deposit_transactions jsonb DEFAULT '[]'::jsonb;

-- 2. Add helpful comment
COMMENT ON COLUMN public.rental_properties.deposit_transactions
  IS 'Ledger of partial security deposit payments/receipts with date, amount, and note per entry';

-- 3. Verify (optional — run separately)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'rental_properties' AND column_name = 'deposit_transactions';
