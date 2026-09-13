import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecurringDepositsSection } from "../components/investments/RecurringDepositsSection";
import { MasterDataContext, DEFAULT_MASTER_DATA } from "../utils/masterData";
import { PrivacyProvider } from "../context/PrivacyContext";

// Sample test RD data
const mockRDs = [
  {
    id: "rd-1",
    bank: "HDFC Bank",
    monthly: 10000,
    rate: 7.5,
    tenureMonths: 24,
    startDate: "2026-01-01",
    maturityDate: "2028-01-01",
    rdNumber: "RD-HDFC-101",
    owner: "self",
    debitDay: 5,
    goal: "Emergency Fund",
    nominee: "Ananya Mohta",
  },
  {
    id: "rd-2",
    bank: "State Bank of India",
    monthly: 5000,
    rate: 7.0,
    tenureMonths: 36,
    startDate: "2026-04-01",
    maturityDate: "2029-04-01",
    rdNumber: "SBI-RD-202",
    owner: "self",
    debitDay: 10,
    goal: "Vacation & Travel",
    nominee: "Raj Mohta",
  },
  {
    id: "rd-3",
    bank: "ICICI Bank",
    monthly: 20000,
    rate: 7.25,
    tenureMonths: 12,
    startDate: "2023-01-01",
    maturityDate: "2024-01-01", // Matured
    rdNumber: "ICICI-RD-303",
    owner: "self",
    debitDay: 1,
    status: "matured",
  },
];

const renderRDSection = (items = mockRDs, props = {}) => {
  const defaultProps = {
    items,
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    addItem: vi.fn(),
    onAdd: vi.fn(),
    showToast: vi.fn(),
    ...props,
  };

  return render(
    <PrivacyProvider>
      <MasterDataContext.Provider value={DEFAULT_MASTER_DATA}>
        <RecurringDepositsSection {...defaultProps} />
      </MasterDataContext.Provider>
    </PrivacyProvider>
  );
};

describe("RecurringDepositsSection Component", () => {
  it("renders empty state when no RDs exist and triggers onAdd", () => {
    const onAdd = vi.fn();
    renderRDSection([], { onAdd });

    expect(screen.getByText(/No Recurring Deposits Added Yet/i)).toBeDefined();
    expect(screen.getByText(/Add First Recurring Deposit/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Add First Recurring Deposit/i));
    expect(onAdd).toHaveBeenCalled();
  });

  it("renders executive KPI summary stats correctly with multiple RDs", () => {
    renderRDSection();

    expect(screen.getByText("Monthly SIP Total")).toBeDefined();
    expect(screen.getByText("Total Deposited")).toBeDefined();
    expect(screen.getByText("Current Accrued")).toBeDefined();
    expect(screen.getByText("Projected Maturity")).toBeDefined();
    expect(screen.getByText("Blended Yield (p.a.)")).toBeDefined();
  });

  it("switches across all view modes (Cards, Table, Ladder, DICGC Risk, Tax TDS, Calculator)", () => {
    renderRDSection();

    // Default view is Cards
    expect(screen.getAllByText("HDFC Bank").length).toBeGreaterThan(0);

    // Switch to Data Table
    const tableBtn = screen.getByText("Data Table");
    fireEvent.click(tableBtn);
    expect(screen.getByText("Monthly SIP")).toBeDefined();
    expect(screen.getByText("Progress / Tenure")).toBeDefined();

    // Switch to SIP & Maturity Ladder
    const ladderBtn = screen.getByText("SIP & Maturity Ladder");
    fireEvent.click(ladderBtn);
    expect(
      screen.getByText(/Recurring Deposit Maturity & Cash-Flow Ladder/i)
    ).toBeDefined();

    // Switch to Bank & DICGC Risk
    const riskBtn = screen.getByText("Bank & DICGC Risk");
    fireEvent.click(riskBtn);
    expect(
      screen.getByText(/DICGC ₹5,00,000 Deposit Insurance Safety Monitor/i)
    ).toBeDefined();

    // Switch to Tax & TDS Hub
    const taxBtn = screen.getByText("Tax & TDS Hub");
    fireEvent.click(taxBtn);
    expect(
      screen.getByText(/Section 194A TDS & Income Tax Rules for Recurring Deposits/i)
    ).toBeDefined();

    // Switch to RD & Goal Calculator
    const calcBtn = screen.getByText("RD & Goal Calculator");
    fireEvent.click(calcBtn);
    expect(
      screen.getByText(/Calculate Maturity from Monthly Deposit/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Target Goal Reverse Calculator/i)
    ).toBeDefined();
  });

  it("filters RDs by active vs matured status", () => {
    renderRDSection();

    // Click Active filter
    const activeFilterBtn = screen.getByText(/Active \(2\)/i);
    fireEvent.click(activeFilterBtn);
    expect(screen.getAllByText("HDFC Bank").length).toBeGreaterThan(0);
    expect(screen.getAllByText("State Bank of India").length).toBeGreaterThan(0);

    // Click Matured filter
    const maturedFilterBtn = screen.getByText(/Matured \(1\)/i);
    fireEvent.click(maturedFilterBtn);
    expect(screen.getAllByText("ICICI Bank").length).toBeGreaterThan(0);
  });

  it("opens edit modal when pencil icon is clicked", () => {
    renderRDSection();

    const editBtns = screen.getAllByLabelText(/Edit .* RD/i);
    expect(editBtns.length).toBeGreaterThan(0);

    fireEvent.click(editBtns[0]);
    expect(screen.getByText("Edit Recurring Deposit")).toBeDefined();
    expect(screen.getByText("Bank / Institution Name")).toBeDefined();
    expect(screen.getByText("Save Changes")).toBeDefined();
  });

  it("opens premature break simulator modal when Break Sim button is clicked", () => {
    renderRDSection();

    const breakSimBtns = screen.getAllByTitle(/Simulate premature withdrawal/i);
    expect(breakSimBtns.length).toBeGreaterThan(0);

    fireEvent.click(breakSimBtns[0]);
    expect(screen.getByText("Premature Closure & Penalty Simulator")).toBeDefined();
    expect(screen.getByText("Estimated Payout Upon Break")).toBeDefined();
  });
});
