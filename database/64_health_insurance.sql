-- Migration 64: Health Insurance Tracker
-- Tracks health insurance policies — family floater, individual, corporate, top-up, super top-up

CREATE TABLE IF NOT EXISTS public.health_insurance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurer       TEXT NOT NULL DEFAULT '',
  policy_name   TEXT NOT NULL DEFAULT '',
  policy_number TEXT NOT NULL DEFAULT '',
  policy_type   TEXT NOT NULL DEFAULT 'family_floater',  -- family_floater | individual | corporate | top_up | super_top_up | critical_illness
  owner         TEXT NOT NULL DEFAULT 'self',            -- self | spouse | daughter | huf | joint
  insured_members JSONB NOT NULL DEFAULT '[]',           -- [{ name, relation, dob }]
  sum_insured   NUMERIC NOT NULL DEFAULT 0,
  premium       NUMERIC NOT NULL DEFAULT 0,
  premium_frequency TEXT NOT NULL DEFAULT 'annual',     -- monthly | quarterly | semi_annual | annual
  start_date    DATE,
  renewal_date  DATE,
  hospital_network TEXT DEFAULT '',
  cashless      BOOLEAN NOT NULL DEFAULT true,
  pre_existing_covered BOOLEAN NOT NULL DEFAULT false,
  waiting_period_years NUMERIC DEFAULT 0,
  no_claim_bonus NUMERIC DEFAULT 0,                     -- current NCB amount
  claims        JSONB NOT NULL DEFAULT '[]',             -- [{ date, amount, description, settled }]
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.health_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health insurance"
  ON public.health_insurance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_insurance_user_id ON public.health_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insurance_renewal ON public.health_insurance(renewal_date);
