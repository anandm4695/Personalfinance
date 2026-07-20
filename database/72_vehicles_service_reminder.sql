-- Migration 72: Next-service reminder for vehicles
-- Adds date/odometer fields so users can set a "next service due" reminder
-- (either or both may be set), surfaced as alerts/badges in the Vehicles tab.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS next_service_due_date date,
  ADD COLUMN IF NOT EXISTS next_service_due_odometer numeric(12,2);
