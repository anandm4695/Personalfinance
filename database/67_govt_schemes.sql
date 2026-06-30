-- Migration 67: Government Schemes Tracker
-- APY, Sukanya Samriddhi, PMJJBY, PMSBY, PM-KISAN, SCSS, NSC, KVP, etc.

CREATE TABLE IF NOT EXISTS public.govt_schemes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_type         TEXT NOT NULL DEFAULT 'APY',
  -- APY | SSY | PMJJBY | PMSBY | PMKISAN | NPS_LITE | SCSS | NSC | KVP | POST_MIS | POST_TD | PPF_POST | RBI_BOND
  scheme_name         TEXT NOT NULL DEFAULT '',         -- display name / custom label
  account_number      TEXT DEFAULT '',
  member_name         TEXT DEFAULT '',                  -- beneficiary name (e.g. daughter's name for SSY)
  owner               TEXT NOT NULL DEFAULT 'self',
  start_date          DATE,
  maturity_date       DATE,
  contribution_amount NUMERIC DEFAULT 0,                -- periodic contribution
  frequency           TEXT DEFAULT 'annual',            -- monthly | quarterly | annual | one_time
  current_balance     NUMERIC DEFAULT 0,
  interest_rate       NUMERIC DEFAULT 0,                -- applicable rate %
  -- APY specific
  pension_amount      NUMERIC DEFAULT 0,                -- monthly pension at 60
  -- PMJJBY / PMSBY specific
  coverage_amount     NUMERIC DEFAULT 0,
  premium             NUMERIC DEFAULT 0,
  -- Nominee
  nominee             TEXT DEFAULT '',
  bank_account        TEXT DEFAULT '',                  -- linked bank
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.govt_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own govt schemes"
  ON public.govt_schemes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_govt_schemes_user_id ON public.govt_schemes(user_id);
CREATE INDEX IF NOT EXISTS idx_govt_schemes_type    ON public.govt_schemes(scheme_type);
