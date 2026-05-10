-- Migration 09: Bulletproof EPF fix — run this in Supabase SQL Editor
-- This drops ALL check constraints on ppf_nps (regardless of name) and re-adds the correct one.
-- Safe to run even if you already ran migrations 06, 07, or 08.

-- Step 1: Add columns (safe — IF NOT EXISTS)
ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS account_number text;

-- Step 2: Drop ALL check constraints on ppf_nps (handles any auto-named constraints)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ppf_nps'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Step 3: Add the correct type constraint allowing PPF, NPS, and EPF
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- Verify (optional — run this separately to confirm)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.ppf_nps'::regclass AND contype = 'c';
