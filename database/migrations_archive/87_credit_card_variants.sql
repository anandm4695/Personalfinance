-- MIGRATION 87: Add variants JSONB column to credit_cards for dual and multi-card accounts (e.g. Scapia Visa + RuPay, Sapphiro MC + Amex)
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.credit_cards.variants IS 'Linked card variants for dual-card single-account setups (e.g. Scapia Visa + RuPay UPI, Sapphiro MC + Amex)';
