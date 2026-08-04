-- Migration 48: Stock Watchlists
-- Creates two tables:
--   watchlists       — named watchlists (e.g. "Tech Picks", "Blue Chip")
--   watchlist_items  — individual stocks inside each watchlist

CREATE TABLE IF NOT EXISTS public.watchlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner        text NOT NULL DEFAULT 'self',
  name         text NOT NULL,
  description  text,
  color        text DEFAULT '#6366f1',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.watchlists;
CREATE POLICY "Users can access own data" ON public.watchlists
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner         text NOT NULL DEFAULT 'self',
  watchlist_id  uuid NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  symbol        text NOT NULL,
  exchange      text NOT NULL DEFAULT 'NSE',
  target_price  numeric(14,2),
  notes         text,
  added_on      date DEFAULT CURRENT_DATE
);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.watchlist_items;
CREATE POLICY "Users can access own data" ON public.watchlist_items
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
