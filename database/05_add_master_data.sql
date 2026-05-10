-- ============================================================
-- MIGRATION 05: Add master_data column to user_settings
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS master_data jsonb;
