-- Migration 10: EPF Final Fix — run this in Supabase SQL Editor
-- This is the definitive migration if EPF accounts still can't be saved.
-- Safe to run even if you already ran migrations 06, 07, 08, or 09.

-- Step 1: Add missing columns (IF NOT EXISTS = safe to re-run)
ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS account_number text;

-- Step 2: Drop the type check constraint by its known name
ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;

-- Step 3: Re-add the constraint allowing PPF, NPS, and EPF
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- Step 4: Verify — run this separately to confirm it worked.
-- Expected: one row with constraint_def containing 'EPF'
SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.ppf_nps'::regclass AND contype = 'c';
