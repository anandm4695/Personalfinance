/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { CashFlowTab } from "../components/tabs/CashFlowTab";

import { PrivacyProvider } from "../context/PrivacyContext";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("CashFlowTab with Salary Slip Tracker Inflows", () => {
  const mockState = {
    salarySlips: [
      {
        id: "sl1",
        slipMonth: "2026-07",
        employer: "Saroj Landmark Realty LLP",
        basic: 98506,
        hra: 49253,
        grossSalary: 197012,
        totalDeductions: 35802,
        netSalary: 161210,
        owner: "self",
      },
    ],
    income: [],
    rentalProperties: [],
    dividends: [],
    fixedDeposits: [],
    recurringDeposits: [],
    ppf: [],
    loansTaken: [],
    sips: [],
    subscriptions: [],
    recurringExpenses: [],
    creditCards: [],
    rentedProperties: [],
    lic: [],
    healthInsurance: [],
    termInsurance: [],
    investmentPlans: [],
    budgets: [],
    bankAccounts: [],
    financialEvents: [],
    settings: {},
  };

  it("should incorporate net take-home salary from salary slips into cash flow forecast inflows", () => {
    const html = renderToString(
      <PrivacyProvider>
        <CashFlowTab state={mockState} metrics={{}} />
      </PrivacyProvider>
    );

    // Verify Cash Flow Forecast renders and reflects monthly net salary
    expect(html).toContain("Cash Flow Forecast");
    expect(html).toContain("Salary");
    expect(html).toContain("1,61,210");
  });
});
