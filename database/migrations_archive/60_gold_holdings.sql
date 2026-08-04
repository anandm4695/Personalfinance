-- Gold & Sovereign Gold Bond holdings
CREATE TABLE IF NOT EXISTS gold_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  owner TEXT NOT NULL DEFAULT 'self',
  name TEXT,
  type TEXT NOT NULL DEFAULT 'physical', -- physical, sgb, digital, etf, mf
  grams NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  purchase_date DATE,
  maturity_date DATE,
  interest_rate NUMERIC DEFAULT 2.5,
  purity TEXT DEFAULT '24K',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gold_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gold_holdings_user_policy" ON gold_holdings
  FOR ALL USING (auth.uid() = user_id);
