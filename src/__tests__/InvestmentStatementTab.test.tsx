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
    goldHoldings: [],
    govtSchemes: [],
    realEstateProperties: [],
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

  it("renders executive KPI hero and metric cards", () => {
    const html = renderToString(
      <InvestmentStatementTab state={mockState} metrics={{ netWorth: 120000 }} marketData={{}} />
    );

    expect(html).toContain("Total Portfolio Value");
    expect(html).toContain("Total Unrealized Gain");
    expect(html).toContain("Guaranteed");
    expect(html).toContain("Dominant Asset Class");
    expect(html).toContain("Liquid Growth Assets");
  });

  it("renders view mode tabs and action buttons", () => {
    const html = renderToString(
      <InvestmentStatementTab state={mockState} metrics={{ netWorth: 120000 }} marketData={{}} />
    );

    expect(html).toContain("Consolidated Statement");
    expect(html).toContain("Asset Allocation");
    expect(html).toContain("Maturity Radar");
    expect(html).toContain("All Holdings");
    expect(html).toContain("Summary CSV");
    expect(html).toContain("Holdings CSV");
    expect(html).toContain("Print");
  });

  it("renders empty state when no holdings are present", () => {
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
      govtSchemes: [],
      realEstateProperties: [],
    };

    const html = renderToString(
      <InvestmentStatementTab state={emptyState} metrics={{ netWorth: 0 }} marketData={{}} />
    );

    expect(html).toContain("No Investments Yet");
  });

  it("computes Days to Maturity as an exact calendar-day count, independent of current time-of-day", () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const maturityDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

    const state = {
      stocks: [],
      mutualFunds: [],
      fixedDeposits: [
        {
          id: "f1",
          bank: "Test Bank",
          principal: 100000,
          rate: 7,
          years: 1,
          startDate: "2026-01-01",
          maturityDate,
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

    const html = renderToString(
      <InvestmentStatementTab state={state} metrics={{ netWorth: 100000 }} marketData={{}} />
    );

    expect(html).toContain(">10d<");
  });
});
