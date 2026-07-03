/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExpenseTrendsTab } from "../components/tabs/ExpenseTrendsTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("ExpenseTrendsTab Premium UI Statically", () => {
  const mockState = {
    transactions: [
      {
        id: "t1",
        date: "2026-04-10",
        note: "Uber Trip",
        category: "Transport",
        type: "debit",
        amount: 450,
        description: "Office ride",
      },
      {
        id: "t2",
        date: "2026-04-20",
        note: "Salary",
        category: "Salary",
        type: "credit",
        amount: 150000,
        description: "Monthly payout",
      },
    ],
  };

  it("should render period bar, summary stats, trend charts, and table categories", () => {
    const html = renderToString(<ExpenseTrendsTab state={mockState} metrics={{}} />);

    // Verify header title and section texts render correctly
    expect(html).toContain("Expense Trends &amp; Analytics");
    expect(html).toContain("Total Spend");
    expect(html).toContain("Avg Monthly");
    expect(html).toContain("Highest Month");
    expect(html).toContain("MoM Change");
    expect(html).toContain("Monthly Spend Trend");
    expect(html).toContain("Spend by Category");
    expect(html).toContain("Category Trends");
    expect(html).toContain("Category Deep Dive");
    expect(html).toContain("Transport");
  });
});
