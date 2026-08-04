-- Migration 75: Real Estate — TDS Amount (total liability) vs TDS Paid
-- The existing `tds_value` column only tracks TDS actually paid so far.
-- Adds `tds_amount` to hold the total TDS liability (e.g. 1% under Sec
-- 194-IA), so the UI can compute and display a TDS Balance = tds_amount -
-- tds_value.

ALTER TABLE public.real_estate_properties
  ADD COLUMN IF NOT EXISTS tds_amount numeric(14,2);
