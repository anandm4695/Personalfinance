-- ============================================================
-- MIGRATION 35: Add budget_month to budgets & Create recurring_expenses
--
-- budget_month: Enables month-specific category budgets. If NULL, acts as 
-- a global/template budget.
-- recurring_expenses: Enables fixed repeating costs (maid, utilities, EMI, etc.)
-- with due days and active start/end date ranges.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Add budget_month to budgets table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'budgets' 
      AND column_name = 'budget_month'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN budget_month text;
  END IF;
END;
$$;

-- 2. Create recurring_expenses table
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL DEFAULT 'self',
  name        text NOT NULL,
  category    text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  frequency   text NOT NULL CHECK (frequency in ('monthly', 'quarterly', 'yearly', 'weekly')),
  due_day     integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  start_date  date NOT NULL,
  end_date    date, -- repeats until this date (or forever if null)
  account_id  uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL, -- default bank account to pay from
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'recurring_expenses'
      AND policyname = 'recurring_expenses_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "recurring_expenses_own"
        ON public.recurring_expenses
        FOR ALL USING (auth.uid() = user_id)
    $pol$;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS recurring_expenses_user_idx
  ON public.recurring_expenses (user_id);

COMMENT ON TABLE public.recurring_expenses IS 'List of fixed/recurring expenses (rent, maid, insurance, etc.) with due dates and ranges.';
