-- Migration 54: Add NPS-specific columns to ppf_nps
-- Run this in Supabase SQL Editor (both live and demo projects).
--
-- Root cause: ppf_nps table was missing `pran` and `tier` columns,
-- so PRAN number and tier info were silently dropped on every save.
-- After this migration, NPS accounts will correctly persist PRAN and tier.

ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS pran text,
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'I';
