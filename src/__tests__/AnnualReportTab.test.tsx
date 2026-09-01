/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { AnnualReportTab } from "../components/tabs/AnnualReportTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
}));

describe("AnnualReportTab Premium UI Statically", () => {
  const mockState = {
    income: [{ id: "1", date: "2025-04-15", amount: 150000, category: "Salary" }],
    transactions: [{ id: "2", date: "2025-05-10", amount: 50000, type: "debit", category: "Rent" }],
    netWorthHistory: [
      { month: "2025-04", netWorth: 1000000 },
      { month: "2025-05", netWorth: 1100000 },
    ],
  };

  const mockMetrics = {
    netWorth: 1100000,
  };

  it("should render premium elements successfully", () => {
    const html = renderToString(<AnnualReportTab state={mockState} metrics={mockMetrics} />);

    // Verify key UI titles and premium bento grid labels are present in static HTML
    expect(html).toContain("Annual Report");
    expect(html).toContain("Executive Financial Summary");
    expect(html).not.toBeNull();
    expect(html).toContain("Opening Net Worth");
    expect(html).toContain("Closing Net Worth");
    expect(html).toContain("NW Change");
    expect(html).toContain("Savings Rate");
    expect(html).toContain("Financial Health Snapshot");
  });

  it("uses the prior FY's March closing snapshot as Opening Net Worth, not the current FY's April entry", () => {
    // FY boundary bug: "opening" balance of a FY must be the closing balance of the PREVIOUS
    // FY (its March snapshot), not the current FY's own April snapshot — April already reflects
    // a month of movement within the FY being reported on.
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const openingMarchKey = `${fyStartYear}-03`;
    const aprilKey = `${fyStartYear}-04`;

    const state = {
      income: [],
      transactions: [],
      netWorthHistory: [
        { month: openingMarchKey, netWorth: 900000 },
        { month: aprilKey, netWorth: 1000000 },
      ],
    };
    const metrics = { netWorth: 0 };

    const html = renderToString(
      <PrivacyProvider>
        <AnnualReportTab state={state} metrics={metrics} />
      </PrivacyProvider>
    );

    // Scope the assertion to the "Opening Net Worth" card specifically (it renders before the
    // "Closing Net Worth" card, which legitimately shows the April/current value).
    const openingIdx = html.indexOf("Opening Net Worth");
    const closingIdx = html.indexOf("Closing Net Worth");
    expect(openingIdx).toBeGreaterThan(-1);
    expect(closingIdx).toBeGreaterThan(openingIdx);
    const openingCardHtml = html.slice(openingIdx, closingIdx);

    expect(openingCardHtml).toContain("₹9,00,000");
    expect(openingCardHtml).not.toContain("₹10,00,000");
  });
  it("correctly separates active loan EMIs from closed loans in debt analysis", () => {
    const now = new Date();
    const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyDate = `${currentFY}-06-15`;

    const state = {
      income: [{ id: "1", date: fyDate, amount: 200000, category: "Salary" }],
      transactions: [],
      loansTaken: [
        {
          id: "loan-active",
          name: "Active Home Loan",
          principal: 5000000,
          outstanding: 4500000,
          monthlyPayment: 45000,
          monthsRemaining: 180,
          interestRate: 8.5,
          status: "active",
        },
        {
          id: "loan-closed",
          name: "Closed Personal Loan",
          principal: 500000,
          outstanding: 0,
          monthlyPayment: 25000,
          monthsRemaining: 0,
          interestRate: 12,
          status: "closed",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <AnnualReportTab state={state} metrics={{ netWorth: 4500000 }} />
      </PrivacyProvider>
    );

    // Debt section should be present
    expect(html).toContain("Debt Summary");
    // Active loan Annual EMI should be 45k * 12 = 5,40,000, not (45k + 25k) * 12 = 8,40,000
    expect(html).toContain("₹5,40,000");
    // Closed loan milestone should be recorded in highlights
    expect(html).toContain("fully repaid");
  });

  it("deduplicates rental receipts if rental income is already present in income ledger", () => {
    const now = new Date();
    const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyDate = `${currentFY}-05-10`;

    const state = {
      income: [
        { id: "inc-1", date: fyDate, amount: 100000, category: "Salary" },
        { id: "inc-2", date: fyDate, amount: 30000, category: "Rent" },
      ],
      transactions: [],
      rentalProperties: [
        {
          id: "prop-1",
          name: "Apartment 101",
          receipts: [{ id: "rec-1", date: fyDate, amount: 30000 }],
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <AnnualReportTab state={state} metrics={{ netWorth: 1000000 }} />
      </PrivacyProvider>
    );

    // Total income should be ₹1,30,000 (100k salary + 30k rent), not ₹1,60,000 (double counted)
    expect(html).toContain("₹1,30,000");
  });

  it("detects FY data and TDS from salary slips and taxes", () => {
    const now = new Date();
    const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const slipMonth = `${currentFY}-07`;

    const state = {
      income: [],
      transactions: [],
      salarySlips: [
        {
          id: "slip-1",
          slipMonth,
          date: `${slipMonth}-31`,
          grossEarnings: 200000,
          netSalary: 160000,
          tdsDeduction: 30000,
          epfDeduction: 10000,
        },
      ],
      taxPayments: [
        {
          id: "tax-1",
          date: `${currentFY}-09-15`,
          amount: 25000,
          type: "Advance Tax",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <AnnualReportTab state={state} metrics={{ netWorth: 500000 }} />
      </PrivacyProvider>
    );

    // FY should be detected and Annual Report rendered (not "No Financial Data")
    expect(html).toContain("Annual Report");
    expect(html).toContain("Tax Summary");
    // TDS (30,000) + Advance Tax (25,000) = 55,000 Total Tax Paid
    expect(html).toContain("₹55,000");
  });
});

