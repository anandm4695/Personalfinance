/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { InvestmentStatementTab } from "../components/tabs/InvestmentStatementTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("InvestmentStatementTab Premium UI Statically", () => {
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
        category: "Equity",
        folioNumber: "FOL123",
        units: 100,
        buyNav: 50,
        currentNav: 55,
        buyDate: "2026-02-15",
      },
    ],
    fixedDeposits: [
      {
        id: "f1",
        bank: "SBI",
        principal: 100000,
        rate: 6.5,
        years: 1,
        startDate: "2026-03-01",
        maturityDate: "2027-03-01",
      },
    ],
    recurringDeposits: [],
    bonds: [],
    ppf: [],
    nps: [],
    epf: [],
    lic: [],
    investmentPlans: [],
  };

  it("should render summary tables, stocks details list, mutual fund details list, FDs lists, and asset allocations", () => {
    const html = renderToString(
      <InvestmentStatementTab state={mockState} metrics={{ netWorth: 120000 }} marketData={{}} />
    );

    // Verify key titles and card details render correctly
    expect(html).toContain("Consolidated Investment Statement");
    expect(html).toContain("Asset Class");
    expect(html).toContain("Equity Stocks");
    expect(html).toContain("Mutual Funds");
    expect(html).toContain("Fixed Deposits");
    expect(html).toContain("Asset Allocation");
  });
});
