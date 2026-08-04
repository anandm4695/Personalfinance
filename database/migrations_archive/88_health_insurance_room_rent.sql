-- Migration 88: Room-rent sub-limit field for Health Insurance
--
-- HealthInsuranceTab.tsx (senior audit, Aug 2026) adds a "Room Rent Sub-limit" field
-- to the policy form/card — e.g. "1% of SI/day", "Single Private AC Room", "No Limit"
-- — so a policy with a capped room-rent clause (which can trigger a "proportionate
-- deduction" on the WHOLE claim, not just the room charge, if exceeded) is visibly
-- flagged instead of being a silent gotcha the user only discovers at claim time.
--
-- The app's generic camelToSnake() save path sends every camelCase field on a
-- healthInsurance record straight through as a snake_case column
-- (roomRentLimit -> room_rent_limit), so this column must exist or ALL saves to this
-- table (not just ones using the new field) would fail. `claims` (jsonb) already
-- exists from migration 64 and needed no new column — only this one does.

ALTER TABLE public.health_insurance
  ADD COLUMN IF NOT EXISTS room_rent_limit TEXT DEFAULT '';
