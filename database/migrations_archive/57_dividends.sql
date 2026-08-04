-- Migration 57: Dividends tracking table
CREATE TABLE IF NOT EXISTS dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  owner TEXT NOT NULL DEFAULT 'self',
  symbol TEXT,
  fund_name TEXT,
  type TEXT NOT NULL DEFAULT 'stock', -- 'stock' | 'mf'
  amount NUMERIC NOT NULL DEFAULT 0,
  tds NUMERIC DEFAULT 0,
  record_date DATE,
  payment_date DATE,
  fy TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own dividends"
  ON dividends FOR ALL USING (auth.uid() = user_id);
