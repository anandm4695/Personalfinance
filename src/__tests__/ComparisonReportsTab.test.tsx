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

describe("ComparisonReportsTab Premium UI Statically", () => {
  const mockState = {
    transactions: [
      {
        id: "t1",
        date: "2026-06-10",
        note: "Gym Membership",
        category: "Health",
        type: "debit",
        amount: 2000,
      },
      {
        id: "t2",
        date: "2026-07-02",
        note: "Doctor Consult",
        category: "Health",
        type: "debit",
        amount: 1500,
      },
    ],
    income: [],
    netWorthHistory: [],
  };

  it("should render comparison titles, stats cards, Recharts horizontal bars, and detailed table lists", () => {
    const html = renderToString(
      <ComparisonReportsTab state={mockState} metrics={{ netWorth: 4500000 }} />
    );

    // Verify key titles and comparatives render correctly
    expect(html).toContain("Comparison Reports");
    expect(html).toContain("Expenses");
    expect(html).toContain("Income");
    expect(html).toContain("Category Comparison");
    expect(html).toContain("Category Detail");
    expect(html).toContain("Health");
  });
});
