import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FixedDepositsSection } from "../components/investments/FixedDepositsSection";
import { MasterDataContext, DEFAULT_MASTER_DATA } from "../utils/masterData";
import { PrivacyProvider } from "../context/PrivacyContext";

// Sample test FD data
const mockFDs = [
  {
    id: "fd-1",
    bank: "HDFC Bank",
    principal: 500000,
    rate: 7.5,
    years: 2,
    startDate: "2024-01-01",
    maturityDate: "2026-01-01",
    fdNumber: "FD-HDFC-991",
    owner: "self",
    interestPayout: "cumulative",
    depositType: "standard",
  },
  {
    id: "fd-2",
    bank: "State Bank of India",
    principal: 150000,
    rate: 7.1,
    years: 5,
    startDate: "2023-04-01",
    maturityDate: "2028-04-01",
    fdNumber: "SBI-80C-442",
    owner: "self",
    depositType: "tax_saver",
    isTaxSaver: true,
  },
  {
    id: "fd-3",
    bank: "ICICI Bank",
    principal: 300000,
    rate: 7.25,
    years: 1,
    startDate: "2023-01-01",
    maturityDate: "2024-01-01", // Matured
    fdNumber: "ICICI-001",
    owner: "self",
  },
];

const renderFDSection = (items = mockFDs, props = {}) => {
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
        <FixedDepositsSection {...defaultProps} />
      </MasterDataContext.Provider>
    </PrivacyProvider>
  );
};

describe("FixedDepositsSection Component", () => {
  it("renders the empty state correctly when no FDs exist", () => {
    const onAdd = vi.fn();
    renderFDSection([], { onAdd });

    expect(screen.getByText(/No Fixed Deposits Added Yet/i)).toBeDefined();
    expect(screen.getByText(/Add First Fixed Deposit/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Add First Fixed Deposit/i));
    expect(onAdd).toHaveBeenCalled();
  });

  it("renders executive KPI summary stats correctly with multiple FDs", () => {
    renderFDSection();

    expect(screen.getByText("Total Invested")).toBeDefined();
    expect(screen.getAllByText("Current Accrued").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Maturity Value")).toBeDefined();
    expect(screen.getByText("Annual Passive Interest")).toBeDefined();
  });

  it("switches across view modes (Cards, Table, Maturity Ladder, Bank & DICGC Risk, TDS Optimizer, FD Calculator)", () => {
    renderFDSection();

    // Default is cards view
    expect(screen.getAllByText("HDFC Bank").length).toBeGreaterThan(0);

    // Switch to Data Table
    const tableBtn = screen.getByText("Data Table");
    fireEvent.click(tableBtn);
    expect(screen.getByText("Rate (% p.a.)")).toBeDefined();
    expect(screen.getByText("Bank & Account")).toBeDefined();

    // Switch to Maturity Ladder
    const ladderBtn = screen.getByText("Maturity Ladder");
    fireEvent.click(ladderBtn);
    expect(screen.getByText(/Quarterly Liquidity & Cash Flow Inflow/i)).toBeDefined();

    // Switch to Bank & DICGC Risk
    const analyticsBtn = screen.getByText("Bank & DICGC Risk");
    fireEvent.click(analyticsBtn);
    expect(screen.getByText(/DICGC \(RBI\) ₹5,00,000 Deposit Insurance Monitor/i)).toBeDefined();

    // Switch to TDS & Tax Optimizer
    const taxBtn = screen.getByText("TDS & Tax Optimizer");
    fireEvent.click(taxBtn);
    expect(screen.getByText(/Section 194A TDS Rules & Form 15G \/ 15H Guide/i)).toBeDefined();
    expect(screen.getByText(/Post-Tax Net Yield Simulator/i)).toBeDefined();

    // Switch to FD Calculator
    const calcBtn = screen.getByText("FD Calculator");
    fireEvent.click(calcBtn);
    expect(screen.getByText(/Interactive Fixed Deposit & Compounding Simulator/i)).toBeDefined();
    expect(screen.getAllByText(/Compounding Frequency/i).length).toBeGreaterThan(0);
  });

  it("filters FDs by status pills (Active, Matured, 80C Tax Saver)", () => {
    renderFDSection();

    // Click Matured filter button pill
    const maturedPill = screen.getByText(/^Matured \(\d+\)$/);
    fireEvent.click(maturedPill);
    expect(screen.getAllByText("ICICI Bank").length).toBeGreaterThan(0);

    // Click 80C Tax Saver pill
    const taxSaverPill = screen.getByText("80C Tax Saver");
    fireEvent.click(taxSaverPill);
    expect(screen.getAllByText("State Bank of India").length).toBeGreaterThan(0);
  });

  it("opens Premature Break Simulator modal when clicking Premature Break Sim", () => {
    renderFDSection();

    const breakSimBtns = screen.getAllByText(/Premature Break Sim/i);
    expect(breakSimBtns.length).toBeGreaterThan(0);
    fireEvent.click(breakSimBtns[0]);

    expect(screen.getByText(/Premature FD Liquidation \/ Break Simulator/i)).toBeDefined();
    expect(screen.getByText(/NET PAYOUT IF BROKEN TODAY/i)).toBeDefined();
  });

  it("opens Renew / Rollover modal when clicking Renew FD for a matured deposit", () => {
    renderFDSection();

    const renewBtns = screen.getAllByText(/Renew FD/i);
    expect(renewBtns.length).toBeGreaterThan(0);
    fireEvent.click(renewBtns[0]);

    expect(screen.getByText(/Renew \/ Rollover Fixed Deposit/i)).toBeDefined();
    expect(screen.getByText(/Confirm & Create Renewed FD/i)).toBeDefined();
  });
});
