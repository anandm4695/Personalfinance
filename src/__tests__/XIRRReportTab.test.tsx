/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { XIRRReportTab } from "../components/tabs/XIRRReportTab";
import { calcXIRR, fdMaturity, monthsBetween, fmtINRFull, today } from "../utils/finance";
import { PrivacyProvider } from "../context/PrivacyContext";

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
    govtSchemes: [],
    realEstateProperties: [],
  };

  it("should render overall portfolio stats, hero KPIs, sub-view navigation, and color guide details", () => {
    const html = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={mockState} />
      </PrivacyProvider>
    );

    // Verify key elements and labels render correctly
    expect(html).toContain("XIRR Report");
    expect(html).toContain("Portfolio Blended XIRR");
    expect(html).toContain("Total Invested");
    expect(html).toContain("Current Value");
    expect(html).toContain("Total Wealth Created");
    expect(html).toContain("Overview &amp; Analytics");
    expect(html).toContain("Holdings Explorer");
    expect(html).toContain("Asset Classes");
    expect(html).toContain("What-If Simulator");
    expect(html).toContain("Benchmark Matrix");
    expect(html).toContain("XIRR Benchmarks (Annualised)");
  });

  it("values an active (not-yet-matured) FD using the same quarterly-compounding formula as fdMaturity, not simple annual compounding", () => {
    const startDate = "2024-01-15";
    const principal = 100000;
    const rate = 8;
    const years = 10;
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
    const html = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={state} />
      </PrivacyProvider>
    );

    expect(expectedXIRR).not.toBeNull();
    expect(html).toContain(`${expectedXIRR!.toFixed(2)}%`);
  });

  it("counts every RD deposit that has actually occurred, unaffected by UTC/local date-string drift", () => {
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
    const html = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={state} />
      </PrivacyProvider>
    );

    expect(html).toContain(fmtINRFull(expectedInvested));
  });

  it("correctly includes EPF, NPS, Bonds, Govt Schemes and Real Estate in XIRR report holdings view", () => {
    const state = {
      fixedDeposits: [],
      recurringDeposits: [],
      mutualFunds: [],
      stocks: [],
      ppf: [],
      epf: [
        {
          id: "epf1",
          employer: "TechCorp",
          balance: 150000,
          transactions: [
            { date: "2024-01-15", employeeShare: 10000, employerShare: 10000, type: "monthly_contribution" },
          ],
        },
      ],
      nps: [
        {
          id: "nps1",
          institution: "HDFC Pension",
          balance: 80000,
          transactions: [
            { date: "2024-02-01", employeeAmount: 5000, employerAmount: 5000 },
          ],
        },
      ],
      bonds: [
        {
          id: "bond1",
          name: "SGB 2028",
          orderDate: "2024-01-01",
          totalInvestmentAmount: 50000,
          coupon: 2.5,
        },
      ],
      govtSchemes: [
        {
          id: "gov1",
          name: "Sukanya Samriddhi",
          startDate: "2024-01-01",
          contributionAmount: 50000,
          currentBalance: 55000,
          interestRate: 8.2,
        },
      ],
      realEstateProperties: [
        {
          id: "re1",
          name: "Palm Heights Villa",
          purchaseDate: "2023-01-01",
          purchasePrice: 5000000,
          marketValue: 6200000,
          status: "active",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={state} initialTab="holdings" />
      </PrivacyProvider>
    );
    expect(html).toContain("TechCorp");
    expect(html).toContain("HDFC Pension");
    expect(html).toContain("SGB 2028");
    expect(html).toContain("Sukanya Samriddhi");
    expect(html).toContain("Palm Heights Villa");
  });

  it("renders specialized views: asset-classes, cashflows, simulator, benchmarks", () => {
    const assetClassesHtml = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={mockState} initialTab="asset-classes" />
      </PrivacyProvider>
    );
    expect(assetClassesHtml).toContain("Fixed Deposit");
    expect(assetClassesHtml).toContain("Mutual Fund");

    const cashflowsHtml = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={mockState} initialTab="cashflows" />
      </PrivacyProvider>
    );
    expect(cashflowsHtml).toContain("Consolidated Cash Flow Ledger");

    const simulatorHtml = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={mockState} initialTab="simulator" />
      </PrivacyProvider>
    );
    expect(simulatorHtml).toContain("Simulation Parameters");
    expect(simulatorHtml).toContain("Projected Portfolio XIRR");

    const benchmarksHtml = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={mockState} initialTab="benchmarks" />
      </PrivacyProvider>
    );
    expect(benchmarksHtml).toContain("Institutional Indian Benchmarks");
    expect(benchmarksHtml).toContain("Nifty 50 TRI");
  });

  it("gracefully renders EmptyState when no investments are available", () => {
    const emptyState = {
      fixedDeposits: [],
      recurringDeposits: [],
      mutualFunds: [],
      stocks: [],
      ppf: [],
      epf: [],
      nps: [],
      bonds: [],
    };
    const html = renderToString(
      <PrivacyProvider>
        <XIRRReportTab state={emptyState} />
      </PrivacyProvider>
    );
    expect(html).toContain("No Investment Data");
  });
});
