-- ============================================================
-- MIGRATION 17: Subscriptions — add remark column
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Add 'remark' column to public.subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS remark text;

-- ── Verify column was added ─────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'subscriptions' AND column_name = 'remark';
