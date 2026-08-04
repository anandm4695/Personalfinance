-- Migration 89: SIP Tracker — status (active/paused/stopped) + annual step-up %
--
-- Prior to this migration, SmartAlertsTab.tsx (`sip.status === "stopped" || "paused"`)
-- and finance.ts's getEmergencyFundMonthlyExpense (`s.status !== "stopped"`) already
-- read a `status` field off SIP records that SIPTrackerTab.tsx never actually wrote —
-- the field was always undefined, so those checks were silent no-ops. This migration
-- adds the column so the SIP Tracker's new Pause/Resume/Stop controls persist real data
-- for those call sites to read.
--
-- `step_up_pct` backs the new "Annual Step-Up %" field in the Add/Edit SIP modal,
-- letting a user model a SIP whose installment amount rises by a fixed % every year
-- (e.g. a "raise-with-salary" SIP), used by SIPTrackerTab's corpus/projection math.

ALTER TABLE public.sips ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.sips ADD COLUMN IF NOT EXISTS step_up_pct numeric DEFAULT 0;

-- Keep status constrained to the 3 values the UI supports.
ALTER TABLE public.sips DROP CONSTRAINT IF EXISTS sips_status_check;
ALTER TABLE public.sips ADD CONSTRAINT sips_status_check
  CHECK (status IN ('active', 'paused', 'stopped'));
