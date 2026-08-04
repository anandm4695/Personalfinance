-- Migration 50: Add folio number, buy NAV, buy date, and MF code to mutual_funds
-- folio_number : the AMFI folio number assigned to this holding
-- buy_nav      : NAV at the time of first/average purchase (cost basis)
-- buy_date     : date of first/average purchase
-- mf_code      : numeric AMFI scheme code used by mfapi.in for live NAV lookup

ALTER TABLE public.mutual_funds
  ADD COLUMN IF NOT EXISTS folio_number text,
  ADD COLUMN IF NOT EXISTS buy_nav      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buy_date     date,
  ADD COLUMN IF NOT EXISTS mf_code      text;
