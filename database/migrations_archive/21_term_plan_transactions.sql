-- ============================================================
-- MIGRATION: 21_term_plan_transactions
-- Adds transactions JSONB to term_plans table for premium payments history
-- ============================================================

-- 1. Add transactions column to term_plans
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS transactions jsonb DEFAULT '[]'::jsonb;

-- 2. Add helpful comment
COMMENT ON COLUMN public.term_plans.transactions IS 'List of previous term plan premium payments (dates and amounts)';
