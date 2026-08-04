-- ============================================================
-- MIGRATION 43: Add linked_type and linked_id to transactions
-- Stores which module record a bank transaction is linked to
-- (e.g., Insurance Policy, Loan, Rental Property, etc.)
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS linked_type text,
  ADD COLUMN IF NOT EXISTS linked_id   text;
