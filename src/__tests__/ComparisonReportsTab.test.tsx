/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ComparisonReportsTab } from "../components/tabs/ComparisonReportsTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("ComparisonReportsTab Senior Executive UI", () => {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevYM = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(
    now.getMonth() === 0 ? 12 : now.getMonth()
  ).padStart(2, "0")}`;

  const mockState = {
    transactions: [
      {
        id: "1",
        date: `${currentYM}-15`,
        note: "Doctor Consult",
        category: "Health",
        type: "debit",
        amount: 3500,
      },
      {
        id: "2",
        date: `${prevYM}-10`,
        note: "Doctor Consult",
        category: "Health",
        type: "debit",
        amount: 1500,
      },
      {
        id: "3",
        date: `${currentYM}-01`,
        note: "Salary",
        category: "Salary",
        type: "credit",
        amount: 100000,
      },
      {
        id: "4",
        date: `${prevYM}-01`,
        note: "Salary",
        category: "Salary",
        type: "credit",
        amount: 95000,
      },
    ],
    income: [],
    netWorthHistory: [
      { month: currentYM, netWorth: 5000000 },
      { month: prevYM, netWorth: 4800000 },
    ],
  };

  it("should render comparison titles, quick presets, 5 KPI variance cards, smart highlights, and detailed table", () => {
    const html = renderToString(
      <ComparisonReportsTab state={mockState} metrics={{ netWorth: 5000000 }} />
    );

    // Header & Presets
    expect(html).toContain("Comparison Reports");
    expect(html).toContain("MoM");
    expect(html).toContain("QoQ");
    expect(html).toContain("YoY");
    expect(html).toContain("FY vs FY");

    // Executive Split Cards
    expect(html).toContain("Expenses");
    expect(html).toContain("Income");
    expect(html).toContain("Net Cash Surplus");
    expect(html).toContain("Savings Rate");
    expect(html).toContain("Net Worth");

    // Smart Highlights
    expect(html).toContain("Smart Comparison Highlights &amp; Drift Insights");

    // Charts & Category Table
    expect(html).toContain("Category Comparison");
    expect(html).toContain("Category Detail");
    expect(html).toContain("Health");
    expect(html).toContain("Total Aggregates");
    expect(html).toContain("Volume Comparison");
  });

  it("should render graceful empty state when there are no transactions or income", () => {
    const emptyState = { transactions: [], income: [], netWorthHistory: [] };
    const html = renderToString(
      <ComparisonReportsTab state={emptyState} metrics={{ netWorth: 0 }} />
    );
    expect(html).toContain("Not Enough Comparison Data");
  });

  it("should render large net worth values cleanly in executive comparison cards", () => {
    const multiCroreState = {
      ...mockState,
      netWorthHistory: [
        { month: currentYM, netWorth: 12496841 },
        { month: prevYM, netWorth: 12496841 },
      ],
    };
    const html = renderToString(
      <ComparisonReportsTab state={multiCroreState} metrics={{ netWorth: 12496841 }} />
    );
    expect(html).toContain("Net Worth");
    expect(html).toContain("₹1,24,96,841");
  });
});
