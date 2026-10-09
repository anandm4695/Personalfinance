import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BanksTab } from "../components/tabs/BanksTab";
import { PrivacyProvider } from "../context/PrivacyContext";

describe("BanksTab Liquid Cash Runway Calculation", () => {
  const defaultProps = {
    addItem: () => {},
    addTransactions: () => {},
    removeItem: () => {},
    bulkRemoveTransactions: () => {},
    updateItem: () => {},
    showToast: () => {},
  };

  it("calculates extensive runway (> 24 months) without arbitrary caps and displays months + years", () => {
    const state = {
      bankAccounts: [
        { id: "acc1", bankName: "HDFC Bank", balance: 6000000, isActive: true },
      ],
      transactions: [
        { id: "t1", date: new Date().toISOString().slice(0, 10), type: "debit", amount: 50000, category: "Groceries" },
        { id: "t2", date: new Date().toISOString().slice(0, 10), type: "debit", amount: 100000, category: "Rent" },
      ],
    };

    // 3-mo debits = 150,000 -> avgMonthlyBurn = 50,000 -> Runway = 6,000,000 / 50,000 = 120.0 Months (10.0 yrs)
    render(
      <PrivacyProvider>
        <BanksTab state={state} {...defaultProps} />
      </PrivacyProvider>
    );

    expect(screen.getByText("120.0 Months")).toBeDefined();
    expect(screen.getByText(/~10.0 yrs/)).toBeDefined();
  });

  it("falls back to recurring commitments / budget when recent transactions are 0", () => {
    const state = {
      bankAccounts: [
        { id: "acc1", bankName: "ICICI Bank", balance: 2400000, isActive: true },
      ],
      transactions: [],
      recurringExpenses: [
        { id: "r1", name: "Maintenance", amount: 40000 },
      ],
    };

    // efMonthlyBurn = 40,000 -> Runway = 2,400,000 / 40,000 = 60.0 Months (~5.0 yrs)
    render(
      <PrivacyProvider>
        <BanksTab state={state} {...defaultProps} />
      </PrivacyProvider>
    );

    expect(screen.getByText("60.0 Months")).toBeDefined();
    expect(screen.getByText(/~5.0 yrs/)).toBeDefined();
  });

  it("displays infinite runway / zero burn when there are no outflows or commitments recorded", () => {
    const state = {
      bankAccounts: [
        { id: "acc1", bankName: "SBI", balance: 500000, isActive: true },
      ],
      transactions: [],
      recurringExpenses: [],
      budgets: [],
    };

    render(
      <PrivacyProvider>
        <BanksTab state={state} {...defaultProps} />
      </PrivacyProvider>
    );

    expect(screen.getByText("∞ No Burn")).toBeDefined();
    expect(screen.getByText("Zero outflows recorded (Infinite runway)")).toBeDefined();
  });
});
