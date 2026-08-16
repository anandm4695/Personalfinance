-- Migration 94: Preserve MF category (Equity/Debt) on the mf_sells ledger
-- InvestmentsTab.tsx already sends `category` on every mutual fund sell so
-- CapitalGainsTab.isEquityMF() can use the user's actual Equity/Debt choice
-- instead of guessing from the fund name text. Without this column the
-- upsert fails with PGRST204, silently drops the field on save, and the
-- capital-gains tax classification (12.5%/20% equity vs 20%/30% debt,
-- 12mo vs 36mo LTCG threshold) reverts to the unreliable name-keyword guess
-- on every reload.
ALTER TABLE public.mf_sells
  ADD COLUMN IF NOT EXISTS category text;
