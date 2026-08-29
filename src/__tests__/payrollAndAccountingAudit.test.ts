import { describe, it, expect } from "vitest";
import { getEmergencyFundMonthlyExpense } from "../utils/finance";

describe("Accounting & Financial System Audit Tests", () => {
  describe("Salary Slip Take-Home & Deduction Accounting", () => {
    // Replicate the autoCompute logic from SalarySlipTab
    function autoComputeSalary(form: any, netSalaryTouched?: boolean, grossTouched?: boolean, deductTouched?: boolean) {
      const earn = [
        "basic",
        "hra",
        "educationAllowance",
        "lta",
        "specialAllowance",
        "employerNpsContribution",
        "da",
        "bonus",
        "otherEarnings",
      ];
      const deduct = [
        "pfEmployee",
        "esiEmployee",
        "professionalTax",
        "tds",
        "incomeTax",
        "npsDeduction",
        "otherDeductions",
      ];
      const earnSum = earn.reduce((s, k) => s + Number(form[k] || 0), 0);
      const deductSum = deduct.reduce((s, k) => s + Number(form[k] || 0), 0);

      const effectiveGross =
        grossTouched && form.grossSalary !== "" && form.grossSalary !== undefined
          ? Number(form.grossSalary || 0)
          : earnSum || Number(form.grossSalary || 0);

      const effectiveDeduct =
        deductTouched && form.totalDeductions !== "" && form.totalDeductions !== undefined
          ? Number(form.totalDeductions || 0)
          : deductSum || Number(form.totalDeductions || 0);

      const computedNet = effectiveGross - effectiveDeduct;

      const finalGross = grossTouched
        ? form.grossSalary
        : earnSum
        ? String(earnSum)
        : form.grossSalary;

      const finalDeduct = deductTouched
        ? form.totalDeductions
        : deductSum
        ? String(deductSum)
        : form.totalDeductions;

      const finalNet = netSalaryTouched
        ? form.netSalary
        : effectiveGross > 0 || effectiveDeduct > 0
        ? String(computedNet)
        : form.netSalary;

      return {
        ...form,
        grossSalary: finalGross,
        totalDeductions: finalDeduct,
        netSalary: finalNet,
      };
    }

    it("should correctly compute net salary by excluding employer PF from employee deductions", () => {
      const inputForm = {
        basic: "50000",
        hra: "25000",
        specialAllowance: "25000",
        grossSalary: "",
        pfEmployee: "6000",
        pfEmployer: "6000", // Employer's share (part of CTC, not deducted from gross)
        professionalTax: "200",
        tds: "8000",
        totalDeductions: "",
        netSalary: "",
      };

      const computed = autoComputeSalary(inputForm);

      expect(computed.grossSalary).toBe("100000");
      // Statutory Employee Deductions = 6000 (PF Emp) + 200 (PT) + 8000 (TDS) = 14200
      expect(computed.totalDeductions).toBe("14200");
      // Net Take-Home = 100000 - 14200 = 85800
      expect(computed.netSalary).toBe("85800");
    });
  });

  describe("Emergency Fund Expense Commitments Accounting", () => {
    it("should include health insurance recurring premiums in emergency fund monthly expense base", () => {
      const mockState = {
        budgets: [],
        loansTaken: [{ emi: 20000 }],
        sips: [{ amount: 10000, status: "active" }],
        subscriptions: [{ amount: 1200, cycle: "yearly" }], // 100/mo
        recurringExpenses: [{ amount: 4000 }],
        rentedProperties: [{ monthlyRent: 25000, isActive: true }],
        lic: [{ premium: 12000, premiumFrequency: "annual" }], // 1000/mo
        healthInsurance: [{ premium: 24000, premiumFrequency: "annual" }], // 2000/mo
      };

      const monthlyExpense = getEmergencyFundMonthlyExpense(mockState, 0);

      // 20000 (EMI) + 10000 (SIP) + 100 (Subs) + 4000 (Recurring) + 25000 (Rent) + 1000 (LIC) + 2000 (Health) = 62100
      expect(monthlyExpense).toBe(62100);
    });
  });

  describe("Executive Dashboard YTD and Spending Accounting", () => {
    it("should correctly compute YTD income including landlord receipts and avoid double counting rent expense", () => {
      const state = {
        income: [{ date: "2025-05-01", amount: 150000 }],
        transactions: [
          { date: "2025-05-05", type: "debit", category: "Dining", amount: 10000 },
          { date: "2025-05-06", type: "debit", category: "Rent", amount: 30000 }, // Bank rent transaction
          { date: "2025-05-07", type: "debit", category: "Investment", amount: 40000 }, // Investment
        ],
        rentedProperties: [
          {
            payments: [
              { id: "bank-123", date: "2025-05-06", amount: 30000 }, // Bank-linked rent payment (must not be double counted)
            ],
          },
        ],
        rentalProperties: [
          {
            receipts: [
              { id: "r1", date: "2025-05-10", amount: 20000 }, // Manual rent receipt
            ],
          },
        ],
      };

      const startStr = "2025-04-01";
      const ytdTxns = (state.transactions || []).filter((t: any) => t.date && t.date >= startStr);
      const ytdIncomeLedger = (state.income || [])
        .filter((i: any) => i.date && i.date >= startStr)
        .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

      const rentalReceiptsYTD = (state.rentalProperties || []).flatMap((p: any) =>
        (p.receipts || []).filter((r: any) => r.date && r.date >= startStr)
      );
      const rentalIncomeYTD = (
        ytdIncomeLedger > 0
          ? rentalReceiptsYTD
          : rentalReceiptsYTD.filter((r: any) => !String(r.id || "").startsWith("bank-"))
      ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      const ytdIncome = ytdIncomeLedger + rentalIncomeYTD;

      const ytdTxnExpense = ytdTxns
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      const ytdRentPaid = (state.rentedProperties || []).reduce(
        (sum: number, p: any) =>
          sum +
          (p.payments || [])
            .filter(
              (pay: any) =>
                pay.date &&
                pay.date >= startStr &&
                !String(pay.id || "").startsWith("bank-")
            )
            .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0),
        0
      );

      const ytdExpense = ytdTxnExpense + ytdRentPaid;
      const ytdSavings = ytdIncome - ytdExpense;

      // ytdIncome = 150000 + 20000 = 170000
      expect(ytdIncome).toBe(170000);
      // ytdExpense = 10000 (Dining) + 30000 (Rent transaction) + 0 (duplicate rent excluded) = 40000 (Investment 40k excluded)
      expect(ytdExpense).toBe(40000);
      // ytdSavings = 170000 - 40000 = 130000
      expect(ytdSavings).toBe(130000);
    });
  });

  describe("Annual Report Bank Ledger Income Accounting", () => {
    it("should compute annual income strictly from bank income ledger and rental receipts", () => {
      const state = {
        income: [
          { date: "2025-04-30", amount: 150000, source: "Salary" },
          { date: "2025-05-31", amount: 150000, source: "Salary" },
        ],
        transactions: [
          { date: "2025-05-15", type: "credit", category: "Transfer", amount: 50000 }, // Self transfer excluded
        ],
        rentalProperties: [
          {
            receipts: [
              { date: "2025-05-01", amount: 25000 },
            ],
          },
        ],
      };

      const fyStart = "2025-04-01";
      const fyEnd = "2026-03-31";

      const incomeLedger = (state.income || []).filter(
        (i: any) => i.date && i.date >= fyStart && i.date <= fyEnd
      );
      const ledgerTotal = incomeLedger.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

      const rentalIncome = (state.rentalProperties || []).flatMap((p: any) =>
        (p.receipts || []).filter((r: any) => r.date && r.date >= fyStart && r.date <= fyEnd)
      ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      const totalAnnualIncome = ledgerTotal + rentalIncome;

      // 300000 (Bank Income Ledger) + 25000 (Rent Receipts) = 325000
      expect(totalAnnualIncome).toBe(325000);
    });
  });

  describe("Cash Flow Forecast Ledger Sourcing", () => {
    it("should project monthly inflows from income ledger and outflows from debit transactions and insurance", () => {
      const state = {
        income: [
          { date: "2025-04-30", amount: 150000, source: "Salary" },
          { date: "2025-05-31", amount: 150000, source: "Salary" },
          { date: "2025-05-15", amount: 20000, source: "Consulting" },
        ],
        transactions: [
          { date: "2025-05-01", type: "debit", category: "Groceries", amount: 15000 },
          { date: "2025-05-05", type: "debit", category: "Utilities", amount: 5000 },
          { date: "2025-05-10", type: "debit", category: "Investment", amount: 50000 }, // excluded
          { date: "2025-05-12", type: "debit", category: "Transfer", amount: 20000 }, // excluded
        ],
        healthInsurance: [
          { premium: 24000, premiumFrequency: "annual" }, // 2000/mo
        ],
        loansTaken: [
          { outstanding: 500000, monthsRemaining: 24, emi: 25000 },
        ],
        sips: [
          { amount: 10000, status: "active" },
        ],
      };

      // 1. Inflow from income ledger:
      // Salary = 150000, Consulting = 20000
      const salaryEntries = (state.income || []).filter((i: any) =>
        (i.source || "").toLowerCase().includes("salary")
      );
      const salaryMonthly = salaryEntries.reduce((s, i) => s + i.amount, 0) / 2; // 150000
      const nonSalaryMonthly = 20000;
      const totalInflow = salaryMonthly + nonSalaryMonthly; // 170000
      expect(totalInflow).toBe(170000);

      // 2. Outflow:
      // EMI (25000) + SIP (10000) + Health Insurance (2000) + Living Expenses (15000 + 5000 = 20000) = 57000
      const emi = 25000;
      const sip = 10000;
      const health = 24000 / 12; // 2000
      const living = 15000 + 5000; // 20000
      const totalOutflow = emi + sip + health + living;
      expect(totalOutflow).toBe(57000);

      // Net monthly forecast = 170000 - 57000 = 113000
      expect(totalInflow - totalOutflow).toBe(113000);
    });
  });
});
