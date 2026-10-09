-- ================================================================
-- Migration 100: Fix Goals Table Columns for Multi-Year Recurring Cash-Flow Goals
-- Ensures columns for multi-year recurring cash-flow schedules,
-- installments, disbursements, expected return rate, and notes
-- exist in Supabase goals table.
--
-- Safe and idempotent (uses ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users NOT NULL,
  owner          text NOT NULL DEFAULT 'self',
  name           text NOT NULL,
  category       text,
  target_amount  numeric DEFAULT 0,
  current_amount numeric DEFAULT 0,
  priority       text CHECK (priority IN ('Low', 'Medium', 'High')),
  start_date     date,
  target_date    date,
  created_at     timestamp with time zone DEFAULT now()
);

-- 2. Add Multi-Year Recurring & Cash-Flow Columns Idempotently
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS goal_type text DEFAULT 'target';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS recurring_frequency text DEFAULT 'yearly';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS installments_count integer DEFAULT 1;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS amount_per_installment numeric DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS installments_paid integer DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS next_due_date date;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS disbursements jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS expected_return_rate numeric DEFAULT 12;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 3. Ensure Row Level Security (RLS) and Policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own data" ON public.goals;
CREATE POLICY "Users can access own data" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

-- 4. Ensure Index for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id);
