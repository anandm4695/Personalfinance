-- Migration 49: Rename wishlists → watchlists, wishlist_items → watchlist_items
-- Handles three cases:
--   A) wishlists exists, watchlists does NOT → rename it
--   B) wishlists exists, watchlists ALSO exists → drop the old empty table
--   C) only watchlists exists (or neither) → nothing to do

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlists'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'watchlists'
    ) THEN
      -- watchlists already created fresh; drop the old wishlists table
      DROP TABLE public.wishlists CASCADE;
    ELSE
      ALTER TABLE public.wishlists RENAME TO watchlists;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist_items'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'watchlist_items'
    ) THEN
      DROP TABLE public.wishlist_items CASCADE;
    ELSE
      ALTER TABLE public.wishlist_items RENAME TO watchlist_items;
    END IF;
  END IF;
END $$;

-- Rename FK column wishlist_id → watchlist_id (only if still has old name)
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

-- Recreate indexes with correct names
DROP INDEX IF EXISTS idx_wishlist_items_wishlist_id;
DROP INDEX IF EXISTS idx_wishlist_items_user_id;

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id      ON public.watchlist_items(user_id);
