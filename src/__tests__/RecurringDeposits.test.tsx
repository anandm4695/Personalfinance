import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getAllByText("Projected Maturity").length).toBeGreaterThan(0);
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

  it("handles newly added RD with 0 paid installments accurately without automatically assuming full deposit", () => {
    const newRD = [
      {
        id: "rd-new",
        bank: "Kotak Mahindra Bank",
        monthly: 5000,
        rate: 6.75,
        tenureMonths: 12,
        startDate: "2026-06-01",
        paidInstallments: 0,
        rdNumber: "501004928192",
        bankAccountId: "b-1",
        owner: "self",
      },
    ];
    const mockBanks = [{ id: "b-1", bankName: "HDFC Bank", balance: 50000, accountNumber: "12345678" }];

    renderRDSection(newRD, { bankAccounts: mockBanks });

    // Should display 0 of 12 installments paid because paidInstallments is explicitly 0
    expect(screen.getByText(/0 of 12 installments paid/i)).toBeDefined();
    expect(screen.getByText("0%")).toBeDefined();
    // Linked bank badge
    expect(screen.getByText(/HDFC Bank ••5678/i)).toBeDefined();
    // Pay Installment button is available
    expect(screen.getByText("Pay Installment")).toBeDefined();
  });

  it("opens Pay Installment modal and executes payment deduction", async () => {
    const updateItem = vi.fn();
    const addItem = vi.fn();
    const newRD = [
      {
        id: "rd-pay-test",
        bank: "Kotak Mahindra Bank",
        monthly: 5000,
        rate: 6.75,
        tenureMonths: 12,
        startDate: "2026-01-01",
        paidInstallments: 2,
        rdNumber: "501004928192",
        bankAccountId: "b-1",
        owner: "self",
      },
    ];
    const mockBanks = [{ id: "b-1", bankName: "HDFC Bank", balance: 50000, accountNumber: "12345678" }];

    renderRDSection(newRD, { bankAccounts: mockBanks, updateItem, addItem });

    const payBtn = screen.getByText("Pay Installment");
    fireEvent.click(payBtn);

    expect(screen.getByText(/Pay RD Installment #3/i)).toBeDefined();
    expect(screen.getByText(/Amount Due/i)).toBeDefined();
    expect(screen.getByText(/After Debit:/i)).toBeDefined();

    const confirmBtn = screen.getByText(/Confirm Payment/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        "recurringDeposits",
        "rd-pay-test",
        expect.objectContaining({
          paidInstallments: 3,
        })
      );
      expect(updateItem).toHaveBeenCalledWith(
        "bankAccounts",
        "b-1",
        expect.objectContaining({
          balance: 45000,
        })
      );
    });
  });

  it("opens RD Installment History & Ledger modal showing paid and upcoming schedule", () => {
    const newRD = [
      {
        id: "rd-hist-test",
        bank: "Kotak Mahindra Bank",
        monthly: 5000,
        rate: 6.75,
        tenureMonths: 12,
        startDate: "2026-01-01",
        paidInstallments: 4,
        rdNumber: "501004928192",
        bankAccountId: "b-1",
        owner: "self",
      },
    ];
    const mockBanks = [{ id: "b-1", bankName: "Kotak Mahindra Bank", balance: 224730, accountNumber: "8274" }];
    const mockTxns = [
      {
        id: "txn-1",
        note: "RD Installment #1 - Kotak Mahindra Bank (A/C: 501004928192)",
        amount: 5000,
        date: "2026-01-01",
        category: "Investments",
        linked_type: "recurring_deposit",
        linked_id: "rd-hist-test",
      },
    ];

    renderRDSection(newRD, { bankAccounts: mockBanks, transactions: mockTxns });

    const histBtn = screen.getByText("Installments");
    fireEvent.click(histBtn);

    expect(screen.getByText(/Kotak Mahindra Bank RD Installment Ledger & Payments/i)).toBeDefined();
    expect(screen.getAllByText(/4 of 12/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Bank Outflow Receipts/i)).toBeDefined();
    expect(screen.getByText(/RD Installment #1 - Kotak Mahindra Bank/i)).toBeDefined();
  });
});
