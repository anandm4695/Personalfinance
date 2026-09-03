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

  it("should incorporate net take-home salary from salary slips into cash flow forecast inflows when bank transactions have no salary", () => {
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

  it("should check from bank first (Priority 1) when bank credit transactions categorized as salary exist", () => {
    const stateWithBankSalary = {
      ...mockState,
      transactions: [
        {
          id: "tx_sal_1",
          type: "credit",
          category: "Salary",
          amount: 180000,
          date: "2026-06-30",
          description: "SALARY CREDIT INFOSYS",
        },
        {
          id: "tx_sal_2",
          type: "credit",
          category: "Salary",
          amount: 180000,
          date: "2026-07-31",
          description: "SALARY CREDIT INFOSYS",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <CashFlowTab state={stateWithBankSalary} metrics={{}} />
      </PrivacyProvider>
    );

    // Verify bank salary takes Priority 1
    expect(html).toContain("Cash Flow Forecast");
    expect(html).toContain("Salary");
    expect(html).toContain("1,80,000");
    expect(html).toContain("From Bank Transactions");
  });

  it("should surface the switch prompt when bank has lower credit than official salary slips", () => {
    const stateWithDiscrepancy = {
      ...mockState,
      transactions: [
        {
          id: "tx_low_sal",
          type: "credit",
          category: "Salary",
          amount: 14400,
          date: "2026-07-15",
          description: "SALARY REIMBURSEMENT",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <CashFlowTab state={stateWithDiscrepancy} metrics={{}} />
      </PrivacyProvider>
    );

    // Verify Bank took Priority 1 (14,400) but highlighted the official salary slips take-home (1,61,210)
    expect(html).toContain("14,400");
    expect(html).toContain("1,61,210");
    expect(html).toContain("Switch to Salary Slips");
  });
});
