-- Store gold price per gram in user_settings so the email cron job can use it
-- (the frontend stores it in localStorage which is inaccessible server-side)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS gold_price_per_gram NUMERIC DEFAULT 7200;
