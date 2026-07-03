/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { SalarySlipTab } from "../components/tabs/SalarySlipTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("SalarySlipTab Premium UI Statically", () => {
  const mockState = {
    salarySlips: [
      {
        id: "sl1",
        slipMonth: "2026-03",
        employer: "Google",
        basic: 100000,
        hra: 50000,
        tds: 20000,
        pfEmployee: 12000,
        grossSalary: 150000,
        totalDeductions: 32000,
        netSalary: 118000,
        owner: "self",
      },
      {
        id: "sl2",
        slipMonth: "2026-02",
        employer: "Google",
        basic: 100000,
        hra: 50000,
        tds: 20000,
        pfEmployee: 12000,
        grossSalary: 150000,
        totalDeductions: 32000,
        netSalary: 118000,
        owner: "self",
      },
    ],
    settings: { geminiApiKey: "mock-key" },
  };

  it("should render monthly summary stats, salary trends chart, and expandable slip lists", () => {
    const html = renderToString(
      <SalarySlipTab
        state={mockState}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    // Verify key titles and card details render correctly
    expect(html).toContain("Salary Slip Tracker");
    expect(html).toContain("Last Net Salary");
    expect(html).toContain("Avg Monthly Net");
    expect(html).toContain("Total TDS (FY)");
    expect(html).toContain("Total PF (Employee)");
    expect(html).toContain("Salary Trend");
    expect(html).toContain("Google");
  });
});
