-- Migration 12: Corporate actions history table
-- Records every stock split and bonus share event so users can audit
-- when an action was applied, what ratio was used, and what changed.

CREATE TABLE IF NOT EXISTS public.corporate_actions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null default 'self',
  symbol text not null,
  exchange text not null default 'NSE',
  action_type text not null check (action_type in ('split', 'bonus')),
  ratio_n numeric not null,
  ratio_m numeric not null,
  action_date date,
  old_qty numeric,
  new_qty numeric,
  old_avg_price numeric,
  new_avg_price numeric,
  created_at timestamp with time zone default now()
);

ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.corporate_actions;
CREATE POLICY "Users can access own data" ON public.corporate_actions
  FOR ALL USING (auth.uid() = user_id);
