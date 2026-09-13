/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExpenseForecastTab } from "../components/tabs/ExpenseForecastTab";

// Mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("ExpenseForecastTab Premium UI Statically", () => {
  const mockState = {
    transactions: [
      {
        id: "t1",
        date: "2026-01-10",
        note: "Rent Payment",
        category: "Rent",
        type: "debit",
        amount: 25000,
      },
      {
        id: "t2",
        date: "2026-02-10",
        note: "Rent Payment",
        category: "Rent",
        type: "debit",
        amount: 25000,
      },
      {
        id: "t3",
        date: "2026-03-10",
        note: "Rent Payment",
        category: "Rent",
        type: "debit",
        amount: 25000,
      },
    ],
    subscriptions: [
      { id: "s1", name: "Netflix", amount: 649, cycle: "monthly", status: "active" },
    ],
    loans: [
      { id: "l1", name: "Car Loan", emi: 15000, remainingMonths: 24 },
    ],
    insurances: [
      { id: "i1", policyName: "Term Life", premium: 12000, frequency: "annual" },
    ],
  };

  it("should render forecast cards, charts, and navigation views", () => {
    const html = renderToString(
      <ExpenseForecastTab state={mockState} metrics={{}} setTab={() => {}} />
    );

    // Verify key titles and stats render
    expect(html).toContain("Expense Forecast");
    expect(html).toContain("Annual Projection");
    expect(html).toContain("Monthly Average");
    expect(html).toContain("Fixed Commitments");
    expect(html).toContain("Trending Up");
    expect(html).toContain("Trending Down");
    expect(html).toContain("Seasonal Spending Patterns");
    expect(html).toContain("Category Trends");
    expect(html).toContain("What-If Simulator");
    expect(html).toContain("Executive Overview");
    expect(html).toContain("Rent");
  });

  it("should render empty state when insufficient transaction history (<3 months)", () => {
    const emptyState = { transactions: [{ id: "t1", date: "2026-01-10", amount: 500, type: "debit" }] };
    const html = renderToString(
      <ExpenseForecastTab state={emptyState} metrics={{}} setTab={() => {}} />
    );
    expect(html).toContain("Not Enough Historical Data");
  });
});
