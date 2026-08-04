-- Migration 41: Add broker/platform field to sips table
ALTER TABLE public.sips ADD COLUMN IF NOT EXISTS broker text DEFAULT NULL;
