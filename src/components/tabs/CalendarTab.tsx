// @ts-nocheck
import React, { useState } from "react";
import { CalendarClock, Milestone } from "lucide-react";
import { THEME } from "../../utils/constants";
import { SectionTitle } from "../ui/SectionTitle";
import { FinancialCalendarTab } from "./FinancialCalendarTab";
import { PaymentCalendarTab } from "./PaymentCalendarTab";

/**
 * Merges what used to be two separate nav entries — "Financial Calendar" and
 * "Payment Calendar" — into one screen with a view toggle. The two were
 * independently-coded views over overlapping source data (subscriptions,
 * insurance premiums), which had already let a real bug (health/LIC/Term
 * premiums under-annualized in one of the two) ship in one twin but not the
 * other. Neither inner component was rewritten here — "Payments" is the
 * existing month-grid/bar-chart recurring-outflow view, "Milestones" is the
 * existing dismissible list of one-off/annual events (maturities, dividends,
 * renewals) — this just gives them one shared header + toggle instead of two
 * separate, confusingly-similarly-named nav destinations.
 */
export const CalendarTab = ({ state, metrics, addItem, showToast, onNavigateToTab }: any) => {
  const [view, setView] = useState<"payments" | "milestones">("payments");

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub={
          view === "payments"
            ? "Every recurring outflow — EMIs, SIPs, RDs, subscriptions, bills, credit cards & insurance premiums"
            : "One-off and annual events — maturities, dividends, renewals & premium due dates"
        }
        rightElement={
          <div
            style={{
              display: "flex",
              border: `1.5px solid ${THEME.line}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setView("payments")}
              aria-label="Payments view"
              aria-pressed={view === "payments"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                border: "none",
                background: view === "payments" ? "var(--t-accent)" : "var(--surface-0)",
                color: view === "payments" ? "#fff" : THEME.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <CalendarClock size={14} /> Payments
            </button>
            <button
              onClick={() => setView("milestones")}
              aria-label="Milestones view"
              aria-pressed={view === "milestones"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                border: "none",
                borderLeft: `1.5px solid ${THEME.line}`,
                background: view === "milestones" ? "var(--t-accent)" : "var(--surface-0)",
                color: view === "milestones" ? "#fff" : THEME.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Milestone size={14} /> Milestones
            </button>
          </div>
        }
      >
        Financial Calendar
      </SectionTitle>

      {view === "payments" ? (
        <PaymentCalendarTab state={state} metrics={metrics} addItem={addItem} showToast={showToast} embedded />
      ) : (
        <FinancialCalendarTab state={state} metrics={metrics} onNavigateToTab={onNavigateToTab} embedded />
      )}
    </div>
  );
};
