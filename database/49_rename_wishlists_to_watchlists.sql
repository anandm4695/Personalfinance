-- Migration 49: Rename wishlists → watchlists, wishlist_items → watchlist_items
-- Safe to run even if migration 48 was never executed (IF EXISTS guards).
-- Run this if you already ran migration 48 and have the old table names.

DO $$
BEGIN
  -- Rename wishlists → watchlists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlists'
  ) THEN
    ALTER TABLE public.wishlists RENAME TO watchlists;
  END IF;

  -- Rename wishlist_items → watchlist_items
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist_items'
  ) THEN
    ALTER TABLE public.wishlist_items RENAME TO watchlist_items;
  END IF;
END $$;

-- Rename the FK column inside watchlist_items: wishlist_id → watchlist_id
-- (only if it still has the old name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'watchlist_items'
      AND column_name  = 'wishlist_id'
  ) THEN
    ALTER TABLE public.watchlist_items RENAME COLUMN wishlist_id TO watchlist_id;
  END IF;
END $$;

-- Rename old indexes (IF EXISTS, PostgreSQL 9.2+)
DROP INDEX IF EXISTS idx_wishlist_items_wishlist_id;
DROP INDEX IF EXISTS idx_wishlist_items_user_id;

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id      ON public.watchlist_items(user_id);
