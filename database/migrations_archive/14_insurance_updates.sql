-- ============================================================
-- MIGRATION: 14_insurance_updates
-- Adds missing columns to lic_policies and term_plans to sync with app
-- ============================================================

-- 1. LIC Policies updates
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS maturity_date date;

-- 2. Term Plans updates
-- Ensure expiry_date exists (app uses expiryDate)
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS expiry_date date;

-- 3. Sync comments for clarity
COMMENT ON COLUMN public.lic_policies.maturity_date IS 'Date when the LIC policy matures';
COMMENT ON COLUMN public.term_plans.expiry_date IS 'Date when the term insurance cover expires';
