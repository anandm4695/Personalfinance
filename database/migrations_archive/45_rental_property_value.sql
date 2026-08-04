-- ============================================================
-- MIGRATION 45: Rental Properties — add property_value column
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS property_value numeric DEFAULT 0;
