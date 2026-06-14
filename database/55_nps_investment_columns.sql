-- Migration 55: NPS investment detail columns
-- Run this in Supabase SQL Editor for BOTH live and demo projects.
-- Safe to run multiple times — uses IF NOT EXISTS throughout.
--
-- These columns are required for the full NPS feature:
--   account_number  → stores PRAN number
--   epf_type        → stores NPS tier (I or II)
--   employer_contribution → employer NPS contribution (Corporate NPS / 80CCD(2))
--   establishments  → stores scheme type, investment choice, asset allocation (JSONB)

ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS account_number       text;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS epf_type             text;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS employer_contribution numeric DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS establishments       jsonb DEFAULT '[]'::jsonb;

-- Also ensure the type constraint allows NPS (and EPF, PPF)
ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- Verify: run this to confirm all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ppf_nps'
ORDER BY ordinal_position;
