-- ============================================================
-- MIGRATION 34: Create income_entries table
--
-- state.income holds explicit salary/other income entries used across
-- Analytics (YTD income, savings rate, FIRE), Smart Insights (savings
-- rate alert, insurance cover ratio), and the email summary.
-- Without a DB table these entries are localStorage-only and are lost
-- when the user logs in on a new device.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.income_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  owner       text NOT NULL DEFAULT 'self',
  date        date NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  source      text,           -- e.g. Salary, Freelance, Dividend, Bonus
  category    text,           -- e.g. active, passive
  note        text,
  created_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'income_entries'
      AND policyname = 'income_entries_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "income_entries_own"
        ON public.income_entries
        FOR ALL USING (auth.uid() = user_id)
    $pol$;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS income_entries_user_date_idx
  ON public.income_entries (user_id, date DESC);

COMMENT ON TABLE public.income_entries IS 'Explicit income ledger — salary, freelance, bonus, dividend entries per user';
