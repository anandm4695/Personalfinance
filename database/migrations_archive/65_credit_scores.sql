-- Migration 65: Credit Score History
-- Manually track CIBIL / Experian / CRIF / Equifax score over time

CREATE TABLE IF NOT EXISTS public.credit_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL CHECK (score BETWEEN 300 AND 900),
  bureau      TEXT NOT NULL DEFAULT 'CIBIL',   -- CIBIL | Experian | CRIF | Equifax
  check_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  owner       TEXT NOT NULL DEFAULT 'self',    -- self | spouse
  source      TEXT DEFAULT 'manual',           -- manual | oneScore | paisa bazaar | bank_app
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own credit scores"
  ON public.credit_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id  ON public.credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_date     ON public.credit_scores(check_date);
