-- ============================================================
-- MIGRATION 04: Add ALL missing columns to credit_cards
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run multiple times (IF NOT EXISTS guards everything)
-- ============================================================

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS annual_fee     numeric DEFAULT 0;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS waiver_info    text;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS helpline       text;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS owner          text DEFAULT 'self';

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS status         text DEFAULT 'active';

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS closed_date    date;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS transactions   jsonb DEFAULT '[]'::jsonb;
