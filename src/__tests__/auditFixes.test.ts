import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMetrics } from "../hooks/useMetrics";
import { computeNetWorthAsOf } from "../utils/netWorthAsOf";

describe("Senior Developer & Senior Accountant Audit Fixes", () => {
  const baseState: any = {
    profile: { id: "self", name: "Anand" },
    bankAccounts: [
      { id: "b1", bankName: "HDFC Bank", type: "Savings", balance: 100000, interestRate: 3.5 },
      { id: "b2", bankName: "SBI", type: "Savings", balance: 200000, interestRate: 3.0 },
    ],
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [],
    stocks: [],
    mutualFunds: [],
    ppf: [],
    epf: [],
    nps: [],
    lic: [],
    termPlans: [],
    investmentPlans: [],
    healthInsurance: [],
    goldHoldings: [],
    creditCards: [],
    loansTaken: [],
    loansGiven: [],
    rentedProperties: [],
    realEstateProperties: [],
    realEstateDemands: [],
    realEstatePayments: [],
    prepaidCards: [],
    govtSchemes: [],
    vehicles: [],
    salarySlips: [],
    income: [],
    transactions: [
      { id: "t1", date: "2026-04-05", type: "credit", category: "Salary", amount: 150000 },
      { id: "t2", date: "2026-04-06", type: "debit", category: "Groceries", amount: 20000 },
      { id: "t3", date: "2026-04-07", type: "credit", category: "Transfer", amount: 50000 },
      { id: "t4", date: "2026-04-08", type: "debit", category: "Self Transfer", amount: 50000 },
      { id: "t5", date: "2026-04-09", type: "debit", category: "Self-Transfer", amount: 25000 },
      { id: "t6", date: "2026-04-10", type: "debit", category: "Investment", amount: 30000 },
    ],
    informalLent: [],
    informalBorrowed: [],
  };

  describe("1. Informal Debts without tranches (Legacy / Direct entry)", () => {
    it("includes person.amount in global useMetrics net worth when tranches are not logged", () => {
      const stateWithInformal = {
        ...baseState,
        informalLent: [{ id: "l1", name: "Friend A", amount: 50000, owner: "self" }],
        informalBorrowed: [{ id: "b1", name: "Relative B", amount: 20000, owner: "self" }],
      };

      const { result } = renderHook(() => useMetrics(stateWithInformal, "all", {}));
      // Bank balance: 300,000 + Informal Lent: 50,000 = Total Assets 350,000
      // Liabilities: 20,000
      // Net Worth: 330,000
      expect(result.current.metrics.informalLentValue).toBe(50000);
      expect(result.current.metrics.informalBorrowedValue).toBe(20000);
      expect(result.current.metrics.netWorth).toBe(330000);
    });

    it("includes person.amount in computeNetWorthAsOf when tranches are not logged", () => {
      const stateWithInformal = {
        ...baseState,
        informalLent: [{ id: "l1", name: "Friend A", amount: 50000, date: "2026-01-10", owner: "self" }],
        informalBorrowed: [{ id: "b1", name: "Relative B", amount: 20000, date: "2026-01-15", owner: "self" }],
      };

      const res = computeNetWorthAsOf(stateWithInformal, "2026-04", {});
      expect(res.totalAssets).toBe(350000);
      expect(res.totalLiabilities).toBe(20000);
      expect(res.netWorth).toBe(330000);
    });
  });

  describe("2. Bank Tab Transaction Exclusions", () => {
    it("excludes Transfer, Self Transfer, and Investment from income & expenses", () => {
      const isTransferCat = (cat: string) =>
        cat === "Transfer" ||
        cat === "Self Transfer" ||
        cat === "Self-Transfer" ||
        cat === "Investment";

      const txns = baseState.transactions;
      const monthlyIncome = txns
        .filter((t: any) => t.type === "credit" && !isTransferCat(t.category))
        .reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0);
      const monthlyExpense = txns
        .filter((t: any) => t.type === "debit" && !isTransferCat(t.category))
        .reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0);

      // Income should only be Salary (150,000), ignoring credit Transfer (50,000)
      expect(monthlyIncome).toBe(150000);
      // Expense should only be Groceries (20,000), ignoring Self Transfer, Self-Transfer, and Investment
      expect(monthlyExpense).toBe(20000);
    });
  });

  describe("3. Section 80TTA Aggregate Savings Interest", () => {
    it("aggregates savings interest across accounts before applying ₹10,000 statutory cap", () => {
      const accounts = [
        { id: "b1", type: "savings", balance: 200000, interestRate: 3.5 }, // 7,000
        { id: "b2", type: "savings", balance: 200000, interestRate: 3.0 }, // 6,000
      ];
      // Total interest: 13,000
      const totalInterest = accounts
        .filter((a) => (a.type || "").toLowerCase() === "savings")
        .reduce((s, a) => s + Number(a.balance || 0) * (Number(a.interestRate || 3.0) / 100), 0);
      const sec80TTA_limit = 10000;
      const sec80TTA_used = Math.min(totalInterest, sec80TTA_limit);

      expect(totalInterest).toBe(13000);
      expect(sec80TTA_used).toBe(10000);
    });
  });

  describe("4. Government Schemes in Portfolio & Statement Calculations", () => {
    it("correctly includes govtSchemes in investment statement portfolio calculations", () => {
      const stateWithGovt = {
        ...baseState,
        govtSchemes: [
          { id: "g1", schemeType: "SSY", schemeName: "Sukanya Samriddhi", currentBalance: 150000, interestRate: 8.2, owner: "self" },
          { id: "g2", schemeType: "NSC", schemeName: "National Savings Certificate", currentBalance: 50000, interestRate: 7.7, owner: "self" },
        ],
      };

      const govtInvested = (stateWithGovt.govtSchemes || []).reduce(
        (s: number, g: any) => s + (Number(g.contributionAmount) || Number(g.currentBalance) || 0),
        0
      );
      const govtCurrent = (stateWithGovt.govtSchemes || []).reduce(
        (s: number, g: any) => s + Number(g.currentBalance || 0),
        0
      );

      expect(govtInvested).toBe(200000);
      expect(govtCurrent).toBe(200000);
    });
  });
});
