-- Migration 92: Salary Slips — add Employer NPS Contribution, Income Tax, NPS Deduction
-- SalarySlipTab tracked PF but had no field for NPS (National Pension System),
-- and only a single "TDS" deduction field even though some employers show
-- Income Tax as a distinct line item from TDS. Adds the three missing columns.
-- Run manually in Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE public.salary_slips
  ADD COLUMN IF NOT EXISTS employer_nps_contribution numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_tax numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nps_deduction numeric DEFAULT 0;

-- ── Verify columns were added ─────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'salary_slips'
--   AND column_name IN ('employer_nps_contribution', 'income_tax', 'nps_deduction');
