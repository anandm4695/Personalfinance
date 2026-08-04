-- Migration 27: Add ALL missing bond columns (safe to run even if migration 26 was already run)
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.bonds
  -- Core bond fields (migration 26 may have missed issuer)
  add column if not exists issuer                    text,
  add column if not exists order_id                  text,
  add column if not exists isin                      text,
  add column if not exists security_name             text,
  add column if not exists security_nature           text,
  add column if not exists ytm_rate                  numeric,
  add column if not exists buyer_name                text,
  add column if not exists seller_name               text,
  add column if not exists face_value_per_unit       numeric,
  add column if not exists number_of_units           numeric,
  add column if not exists principal_repayment       text,
  add column if not exists interest_payment_date     text,
  add column if not exists order_date                text,
  add column if not exists clean_price_per_unit      numeric,
  add column if not exists accrued_interest_per_unit numeric,
  add column if not exists total_principal_amount    numeric,
  add column if not exists total_accrued_interest    numeric,
  add column if not exists total_consideration       numeric,
  add column if not exists brokerage                 numeric default 0,
  add column if not exists stamp_duty                numeric default 0,
  add column if not exists total_investment_amount   numeric;
