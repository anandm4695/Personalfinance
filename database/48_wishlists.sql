-- Migration 48: Stock Wishlists
-- Creates two tables:
--   wishlists       — named watchlists (e.g. "Tech Picks", "Blue Chip")
--   wishlist_items  — individual stocks inside each wishlist

CREATE TABLE IF NOT EXISTS public.wishlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner        text NOT NULL DEFAULT 'self',
  name         text NOT NULL,
  description  text,
  color        text DEFAULT '#6366f1',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.wishlists;
CREATE POLICY "Users can access own data" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner         text NOT NULL DEFAULT 'self',
  wishlist_id   uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  symbol        text NOT NULL,
  exchange      text NOT NULL DEFAULT 'NSE',
  target_price  numeric(14,2),
  notes         text,
  added_on      date DEFAULT CURRENT_DATE
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.wishlist_items;
CREATE POLICY "Users can access own data" ON public.wishlist_items
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
