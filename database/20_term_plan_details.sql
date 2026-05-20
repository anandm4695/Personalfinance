-- ============================================================
-- MIGRATION: 20_term_plan_details
-- Adds premium_paying_term (integer) to term_plans table
-- ============================================================

-- 1. Add premium_paying_term column to term_plans
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS premium_paying_term integer;

-- 2. Add helpful comment
COMMENT ON COLUMN public.term_plans.premium_paying_term IS 'Years for which premium is payable';
