/* eslint-disable */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BudgetTab } from "../components/tabs/BudgetTab";
import { PrivacyProvider } from "../context/PrivacyContext";

import { today } from "../utils/finance";

// Mock Recharts ResponsiveContainer to avoid jsdom zero-dimension rendering issues
vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 400 }}>{children}</div>,
  };
});

const curMonth = today().slice(0, 7);

const mockState = {
  budgets: [
    {
      id: "b1",
      category: "Groceries",
      monthly: 10000,
      budgetMonth: curMonth,
      owner: "self",
      rollover: true,
    },
    {
      id: "b2",
      category: "Dining",
      monthly: 5000,
      budgetMonth: curMonth,
      owner: "self",
      rollover: false,
    },
    {
      id: "b3",
      category: "Transport",
      monthly: 4000,
      budgetMonth: "2026-08",
      owner: "self",
      rollover: false,
    },
  ],
  transactions: [
    {
      id: "t1",
      date: `${curMonth}-05`,
      type: "debit",
      category: "Groceries",
      amount: 4500,
      note: "Nature's Basket supermarket",
      accountId: "acc1",
    },
    {
      id: "t2",
      date: `${curMonth}-10`,
      type: "debit",
      category: "Dining",
      amount: 5500,
      note: "Family dinner restaurant",
      accountId: "acc1",
    },
    {
      id: "t3",
      date: `${curMonth}-02`,
      type: "debit",
      category: "Entertainment",
      amount: 1200,
      note: "Movie IMAX tickets",
      accountId: "acc1",
    },
    {
      id: "t4",
      date: `${curMonth}-01`,
      type: "credit",
      category: "Salary",
      amount: 150000,
      note: "Monthly salary credit",
      accountId: "acc1",
    },
    {
      id: "t5",
      date: "2026-08-15",
      type: "debit",
      category: "Groceries",
      amount: 6000,
      note: "August groceries",
      accountId: "acc1",
    },
  ],
  recurringExpenses: [
    {
      id: "re1",
      name: "Maid Salary",
      category: "Bills",
      amount: 6000,
      frequency: "monthly",
      dueDay: 5,
      startDate: "2026-01-01",
      isActive: true,
      owner: "self",
      accountId: "acc1",
    },
    {
      id: "re2",
      name: "Broadband Bill",
      category: "Utilities",
      amount: 1199,
      frequency: "monthly",
      dueDay: 15,
      startDate: "2026-01-01",
      isActive: true,
      owner: "self",
      accountId: "acc1",
    },
  ],
  rentedProperties: [],
  bankAccounts: [
    {
      id: "acc1",
      bankName: "HDFC Bank",
      accountNumber: "1234567890",
      type: "savings",
    },
  ],
  income: [],
  masterData: {
    transactionCategories: ["Groceries", "Dining", "Bills", "Utilities", "Entertainment", "Transport", "Investment"],
    familyProfiles: [{ id: "self", name: "Anand Mohta", relation: "Self" }],
  },
};

describe("BudgetTab Redesign Tests", () => {
  it("renders the summary KPI tiles and budget categories correctly", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <PrivacyProvider>
        <BudgetTab
          state={mockState}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          activeProfile="all"
        />
      </PrivacyProvider>
    );

    // Header & Subtabs
    expect(screen.getByText("Budget Tracker")).toBeTruthy();
    expect(screen.getByText("Fixed & Recurring")).toBeTruthy();
    expect(screen.getByText("Analytics & Trends")).toBeTruthy();

    // Summary KPIs
    expect(screen.getByText("Total Budgeted")).toBeTruthy();
    expect(screen.getByText("Actual Spent")).toBeTruthy();
    expect(screen.getByText("Remaining Capacity")).toBeTruthy();
    expect(screen.getByText("50 / 30 / 20 Financial Wellness Rule")).toBeTruthy();

    // Category Cards
    expect(screen.getByText("Groceries")).toBeTruthy();
    expect(screen.getByText("Dining")).toBeTruthy();
  });

  it("filters categories when searching in search bar", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <PrivacyProvider>
        <BudgetTab
          state={mockState}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          activeProfile="all"
        />
      </PrivacyProvider>
    );

    const searchInput = screen.getByPlaceholderText("Search categories...");
    fireEvent.change(searchInput, { target: { value: "Dining" } });

    expect(screen.getByText("Dining")).toBeTruthy();
    expect(screen.queryByText("Groceries")).toBeNull();
  });

  it("opens Category Detail Drawer when a category card is clicked", async () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <PrivacyProvider>
        <BudgetTab
          state={mockState}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          activeProfile="all"
        />
      </PrivacyProvider>
    );

    // Click on Groceries category card
    const groceriesTitle = screen.getByText("Groceries");
    fireEvent.click(groceriesTitle.closest(".hover-card") || groceriesTitle);

    // Drawer should open and display matching transactions
    await waitFor(() => {
      expect(screen.getByText(/Groceries — Details & Transactions/)).toBeTruthy();
      expect(screen.getByText("Nature's Basket supermarket")).toBeTruthy();
    });
  });

  it("switches to Fixed & Recurring subtab and displays commitments", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <PrivacyProvider>
        <BudgetTab
          state={mockState}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          activeProfile="all"
        />
      </PrivacyProvider>
    );

    const recurringTab = screen.getByText("Fixed & Recurring");
    fireEvent.click(recurringTab);

    expect(screen.getByText("Fixed & Recurring Outflows")).toBeTruthy();
    expect(screen.getByText("Maid Salary")).toBeTruthy();
    expect(screen.getByText("Broadband Bill")).toBeTruthy();
  });

  it("switches to Analytics & Trends subtab and displays chart sections", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <PrivacyProvider>
        <BudgetTab
          state={mockState}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          activeProfile="all"
        />
      </PrivacyProvider>
    );

    const analyticsTab = screen.getByText("Analytics & Trends");
    fireEvent.click(analyticsTab);

    expect(screen.getByText("Budget Analytics & Trends")).toBeTruthy();
    expect(screen.getByText(/Budget Target vs Actual Spend/)).toBeTruthy();
    expect(screen.getByText("Spending Allocation by Category")).toBeTruthy();
    expect(screen.getByText("3-Month Historical Spending vs Current Month")).toBeTruthy();
  });
});
