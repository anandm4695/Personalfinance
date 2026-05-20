-- ============================================================
-- MIGRATION: 22_investment_plans
-- Creates the investment_plans table for endowment/ULIP/guaranteed income plans
-- ============================================================

CREATE TABLE IF NOT EXISTS public.investment_plans (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  uuid REFERENCES auth.users NOT NULL,
  owner                    text NOT NULL DEFAULT 'self',
  insurer                  text NOT NULL,
  plan_name                text NOT NULL,
  policy_number            text,
  sum_assured              numeric DEFAULT 0,
  annual_premium           numeric DEFAULT 0,
  premium_paid             numeric DEFAULT 0,
  policy_term              integer DEFAULT 0,
  premium_paying_term      integer DEFAULT 0,
  commencement_date        date,
  maturity_date            date,
  expected_maturity_amount numeric DEFAULT 0,
  transactions             jsonb DEFAULT '[]'::jsonb,
  created_at               timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

-- Security Policies
DROP POLICY IF EXISTS "Users can manage their own investment plans" ON public.investment_plans;
CREATE POLICY "Users can manage their own investment plans" ON public.investment_plans
  FOR ALL USING (auth.uid() = user_id);

-- DB Comments
COMMENT ON TABLE public.investment_plans IS 'Endowment plans, ULIPs, and other premium-paying investment schemes';
COMMENT ON COLUMN public.investment_plans.transactions IS 'List of previous premium payments (dates and amounts)';
