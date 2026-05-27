-- Migration 39: Add escalation_tiers column to rental_properties
-- Stores per-year rent escalation schedule as agreed in license/lease deeds
-- Example: [{durationMonths:12,amount:40000},{durationMonths:12,amount:44000}]
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS escalation_tiers jsonb DEFAULT '[]'::jsonb;
