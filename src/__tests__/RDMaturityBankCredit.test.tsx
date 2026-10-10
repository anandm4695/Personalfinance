import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecurringDepositsSection } from "../components/investments/RecurringDepositsSection";
import { BanksTab } from "../components/tabs/BanksTab";
import { rdMaturity } from "../utils/finance";

vi.mock("../context/PrivacyContext", () => ({
  usePrivacy: () => ({ privacyMode: false }),
  Prv: ({ children }: any) => <>{children}</>,
}));

vi.mock("../utils/masterData", () => ({
  useMasterData: () => ({
    familyProfiles: [{ id: "self", name: "Anand Mohta", relation: "Self" }],
    bankAccountTypes: ["Savings", "Current", "Salary"],
    transactionCategories: ["Investments", "Salary", "Bills", "Transfer"],
  }),
  formatProfileOption: (p: any) => p.name,
}));

describe("RD Maturity and Bank Account Credit Flow", () => {
  const mockBankAccounts = [
    {
      id: "bank_hdfc_1",
      bankName: "HDFC Bank",
      accountNumber: "50100123456789",
      type: "Savings",
      balance: 150000,
      owner: "self",
    },
    {
      id: "bank_icici_1",
      bankName: "ICICI Bank",
      accountNumber: "000101234567",
      type: "Salary",
      balance: 75000,
      owner: "self",
    },
  ];

  const mockRecurringDeposits = [
    {
      id: "rd_matured_1",
      bank: "HDFC Bank",
      monthly: 10000,
      rate: 7.5,
      tenureMonths: 12,
      startDate: "2023-01-01",
      maturityDate: "2024-01-01",
      rdNumber: "RD-99001",
      bankAccountId: "bank_hdfc_1",
      paidInstallments: 12,
      owner: "self",
      status: "matured",
      payoutStatus: "pending",
    },
    {
      id: "rd_credited_1",
      bank: "ICICI Bank",
      monthly: 5000,
      rate: 7.0,
      tenureMonths: 12,
      startDate: "2023-01-01",
      maturityDate: "2024-01-01",
      rdNumber: "RD-99002",
      bankAccountId: "bank_icici_1",
      paidInstallments: 12,
      owner: "self",
      status: "matured",
      payoutStatus: "credited",
      payoutAmount: 62310,
      payoutDate: "2024-01-02",
      payoutBankAccountId: "bank_icici_1",
    },
  ];

  it("calculates accurate maturity proceeds for recurring deposit", () => {
    // 10,000 monthly @ 7.5% for 12 months
    const matVal = rdMaturity(10000, 7.5, 12);
    expect(matVal).toBeGreaterThan(120000); // More than 1.2L deposited
    expect(Math.round(matVal)).toBe(124957);
  });

  it("renders RD cards with Credit to Bank button for matured RDs and Credited badge for settled ones", () => {
    const updateItem = vi.fn();
    const addItem = vi.fn();
    const removeItem = vi.fn();

    render(
      <RecurringDepositsSection
        items={mockRecurringDeposits}
        bankAccounts={mockBankAccounts}
        removeItem={removeItem}
        updateItem={updateItem}
        addItem={addItem}
        onAdd={() => {}}
      />
    );

    // Matured RD has "Credit to Bank" button
    expect(screen.getByText("Credit to Bank")).toBeDefined();

    // Settled RD shows "Credited to Bank" badge and credited note
    expect(screen.getByText("Credited to Bank")).toBeDefined();
    expect(screen.getByText(/Credited to ICICI Bank/i)).toBeDefined();
  });

  it("opens RDMaturityPayoutModal and credits maturity proceeds to bank account", async () => {
    const updateItem = vi.fn();
    const addItem = vi.fn();
    const removeItem = vi.fn();

    render(
      <RecurringDepositsSection
        items={[mockRecurringDeposits[0]]}
        bankAccounts={mockBankAccounts}
        removeItem={removeItem}
        updateItem={updateItem}
        addItem={addItem}
        onAdd={() => {}}
      />
    );

    // Click on "Credit to Bank" button
    const creditBtn = screen.getByText("Credit to Bank");
    fireEvent.click(creditBtn);

    // Modal should be visible
    expect(
      screen.getByText("Credit RD Maturity Proceeds to Bank Account")
    ).toBeDefined();
    expect(screen.getByText("How this is recorded:")).toBeDefined();

    // Submit the modal
    const saveBtn = screen.getByRole("button", { name: /Credit ₹.* to Bank/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // 1. Should update the RD record with status 'matured' and payoutStatus 'credited'
      expect(updateItem).toHaveBeenCalledWith(
        "recurringDeposits",
        "rd_matured_1",
        expect.objectContaining({
          status: "matured",
          payoutStatus: "credited",
          payoutBankAccountId: "bank_hdfc_1",
        })
      );

      // 2. Should update target bank account balance (+maturity amount)
      expect(updateItem).toHaveBeenCalledWith(
        "bankAccounts",
        "bank_hdfc_1",
        expect.objectContaining({
          id: "bank_hdfc_1",
          balance: 150000 + 124957,
        })
      );

      // 3. Should add credit transaction in the bank ledger
      expect(addItem).toHaveBeenCalledWith(
        "transactions",
        expect.objectContaining({
          type: "credit",
          category: "Investments",
          subCategory: "RD Maturity",
          accountId: "bank_hdfc_1",
          amount: 124957,
          linked_type: "recurring_deposit",
          linked_id: "rd_matured_1",
        })
      );
    });
  });

  it("renders BanksTab with RD MATURITY badges in ledger and linked RD stats on bank card", () => {
    const mockState = {
      bankAccounts: mockBankAccounts,
      recurringDeposits: mockRecurringDeposits,
      fixedDeposits: [],
      transactions: [
        {
          id: "txn_rd_mat_1",
          type: "credit",
          category: "Investments",
          subCategory: "RD Maturity",
          amount: 124957,
          date: "2024-01-01",
          accountId: "bank_hdfc_1",
          linked_type: "recurring_deposit",
          linked_id: "rd_matured_1",
          note: "RD Maturity Payout - HDFC Bank (A/C: RD-99001)",
          owner: "self",
        },
      ],
    };

    render(
      <BanksTab
        state={mockState}
        fullState={mockState}
        addItem={vi.fn()}
        updateItem={vi.fn()}
        removeItem={vi.fn()}
      />
    );

    // Bank Account cards should show linked RD status
    expect(screen.getAllByText(/Linked RDs/i).length).toBeGreaterThan(0);

    // Switch to Transactions Ledger tab
    const ledgerTabBtn = screen.getByText("Transaction Ledger");
    fireEvent.click(ledgerTabBtn);

    // The transaction should show with RD MATURITY badge
    expect(screen.getAllByText("RD MATURITY").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("RD Maturity Payout - HDFC Bank (A/C: RD-99001)").length
    ).toBeGreaterThan(0);
  });
});
