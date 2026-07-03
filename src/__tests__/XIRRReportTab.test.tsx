/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { XIRRReportTab } from "../components/tabs/XIRRReportTab";

describe("XIRRReportTab Premium UI Statically", () => {
  const mockState = {
    fixedDeposits: [
      {
        id: "fd1",
        bank: "SBI",
        principal: 100000,
        rate: 7.1,
        years: 2,
        startDate: "2026-01-01",
        maturityDate: "2028-01-01",
        owner: "self",
      },
    ],
    recurringDeposits: [],
    mutualFunds: [
      {
        id: "mf1",
        name: "Axis Bluechip",
        units: 1000,
        buyNav: 40,
        currentNav: 48,
        invested: 40000,
        buyDate: "2026-01-01",
        owner: "spouse",
      },
    ],
    stocks: [],
    ppf: [],
    epf: [],
    nps: [],
    bonds: [],
  };

  it("should render overall portfolio stats, per-type tables, itemized listings, and color guide details", () => {
    const html = renderToString(<XIRRReportTab state={mockState} />);

    // Verify key elements and labels render correctly
    expect(html).toContain("XIRR Report");
    expect(html).toContain("Portfolio XIRR");
    expect(html).toContain("Total Invested");
    expect(html).toContain("Current Value");
    expect(html).toContain("Total Gain / Loss");
    expect(html).toContain("Fixed Deposit");
    expect(html).toContain("Mutual Fund");
    expect(html).toContain("XIRR Benchmarks");
  });
});
