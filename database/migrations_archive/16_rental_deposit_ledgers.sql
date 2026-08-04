-- ============================================================
-- MIGRATION 16: Rental Properties — deposit dates + ledger sync fields
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. Add columns for Rent Payments & Receipts Ledgers ──
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS payments               jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS receipts               jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_deductions     jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_returned       numeric DEFAULT 0;

-- ── 2. Add columns for Deposit Payment/Receipt Dates ──
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS deposit_paid_date      date,
  ADD COLUMN IF NOT EXISTS deposit_received_date  date;
