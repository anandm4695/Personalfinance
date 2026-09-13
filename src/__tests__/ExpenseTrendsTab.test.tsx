/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExpenseTrendsTab } from "../components/tabs/ExpenseTrendsTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("ExpenseTrendsTab Executive UI & Analytics", () => {
  const mockState = {
    transactions: [
      {
        id: "t1",
        date: "2026-04-10",
        note: "Uber Trip",
        category: "Transport",
        type: "debit",
        amount: 450,
        description: "Office ride",
        account: "HDFC Bank",
      },
      {
        id: "t2",
        date: "2026-04-15",
        note: "Grocery at Nature's Basket",
        category: "Groceries",
        type: "debit",
        amount: 3200,
        description: "UPI-NATURES_BASKET-1234",
        account: "ICICI Bank",
      },
      {
        id: "t3",
        date: "2026-04-18",
        note: "Dinner at Smoke House Deli",
        category: "Dining",
        type: "debit",
        amount: 4500,
        description: "UPI-SMOKE_HOUSE_DELI-5678",
        account: "HDFC Bank",
      },
      {
        id: "t4",
        date: "2026-04-20",
        note: "Monthly Salary",
        category: "Salary",
        type: "credit",
        amount: 175000,
        description: "Monthly payout",
        account: "HDFC Bank",
      },
    ],
  };

  it("should render period bar, executive KPI summary, 50/30/20 balance, and deep dive tables", () => {
    const html = renderToString(<ExpenseTrendsTab state={mockState} metrics={{}} />);

    // Verify header title and section texts render correctly
    expect(html).toContain("Expense Trends &amp; Analytics");
    expect(html).toContain("Total Spend");
    expect(html).toContain("Avg Monthly");
    expect(html).toContain("Daily Burn Rate");
    expect(html).toContain("MoM Change");
    expect(html).toContain("Highest Month");
    expect(html).toContain("Lowest Month");
    expect(html).toContain("Top Category");
    expect(html).toContain("Net Savings Rate");

    // 50/30/20 Budgeting section
    expect(html).toContain("50/30/20 Essential vs Lifestyle Spending Balance");
    expect(html).toContain("NEEDS (ESSENTIALS)");
    expect(html).toContain("WANTS (DISCRETIONARY)");
    expect(html).toContain("SAVINGS &amp; INVESTMENTS");

    // Charts & Category breakdown
    expect(html).toContain("Monthly Spend Trend");
    expect(html).toContain("Spend by Category");
    expect(html).toContain("Category Trends");
    expect(html).toContain("Category Deep Dive");
    expect(html).toContain("Top Merchants / Payees");

    // Categories in table
    expect(html).toContain("Transport");
    expect(html).toContain("Groceries");
    expect(html).toContain("Dining");
  });

  it("should render empty state gracefully when no transactions are provided", () => {
    const html = renderToString(<ExpenseTrendsTab state={{ transactions: [] }} metrics={{}} />);
    expect(html).toContain("No Transactions Yet");
    expect(html).toContain("Add transactions from the Banks tab");
  });

  it("should detect and display anomaly alerts when transactions are high-value outliers", () => {
    const stateWithOutlier = {
      transactions: [
        {
          id: "t1",
          date: "2026-04-05",
          note: "Regular Groceries",
          category: "Groceries",
          type: "debit",
          amount: 2000,
        },
        {
          id: "t2",
          date: "2026-04-12",
          note: "Luxury Appliance Purchase",
          category: "Electronics",
          type: "debit",
          amount: 85000,
        },
      ],
    };

    const html = renderToString(<ExpenseTrendsTab state={stateWithOutlier} metrics={{}} />);
    expect(html).toContain("Anomaly Detection");
    expect(html).toContain("Outlier Transaction");
  });
});
