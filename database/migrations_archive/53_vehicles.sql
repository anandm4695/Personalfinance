-- Migration 53: Vehicles Portfolio
-- Stores vehicle ownership records with embedded service history (JSONB).
-- Service history (tyre changes, battery, repairs, regular service, etc.) is
-- stored as a JSONB array inside each vehicle row — no separate table needed,
-- since service records are always read/written together with the vehicle.

CREATE TABLE IF NOT EXISTS public.vehicles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner                text NOT NULL DEFAULT 'self',

  -- Vehicle identity
  vehicle_type         text NOT NULL DEFAULT 'two-wheeler',  -- two-wheeler | four-wheeler | commercial
  make                 text NOT NULL,                         -- Honda, Maruti, etc.
  model                text NOT NULL,                         -- Activa, Swift, etc.
  year                 integer,                               -- manufacture year
  color                text,
  fuel_type            text DEFAULT 'petrol',                 -- petrol | diesel | electric | cng | hybrid

  -- Registration / chassis
  registration_number  text,
  chassis_number       text,
  engine_number        text,

  -- Purchase details
  purchase_date        date,
  purchase_price       numeric(14,2),
  current_value        numeric(14,2),                        -- current market estimate (user-maintained)

  -- Compliance
  insurance_expiry     date,
  puc_expiry           date,

  -- Service history — array of {id, date, type, description, cost, odometer, serviceCenter, notes}
  service_history      jsonb NOT NULL DEFAULT '[]'::jsonb,

  notes                text,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.vehicles;
CREATE POLICY "Users can access own data" ON public.vehicles
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
