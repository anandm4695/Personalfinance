-- ============================================================
-- MIGRATION: 18_lic_commencement_transactions
-- Adds commencement_date and transactions JSONB to lic_policies table
-- ============================================================

-- 1. Add columns to lic_policies
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS commencement_date date;
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb;

-- 2. Add helpful comments
COMMENT ON COLUMN public.lic_policies.commencement_date IS 'Date when the LIC policy commenced (started)';
COMMENT ON COLUMN public.lic_policies.transactions IS 'List of previous premium payments (dates and amounts)';
