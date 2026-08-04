-- ============================================================
-- MIGRATION 25: Add due_day column to rental_properties
-- 
-- This migration adds a monthly rent due day column (`due_day` integer) 
-- to the `rental_properties` table. It defaults to 5.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Add due_day integer column with default 5
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS due_day integer DEFAULT 5;

-- 2. Add comment
COMMENT ON COLUMN public.rental_properties.due_day
  IS 'The day of the month when rent is due (e.g. 5 for the 5th)';

-- 3. Verify
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'rental_properties' AND column_name = 'due_day';
