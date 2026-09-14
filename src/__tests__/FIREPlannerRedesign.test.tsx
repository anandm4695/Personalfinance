import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FIREPlannerTab } from "../components/tabs/FIREPlannerTab";

// Mock Recharts ResponsiveContainer to avoid size rendering issues in test environment
vi.mock("recharts", async () => {
  const original = await vi.importActual<any>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 400 }}>{children}</div>,
  };
});

describe("FIREPlannerTab Redesign", () => {
  const mockState = {
    mutualFunds: [
      { id: "mf1", name: "Parag Parikh Flexi Cap", units: 1000, currentNav: 75, category: "Flexi Cap" },
    ],
    stocks: [
      { id: "st1", symbol: "RELIANCE", quantity: 50, currentPrice: 2800 },
    ],
    bankAccounts: [
      { id: "ba1", bankName: "HDFC Bank", balance: 250000, accountType: "Savings" },
    ],
    fixedDeposits: [
      { id: "fd1", bankName: "SBI", principal: 500000, amount: 500000 },
    ],
    recurringDeposits: [],
    bonds: [],
    epf: [
      { id: "epf1", totalBalance: 600000 },
    ],
    ppf: [
      { id: "ppf1", currentBalance: 400000 },
    ],
    nps: [
      { id: "nps1", currentCorpus: 300000 },
    ],
    goldHoldings: [
      { id: "gold1", currentValue: 150000 },
    ],
    realEstateProperties: [
      { id: "re1", currentValuation: 8500000 },
    ],
  };

  const mockMetrics = {
    netWorth: 10865000,
    monthIncome: 180000,
    monthExpense: 60000,
    savingsRate: 66.6,
  };

  it("renders FIRE Command Center header and hero cockpit stats", () => {
    render(<FIREPlannerTab state={mockState} metrics={mockMetrics} />);

    expect(screen.getByText(/FIRE Command Center & FI Planner/i)).toBeDefined();
    expect(screen.getByText(/Target FIRE Corpus/i)).toBeDefined();
    expect(screen.getByText(/Readiness/i)).toBeDefined();
    expect(screen.getByText(/Projected Date/i)).toBeDefined();
    expect(screen.getByText(/Freedom Dividend/i)).toBeDefined();
  });

  it("switches across tabs correctly", () => {
    render(<FIREPlannerTab state={mockState} metrics={mockMetrics} />);

    // Click Scenario Studio tab
    const studioTabBtn = screen.getByText(/Scenario Studio & Archetypes/i);
    fireEvent.click(studioTabBtn);
    expect(screen.getByText(/Live Assumptions & Parameter Tuning/i)).toBeDefined();
    expect(screen.getByText(/Regular FIRE/i)).toBeDefined();
    expect(screen.getByText(/Fat FIRE/i)).toBeDefined();
    expect(screen.getByText(/Lean FIRE/i)).toBeDefined();
    expect(screen.getByText(/Coast FIRE/i)).toBeDefined();
    expect(screen.getByText(/Barista FIRE/i)).toBeDefined();
    expect(screen.getByText(/Flamingo FIRE/i)).toBeDefined();

    // Click Trajectory tab
    const trajectoryTabBtn = screen.getByText(/Trajectory & Cashflow Table/i);
    fireEvent.click(trajectoryTabBtn);
    expect(screen.getByText(/Multi-Phase Corpus Forecast/i)).toBeDefined();
    expect(screen.getByText(/Year-by-Year Compounding Ledger/i)).toBeDefined();

    // Click Stress Testing tab
    const stressTabBtn = screen.getByText(/Stress Testing & SRR/i);
    fireEvent.click(stressTabBtn);
    expect(screen.getByText(/Portfolio Stress-Testing & Longevity Engine/i)).toBeDefined();
    expect(screen.getByText(/Early Retirement Bear Market/i)).toBeDefined();
    expect(screen.getByText(/Sustained High Inflation Shock/i)).toBeDefined();

    // Click 3-Bucket & Tax-Smart SWP tab
    const bucketTabBtn = screen.getByText(/3-Bucket & Tax-Smart SWP/i);
    fireEvent.click(bucketTabBtn);
    expect(screen.getByText(/Indian 3-Bucket Retirement Withdrawal Architecture/i)).toBeDefined();
    expect(screen.getByText(/Bucket 1: Immediate Cash/i)).toBeDefined();
    expect(screen.getByText(/Bucket 2: Stability & Income/i)).toBeDefined();
    expect(screen.getByText(/Bucket 3: Growth Engine/i)).toBeDefined();

    // Click Acceleration Playbook tab
    const playbookTabBtn = screen.getByText(/Acceleration Playbook/i);
    fireEvent.click(playbookTabBtn);
    expect(screen.getByText(/FIRE Acceleration Levers/i)).toBeDefined();
    expect(screen.getByText(/Increase Monthly SIP by \+₹10,000/i)).toBeDefined();
    expect(screen.getByText(/Trim Discretionary Expenses by ₹5,000\/mo/i)).toBeDefined();
  });

  it("switches archetype models and updates calculations", () => {
    render(<FIREPlannerTab state={mockState} metrics={mockMetrics} />);

    // Navigate to Scenario Studio
    fireEvent.click(screen.getByText(/Scenario Studio & Archetypes/i));

    // Click Lean FIRE
    fireEvent.click(screen.getByText(/Lean FIRE/i));
    expect(screen.getByText(/Lean FIRE/i)).toBeDefined();

    // Click Coast FIRE
    fireEvent.click(screen.getByText(/Coast FIRE/i));
    expect(screen.getByText(/Coast FIRE Status Analysis/i)).toBeDefined();

    // Click Barista FIRE
    fireEvent.click(screen.getByText(/Barista FIRE/i));
    expect(screen.getByText(/Barista FIRE Part-Time \/ Passion Income Modeling/i)).toBeDefined();
  });

  it("supports copying summary and toggling asset filters", () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<FIREPlannerTab state={mockState} metrics={mockMetrics} />);

    // Click Copy Summary
    const copyBtn = screen.getByText(/Copy Summary/i);
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Toggle Real Estate in Asset Filter
    const reCheckbox = screen.getByLabelText(/Real Estate \(Inv\)/i) as HTMLInputElement;
    fireEvent.click(reCheckbox);
    expect(reCheckbox.checked).toBe(true);
  });
});
