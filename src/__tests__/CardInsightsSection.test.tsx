/* eslint-disable */
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CardInsightsSection,
  getFYDetails,
  getCategoryIcon,
  getCategoryColor,
} from "../components/credit/CardInsightsSection";

describe("CardInsightsSection - Fiscal Year (FY) & Assessment Year (AY) Math", () => {
  it("correctly computes FY and AY for April-December dates", () => {
    const res1 = getFYDetails("2024-04-01");
    expect(res1.fy).toBe("FY 2024-25");
    expect(res1.ay).toBe("AY 2025-26");
    expect(res1.fyStartYear).toBe(2024);

    const res2 = getFYDetails("2024-11-15");
    expect(res2.fy).toBe("FY 2024-25");
    expect(res2.ay).toBe("AY 2025-26");
    expect(res2.fyStartYear).toBe(2024);
  });

  it("correctly computes FY and AY for January-March dates (falls in previous calendar start year)", () => {
    const res1 = getFYDetails("2025-01-10");
    expect(res1.fy).toBe("FY 2024-25");
    expect(res1.ay).toBe("AY 2025-26");
    expect(res1.fyStartYear).toBe(2024);

    const res2 = getFYDetails("2025-03-31");
    expect(res2.fy).toBe("FY 2024-25");
    expect(res2.ay).toBe("AY 2025-26");
    expect(res2.fyStartYear).toBe(2024);
  });

  it("correctly rolls over to next FY on 1st April", () => {
    const res = getFYDetails("2025-04-01");
    expect(res.fy).toBe("FY 2025-26");
    expect(res.ay).toBe("AY 2026-27");
    expect(res.fyStartYear).toBe(2025);
  });
});

describe("CardInsightsSection - Category helpers", () => {
  it("returns appropriate category colors and icons", () => {
    expect(getCategoryColor("Food & Dining")).toBe("#F97316");
    expect(getCategoryColor("Shopping")).toBe("#8B5CF6");
    expect(getCategoryColor("Travel")).toBe("#0EA5E9");
    expect(getCategoryColor("Groceries")).toBe("#10B981");

    expect(getCategoryIcon("Dining")).toBeDefined();
    expect(getCategoryIcon("Flight Tickets")).toBeDefined();
  });
});

describe("CardInsightsSection Component UI & Calculations", () => {
  const mockState = {
    creditCards: [
      {
        id: "cc-1",
        issuer: "HDFC Regalia Gold",
        cardName: "HDFC Regalia Gold",
        bank: "HDFC Bank",
        network: "Visa",
        last4: "4321",
        limit: 500000,
        outstanding: 45000,
        billDate: "15",
        dueDay: "5",
        annualFee: 2500,
        feeWaiverSpendTarget: 400000,
        rewardPointsBalance: 12000,
        rewardPointValue: 0.5,
        status: "active",
        transactions: [
          {
            id: "tx-1",
            date: "2024-05-10",
            merchant: "Amazon India",
            category: "Shopping",
            amount: "15000",
          },
          {
            id: "tx-2",
            date: "2024-05-20",
            merchant: "Swiggy",
            category: "Food",
            amount: "2500",
          },
          {
            id: "tx-3",
            date: "2024-06-05",
            merchant: "HDFC Bill Pay",
            category: "Payment",
            amount: "-17500",
          },
        ],
      },
      {
        id: "cc-2",
        issuer: "ICICI Sapphiro",
        cardName: "ICICI Sapphiro",
        bank: "ICICI Bank",
        network: "Mastercard",
        last4: "8899",
        limit: 300000,
        outstanding: 20000,
        billDate: "20",
        dueDay: "10",
        annualFee: 0,
        status: "active",
        transactions: [
          {
            id: "tx-4",
            date: "2024-06-12",
            merchant: "MakeMyTrip Flights",
            category: "Travel",
            amount: "20000",
          },
        ],
      },
    ],
    prepaidCards: [
      {
        id: "prep-1",
        cardName: "Zeta Meal Card",
        bank: "Zeta",
        network: "RuPay",
        last4: "1122",
        balance: 5000,
        limit: 10000,
        status: "active",
        transactions: [
          {
            id: "ptx-1",
            date: "2024-05-01",
            merchant: "Company Salary Load",
            type: "load",
            amount: 10000,
            category: "Top-Up",
          },
          {
            id: "ptx-2",
            date: "2024-05-05",
            merchant: "Starbucks Coffee",
            type: "spend",
            amount: 1200,
            category: "Food",
          },
        ],
      },
    ],
  };

  it("renders the Card Insights title and high-level KPI cards", () => {
    render(<CardInsightsSection state={mockState} />);

    expect(screen.getByText("Card Spends & Portfolio Insights")).toBeDefined();
    expect(screen.getByText("Total Card Spends")).toBeDefined();
    expect(screen.getByText("Payments & Top-Ups")).toBeDefined();
    expect(screen.getByText("Monthly Average Outflow")).toBeDefined();
    expect(screen.getByText("Credit Utilization")).toBeDefined();
  });

  it("calculates SFT Section 285BA status accurately", () => {
    render(<CardInsightsSection state={mockState} />);

    expect(screen.getByText(/Section 285BA \/ SFT Compliance Monitor/)).toBeDefined();
    expect(screen.getByText(/Under Indian Income Tax rules/)).toBeDefined();
  });

  it("switches to Month-Wise Breakdown view seamlessly", () => {
    render(<CardInsightsSection state={mockState} />);

    const monthTabButton = screen.getByRole("button", { name: /Month-Wise Breakdown/i });
    fireEvent.click(monthTabButton);

    expect(screen.getByText("Month-by-Month Card Spends & Flow Ledger")).toBeDefined();
    expect(screen.getByText("Charges / Spends")).toBeDefined();
    expect(screen.getByText("Net Outflow")).toBeDefined();
  });

  it("switches to Category Intelligence view seamlessly", () => {
    render(<CardInsightsSection state={mockState} />);

    const catTabButton = screen.getByRole("button", { name: /Category Intelligence/i });
    fireEvent.click(catTabButton);

    expect(screen.getAllByText("Shopping").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Travel").length).toBeGreaterThan(0);
  });

  it("switches to F.Y. & A.Y. Tax Hub view seamlessly", () => {
    render(<CardInsightsSection state={mockState} />);

    const taxTabButton = screen.getByRole("button", { name: /F\.Y\. & A\.Y\. Tax Hub/i });
    fireEvent.click(taxTabButton);

    expect(
      screen.getByText("Multi-Year Financial Year (F.Y.) & Assessment Year (A.Y.) Ledger")
    ).toBeDefined();
    expect(screen.getByText(/Key Indian Tax & SFT Credit Card Compliance Points/i)).toBeDefined();
  });

  it("switches to Smart Advisory & Benefits view", () => {
    render(<CardInsightsSection state={mockState} />);

    const advisoryTab = screen.getByRole("button", { name: /Smart Advisory & Benefits/i });
    fireEvent.click(advisoryTab);

    expect(screen.getByText(/Smart Swipe Advisor/i)).toBeDefined();
    expect(screen.getByText(/TOP SUGGESTED CARD FOR TODAY/i)).toBeDefined();
    expect(screen.getByText(/Why swipe this card today\?/i)).toBeDefined();
    expect(screen.getByText(/Annual Fee Waiver Milestones Tracker/i)).toBeDefined();
  });

  it("switches to Unified Ledger view with search and sort", () => {
    render(<CardInsightsSection state={mockState} />);

    const ledgerTab = screen.getByRole("button", { name: /Unified Ledger/i });
    fireEvent.click(ledgerTab);

    expect(screen.getByText("Unified Card Transaction Ledger")).toBeDefined();
    expect(screen.getByText("Amazon India")).toBeDefined();
    expect(screen.getByText("Starbucks Coffee")).toBeDefined();
  });
});
