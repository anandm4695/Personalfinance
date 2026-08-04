-- Migration 73: Vehicle purchase cost breakdown + insurance renewal ledger
-- Adds columns to capture the on-road price breakdown (basic cost + CGST + SGST,
-- separate from RTO registration charges and accessories charges) and a repeatable
-- insurance policy ledger (multiple Own Damage / renewal periods with premium
-- breakdown over the years), mirroring the existing service_history JSONB pattern.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS purchase_basic_cost   numeric(14,2),
  ADD COLUMN IF NOT EXISTS purchase_cgst_amount  numeric(14,2),
  ADD COLUMN IF NOT EXISTS purchase_sgst_amount  numeric(14,2),
  ADD COLUMN IF NOT EXISTS rto_charges           numeric(14,2),
  ADD COLUMN IF NOT EXISTS accessories_charges   numeric(14,2),
  -- array of {id, policyType, insurer, policyNumber, tenure, fromDate, toDate,
  --           basicCost, cgstAmount, sgstAmount, totalPremium, notes}
  ADD COLUMN IF NOT EXISTS insurance_history     jsonb NOT NULL DEFAULT '[]'::jsonb;
