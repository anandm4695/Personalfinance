-- ============================================================
-- MIGRATION 03: Add missing columns to credit_cards
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Add transaction ledger (individual credit card entries)
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb;

-- Add waiver info / notes field
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS waiver_info text;

-- Add status and closed_date if not already added by migration 02
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS closed_date date;
