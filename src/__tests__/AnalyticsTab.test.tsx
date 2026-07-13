/* eslint-disable */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsTab } from "../components/tabs/AnalyticsTab";
import { useMetrics } from "../hooks/useMetrics";

// jsdom has no layout engine, so recharts' ResponsiveContainer renders zero-size
// and drops its children — swap it for a plain div like the other tab tests do.
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

afterEach(() => {
  cleanup();
});

// Minimal-but-complete empty finance state — every collection AnalyticsTab reads
// directly (via .length / .reduce without a `|| []` fallback) must exist.
function emptyState(overrides: any = {}) {
  return {
    profile: { name: "Test", fy: "2026-27", regime: "new", savingsTarget: 20 },
    settings: {},
    masterData: {},
    bankAccounts: [],
    transactions: [],
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [],
    ppf: [],
    ppfLedger: [],
    nps: [],
    epf: [],
    lic: [],
    termPlans: [],
    investmentPlans: [],
    mutualFunds: [],
    stocks: [],
    demat: [],
    creditCards: [],
    prepaidCards: [],
    loansTaken: [],
    loansGiven: [],
    informalBorrowed: [],
    informalLent: [],
    rentalProperties: [],
    rentedProperties: [],
    realEstateProperties: [],
    vehicles: [],
    goldHoldings: [],
    govtSchemes: [],
    subscriptions: [],
    goals: [],
    income: [],
    taxPayments: [],
    budgets: [],
    recurringExpenses: [],
    reminders: [],
    stockSells: [],
    mfSells: [],
    netWorthHistory: [],
    sips: [],
    ...overrides,
  };
}

// Harness computes `metrics`/`assetBreakdown`/`trendData` via the real useMetrics
// hook (exactly like App.tsx does) so AnalyticsTab receives a properly-shaped
// metrics object instead of a hand-rolled stub that could mask real bugs.
function Harness({ state }: { state: any }) {
  const { metrics, assetBreakdown, trendData } = useMetrics(state, "all", {});
  return (
    <AnalyticsTab
      state={state}
      metrics={metrics}
      assetBreakdown={assetBreakdown}
      trendData={trendData}
      setState={() => {}}
    />
  );
}

describe("AnalyticsTab 80C tracker", () => {
  it("includes NPS employee contributions in the 80C total and stays reactive when only NPS changes", () => {
    // Keep the SAME array references for mutualFunds/ppf/ppfLedger/lic/epf across
    // both renders — only `nps` changes. This reproduces the exact shape of the
    // useMemo staleness bug: taxData80C's dependency array previously omitted
    // `state.nps`, so a re-render that changed nps but nothing else in the list
    // would keep showing the stale (pre-NPS) 80C total instead of recomputing.
    const mutualFunds: any[] = [];
    const ppf: any[] = [];
    const ppfLedger: any[] = [];
    const lic: any[] = [];
    const epf: any[] = [];

    const state1 = emptyState({ mutualFunds, ppf, ppfLedger, lic, epf, nps: [] });

    const { rerender } = render(<Harness state={state1} />);
    fireEvent.click(screen.getByText("Planning"));

    // No 80C contributions yet → full ₹1,50,000 remaining.
    let remainingIdx = screen.getByText("Remaining Space");
    expect(remainingIdx.parentElement?.textContent).toContain("₹1,50,000");

    // Only `nps` changes; mutualFunds/ppf/ppfLedger/lic/epf keep identical references.
    const state2 = emptyState({
      mutualFunds,
      ppf,
      ppfLedger,
      lic,
      epf,
      nps: [{ id: "n1", yearContribution: 60000 }],
    });

    rerender(<Harness state={state2} />);

    // 80C total should now include the ₹60,000 NPS contribution → ₹90,000 remaining.
    remainingIdx = screen.getByText("Remaining Space");
    expect(remainingIdx.parentElement?.textContent).toContain("₹90,000");
    expect(remainingIdx.parentElement?.textContent).not.toContain("₹1,50,000");
  });
});
