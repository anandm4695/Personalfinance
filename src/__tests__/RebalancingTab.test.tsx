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
      {
        id: "m2",
        schemeName: "Nippon Gold ETF",
        category: "Gold ETF",
        units: 50,
        buyNav: 50,
        currentNav: 60,
      },
    ],
    fixedDeposits: [{ id: "fd1", principal: 100000, rate: 7.5 }],
    recurringDeposits: [],
    bonds: [],
    ppf: [{ id: "ppf1", balance: 50000 }],
    nps: [{ id: "nps1", balance: 75000 }],
    epf: [{ id: "epf1", employeeShare: 50000, employerShare: 50000, pensionShare: 20000 }],
    lic: [],
    investmentPlans: [],
    goldHoldings: [{ id: "g1", type: "physical", grams: 10, purity: "24K" }],
    bankAccounts: [{ id: "a1", balance: 50000, name: "Savings Account" }],
    prepaidCards: [],
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
    expect(html).toContain("Deploy New Money");
    expect(html).toContain("SIP Rebalancing");
    expect(html).toContain("Liquid vs Locked");
    expect(html).toContain("5/25 Rebalancing Rule");
  });

  it("should render empty state when portfolio has no investments", () => {
    const emptyState = {
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
      goldHoldings: [],
      bankAccounts: [],
      prepaidCards: [],
    };
    const html = renderToString(<RebalancingTab state={emptyState} metrics={{}} marketData={{}} />);
    expect(html).toContain("No Portfolio Data");
    expect(html).toContain("Add investments to see rebalancing suggestions");
  });
});
