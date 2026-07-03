/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { RebalancingTab } from "../components/tabs/RebalancingTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("RebalancingTab Premium UI Statically", () => {
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

  it("should render alignment score, presets selectors, comparison donuts, suggestion lists, and detailed break lists", () => {
    const html = renderToString(<RebalancingTab state={mockState} metrics={{}} marketData={{}} />);

    // Verify key titles and card details render correctly
    expect(html).toContain("Smart Rebalancing");
    expect(html).toContain("Portfolio Alignment Score");
    expect(html).toContain("Target Allocation Profile");
    expect(html).toContain("Current Allocation");
    expect(html).toContain("Current vs Target");
    expect(html).toContain("Target Allocation");
    expect(html).toContain("Actionable Suggestions");
    expect(html).toContain("Detailed Breakdown");
  });
});
