import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmergencyFundTab } from "../components/tabs/EmergencyFundTab";

describe("EmergencyFundTab Redesign", () => {
  const mockState = {
    bankAccounts: [
      { id: "b1", bankName: "HDFC Bank", accountName: "Salary Account", accountNumber: "1234567890", balance: 300000, accountType: "Savings" },
      { id: "b2", bankName: "ICICI Bank", accountName: "Emergency Stash", accountNumber: "9876543210", balance: 200000, accountType: "Savings" },
    ],
    mutualFunds: [
      { id: "mf1", name: "HDFC Liquid Fund Direct Plan Growth", category: "Liquid Fund", units: 100, currentNav: 3500, buyNav: 3200 },
      { id: "mf2", name: "Parag Parikh Flexi Cap Fund", category: "Flexi Cap", units: 50, currentNav: 60, buyNav: 50 },
    ],
    fixedDeposits: [
      {
        id: "fd1",
        bankName: "State Bank of India",
        principal: 150000,
        interestRate: 7.1,
        // Near-term maturity (within 30 days)
        maturityDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      },
      {
        id: "fd2",
        bankName: "HDFC Bank",
        principal: 500000,
        interestRate: 7.5,
        // Long-term maturity (1 year)
        maturityDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      },
    ],
    prepaidCards: [
      { id: "c1", cardName: "Niyo Global", balance: 25000, last4: "4321" },
    ],
    loansTaken: [
      { id: "l1", name: "Home Loan", emi: 35000, outstanding: 2500000 },
    ],
    rentedProperties: [
      { id: "r1", name: "2BHK Apartment", rent: 25000, isActive: true },
    ],
    sips: [
      { id: "s1", name: "Nifty 50 Index SIP", amount: 15000, status: "active" },
    ],
    subscriptions: [
      { id: "sub1", name: "Netflix Premium", amount: 649, cycle: "monthly", paused: false },
    ],
    recurringExpenses: [
      { id: "rec1", name: "Electricity & Wi-Fi", amount: 5000 },
    ],
    lic: [],
    termPlans: [],
    investmentPlans: [],
    healthInsurance: [
      { id: "hi1", policyName: "Family Floater", premium: 24000, premiumFrequency: "Yearly", annualPremium: 24000 },
    ],
  };

  const mockMetrics = {
    emergencyFund: {
      liquidAssets: 975000, // 500k bank + 350k liquid MF + 100k near FD + 25k prepaid
      cashInBanks: 500000,
      nearTermFDValue: 150000,
      liquidMFValue: 350000,
      prepaidValue: 25000,
      monthlyExpense: 82649,
      monthsCovered: 11.8,
      targetMonths: 6,
      targetAmount: 495894,
      gap: 0,
      coveragePct: 100,
      tier: "healthy",
      label: "Adequate Runway",
    },
    monthIncome: 180000,
    monthExpense: 82649,
  };

  it("renders the Emergency Fund & Runway Hub with all essential cockpit metrics", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    expect(screen.getByText("Emergency Fund & Runway Hub")).toBeDefined();
    expect(screen.getByText("Standard Lifestyle Burn")).toBeDefined();
    expect(screen.getByText("Bare-Bones Survival")).toBeDefined();
    expect(screen.getByText("3-Tier Liquidity Waterfall Architecture")).toBeDefined();
    expect(screen.getByText("Tier 1: T+0 Instant Access")).toBeDefined();
    expect(screen.getByText("Tier 2: T+1 Liquid Funds")).toBeDefined();
    expect(screen.getByText("Tier 3: T+3 Near-Term Buffer")).toBeDefined();
  });

  it("switches to Bare-Bones Survival Mode and updates burn rate", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    const survivalBtn = screen.getByText("Bare-Bones Survival");
    fireEvent.click(survivalBtn);

    expect(screen.getByText("Bare-Bones Survival Mode")).toBeDefined();
  });

  it("allows switching Target Runway Horizon (3M, 6M, 9M, 12M)", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    const twelveMonthBtn = screen.getByText("12M (Fortified)");
    fireEvent.click(twelveMonthBtn);

    expect(screen.getByText("12 Months")).toBeDefined();
  });

  it("handles What-If expense trimming (pausing SIPs and Subscriptions)", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    const pauseSipCard = screen.getByText("Pause SIP Investments");
    fireEvent.click(pauseSipCard);

    expect(screen.getByText(/"What-If" Expense Trimmer/)).toBeDefined();
  });

  it("triggers Crisis Stress-Test Sandbox scenarios", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    const medicalShockBtn = screen.getByText("Medical Out-of-Pocket");
    fireEvent.click(medicalShockBtn);

    expect(screen.getByText(/Hospitalization \/ Medical Emergency Shock/)).toBeDefined();
    expect(screen.getByText(/Crisis Liquidity Drawdown Sequence/)).toBeDefined();
  });

  it("opens Emergency Action Protocol modal when clicked", () => {
    render(<EmergencyFundTab state={mockState} metrics={mockMetrics} />);

    const playbookBtn = screen.getByText("Emergency Playbook");
    fireEvent.click(playbookBtn);

    expect(screen.getByText("Emergency Action Protocol & Family Playbook")).toBeDefined();
    expect(screen.getByText(/Phase 1: Immediate Cash/)).toBeDefined();

    const gotItBtn = screen.getByText("Got It");
    fireEvent.click(gotItBtn);
  });
});
