-- Migration 78: Current odometer reading on vehicles
-- Lets the owner record a live odometer reading directly on the vehicle,
-- independent of service history. Without this, service-due-by-km alerts and
-- cost-per-km would silently go stale whenever the last logged service is old,
-- since the app previously had no odometer source besides service records.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS current_odometer numeric(12,2);
