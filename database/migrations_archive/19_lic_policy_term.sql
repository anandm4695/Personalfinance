-- ============================================================
-- MIGRATION: 19_lic_policy_term
-- Adds policy_term (integer) to lic_policies table
-- ============================================================

-- 1. Add policy_term column to lic_policies
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS policy_term integer;

-- 2. Add helpful comment
COMMENT ON COLUMN public.lic_policies.policy_term IS 'Duration of the LIC policy in years';
