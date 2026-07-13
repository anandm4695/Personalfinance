/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { XIRRReportTab } from "../components/tabs/XIRRReportTab";
import { calcXIRR, fdMaturity, monthsBetween, fmtINRFull, today } from "../utils/finance";

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

  it("values an active (not-yet-matured) FD using the same quarterly-compounding formula as fdMaturity, not simple annual compounding", () => {
    // Bug: the active-FD branch used principal*(1+rate/100)^elapsed (annual compounding)
    // while the matured branch used fdMaturity() (quarterly compounding), causing a
    // valuation discontinuity right at the maturity boundary. Both branches must now
    // agree on the same compounding formula.
    const startDate = "2024-01-15";
    const principal = 100000;
    const rate = 8;
    const years = 10; // far from maturity so the "active" branch is exercised
    const todayStr = today();
    const elapsed =
      (new Date(todayStr + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
      (365.25 * 24 * 3600 * 1000);
    const expectedCurrentVal = fdMaturity(principal, rate, Math.max(0, elapsed));
    const expectedXIRR = calcXIRR([
      { date: startDate, amount: -principal },
      { date: todayStr, amount: expectedCurrentVal },
    ]);

    const state = {
      fixedDeposits: [{ id: "fd1", bank: "Test Bank", principal, rate, years, startDate }],
      recurringDeposits: [],
      mutualFunds: [],
      stocks: [],
      ppf: [],
      epf: [],
      nps: [],
      bonds: [],
    };
    const html = renderToString(<XIRRReportTab state={state} />);

    expect(expectedXIRR).not.toBeNull();
    expect(html).toContain(`${expectedXIRR!.toFixed(2)}%`);
  });

  it("counts every RD deposit that has actually occurred, unaffected by UTC/local date-string drift", () => {
    // Bug: RD deposit cash-flow dates were built via `d.toISOString().slice(0,10)` on a
    // locally-constructed Date, which rolls the date back a day for any timezone ahead
    // of UTC (e.g. IST, +5:30) — this app's target timezone. That could over/undercount
    // how many monthly deposits have "occurred" by the reporting date. Deposits are on
    // the 1st of the month so the count depends only on elapsed calendar months.
    const startDate = "2023-07-01";
    const monthly = 5000;
    const rate = 7;
    const tenureMonths = 120;
    const todayStr = today();
    const expectedPaidMonths = Math.min(
      tenureMonths,
      Math.max(0, monthsBetween(startDate, todayStr) + 1)
    );
    const expectedInvested = monthly * expectedPaidMonths;

    const state = {
      fixedDeposits: [],
      recurringDeposits: [
        { id: "rd1", bank: "Test Bank", monthly, rate, tenureMonths, startDate },
      ],
      mutualFunds: [],
      stocks: [],
      ppf: [],
      epf: [],
      nps: [],
      bonds: [],
    };
    const html = renderToString(<XIRRReportTab state={state} />);

    // "Total Invested" stat card is plain text (not privacy-masked), and with only
    // one RD in state it equals this RD's invested amount exactly.
    expect(html).toContain(fmtINRFull(expectedInvested));
  });
});
