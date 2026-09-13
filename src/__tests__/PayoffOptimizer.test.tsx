/* eslint-disable */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DebtPayoffOptimizer } from "../components/credit/DebtPayoffOptimizer";

// Mock Recharts ResponsiveContainer to avoid jsdom zero dimension issues
vi.mock("recharts", async () => {
  const original = await vi.importActual<any>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="recharts-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe("DebtPayoffOptimizer Component & Strategic Engine", () => {
  const sampleState = {
    loansTaken: [
      {
        id: "l1",
        lender: "HDFC Bank",
        type: "Personal Loan",
        principal: 500000,
        rate: 14.5,
        emi: 15000,
        monthsRemaining: 36,
        startDate: "2024-01-01",
      },
      {
        id: "l2",
        lender: "SBI Bank",
        type: "Car Loan",
        principal: 300000,
        rate: 9.2,
        emi: 8500,
        monthsRemaining: 24,
        startDate: "2024-01-01",
      },
    ],
    creditCards: [
      {
        id: "cc1",
        issuer: "ICICI Bank",
        name: "Coral Credit Card",
        outstanding: 50000,
        interestRate: 42,
        status: "active",
      },
    ],
  };

  it("renders the empty state when no loans or credit cards are present", () => {
    render(<DebtPayoffOptimizer state={{ loansTaken: [], creditCards: [] }} />);
    expect(screen.getByText(/Zero Outstanding Liabilities Detected/i)).toBeDefined();
  });

  it("renders the command center and aggregated liabilities snapshot", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    // Header & Command Bar
    expect(screen.getByText(/Payoff Optimizer & Acceleration Studio/i)).toBeDefined();
    expect(screen.getByText(/Debt Acceleration Command/i)).toBeDefined();

    // Strategy selectors
    expect(screen.getByText(/Debt Avalanche/i)).toBeDefined();
    expect(screen.getByText(/Debt Snowball/i)).toBeDefined();
    expect(screen.getByText(/Cashflow Relief/i)).toBeDefined();

    // Lenders rendered in timeline
    expect(screen.getAllByText(/ICICI Bank/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HDFC Bank/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SBI Bank/i).length).toBeGreaterThan(0);
  });

  it("switches between strategy views (Roadmap, Trajectory Curve, and Portfolio Breakdown)", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    const chartTabBtn = screen.getByText(/Paydown Trajectory Curve/i);
    fireEvent.click(chartTabBtn);
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();

    const breakdownTabBtn = screen.getByText(/Debt Portfolio Breakdown/i);
    fireEvent.click(breakdownTabBtn);
    expect(screen.getAllByText(/of total liabilities/i).length).toBeGreaterThan(0);

    const timelineTabBtn = screen.getByText(/Chronological Payoff Roadmap/i);
    fireEvent.click(timelineTabBtn);
    expect(screen.getByText(/How Rollovers Work in this Strategy/i)).toBeDefined();
  });

  it("opens and calculates required surplus in the Target Date Solver modal", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    const targetDateBtn = screen.getByText(/Target Date Solver/i);
    fireEvent.click(targetDateBtn);

    expect(screen.getByText(/Target Debt-Free Date Reverse Solver/i)).toBeDefined();
    expect(screen.getByText(/Required Extra Monthly Payment/i)).toBeDefined();

    // Select 12 months horizon
    const twelveMonthBtn = screen.getByText(/12 Months/i);
    fireEvent.click(twelveMonthBtn);

    // Click apply button
    const applyBtn = screen.getByRole("button", { name: /Apply/i });
    fireEvent.click(applyBtn);

    // Modal closes
    expect(screen.queryByText(/Target Debt-Free Date Reverse Solver/i)).toBeNull();
  });

  it("opens and computes savings in the Refinance / Consolidation modeler", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    const consolidateBtn = screen.getByText(/Refinance \/ Consolidate/i);
    fireEvent.click(consolidateBtn);

    expect(screen.getByText(/Debt Consolidation & Refinance Modeler/i)).toBeDefined();

    // Select all debts
    const selectAllBtn = screen.getByText(/Select All/i);
    fireEvent.click(selectAllBtn);

    // Should display consolidated principal and new EMI
    expect(screen.getByText(/Principal Consolidated/i)).toBeDefined();
    expect(screen.getByText(/New Consolidated EMI/i)).toBeDefined();

    const doneBtn = screen.getByRole("button", { name: /Done/i });
    fireEvent.click(doneBtn);
    expect(screen.queryByText(/Debt Consolidation & Refinance Modeler/i)).toBeNull();
  });

  it("opens Manage Debts modal and allows toggling debt exclusions", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    const manageBtn = screen.getByText(/Manage Debts/i);
    fireEvent.click(manageBtn);

    expect(screen.getByText(/Select Debts Included in Optimization/i)).toBeDefined();

    const saveBtn = screen.getByRole("button", { name: /Save & Update Model/i });
    fireEvent.click(saveBtn);
    expect(screen.queryByText(/Select Debts Included in Optimization/i)).toBeNull();
  });

  it("allows updating extra monthly repayment and windfall", () => {
    render(<DebtPayoffOptimizer state={sampleState} />);

    const windfallInput = screen.getByPlaceholderText(/e\.g\. ₹1,00,000 bonus/i);
    fireEvent.change(windfallInput, { target: { value: "50000" } });

    expect(screen.getByDisplayValue("50000")).toBeDefined();

    const clearBtn = screen.getByRole("button", { name: /^Clear$/i });
    fireEvent.click(clearBtn);
    expect(screen.queryByDisplayValue("50000")).toBeNull();
  });
});
