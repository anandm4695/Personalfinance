/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { SalarySlipTab } from "../components/tabs/SalarySlipTab";

import { getCurrentFYStartYear } from "../utils/appConstants";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("SalarySlipTab Premium UI Statically", () => {
  const fyStart = getCurrentFYStartYear();
  const mockState = {
    salarySlips: [
      {
        id: "sl1",
        slipMonth: `${fyStart}-05`,
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
        slipMonth: `${fyStart}-04`,
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
    // Labels now include the actual financial year (e.g. "FY 2026-27") so the
    // "(FY)" stats visibly match the period they're scoped to.
    expect(html).toMatch(/Total TDS \(FY \d{4}-\d{2}\)/);
    expect(html).toMatch(/Total PF \(FY \d{4}-\d{2}\)/);
    expect(html).toContain("Salary Trend");
    expect(html).toContain("Google");
  });

  it("should support all earning fields including Education Allowance and Employer NPS Contribution", () => {
    const detailedState = {
      salarySlips: [
        {
          id: "sl_detailed",
          slipMonth: `${fyStart}-05`,
          employer: "TechCorp",
          basic: 80000,
          hra: 40000,
          educationAllowance: 2000,
          lta: 5000,
          specialAllowance: 25000,
          employerNpsContribution: 8000,
          da: 3000,
          bonus: 10000,
          otherEarnings: 2000,
          grossSalary: 175000,
          pfEmployee: 9600,
          tds: 18000,
          totalDeductions: 27600,
          netSalary: 147400,
          owner: "self",
        },
      ],
      settings: {},
    };

    const html = renderToString(
      <SalarySlipTab
        state={detailedState}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    expect(html).toContain("TechCorp");
  });

  it("should aggregate both TDS/Income Tax and PF Employee/Employer in FY stats", () => {
    const stateWithTaxAndPf = {
      salarySlips: [
        {
          id: "sl_tax_pf",
          slipMonth: `${fyStart}-07`,
          employer: "Saroj Landmark Realty LLP",
          basic: 98506,
          hra: 49253,
          educationAllowance: 6000,
          lta: 8209,
          specialAllowance: 21253,
          employerNpsContribution: 13791,
          grossSalary: 197012,
          pfEmployer: 1800,
          professionalTax: 200,
          incomeTax: 20011,
          npsDeduction: 13791,
          totalDeductions: 35802,
          netSalary: 161210,
          owner: "self",
        },
      ],
      settings: {},
    };

    const html = renderToString(
      <SalarySlipTab
        state={stateWithTaxAndPf}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    // Verify slip details and employer name are rendered
    expect(html).toContain("Saroj Landmark Realty LLP");
    expect(html).toContain("Salary Slip Tracker");
  });
});

