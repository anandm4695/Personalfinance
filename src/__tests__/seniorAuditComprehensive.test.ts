import { describe, it, expect } from "vitest";
import {
  loanOutstanding,
  loanGivenOutstanding,
  getEmergencyFundMonthlyExpense,
  calcTaxNew,
  calcTaxNewByFY,
  getNextSubscriptionRenewal,
  getAutoDetectedDeductions,
  getTaxDueForDashboard,
} from "../utils/finance";
import { computeNetWorthAsOf } from "../utils/netWorthAsOf";

describe("Senior Comprehensive Audit - Accountant & Developer Verification", () => {
  describe("Loan Outstanding & Loan Given Outstanding", () => {
    it("returns outstanding balance when present", () => {
      expect(loanOutstanding({ outstanding: 50000, principal: 100000 })).toBe(50000);
      expect(loanOutstanding({ outstanding: "45000", principal: 100000 })).toBe(45000);
      expect(loanGivenOutstanding({ outstanding: 20000, principal: 50000 })).toBe(20000);
    });

    it("falls back to principal when outstanding is null, undefined, or empty string", () => {
      expect(loanOutstanding({ principal: 150000 })).toBe(150000);
      expect(loanOutstanding({ outstanding: null, principal: 150000 })).toBe(150000);
      expect(loanOutstanding({ outstanding: undefined, principal: 150000 })).toBe(150000);
      expect(loanOutstanding({ outstanding: "", principal: 150000 })).toBe(150000);

      expect(loanGivenOutstanding({ principal: 75000 })).toBe(75000);
      expect(loanGivenOutstanding({ outstanding: null, amount: 75000 })).toBe(75000);
    });

    it("returns 0 if loan status is closed regardless of outstanding field", () => {
      expect(loanOutstanding({ status: "closed", outstanding: 50000, principal: 100000 })).toBe(0);
      expect(loanOutstanding({ status: "Closed", outstanding: 50000 })).toBe(0);
      expect(loanGivenOutstanding({ status: "closed", outstanding: 25000 })).toBe(0);
    });
  });

  describe("Emergency Fund Monthly Expense Calculations", () => {
    it("excludes closed loans and loans with zero balance from EMI expense", () => {
      const state = {
        loansTaken: [
          { name: "Active Home Loan", emi: 25000, outstanding: 2000000, status: "active" },
          { name: "Closed Car Loan", emi: 12000, outstanding: 0, status: "closed" },
          { name: "Paid Personal Loan", emi: 5000, outstanding: 0, principal: 0 },
        ],
        subscriptions: [
          { name: "Netflix", amount: 649, cycle: "monthly" },
          { name: "Amazon Prime", amount: 1499, cycle: "yearly" },
          { name: "Hotstar", amount: 600, cycle: "half-yearly" },
        ],
        rentedProperties: [],
        sips: [],
        recurringExpenses: [],
        lic: [],
        termPlans: [],
        investmentPlans: [],
        healthInsurance: [],
      };

      const monthlyExp = getEmergencyFundMonthlyExpense(state);
      // Expected EMI: 25000
      // Expected Subscriptions: 649 + 1499/12 (124.9167) + 600/6 (100) = 873.9167
      // Total monthly: 25873.9167
      expect(monthlyExp).toBeCloseTo(25873.92, 1);
    });
  });

  describe("Tax Calculations with Budget 2025-26 Standard Deductions & Slabs", () => {
    it("exempts income within Section 87A rebate limit under FY 2025-26", () => {
      // Under FY 2025-26, income up to 12,00,000 has 87A rebate yielding 0 tax
      expect(calcTaxNew(700000).total).toBe(0);
      expect(calcTaxNew(1200000).total).toBe(0);
      expect(calcTaxNewByFY(700000, "2025-26").total).toBe(0);
    });

    it("accurately calculates tax for 15 Lakhs income under FY 2025-26", () => {
      const taxRes = calcTaxNew(1500000);
      expect(taxRes.stdDed).toBe(75000);
      expect(taxRes.taxable).toBe(1425000);
      expect(taxRes.total).toBeGreaterThan(0);
    });
  });

  describe("Net Worth As Of Loan Liability Integrity", () => {
    it("recognizes loan liability even if outstanding was omitted and only principal was specified", () => {
      const state = {
        bankAccounts: [{ balance: 500000 }],
        loansTaken: [{ principal: 300000 }], // outstanding omitted
        loansGiven: [{ principal: 100000 }],
        bonds: [{ numberOfUnits: 10, faceValuePerUnit: 1000 }], // unit-based valuation
      };

      const result = computeNetWorthAsOf(state, "2026-09", {});
      expect(result.totalLiabilities).toBe(300000);
      expect(result.totalAssets).toBe(610000);
      // Net worth = 500,000 (bank) + 100,000 (loan given) + 10,000 (bond) - 300,000 (loan taken) = 310,000
      expect(result.netWorth).toBe(310000);
    });
  });

  describe("Subscription Renewal Roll Forward", () => {
    it("advances overdue renewals past today's date", () => {
      const pastRenewal = "2026-05-15";
      const refDate = "2026-09-08";
      const nextDate = getNextSubscriptionRenewal(pastRenewal, "monthly", refDate);
      expect(nextDate).toBe("2026-09-15");
      expect(nextDate >= refDate).toBe(true);
    });
  });

  describe("Loan Amortization & Prepayment Math", () => {
    it("computes base amortization accurately", async () => {
      const { generateAmortization } = await import("../components/tabs/LoanAmortizationTab");
      // 10 Lakhs, 8.5% p.a., 240 months (20 years)
      const res = generateAmortization(1000000, 8.5, 240);
      expect(res.emi).toBe(8678);
      expect(res.totalMonths).toBe(240);
      expect(res.totalInterest).toBeGreaterThan(1000000);
      expect(res.schedule[0].principal).toBeLessThan(res.schedule[0].interest);
    });

    it("accelerates loan closure and saves substantial interest with extra monthly payment", async () => {
      const { generateAmortization } = await import("../components/tabs/LoanAmortizationTab");
      const base = generateAmortization(1000000, 8.5, 240);
      // Prepaying Rs. 2,000 extra per month
      const prepaid = generateAmortization(1000000, 8.5, 240, 2000);
      expect(prepaid.totalMonths).toBeLessThan(base.totalMonths);
      expect(prepaid.totalInterest).toBeLessThan(base.totalInterest);
      expect(base.totalInterest - prepaid.totalInterest).toBeGreaterThan(200000); // Saves over 2 lakhs interest
    });

    it("applies lump sum prepayment in specified month to reduce balance and interest", async () => {
      const { generateAmortization } = await import("../components/tabs/LoanAmortizationTab");
      const base = generateAmortization(1000000, 8.5, 240);
      // 1 Lakh lump sum at month 12
      const lump = generateAmortization(1000000, 8.5, 240, 0, { month: 12, amount: 100000 });
      expect(lump.totalMonths).toBeLessThan(base.totalMonths);
      expect(lump.totalInterest).toBeLessThan(base.totalInterest);
      expect(lump.schedule[11].principal).toBeGreaterThan(100000); // 12th month (index 11) has lump sum
    });
  });

  describe("Bond Valuation and Unit-Based Fallbacks", () => {
    it("computes unit-based bond value properly when totalPrincipalAmount is omitted", () => {
      const bond = {
        name: "GOI 7.18% 2033",
        numberOfUnits: 100,
        faceValuePerUnit: 1000,
        coupon: 7.18,
      };
      const principal = Number(bond.numberOfUnits || 0) * Number(bond.faceValuePerUnit || 0);
      expect(principal).toBe(100000);
      const couponAnnual = (principal * bond.coupon) / 100;
      expect(couponAnnual).toBe(7180);
    });
  });

  describe("Section 80D Health Insurance Auto-Detection", () => {
    it("annualizes health insurance premiums across monthly and annual payment cycles", async () => {
      const { annualizePremium } = await import("../utils/finance");
      const annualPolicy = { premium: 18500, premiumFrequency: "annual" };
      const monthlyPolicy = { premium: 1200, premiumFrequency: "monthly" };

      expect(annualizePremium(annualPolicy.premium, annualPolicy.premiumFrequency)).toBe(18500);
      expect(annualizePremium(monthlyPolicy.premium, monthlyPolicy.premiumFrequency)).toBe(14400);

      const totalD80D =
        annualizePremium(annualPolicy.premium, annualPolicy.premiumFrequency) +
        annualizePremium(monthlyPolicy.premium, monthlyPolicy.premiumFrequency);
      expect(totalD80D).toBe(32900);
    });

    it("auto-detects 80D health insurance and NPS in getAutoDetectedDeductions and getTaxDueForDashboard", async () => {
      const { getAutoDetectedDeductions, getTaxDueForDashboard } = await import("../utils/finance");
      const state = {
        profile: { fy: "2025-26", regime: "old" },
        healthInsurance: [
          { premium: 20000, premiumFrequency: "annual", insuredMembers: [{ relation: "Self" }] },
          { premium: 35000, premiumFrequency: "annual", insuredMembers: [{ relation: "Father" }] },
        ],
        nps: [
          { thisYearContribution: 60000, employerContribution: 40000 },
        ],
        masterData: {
          familyProfiles: [
            { id: "self", dob: "1990-01-01" },
            { id: "father", relation: "Father", dob: "1960-01-01" }, // Senior citizen (65+)
          ],
        },
        mutualFunds: [],
        ppfLedger: [],
        lic: [],
        epf: [],
        rentedProperties: [],
        loansTaken: [],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // Self: ₹20k (under ₹25k cap)
      // Parents (Senior): ₹35k (under ₹50k senior cap)
      // Total 80D: 20k + 35k = 55k
      expect(auto.d80D).toBe(55000);
      expect(auto.d80D_source).toContain("Self/Family ₹20,000 + Parents ₹35,000");

      // NPS: 60k capped at 50k
      expect(auto.nps).toBe(50000);
      expect(auto.nps_source).toBe("NPS ₹50,000");

      // Employer NPS: 40k
      expect(auto.d80CCD2).toBe(40000);
      expect(auto.d80CCD2_source).toBe("Employer NPS ₹40,000");

      // Income = 10L
      // Total Deductions in old regime:
      // stdDed (50k) + 80D (55k) + NPS (50k) + Employer NPS (40k) = 195,000
      // Taxable = 1,000,000 - 195,000 = 805,000
      // Slabs: 0-2.5L: 0, 2.5-5L (5%): 12,500, 5-8.05L (20%): 305,000 * 0.20 = 61,000
      // Total before cess = 73,500
      // Cess = 73,500 * 0.04 = 2,940. Total = 76,440.
      const taxDue = getTaxDueForDashboard(state, 1000000);
      expect(taxDue).toBe(76440);
    });
  });

  describe("Unit-Denominated Bond Valuation in XIRR and Rebalancing", () => {
    it("computes invested and terminal values for unit-denominated bonds without totalInvestmentAmount", async () => {
      const bond = {
        numberOfUnits: 25,
        faceValuePerUnit: 1000,
        orderDate: "2024-01-01",
        maturityDate: "2029-01-01",
        coupon: 7.5,
      };

      const unitVal = Number(bond.numberOfUnits || 0) * Number(bond.faceValuePerUnit || 0);
      const invAmount = Number(
        (bond as any).totalInvestmentAmount || (bond as any).totalPrincipalAmount || (bond as any).faceValue || unitVal || 0
      );
      const faceVal = Number((bond as any).totalPrincipalAmount || (bond as any).faceValue || unitVal || invAmount);

      expect(unitVal).toBe(25000);
      expect(invAmount).toBe(25000);
      expect(faceVal).toBe(25000);

      const couponRate = Number(bond.coupon || 0) / 100;
      const annualCoupon = faceVal * couponRate;
      expect(annualCoupon).toBe(1875);
    });
  });

  describe("Expanded Section 80C & NPS Ledger Auto-Detection", () => {
    it("auto-detects PPF deposits from account transactions", () => {
      const state = {
        ppf: [
          {
            id: "ppf-1",
            transactions: [
              { id: "tx-1", date: "2025-05-10", type: "deposit", amount: 45000 },
              { id: "tx-2", date: "2025-08-20", type: "deposit", amount: 25000 },
              { id: "tx-3", date: "2025-09-01", type: "withdrawal", amount: 10000 }, // withdrawal excluded
              { id: "tx-4", date: "2024-03-15", type: "deposit", amount: 30000 }, // outside FY 2025-26
            ],
          },
        ],
        ppfLedger: [],
        mutualFunds: [],
        lic: [],
        epf: [],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // 45,000 + 25,000 = 70,000
      expect(auto.d80C).toBe(70000);
      expect(auto.d80C_sources).toContain("PPF ₹70,000");
    });

    it("falls back to salary slips for EPF when passbook transactions are absent", () => {
      const state = {
        epf: [{ id: "epf-1", transactions: [] }],
        salarySlips: [
          { id: "s-1", slipMonth: "2025-04", pfEmployee: 6000 },
          { id: "s-2", slipMonth: "2025-05", pfEmployee: 6000 },
          { id: "s-3", slipMonth: "2025-06", epf: 6000 },
          { id: "s-4", slipMonth: "2025-07", providentFund: 6000 },
        ],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // 4 months * 6,000 = 24,000
      expect(auto.d80C).toBe(24000);
      expect(auto.d80C_sources).toContain("EPF ₹24,000");
    });

    it("auto-detects NSC and SSY contributions from govt schemes under Section 80C", () => {
      const state = {
        govtSchemes: [
          { id: "g-1", schemeType: "NSC", contributionAmount: 15000, frequency: "annual" },
          { id: "g-2", schemeType: "SSY", contributionAmount: 2000, frequency: "monthly" }, // 2000 * 12 = 24,000
          { id: "g-3", schemeType: "SCSS", contributionAmount: 50000, frequency: "annual" }, // Not 80C here
        ],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // NSC: 15,000, SSY: 24,000 -> 39,000
      expect(auto.d80C).toBe(39000);
      expect(auto.d80C_sources).toContain("NSC ₹15,000");
      expect(auto.d80C_sources).toContain("SSY ₹24,000");
    });

    it("auto-detects Home Loan Principal repayment under Section 80C", () => {
      const state = {
        loansTaken: [
          {
            id: "hl-1",
            type: "Home",
            outstanding: "2000000",
            rate: 8.5,
            emi: "25000", // Annual EMI = 300,000. Approx interest = 2,000,000 * 8.5% = 170,000. Principal = 130,000
          },
        ],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      expect(auto.homeLoan).toBe(170000); // Section 24(b) interest capped at 200k
      expect(auto.d80C).toBe(130000); // 300,000 - 170,000 = 130,000
      expect(auto.d80C_sources).toContain("Home Loan Principal ₹1,30,000");
    });

    it("auto-detects NPS transactions in FY for both 80CCD(1B) and 80CCD(2)", () => {
      const state = {
        nps: [
          {
            id: "nps-1",
            transactions: [
              { id: "tx-1", date: "2025-06-15", employeeAmount: 35000, employerAmount: 40000 },
              { id: "tx-2", date: "2025-11-20", employeeAmount: 25000, employerAmount: 40000 },
            ],
          },
        ],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // Self: 35k + 25k = 60k, capped at 50k
      expect(auto.nps).toBe(50000);
      expect(auto.nps_source).toBe("NPS ₹50,000");
      // Employer: 40k + 40k = 80k
      expect(auto.d80CCD2).toBe(80000);
      expect(auto.d80CCD2_source).toBe("Employer NPS ₹80,000");
    });
  });
});



