-- ============================================================
-- MIGRATION 85: Add rollover flag to budgets
--
-- BudgetTab's per-category budgets had no way to carry unused amounts
-- forward into next month (a standard YNAB-style "rollover" feature).
-- This adds a `rollover` boolean to public.budgets — when true, the
-- BudgetTab UI computes next month's effective limit as
-- (this month's monthly_limit) + max(0, previous month's monthly_limit -
-- previous month's actual spend for that category). All the math happens
-- client-side; this column just persists the per-category on/off toggle.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budgets'
      AND column_name = 'rollover'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN rollover boolean NOT NULL DEFAULT false;
  END IF;
END;
$$;

COMMENT ON COLUMN public.budgets.rollover IS 'When true, unused budget from the previous month (an explicit record for the same category+owner) carries forward into this month''s effective limit.';
