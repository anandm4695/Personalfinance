-- ============================================================
-- MIGRATION 47: Subscriptions — add website column
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Add 'website' column so users can supply a custom domain/URL
-- for logo resolution when the service name isn't in the built-in map.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS website text;

-- ── Verify column was added ─────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'subscriptions' AND column_name = 'website';
