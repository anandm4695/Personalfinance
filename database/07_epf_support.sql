-- Migration 07: Add EPF (Employee Provident Fund) support to ppf_nps table
-- Run this in Supabase SQL Editor

-- Add UAN column for EPF Universal Account Number
ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS uan text;

-- Drop and recreate type constraint to include EPF
ALTER TABLE public.ppf_nps DROP CONSTRAINT IF EXISTS ppf_nps_type_check;
ALTER TABLE public.ppf_nps ADD CONSTRAINT ppf_nps_type_check
  CHECK (type IN ('PPF', 'NPS', 'EPF'));

-- Note: the 'employer' field is stored in the existing 'bank' column for EPF accounts.
-- The 'transactions' and 'account_number' columns were added in migration 06.
