import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SIPTrackerTab } from "../components/tabs/SIPTrackerTab";

const mockState = {
  sips: [
    {
      id: "sip-1",
      owner: "self",
      scheme: "Parag Parikh Flexi Cap Direct Growth",
      fundType: "Flexi Cap",
      amount: "10000",
      frequency: "monthly",
      startDate: "2024-01-01",
      debitDay: "5",
      totalInstallments: "120",
      broker: "Zerodha (Coin)",
      stepUpPct: "10",
      status: "active",
      bankAccountId: "bank-1",
      goalId: "goal-1",
      folioNo: "12345678",
    },
    {
      id: "sip-2",
      owner: "self",
      scheme: "HDFC Mid-Cap Opportunities Direct Growth",
      fundType: "Equity",
      amount: "5000",
      frequency: "monthly",
      startDate: "2024-06-01",
      debitDay: "10",
      totalInstallments: "60",
      broker: "Groww",
      stepUpPct: "0",
      status: "active",
    },
    {
      id: "sip-3",
      owner: "spouse",
      scheme: "SBI Bluechip Fund Direct Growth",
      fundType: "Equity",
      amount: "3000",
      frequency: "monthly",
      startDate: "2023-01-01",
      debitDay: "15",
      totalInstallments: "24",
      broker: "Kuvera",
      stepUpPct: "0",
      status: "stopped",
    },
  ],
  bankAccounts: [
    { id: "bank-1", bankName: "HDFC Bank", accountNumber: "123456789012" },
  ],
  goals: [
    { id: "goal-1", name: "Retirement Corpus", targetAmount: 50000000 },
  ],
};

const mockMetrics = {
  monthIncome: 150000,
};

describe("SIPTrackerTab UI/UX Redesign Suite", () => {
  it("renders hero metrics correctly", () => {
    render(
      <SIPTrackerTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        metrics={mockMetrics}
        showToast={vi.fn()}
      />
    );

    expect(screen.getByText("SIP & Wealth Tracker")).toBeDefined();
    expect(screen.getByText("Monthly SIP Commitment")).toBeDefined();
    expect(screen.getByText("Total Invested")).toBeDefined();
    expect(screen.getByText("Est. Current Value")).toBeDefined();
    expect(screen.getByText("10-Yr Projected Corpus")).toBeDefined();
  });

  it("switches across all 5 view modes seamlessly", () => {
    render(
      <SIPTrackerTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        metrics={mockMetrics}
        showToast={vi.fn()}
      />
    );

    // Default is cards view
    expect(screen.getByText("Parag Parikh Flexi Cap Direct Growth")).toBeDefined();

    // Switch to Debit Schedule / Calendar View
    const debitScheduleBtn = screen.getByRole("button", { name: /Debit Schedule/i });
    fireEvent.click(debitScheduleBtn);
    expect(screen.getByText("Monthly Auto-Debit Schedule")).toBeDefined();
    expect(screen.getByText("Monthly Debit Calendar (Day 1 - 31)")).toBeDefined();

    // Switch to Table Ledger View
    const tableBtn = screen.getByRole("button", { name: /Table Ledger/i });
    fireEvent.click(tableBtn);
    expect(screen.getByText("Scheme & AMC")).toBeDefined();

    // Switch to Step-Up Lab Simulator
    const simulatorBtn = screen.getByRole("button", { name: /Step-Up Lab/i });
    fireEvent.click(simulatorBtn);
    expect(screen.getByText("Step-Up SIP Compounding Simulation Controls")).toBeDefined();
    expect(screen.getByText("The Cost of Delaying Your Investments")).toBeDefined();

    // Switch to Health & AMC View
    const healthBtn = screen.getByRole("button", { name: /Health & AMC/i });
    fireEvent.click(healthBtn);
    expect(screen.getByText("Fund House (AMC) Diversification")).toBeDefined();
    expect(screen.getByText("AMC Allocation & Exposure")).toBeDefined();
  });

  it("filters SIPs by search query and status", () => {
    render(
      <SIPTrackerTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        metrics={mockMetrics}
        showToast={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search funds, AMC, broker, folio...");
    fireEvent.change(searchInput, { target: { value: "HDFC" } });

    expect(screen.getByText("HDFC Mid-Cap Opportunities Direct Growth")).toBeDefined();
    expect(screen.queryByText("Parag Parikh Flexi Cap Direct Growth")).toBeNull();
  });

  it("opens Add SIP modal with preset funds and goal/bank fields", () => {
    render(
      <SIPTrackerTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        metrics={mockMetrics}
        showToast={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add SIP/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Add New SIP")).toBeDefined();
    expect(screen.getByText("Quick Popular Fund Presets:")).toBeDefined();
    expect(screen.getByText("Banking & Goal Mapping (Optional)")).toBeDefined();
  });
});
