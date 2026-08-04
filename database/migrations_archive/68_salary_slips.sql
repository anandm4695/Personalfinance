-- Migration 68: Salary Slip Tracker
-- Store parsed salary slip components month by month

CREATE TABLE IF NOT EXISTS public.salary_slips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner             TEXT NOT NULL DEFAULT 'self',
  employer          TEXT DEFAULT '',
  slip_month        TEXT NOT NULL,                      -- YYYY-MM
  -- Earnings
  basic             NUMERIC DEFAULT 0,
  hra               NUMERIC DEFAULT 0,
  da                NUMERIC DEFAULT 0,                  -- dearness allowance
  special_allowance NUMERIC DEFAULT 0,
  lta               NUMERIC DEFAULT 0,                  -- leave travel allowance
  bonus             NUMERIC DEFAULT 0,
  other_earnings    NUMERIC DEFAULT 0,
  gross_salary      NUMERIC DEFAULT 0,
  -- Deductions
  pf_employee       NUMERIC DEFAULT 0,
  pf_employer       NUMERIC DEFAULT 0,
  esi_employee      NUMERIC DEFAULT 0,
  professional_tax  NUMERIC DEFAULT 0,
  tds               NUMERIC DEFAULT 0,
  other_deductions  NUMERIC DEFAULT 0,
  total_deductions  NUMERIC DEFAULT 0,
  -- Net
  net_salary        NUMERIC DEFAULT 0,
  -- Metadata
  raw_text          TEXT DEFAULT '',                    -- pasted text used for AI parsing
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, owner, slip_month)
);

ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own salary slips"
  ON public.salary_slips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_salary_slips_user_id ON public.salary_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_month   ON public.salary_slips(slip_month);
