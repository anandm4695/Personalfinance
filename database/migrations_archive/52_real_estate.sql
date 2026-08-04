-- Migration 52: Real Estate Portfolio
-- Creates three tables:
--   real_estate_properties — property records (purchases + sales)
--   real_estate_demands    — demand letters / installment calls from builder
--   real_estate_payments   — payments made against a property / demand

CREATE TABLE IF NOT EXISTS public.real_estate_properties (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner               text NOT NULL DEFAULT 'self',
  name                text NOT NULL,
  type                text NOT NULL DEFAULT 'residential',
  status              text NOT NULL DEFAULT 'owned',
  location            text,
  developer_name      text,
  seller_name         text,
  rera_number         text,
  area_sqft           numeric(14,2),
  purchase_date       date,
  registration_date   date,
  possession_date     date,
  agreement_value     numeric(14,2),
  stamp_duty          numeric(14,2),
  tds_value           numeric(14,2),
  market_value        numeric(14,2),
  sale_date           date,
  sale_price          numeric(14,2),
  sale_stamp_duty     numeric(14,2),
  sale_tds            numeric(14,2),
  notes               text,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_properties;
CREATE POLICY "Users can access own data" ON public.real_estate_properties
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_properties_user_id ON public.real_estate_properties(user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.real_estate_demands (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner        text NOT NULL DEFAULT 'self',
  property_id  uuid NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
  demand_date  date,
  due_date     date,
  milestone    text,
  amount       numeric(14,2),
  gst_amount   numeric(14,2),
  total_amount numeric(14,2),
  status       text NOT NULL DEFAULT 'pending',
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_demands;
CREATE POLICY "Users can access own data" ON public.real_estate_demands
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_demands_user_id     ON public.real_estate_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_re_demands_property_id ON public.real_estate_demands(property_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.real_estate_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner            text NOT NULL DEFAULT 'self',
  property_id      uuid NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
  demand_id        uuid REFERENCES public.real_estate_demands(id) ON DELETE SET NULL,
  payment_date     date,
  amount           numeric(14,2),
  payment_mode     text DEFAULT 'NEFT',
  reference_number text,
  note             text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.real_estate_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.real_estate_payments;
CREATE POLICY "Users can access own data" ON public.real_estate_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_re_payments_user_id     ON public.real_estate_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_re_payments_property_id ON public.real_estate_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_re_payments_demand_id   ON public.real_estate_payments(demand_id);
