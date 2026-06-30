-- Migration 66: Bill Payment Tracker
-- Track recurring utility bills — electricity, gas, water, broadband, mobile, etc.

CREATE TABLE IF NOT EXISTS public.bill_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL DEFAULT 'electricity',  -- electricity | gas | water | broadband | mobile | cable_tv | ott | maintenance | other
  provider        TEXT NOT NULL DEFAULT '',
  account_number  TEXT DEFAULT '',
  nickname        TEXT DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0,           -- typical/expected amount
  due_day         INTEGER CHECK (due_day BETWEEN 1 AND 31),  -- day of month bill is due
  auto_pay        BOOLEAN NOT NULL DEFAULT false,
  bank_account_id UUID,                                 -- optional link to bank account for auto-pay
  owner           TEXT NOT NULL DEFAULT 'self',
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment history for each bill
CREATE TABLE IF NOT EXISTS public.bill_payment_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id         UUID NOT NULL REFERENCES public.bill_payments(id) ON DELETE CASCADE,
  paid_date       DATE NOT NULL,
  amount          NUMERIC NOT NULL DEFAULT 0,
  units_consumed  NUMERIC,                              -- for electricity/gas — kWh / cubic meters
  payment_method  TEXT DEFAULT '',                      -- UPI | NEFT | auto-debit | cash
  receipt_number  TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bill_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payment_history  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bills"
  ON public.bill_payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own bill history"
  ON public.bill_payment_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_user_id         ON public.bill_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_history_user_id  ON public.bill_payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_history_bill_id  ON public.bill_payment_history(bill_id);
