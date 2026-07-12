/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExpenseForecastTab } from "../components/tabs/ExpenseForecastTab";

// Simple mock for recharts ResponsiveContainer
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
  };

  it("should render forecast cards, charts, and trends table", () => {
    const html = renderToString(
      <ExpenseForecastTab state={mockState} metrics={{}} setTab={() => {}} />
    );

    // Verify key titles and stats render
    expect(html).toContain("Expense Forecast");
    expect(html).toContain("Annual Projection");
    expect(html).toContain("Monthly Average");
    expect(html).toContain("Trending Up");
    expect(html).toContain("Trending Down");
    expect(html).toContain("Seasonal Spending Patterns");
    expect(html).toContain("Category Trends");
    expect(html).toContain("Rent");
  });
});
