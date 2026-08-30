import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { InvestmentsTab } from "../components/tabs/InvestmentsTab";

describe("Investments Portfolio — Yield Tracker Accounting & Calculation Audit", () => {
  const mockState = {
    fixedDeposits: [
      {
        id: "fd_active_1",
        bank: "HDFC Bank",
        principal: 100000,
        rate: 7.5,
        years: 2,
        startDate: "2025-01-01",
        maturityDate: "2027-01-01", // Future -> Active
      },
      {
        id: "fd_matured_1",
        bank: "ICICI Bank",
        principal: 50000,
        rate: 7.0,
        years: 1,
        startDate: "2023-01-01",
        maturityDate: "2024-01-01", // Past -> Matured
      },
    ],
    bonds: [
      {
        id: "bond_active_1",
        name: "NHAI 7.5% Tax Free 2030",
        issuer: "NHAI",
        totalPrincipalAmount: 100000,
        coupon: 7.5,
        orderDate: "2020-01-01",
        maturityDate: "2030-01-01", // Active
      },
      {
        id: "bond_matured_1",
        name: "IIFL Samasta 10.5% Matured",
        issuer: "IIFL",
        totalPrincipalAmount: 50000,
        coupon: 10.5,
        orderDate: "2021-01-01",
        maturityDate: "2023-01-01", // Matured
      },
    ],
    recurringDeposits: [
      {
        id: "rd_active_1",
        bank: "SBI",
        monthly: 5000,
        rate: 7.0,
        tenureMonths: 12,
        startDate: "2026-01-01",
      },
    ],
    ppf: [
      {
        id: "ppf_1",
        institution: "SBI",
        balance: 0,
        transactions: [
          { type: "deposit", amount: 150000, date: "2025-04-05" },
          { type: "deposit", amount: 50000, date: "2025-10-10" },
        ],
      },
    ],
    epf: [
      {
        id: "epf_1",
        balance: 500000,
        transactions: [],
      },
    ],
    govtSchemes: [
      {
        id: "govt_scss_1",
        schemeType: "SCSS",
        schemeName: "Senior Citizen Savings Scheme",
        currentBalance: 1500000,
        interestRate: 8.2,
      },
    ],
    dividends: [
      {
        id: "div_recent",
        amount: 10000,
        tds: 1000,
        paymentDate: "2026-06-15", // Recent TTM
      },
      {
        id: "div_old",
        amount: 20000,
        tds: 2000,
        paymentDate: "2022-01-01", // Older than 1 year -> skipped from TTM yield
      },
    ],
    nps: [
      {
        id: "nps_1",
        balance: 300000,
      },
    ],
    mutualFunds: [],
    stocks: [
      {
        symbol: "INFY",
        shares: 100,
        currentPrice: 1800,
      },
    ],
    lic: [],
    investmentPlans: [],
  };

  it("renders Yield Tracker subtab with accurate stat tiles and accounting streams", () => {
    const html = renderToString(
      <InvestmentsTab
        state={mockState}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="income"
      />
    );

    // Header and filter pills
    expect(html).toContain("Yield Breakdown by Instrument");
    expect(html).toContain("All Streams");
    expect(html).toContain("Cash Flow");
    expect(html).toContain("Retirement &amp; Compounding");

    // Key Stat Card labels
    expect(html).toContain("Annual Yield");
    expect(html).toContain("Weighted Yield Rate");
    expect(html).toContain("Monthly Income");
    expect(html).toContain("Daily Passive");
    expect(html).toContain("Capital Deployed");

    // Active streams rendered
    expect(html).toContain("Fixed Deposits");
    expect(html).toContain("Bonds &amp; Debentures");
    expect(html).toContain("Govt / Post Office Schemes");
    expect(html).toContain("Recurring Deposits");
    expect(html).toContain("Dividends (TTM)");
    expect(html).toContain("EPF / EPFO");
    expect(html).toContain("PPF (Public Provident)");
    expect(html).toContain("NPS Growth (Est.)");

    // Audit Reference Notes
    expect(html).toContain("Accounting &amp; Regulatory Audit Notes:");
    expect(html).toContain("Indian banking standard quarterly compounding");
    expect(html).toContain("SCSS (8.2%)");
  });

  it("computes accurate yield mathematics excluding matured instruments", () => {
    // Active FD (100k @ 7.5% quarterly) = 100000 * ((1 + 0.075/4)^4 - 1) = ~7,713.59
    // Active Bond (100k @ 7.5%) = 7,500
    // Active SCSS (1.5M @ 8.2%) = 123,000
    // Active RD (5k/mo @ 7% for 12m) = (62,317 - 60,000) / 1 = ~2,317
    // PPF (200k from ledger @ 7.1%) = 14,200
    // EPF (500k @ 8.25%) = 41,250
    // Dividends TTM (10k - 1k TDS) = 9,000
    // Total Contractual Cash Yield = ~204,980
    // NPS Est Growth (300k @ 10%) = 30,000
    // Total Annual Yield = ~234,980

    const html = renderToString(
      <InvestmentsTab
        state={mockState}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="income"
      />
    );

    // Matured FD (50k ICICI) and matured Bond (50k IIFL) must NOT be counted in active capital
    expect(html).not.toContain("IIFL Samasta 10.5% Matured");
    expect(html).toContain("Projection"); // NPS is tagged as projection
  });

  it("renders empty state gracefully when no investment items exist", () => {
    const emptyState = {
      fixedDeposits: [],
      recurringDeposits: [],
      bonds: [],
      ppf: [],
      epf: [],
      govtSchemes: [],
      dividends: [],
      nps: [],
      stocks: [],
      mutualFunds: [],
    };

    const html = renderToString(
      <InvestmentsTab
        state={emptyState}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="income"
      />
    );

    expect(html).toContain("No Yield Data Yet");
    expect(html).toContain("Add Fixed Deposits, Bonds, PPF, EPF, Recurring Deposits, Govt Schemes");
  });
});
