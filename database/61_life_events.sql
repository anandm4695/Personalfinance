-- Life Event Planner
CREATE TABLE IF NOT EXISTS life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  owner TEXT NOT NULL DEFAULT 'self',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other', -- education, home, car, wedding, vacation, baby, retirement, other
  target_date DATE,
  estimated_cost NUMERIC DEFAULT 0,
  current_saved NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'medium', -- high, medium, low
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "life_events_user_policy" ON life_events
  FOR ALL USING (auth.uid() = user_id);
