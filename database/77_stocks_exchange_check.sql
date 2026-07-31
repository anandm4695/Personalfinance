-- Run manually in Supabase SQL editor (not auto-applied).
--
-- Demat/Stocks audit: `stocks.exchange` and `stock_sells.exchange` are read
-- throughout DematTab.tsx to build the Yahoo Finance symbol suffix (.NS/.BO).
-- Neither column had a CHECK constraint, so a typo'd value would silently
-- break that suffix logic instead of failing at the DB layer. `stock_sells`
-- was also nullable with no default, unlike `stocks`, even though both are
-- populated from the same NSE/BSE choice in the UI.

ALTER TABLE stocks
  ADD CONSTRAINT stocks_exchange_check CHECK (exchange IN ('NSE', 'BSE'));

ALTER TABLE stock_sells
  ALTER COLUMN exchange SET DEFAULT 'NSE';

UPDATE stock_sells SET exchange = 'NSE' WHERE exchange IS NULL;

ALTER TABLE stock_sells
  ALTER COLUMN exchange SET NOT NULL,
  ADD CONSTRAINT stock_sells_exchange_check CHECK (exchange IN ('NSE', 'BSE'));
