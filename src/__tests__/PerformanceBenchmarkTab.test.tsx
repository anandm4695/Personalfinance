/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PerformanceBenchmarkTab } from "../components/tabs/PerformanceBenchmarkTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("PerformanceBenchmarkTab Premium UI Statically", () => {
  const mockState = {
    stocks: [
      {
        id: "s1",
        symbol: "RELIANCE.NS",
        exchange: "NSE",
        qty: 10,
        avgPrice: 2400,
        buyDate: "2026-01-10",
        currentPrice: 2550,
      },
    ],
    mutualFunds: [
      {
        id: "m1",
        schemeName: "HDFC Top 100",
        category: "Equity Mutual Funds",
        folioNumber: "FOL123",
        units: 100,
        buyNav: 50,
        currentNav: 55,
      },
    ],
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [],
    ppf: [],
    nps: [],
    epf: [],
    lic: [],
    investmentPlans: [],
    bankAccounts: [{ id: "a1", balance: 50000, name: "Savings Account" }],
  };

  it("should render overall returns, total invested stats, benchmarks comparison charts, and health radars", () => {
    const html = renderToString(
      <PrivacyProvider>
        <PerformanceBenchmarkTab
          state={mockState}
          metrics={{
            monthIncome: 100000,
            monthExpense: 30000,
            debtToAssetRatio: 10,
            overallGoalPct: 45,
            emergencyFund: { monthsCovered: 1.67 },
          }}
          marketData={{}}
        />
      </PrivacyProvider>
    );

    // Verify key titles and card details render correctly
    expect(html).toContain("Performance Benchmark");
    expect(html).toContain("Overall Return");
    expect(html).toContain("Total Invested");
    expect(html).toContain("Financial Health");
    expect(html).toContain("Your Returns vs Benchmarks");
    expect(html).toContain("Asset Class Performance");
    expect(html).toContain("Financial Health Radar");
    expect(html).toContain("Score Breakdown");
  });

  it("applies the purity discount to physical gold value, matching the calc used in GoldSGBTab/RebalancingTab/useMetrics", () => {
    // Bug: goldValue was computed as grams * pricePerGram with no purity adjustment,
    // overstating the value (and return %) of sub-24K physical holdings.
    const goldOnlyState = {
      stocks: [],
      mutualFunds: [],
      fixedDeposits: [],
      recurringDeposits: [],
      bonds: [],
      ppf: [],
      nps: [],
      epf: [],
      lic: [],
      investmentPlans: [],
      bankAccounts: [],
      goldHoldings: [
        { id: "g1", type: "physical", purity: "22K", grams: 100, purchasePrice: 500000 },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <PerformanceBenchmarkTab
          state={goldOnlyState}
          metrics={{
            monthIncome: 0,
            monthExpense: 0,
            debtToAssetRatio: 0,
            overallGoalPct: 0,
            emergencyFund: { monthsCovered: 0 },
          }}
          marketData={{}}
        />
      </PrivacyProvider>
    );

    // goldPricePerGram defaults to 7200 (no localStorage override in tests).
    // Fixed: goldValue = 100 * 7200 * (22/24) = 660000 → return = (660000-500000)/500000*100 = 32.0%
    // Buggy: goldValue = 100 * 7200 = 720000 → return = 44.0%
    expect(html).toContain("32.0%");
    expect(html).not.toContain("44.0%");
  });
});
