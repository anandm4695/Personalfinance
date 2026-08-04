-- Migration 11: Add missing columns to stocks table
-- exchange and buy_date are referenced throughout DematTab.tsx but were absent
-- from the original migration 01 schema. These columns exist in the live DB
-- (added via Supabase dashboard), so this migration is idempotent (IF NOT EXISTS).

ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS exchange text NOT NULL DEFAULT 'NSE',
  ADD COLUMN IF NOT EXISTS buy_date date;

-- stock_sells already had these columns from migration 02 — no changes needed there.
