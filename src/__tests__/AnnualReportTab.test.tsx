/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { AnnualReportTab } from "../components/tabs/AnnualReportTab";

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
});
