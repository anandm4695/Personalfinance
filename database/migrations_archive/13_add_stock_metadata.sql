-- Migration 13: Add sector and market_cap to stocks table for metadata persistence
-- This allows sector and market cap analytics to persist across devices and reloads
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS market_cap numeric;

-- Also add to stock_sells to enable historical sector-based performance analysis
ALTER TABLE public.stock_sells
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS market_cap numeric;
