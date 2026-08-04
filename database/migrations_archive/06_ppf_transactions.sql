-- Migration 06: Add transaction ledger to PPF accounts
-- Run this in Supabase SQL Editor

ALTER TABLE public.ppf_nps
  ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS account_number text;
