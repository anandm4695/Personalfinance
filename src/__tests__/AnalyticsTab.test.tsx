/* eslint-disable */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsTab } from "../components/tabs/AnalyticsTab";
import { useMetrics } from "../hooks/useMetrics";
import { PrivacyProvider } from "../context/PrivacyContext";

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
    <PrivacyProvider>
      <AnalyticsTab
        state={state}
        metrics={metrics}
        assetBreakdown={assetBreakdown}
        trendData={trendData}
        setState={() => {}}
      />
    </PrivacyProvider>
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

// ---------------------------------------------------------------------------
// Net Worth Growth chart — backdated entries must move the month they're
// dated for, not just today's snapshot (previously read from frozen
// state.netWorthHistory snapshots; now reconstructed via computeNetWorthAsOf).
// ---------------------------------------------------------------------------
function ymMonthsAgo(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dateMonthsAgo(n: number): string {
  return `${ymMonthsAgo(n)}-15`;
}

describe("AnalyticsTab Net Worth Growth chart", () => {
  it("reflects a backdated Fixed Deposit starting at its own month, not just today", () => {
    // Flat ₹1,00,000 baseline (bank cash, no date data) for the whole default 12-month
    // lookback window, plus a ₹50,000 FD dated 3 months ago. Default trend period is "6M",
    // which spans (today-5) .. today — the FD's start month falls inside that window, so
    // the growth % over that window should be exactly 50%, not 0% (which is what the old
    // frozen-snapshot code would have shown, since only today's snapshot would ever move).
    const state = emptyState({
      bankAccounts: [{ id: "b1", balance: 100000 }],
      fixedDeposits: [{ id: "f1", principal: 50000, startDate: dateMonthsAgo(3) }],
    });

    render(<Harness state={state} />);
    fireEvent.click(screen.getByText("Trends"));

    // "Net Worth" also labels an always-visible header tile elsewhere on the page —
    // find the one inside the Trends KPI strip, identified by its delta chip showing a %.
    const netWorthCard = screen
      .getAllByText("Net Worth")
      .map((el) => el.parentElement?.parentElement)
      .find((card) => card?.textContent?.includes("%"));
    expect(netWorthCard?.textContent).toContain("50.0%");
  });

  it("still produces a multi-point trend for a non-'all' profile filter (no collapsed single-point special case)", () => {
    const state = emptyState({
      bankAccounts: [{ id: "b1", balance: 100000, owner: "self" }],
      fixedDeposits: [{ id: "f1", principal: 50000, startDate: dateMonthsAgo(3), owner: "self" }],
    });

    function ProfileHarness() {
      const { filteredState, metrics, assetBreakdown, trendData } = useMetrics(state, "self", {});
      return (
        <PrivacyProvider>
          <AnalyticsTab
            state={filteredState}
            metrics={metrics}
            assetBreakdown={assetBreakdown}
            trendData={trendData}
            setState={() => {}}
            activeProfile="self"
          />
        </PrivacyProvider>
      );
    }

    render(<ProfileHarness />);
    fireEvent.click(screen.getByText("Trends"));

    // A real multi-month trend produces a delta %; the old single-point special case for
    // non-"all" profiles rendered no delta chip at all for this metric.
    const netWorthCard = screen
      .getAllByText("Net Worth")
      .map((el) => el.parentElement?.parentElement)
      .find((card) => card?.textContent?.includes("50.0%"));
    expect(netWorthCard).toBeTruthy();
  });
});
