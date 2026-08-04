-- ============================================================
-- MIGRATION 15: Rental Properties — multi-tenant + multi-landlord fields
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. Add new columns for Rented OUT (multi-tenant support) ──
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS tenants          jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tenant_phone     text,
  ADD COLUMN IF NOT EXISTS agreement_start  date,
  ADD COLUMN IF NOT EXISTS agreement_end    date,
  ADD COLUMN IF NOT EXISTS property_type_detail text,
  ADD COLUMN IF NOT EXISTS municipal_tax    numeric DEFAULT 0;

-- ── 2. Add new columns for Rented IN (multi-landlord support) ──
ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS landlords        jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landlord_phone   text,
  ADD COLUMN IF NOT EXISTS landlord_pan     text;

-- ── 3. Back-fill agreement_start / agreement_end from existing lease_start / lease_end ──
UPDATE public.rental_properties
  SET agreement_start = lease_start
  WHERE agreement_start IS NULL AND lease_start IS NOT NULL;

UPDATE public.rental_properties
  SET agreement_end = lease_end
  WHERE agreement_end IS NULL AND lease_end IS NOT NULL;

-- ── 4. Verify the columns were added ─────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'rental_properties' ORDER BY ordinal_position;
