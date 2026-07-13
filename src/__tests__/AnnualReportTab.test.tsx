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
});
