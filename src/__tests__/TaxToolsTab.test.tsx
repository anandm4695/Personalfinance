import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { TaxToolsTab } from "../components/tabs/TaxToolsTab";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ReferenceLine: () => <div />,
  Cell: () => <div />,
  CartesianGrid: () => <div />,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
}));

describe("TaxToolsTab Senior UI/UX Redesign", () => {
  const mockState = {
    profile: {
      name: "Anand Mohta",
      fy: "2025-26",
      regime: "new",
    },
    income: [
      { id: "inc1", date: "2025-05-10", amount: 200000, category: "Salary" },
      { id: "inc2", date: "2025-06-10", amount: 200000, category: "Salary" },
    ],
    transactions: [],
    taxPayments: [
      { id: "tp1", fy: "2025-26", taxType: "TDS", amount: 35000, date: "2025-06-30" },
      { id: "tp2", fy: "2025-26", taxType: "Advance Tax", amount: 20000, date: "2025-06-14" },
    ],
    rentedProperties: [
      {
        id: "rent-prop-1",
        name: "Sea View Apartment",
        address: "101 Ocean Drive, Bandra West, Mumbai",
        monthlyRent: 45000,
        rentHistory: [],
      },
    ],
    form26as: [
      {
        id: "f26-1",
        deductor: "Tech Corp India Ltd",
        tan: "MUMB12345E",
        section: "192",
        amount: 35000,
        dateOfPayment: "2025-06-30",
        fy: "2025-26",
      },
    ],
    masterData: {
      taxDeductions: {
        "2025-26": {
          d80C: 150000,
          d80D: 25000,
          hra: 180000,
        },
      },
    },
  };

  const mockMetrics = {
    annualIncome: 2400000,
    monthIncome: 200000,
  };

  it("renders the Advance Tax & Sec 234B/C simulator view correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="advance" />
    );
    expect(html).toContain("Advance Tax");
    expect(html).toContain("Section 208 statutory compliance");
    expect(html).toContain("Quarterly Statutory Payment Schedule");
  });

  it("renders the HRA Exemption Optimizer & Receipts view correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="hra" />
    );
    expect(html).toContain("HRA Exemption Optimizer &amp; Rent Receipts");
    expect(html).toContain("Section 10(13A) Rule 2A Exemption Calculator");
    expect(html).toContain("Sea View Apartment");
  });

  it("renders the Form 26AS / AIS Smart Reconciler view correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="26as" />
    );
    expect(html).toContain("Form 26AS / AIS Smart Reconciler");
    expect(html).toContain("Tech Corp India Ltd");
    expect(html).toContain("Matched");
  });

  it("renders the GST & TDS Invoicing Reckoner correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="gst-tds" />
    );
    expect(html).toContain("GST &amp; TDS Invoicing Reckoner");
    expect(html).toContain("Combined Invoice Settlement Matrix");
    expect(html).toContain("Statutory TDS Rate Directory");
  });

  it("renders the Regime Crossover Sandbox correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="regime-sandbox" />
    );
    expect(html).toContain("Old vs New Regime Crossover Sandbox");
    expect(html).toContain("Optimal Regime Recommendation");
    expect(html).toContain("Break-Even Deduction Threshold");
  });

  it("renders the Capital Gains Lab correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="capital-gains" />
    );
    expect(html).toContain("Capital Gains Tax Lab (Budget 2024 &amp; 2025 Rules)");
    expect(html).toContain("Sec 112A Equity LTCG Tax (12.5%)");
    expect(html).toContain("Loss Set-Off Matrix");
  });

  it("renders the Section 87A & Marginal Relief Visualizer correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="marginal-relief" />
    );
    expect(html).toContain("Section 87A Rebate &amp; Marginal Relief Visualizer");
    expect(html).toContain("Marginal Relief Cushion");
  });

  it("renders the Statutory Compliance Radar correctly", () => {
    const html = renderToString(
      <TaxToolsTab state={mockState} metrics={mockMetrics} subTab="calendar" />
    );
    expect(html).toContain("Statutory Tax Compliance Radar");
    expect(html).toContain("Advance Tax Q1 Milestone");
    expect(html).toContain("Individual ITR Filing (Non-Audit)");
  });
});
