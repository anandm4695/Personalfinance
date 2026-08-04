-- Migration 51: Add mf_type (Direct/Regular × Growth/IDCW) + ensure migration 50 columns exist
-- mf_type: fund plan type e.g. "Direct Growth", "Direct IDCW", "Regular Growth", "Regular IDCW"

ALTER TABLE public.mutual_funds
  ADD COLUMN IF NOT EXISTS folio_number text,
  ADD COLUMN IF NOT EXISTS buy_nav      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buy_date     date,
  ADD COLUMN IF NOT EXISTS mf_code      text,
  ADD COLUMN IF NOT EXISTS mf_type      text;
