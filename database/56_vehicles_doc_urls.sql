-- Migration 56: Add document URL columns to vehicles table
-- Adds fields for storing links to vehicle documents (RC, Insurance, PUC).

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS rc_document_url text,
  ADD COLUMN IF NOT EXISTS insurance_policy_url text,
  ADD COLUMN IF NOT EXISTS puc_certificate_url text;
