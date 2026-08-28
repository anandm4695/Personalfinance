-- Migration 95: Salary Slips — add Education Allowance
-- Adds the education_allowance column to public.salary_slips.
-- Run manually in Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE public.salary_slips
  ADD COLUMN IF NOT EXISTS education_allowance numeric DEFAULT 0;

-- ── Verify column was added ─────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'salary_slips'
--   AND column_name = 'education_allowance';
