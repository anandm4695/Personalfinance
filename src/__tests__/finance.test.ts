import {
  fmtINR,
  fmtINRFull,
  monthsBetween,
  calcCAGR,
  fdMaturity,
  rdMaturity,
  calcTaxNew,
  calcTaxOld,
  autoCateg,
  uid,
  today,
  calcTaxNewByFY,
  getAutoDetectedDeductions,
  getTaxDueForDashboard,
  getLocalDateString,
  getCCDueDate,
  calculateEpfBalance,
  calcXIRR,
  calcTaxOldByFY,
  getEffectiveRent,
  getCurrentTierIndex,
  getMonthsToNextEscalation,
} from "../utils/finance";

// ---------------------------------------------------------------------------
// fmtINR — Indian number abbreviation formatter
// ---------------------------------------------------------------------------
describe("fmtINR", () => {
  it("returns ₹0 for null/undefined/NaN", () => {
    expect(fmtINR(null)).toBe("₹0");
    expect(fmtINR(undefined)).toBe("₹0");
    expect(fmtINR(NaN)).toBe("₹0");
    expect(fmtINR("abc")).toBe("₹0");
  });

  it("formats values below 1000 as whole rupees", () => {
    expect(fmtINR(0)).toBe("₹0");
    expect(fmtINR(500)).toBe("₹500");
    expect(fmtINR(999)).toBe("₹999");
  });

  it("formats thousands as K", () => {
    expect(fmtINR(1000)).toBe("₹1K");
    expect(fmtINR(50000)).toBe("₹50K");
    expect(fmtINR(99999)).toBe("₹100K");
  });

  it("formats lakhs as L", () => {
    expect(fmtINR(100000)).toBe("₹1L");
    expect(fmtINR(500000)).toBe("₹5L");
    expect(fmtINR(9999999)).toBe("₹100L");
  });

  it("formats crores as Cr", () => {
    expect(fmtINR(10000000)).toBe("₹1Cr");
    expect(fmtINR(50000000)).toBe("₹5Cr");
  });

  it("handles negative values with correct sign", () => {
    expect(fmtINR(-500)).toBe("-₹500");
    expect(fmtINR(-100000)).toBe("-₹1L");
    expect(fmtINR(-10000000)).toBe("-₹1Cr");
  });

  it("accepts string numbers", () => {
    expect(fmtINR("1000")).toBe("₹1K");
    expect(fmtINR("100000")).toBe("₹1L");
  });
});

// ---------------------------------------------------------------------------
// fmtINRFull — full locale-formatted rupee string
// ---------------------------------------------------------------------------
describe("fmtINRFull", () => {
  it("returns ₹0 for invalid inputs", () => {
    expect(fmtINRFull(null)).toBe("₹0");
    expect(fmtINRFull(undefined)).toBe("₹0");
  });

  it("formats with en-IN locale commas", () => {
    expect(fmtINRFull(1000000)).toBe("₹10,00,000");
    expect(fmtINRFull(100000)).toBe("₹1,00,000");
  });
});

// ---------------------------------------------------------------------------
// monthsBetween
// ---------------------------------------------------------------------------
describe("monthsBetween", () => {
  it("returns 0 for same date", () => {
    expect(monthsBetween("2025-01-01", "2025-01-01")).toBe(0);
  });

  it("returns correct months within same year", () => {
    expect(monthsBetween("2025-01-01", "2025-06-01")).toBe(5);
  });

  it("returns correct months across years", () => {
    expect(monthsBetween("2024-01-01", "2025-01-01")).toBe(12);
    expect(monthsBetween("2023-11-01", "2025-01-01")).toBe(14);
  });

  it("returns negative for reversed dates", () => {
    expect(monthsBetween("2025-06-01", "2025-01-01")).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// calcCAGR — compound annual growth rate
// ---------------------------------------------------------------------------
describe("calcCAGR", () => {
  it("returns null for invalid inputs", () => {
    expect(calcCAGR(0, 100, "2020-01-01")).toBeNull();
    expect(calcCAGR(100, 0, "2020-01-01")).toBeNull();
    expect(calcCAGR(100, 150, "")).toBeNull();
  });

  it("returns null if holding period < ~1 month (< 0.08 years)", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    expect(calcCAGR(100, 110, yesterday)).toBeNull();
  });

  it("returns ~0 CAGR when invested = current over 1 year", () => {
    const oneYearAgo = new Date(Date.now() - 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const cagr = calcCAGR(100, 100, oneYearAgo);
    expect(cagr).not.toBeNull();
    expect(Math.abs(cagr!)).toBeLessThan(0.1);
  });

  it("returns ~10% CAGR for 10% gain over 1 year", () => {
    const oneYearAgo = new Date(Date.now() - 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const cagr = calcCAGR(100, 110, oneYearAgo);
    expect(cagr).not.toBeNull();
    expect(cagr!).toBeCloseTo(10, 0);
  });
});

// ---------------------------------------------------------------------------
// fdMaturity — fixed deposit maturity value
// ---------------------------------------------------------------------------
describe("fdMaturity", () => {
  it("returns principal for 0% rate", () => {
    expect(fdMaturity(100000, 0, 1)).toBeCloseTo(100000, 2);
  });

  it("calculates quarterly compounding correctly", () => {
    // ₹1,00,000 at 7% for 1 year (quarterly) = 100000 * (1 + 0.07/4)^4
    const expected = 100000 * Math.pow(1 + 0.07 / 4, 4);
    expect(fdMaturity(100000, 7, 1)).toBeCloseTo(expected, 2);
  });

  it("calculates for multiple years", () => {
    const expected = 100000 * Math.pow(1 + 0.065 / 4, 4 * 3);
    expect(fdMaturity(100000, 6.5, 3)).toBeCloseTo(expected, 2);
  });

  it("supports custom compounding frequency", () => {
    const monthlyResult = fdMaturity(100000, 7, 1, 12);
    const quarterlyResult = fdMaturity(100000, 7, 1, 4);
    expect(monthlyResult).toBeGreaterThan(quarterlyResult);
  });
});

// ---------------------------------------------------------------------------
// rdMaturity — recurring deposit maturity value
// ---------------------------------------------------------------------------
describe("rdMaturity", () => {
  it("returns 0 for 0 monthly contribution", () => {
    expect(rdMaturity(0, 7, 12)).toBe(0);
  });

  it("is greater than sum of contributions (interest earned)", () => {
    const monthly = 5000;
    const months = 12;
    const maturity = rdMaturity(monthly, 7, months);
    expect(maturity).toBeGreaterThan(monthly * months);
  });

  it("higher rate produces higher maturity", () => {
    expect(rdMaturity(5000, 8, 12)).toBeGreaterThan(rdMaturity(5000, 6, 12));
  });
});

// ---------------------------------------------------------------------------
// calcTaxNew — new regime (FY 2025-26)
// ---------------------------------------------------------------------------
describe("calcTaxNew", () => {
  it("returns zero tax for income ≤ ₹12L (rebate)", () => {
    const result = calcTaxNew(1200000);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  it("returns zero tax for income ≤ ₹4L (nil slab)", () => {
    const result = calcTaxNew(400000);
    expect(result.tax).toBe(0);
  });

  it("calculates tax for income above ₹12L", () => {
    const result = calcTaxNew(1500000);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.cess).toBeCloseTo(result.tax * 0.04, 5);
    expect(result.total).toBeCloseTo(result.tax + result.cess, 5);
  });

  it("higher income produces higher tax", () => {
    expect(calcTaxNew(2000000).total).toBeGreaterThan(calcTaxNew(1500000).total);
  });
});

// ---------------------------------------------------------------------------
// calcTaxOld — old regime
// ---------------------------------------------------------------------------
describe("calcTaxOld", () => {
  it("returns zero tax for taxable income ≤ ₹5L (rebate)", () => {
    const result = calcTaxOld(500000, 0);
    expect(result.tax).toBe(0);
  });

  it("deductions reduce taxable income", () => {
    const noDeduction = calcTaxOld(800000, 0);
    const withDeduction = calcTaxOld(800000, 150000);
    expect(withDeduction.taxable).toBe(650000);
    expect(withDeduction.total).toBeLessThan(noDeduction.total);
  });

  it("calculates cess at 4% of tax", () => {
    const result = calcTaxOld(1500000, 0);
    expect(result.cess).toBeCloseTo(result.tax * 0.04, 5);
  });
});

// ---------------------------------------------------------------------------
// autoCateg — transaction auto-categorization
// ---------------------------------------------------------------------------
describe("autoCateg", () => {
  it("returns null for empty/falsy input", () => {
    expect(autoCateg("")).toBeNull();
    expect(autoCateg(null as any)).toBeNull();
  });

  it("categorizes food merchants correctly", () => {
    expect(autoCateg("Zomato order")).toBe("Food");
    expect(autoCateg("SWIGGY PAYMENT")).toBe("Food");
  });

  it("categorizes groceries correctly", () => {
    expect(autoCateg("BigBasket order")).toBe("Groceries");
    expect(autoCateg("Zepto delivery")).toBe("Groceries");
  });

  it("categorizes transport correctly", () => {
    expect(autoCateg("Uber ride")).toBe("Transport");
    expect(autoCateg("petrol pump payment")).toBe("Transport");
  });

  it("categorizes utility bills correctly", () => {
    expect(autoCateg("Jio recharge")).toBe("Bills");
    expect(autoCateg("electricity bill payment")).toBe("Bills");
  });

  it("categorizes investments correctly", () => {
    expect(autoCateg("SIP Zerodha")).toBe("Investment");
    expect(autoCateg("mutual fund purchase")).toBe("Investment");
  });

  it("categorizes salary correctly", () => {
    expect(autoCateg("salary credit")).toBe("Salary");
    expect(autoCateg("payroll November")).toBe("Salary");
  });

  it("returns null for uncategorized transactions", () => {
    expect(autoCateg("random unclassified payment xyz")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// uid — unique ID generator
// ---------------------------------------------------------------------------
describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("returns unique values on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// today — returns today's date as YYYY-MM-DD
// ---------------------------------------------------------------------------
describe("today", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the current date", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(today()).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// FY-aware Tax Calculations
// ---------------------------------------------------------------------------
describe("FY-aware Tax Calculations", () => {
  describe("calcTaxNewByFY", () => {
    it("calculates correct tax for FY 2023-24 new regime", () => {
      // Gross: 10L. Std Ded: 50K. Taxable: 9.5L
      // 0-3L: 0, 3-6L (5%): 15k, 6-9L (10%): 30k, 9-12L (15%): 50k * 0.15 = 7.5k.
      // Total: 52.5k tax + 2.1k cess = 54.6k
      const res = calcTaxNewByFY(1000000, "2023-24");
      expect(res.stdDed).toBe(50000);
      expect(res.taxable).toBe(950000);
      expect(res.tax).toBe(52500);
      expect(res.total).toBe(54600);
    });

    it("calculates correct tax for FY 2024-25 new regime", () => {
      // Gross: 10L. Std Ded: 75K. Taxable: 9.25L
      // 0-3L: 0, 3-7L (5%): 4L * 0.05 = 20k, 7-10L (10%): 2.25L * 0.10 = 22.5k.
      // Total: 42.5k tax + 1.7k cess = 44.2k
      const res = calcTaxNewByFY(1000000, "2024-25");
      expect(res.stdDed).toBe(75000);
      expect(res.taxable).toBe(925000);
      expect(res.tax).toBe(42500);
      expect(res.total).toBe(44200);
    });
  });

  describe("getAutoDetectedDeductions", () => {
    it("extracts auto-detected deductions correctly", () => {
      const state = {
        mutualFunds: [
          { category: "ELSS", invested: 120000, buyDate: "2025-05-10" },
          { category: "ELSS", invested: 50000, buyDate: "2024-05-10" }, // outer FY
        ],
        ppfLedger: [{ amount: 30000, date: "2025-06-15", type: "deposit" }],
        lic: [{ annualPremium: 20000 }],
        epf: [
          {
            transactions: [{ type: "employee", amount: 15000, date: "2025-08-01" }],
          },
        ],
        rentedProperties: [
          { monthlyRent: 10000 }, // fallback rent = 120,000
        ],
        loansTaken: [
          { type: "Home", outstanding: 1000000, rate: 8.5 }, // annual interest approx 85,000
        ],
      };

      const auto = getAutoDetectedDeductions(state, "2025-26");
      // 80C should be: ELSS (120k) + PPF (30k) + LIC (20k) + EPF (15k) = 185k -> capped at 150k
      expect(auto.d80C).toBe(150000);
      expect(auto.hra).toBe(120000);
      expect(auto.homeLoan).toBe(85000);
    });
  });

  describe("getTaxDueForDashboard", () => {
    it("respects overrides stored in masterData", () => {
      const state = {
        profile: { fy: "2025-26", regime: "old" },
        masterData: {
          taxDeductions: {
            "2025-26": { d80D: 25000, nps: 50000 },
          },
        },
        mutualFunds: [],
        ppfLedger: [],
        lic: [],
        epf: [],
        rentedProperties: [],
        loansTaken: [],
      };

      // Income = 10L
      // Deductions: stdDed (50k) + 80D (25k) + NPS (50k) = 125k
      // Taxable: 8.75L
      // Slabs: 0-2.5L: 0, 2.5-5L (5%): 12.5k, 5-8.75L (20%): 3.75L * 0.20 = 75k
      // Total tax: 87.5k before cess. Cess = 87.5k * 0.04 = 3.5k. Total = 91k.
      const taxDue = getTaxDueForDashboard(state, 1000000);
      expect(taxDue).toBe(91000);
    });
  });
});

// ---------------------------------------------------------------------------
// getLocalDateString — converts Date to "YYYY-MM-DD"
// ---------------------------------------------------------------------------
describe("getLocalDateString", () => {
  it("formats a normal date correctly", () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025
    expect(getLocalDateString(d)).toBe("2025-01-15");
  });

  it("zero-pads single-digit month and day", () => {
    const d = new Date(2024, 2, 5); // Mar 5, 2024
    expect(getLocalDateString(d)).toBe("2024-03-05");
  });

  it("handles December 31 correctly", () => {
    const d = new Date(2025, 11, 31); // Dec 31, 2025
    expect(getLocalDateString(d)).toBe("2025-12-31");
  });

  it("handles January 1 correctly", () => {
    const d = new Date(2025, 0, 1); // Jan 1, 2025
    expect(getLocalDateString(d)).toBe("2025-01-01");
  });

  it("handles leap year February 29", () => {
    const d = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
    expect(getLocalDateString(d)).toBe("2024-02-29");
  });
});

// ---------------------------------------------------------------------------
// getCCDueDate — credit card due date from billing cycle
// ---------------------------------------------------------------------------
describe("getCCDueDate", () => {
  it("returns null when no dueDay or dueDate", () => {
    expect(getCCDueDate({})).toBeNull();
    expect(getCCDueDate({ name: "HDFC" })).toBeNull();
  });

  it("returns future date in current month when dueDay has not passed", () => {
    // Reference: Jan 5, dueDay: 20 -> should be Jan 20
    const ref = new Date(2025, 0, 5); // Jan 5
    const result = getCCDueDate({ dueDay: 20 }, ref);
    expect(result).toBe("2025-01-20");
  });

  it("returns next month when dueDay has already passed", () => {
    // Reference: Jan 25, dueDay: 10 -> should be Feb 10
    const ref = new Date(2025, 0, 25); // Jan 25
    const result = getCCDueDate({ dueDay: 10 }, ref);
    expect(result).toBe("2025-02-10");
  });

  it("returns next month when dueDay equals today", () => {
    // Reference: Jan 15, dueDay: 15 -> date is Jan 15 which is <= now, so Feb 15
    const ref = new Date(2025, 0, 15); // Jan 15
    const result = getCCDueDate({ dueDay: 15 }, ref);
    expect(result).toBe("2025-02-15");
  });

  it("handles year rollover from December", () => {
    // Reference: Dec 20, dueDay: 5 -> should be Jan 5 next year
    const ref = new Date(2025, 11, 20); // Dec 20, 2025
    const result = getCCDueDate({ dueDay: 5 }, ref);
    expect(result).toBe("2026-01-05");
  });

  it("handles string dueDay", () => {
    const ref = new Date(2025, 0, 5);
    const result = getCCDueDate({ dueDay: "20" }, ref);
    expect(result).toBe("2025-01-20");
  });

  it("falls back to stored dueDate when dueDay is absent", () => {
    const result = getCCDueDate({ dueDate: "2025-03-15" });
    expect(result).toBe("2025-03-15");
  });

  it("prefers computed dueDay over stored dueDate", () => {
    const ref = new Date(2025, 0, 5);
    const result = getCCDueDate({ dueDay: 20, dueDate: "2025-06-01" }, ref);
    expect(result).toBe("2025-01-20");
  });

  it("returns null for invalid dueDay (0 or negative)", () => {
    const ref = new Date(2025, 0, 5);
    expect(getCCDueDate({ dueDay: 0 }, ref)).toBeNull();
    expect(getCCDueDate({ dueDay: -1 }, ref)).toBeNull();
  });

  it("returns null for dueDay > 31", () => {
    const ref = new Date(2025, 0, 5);
    expect(getCCDueDate({ dueDay: 32 }, ref)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateEpfBalance — EPF corpus calculation
// ---------------------------------------------------------------------------
describe("calculateEpfBalance", () => {
  it("returns 0 for null/undefined input", () => {
    expect(calculateEpfBalance(null)).toBe(0);
    expect(calculateEpfBalance(undefined)).toBe(0);
  });

  it("returns balance field when no passbook transactions", () => {
    expect(calculateEpfBalance({ balance: 500000 })).toBe(500000);
    expect(calculateEpfBalance({ balance: "300000" })).toBe(300000);
  });

  it("returns 0 when balance field is missing and no transactions", () => {
    expect(calculateEpfBalance({})).toBe(0);
    expect(calculateEpfBalance({ transactions: [] })).toBe(0);
  });

  it("sums employee + employer contributions from monthly_contribution rows", () => {
    const epf = {
      transactions: [
        { type: "monthly_contribution", employeeShare: 5000, employerShare: 3000, pensionShare: 2000 },
        { type: "monthly_contribution", employeeShare: 5000, employerShare: 3000, pensionShare: 2000 },
      ],
      establishments: [],
    };
    // closing = (0+0+10000) employee + (0+0+6000) employer + (4000+0+0) pension - 0 withdrawal
    // employee: totalEmployee(0+10000) + empInterest(0) + transferInEmp(0) = 10000
    // employer: totalEmployer(0+6000) + erInterest(0) + transferInEr(0) = 6000
    // pension: totalPension(4000) + transferInPen(0) + penInterest(0) = 4000
    // total = 10000 + 6000 + 4000 = 20000
    expect(calculateEpfBalance(epf)).toBe(20000);
  });

  it("includes interest credits in the balance", () => {
    const epf = {
      transactions: [
        { type: "monthly_contribution", employeeShare: 10000, employerShare: 5000, pensionShare: 2000 },
        { type: "interest_credit", employeeShare: 800, employerShare: 400, pensionShare: 100 },
      ],
      establishments: [],
    };
    // employee: 0 + 10000 (monthly ee) + 800 (interest ee) + 0 = 10800
    // employer: 0 + 5000 (monthly er) + 400 (interest er) + 0 = 5400
    // pension: 2000 + 0 + 100 = 2100
    // total = 10800 + 5400 + 2100 = 18300
    expect(calculateEpfBalance(epf)).toBe(18300);
  });

  it("handles transfer_in amounts", () => {
    const epf = {
      transactions: [
        { type: "monthly_contribution", employeeShare: 5000, employerShare: 3000, pensionShare: 1000 },
        { type: "transfer_in", amount: 100000, employerShare: 40000, pensionShare: 10000 },
      ],
      establishments: [],
    };
    // employee: 0 + 5000 + 0 + (100000-40000-10000) = 55000
    // employer: 0 + 3000 + 0 + 40000 = 43000
    // pension: 1000 + 10000 + 0 = 11000
    // total = 55000 + 43000 + 11000 = 109000
    expect(calculateEpfBalance(epf)).toBe(109000);
  });

  it("subtracts withdrawals from the total", () => {
    const epf = {
      transactions: [
        { type: "monthly_contribution", employeeShare: 50000, employerShare: 30000, pensionShare: 10000 },
        { type: "withdrawal", amount: 20000 },
      ],
      establishments: [],
    };
    // employee: 50000, employer: 30000, pension: 10000
    // total = 90000 - 20000 = 70000
    expect(calculateEpfBalance(epf)).toBe(70000);
  });

  it("excludes transactions from transferred-out establishments", () => {
    const epf = {
      establishments: [
        { id: "est1", employerName: "Old Company" },
        { id: "est2", employerName: "Current Company" },
      ],
      transactions: [
        { type: "monthly_contribution", employeeShare: 10000, employerShare: 5000, pensionShare: 2000, estId: "est1" },
        { type: "monthly_contribution", employeeShare: 20000, employerShare: 10000, pensionShare: 4000, estId: "est2" },
        { type: "transfer_in", amount: 50000, fromEmployer: "Old Company", employerShare: 20000, pensionShare: 5000 },
      ],
    };
    // est1 is transferred out (transfer_in from "Old Company" matches est1)
    // activeTxs excludes estId="est1" monthly row, but includes est2 monthly and transfer_in
    // employee: 0 + 20000 (est2 monthly ee) + 0 + (50000-20000-5000) = 45000
    // employer: 0 + 10000 (est2 monthly er) + 0 + 20000 = 30000
    // pension: 4000 + 5000 + 0 = 9000
    // total = 45000 + 30000 + 9000 = 84000
    expect(calculateEpfBalance(epf)).toBe(84000);
  });

  it("handles backward-compatible interest (single amount, no shares)", () => {
    const epf = {
      transactions: [
        { type: "monthly_contribution", employeeShare: 10000, employerShare: 5000, pensionShare: 2000 },
        { type: "interest_credit", amount: 1200 },
      ],
      establishments: [],
    };
    // interest with no employeeShare key -> backward compat: amount goes to employee
    // employee: 10000 + 1200 = 11200
    // employer: 5000 + 0 = 5000
    // pension: 2000 + 0 = 2000
    // total = 18200
    expect(calculateEpfBalance(epf)).toBe(18200);
  });
});

// ---------------------------------------------------------------------------
// calcXIRR — extended internal rate of return
// ---------------------------------------------------------------------------
describe("calcXIRR", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(calcXIRR(null as any)).toBeNull();
    expect(calcXIRR(undefined as any)).toBeNull();
    expect(calcXIRR([])).toBeNull();
  });

  it("returns null for fewer than 2 valid cash flows", () => {
    expect(calcXIRR([{ date: "2020-01-01", amount: -1000 }])).toBeNull();
  });

  it("returns null when all flows are same sign (no root exists)", () => {
    expect(
      calcXIRR([
        { date: "2020-01-01", amount: -1000 },
        { date: "2021-01-01", amount: -500 },
      ])
    ).toBeNull();
    expect(
      calcXIRR([
        { date: "2020-01-01", amount: 1000 },
        { date: "2021-01-01", amount: 500 },
      ])
    ).toBeNull();
  });

  it("calculates ~0% XIRR for no-gain investment over 1 year", () => {
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2021-01-01", amount: 1000 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0, 0);
  });

  it("calculates ~10% XIRR for 10% gain over 1 year", () => {
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2021-01-01", amount: 1100 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("calculates XIRR for multi-year investment", () => {
    // Invest 1000, get 1210 after 2 years -> ~10% CAGR
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2022-01-01", amount: 1210 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("handles multiple investments (SIP-like)", () => {
    // Monthly SIP of 1000 for 12 months, then redeem
    const flows: { date: string; amount: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = String(i + 1).padStart(2, "0");
      flows.push({ date: `2020-${m}-01`, amount: -1000 });
    }
    // Total invested: 12000, redeemed: 12600 (5% total gain)
    flows.push({ date: "2021-01-01", amount: 12600 });
    const result = calcXIRR(flows);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it("filters out zero-amount cash flows", () => {
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2020-06-01", amount: 0 },
      { date: "2021-01-01", amount: 1100 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("handles Date objects as well as strings", () => {
    const result = calcXIRR([
      { date: new Date(2020, 0, 1), amount: -1000 },
      { date: new Date(2021, 0, 1), amount: 1100 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("returns null for invalid date strings", () => {
    const result = calcXIRR([
      { date: "invalid", amount: -1000 },
      { date: "also-invalid", amount: 1100 },
    ]);
    expect(result).toBeNull();
  });

  it("handles high-return scenarios", () => {
    // Double your money in 1 year -> ~100%
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2021-01-01", amount: 2000 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(100, 0);
  });

  it("handles negative return (loss)", () => {
    // Invest 1000, get back 900 after 1 year -> ~-10%
    const result = calcXIRR([
      { date: "2020-01-01", amount: -1000 },
      { date: "2021-01-01", amount: 900 },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-10, 0);
  });
});

// ---------------------------------------------------------------------------
// calcTaxOldByFY — old tax regime with FY-aware slabs
// ---------------------------------------------------------------------------
describe("calcTaxOldByFY", () => {
  it("returns zero tax for taxable income within rebate limit (5L)", () => {
    // Gross: 5L, Deductions: 50k (stdDed). Taxable: 4.5L -> below 5L rebate
    const res = calcTaxOldByFY(500000, 50000, "2025-26");
    expect(res.tax).toBe(0);
    expect(res.rebateApplied).toBe(true);
    expect(res.total).toBe(0);
  });

  it("calculates correct tax for FY 2025-26 (stdDed 50K)", () => {
    // Gross: 10L, totalDeductions: 200000 (std 50k + 80C 150k). Taxable: 8L
    // Slabs: 0-2.5L: 0, 2.5-5L (5%): 12.5k, 5-8L (20%): 60k
    // Tax: 72.5k, cess: 2.9k, total: 75.4k
    const res = calcTaxOldByFY(1000000, 200000, "2025-26");
    expect(res.stdDed).toBe(50000);
    expect(res.taxable).toBe(800000);
    expect(res.tax).toBe(72500);
    expect(res.cess).toBe(2900);
    expect(res.total).toBe(75400);
  });

  it("uses 40K stdDed for FY before 2020", () => {
    const res = calcTaxOldByFY(1000000, 40000, "2019-20");
    expect(res.stdDed).toBe(40000);
    // Taxable: 10L - 40K = 9.6L
    expect(res.taxable).toBe(960000);
  });

  it("applies 30% slab for income above 10L", () => {
    // Gross: 20L, Deductions: 50k. Taxable: 19.5L
    // Slabs: 0-2.5L: 0, 2.5-5L: 12.5k, 5-10L: 100k, 10-19.5L: 9.5L * 0.3 = 285k
    // Tax: 397.5k
    const res = calcTaxOldByFY(2000000, 50000, "2025-26");
    expect(res.taxable).toBe(1950000);
    expect(res.tax).toBe(397500);
    expect(res.rebateApplied).toBe(false);
  });

  it("deductions can bring taxable to zero", () => {
    const res = calcTaxOldByFY(500000, 600000, "2025-26");
    expect(res.taxable).toBe(0);
    expect(res.tax).toBe(0);
    expect(res.total).toBe(0);
  });

  it("includes cess at 4%", () => {
    const res = calcTaxOldByFY(1500000, 50000, "2025-26");
    // Taxable: 14.5L. Slabs: 0-2.5L: 0, 2.5-5L: 12.5k, 5-10L: 100k, 10-14.5L: 135k
    // Tax: 247.5k, cess: 9.9k
    expect(res.tax).toBe(247500);
    expect(res.cess).toBe(9900);
    expect(res.total).toBe(257400);
  });

  it("returns slab breakdown items", () => {
    const res = calcTaxOldByFY(800000, 50000, "2025-26");
    expect(res.slabs.length).toBeGreaterThan(0);
    expect(res.slabs[0].label).toBe("Exempt slab");
    expect(res.slabs[0].rate).toBe(0);
  });

  it("calculates effectiveRate correctly", () => {
    const res = calcTaxOldByFY(1000000, 200000, "2025-26");
    expect(res.effectiveRate).toBeCloseTo((res.total / 1000000) * 100, 2);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveRent — effective rent with escalation tiers
// ---------------------------------------------------------------------------
describe("getEffectiveRent", () => {
  it("returns monthlyRent when no escalation tiers", () => {
    expect(getEffectiveRent({ monthlyRent: 15000 })).toBe(15000);
    expect(getEffectiveRent({ monthlyRent: 15000, escalationTiers: [] })).toBe(15000);
  });

  it("returns monthlyRent when no agreementStart", () => {
    const p = {
      monthlyRent: 15000,
      escalationTiers: [{ amount: 20000, durationMonths: 12 }],
    };
    expect(getEffectiveRent(p)).toBe(15000);
  });

  it("returns first tier amount at agreement start", () => {
    const p = {
      monthlyRent: 10000,
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getEffectiveRent(p, "2025-01")).toBe(15000);
  });

  it("returns second tier after first tier duration expires", () => {
    const p = {
      monthlyRent: 10000,
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    // 12 months after start -> second tier
    expect(getEffectiveRent(p, "2026-01")).toBe(18000);
  });

  it("returns last tier amount when past all tier durations", () => {
    const p = {
      monthlyRent: 10000,
      agreementStart: "2024-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    // 30 months after start -> past both tiers, return last tier
    expect(getEffectiveRent(p, "2026-07")).toBe(18000);
  });

  it("returns first tier amount when reference is before agreement start", () => {
    const p = {
      monthlyRent: 10000,
      agreementStart: "2025-06-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getEffectiveRent(p, "2025-01")).toBe(15000);
  });

  it("handles 0 as monthlyRent fallback", () => {
    expect(getEffectiveRent({})).toBe(0);
    expect(getEffectiveRent({ monthlyRent: 0 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCurrentTierIndex — current escalation tier index
// ---------------------------------------------------------------------------
describe("getCurrentTierIndex", () => {
  it("returns -1 when no tiers or no agreementStart", () => {
    expect(getCurrentTierIndex({})).toBe(-1);
    expect(getCurrentTierIndex({ escalationTiers: [] })).toBe(-1);
    expect(getCurrentTierIndex({ escalationTiers: [{ amount: 10000, durationMonths: 12 }] })).toBe(-1);
  });

  it("returns 0 at the start of agreement", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getCurrentTierIndex(p, "2025-01")).toBe(0);
  });

  it("returns 0 when reference is before agreement start", () => {
    const p = {
      agreementStart: "2025-06-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getCurrentTierIndex(p, "2025-01")).toBe(0);
  });

  it("returns correct index after first tier expires", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
        { amount: 20000, durationMonths: 12 },
      ],
    };
    expect(getCurrentTierIndex(p, "2026-01")).toBe(1);
    expect(getCurrentTierIndex(p, "2027-01")).toBe(2);
  });

  it("returns last tier index when past all tiers", () => {
    const p = {
      agreementStart: "2024-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getCurrentTierIndex(p, "2026-07")).toBe(1);
  });

  it("uses default durationMonths of 12 when not specified", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000 }, // no durationMonths -> defaults to 12
        { amount: 18000 },
      ],
    };
    expect(getCurrentTierIndex(p, "2025-06")).toBe(0);
    expect(getCurrentTierIndex(p, "2026-01")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getMonthsToNextEscalation — months until next rent escalation
// ---------------------------------------------------------------------------
describe("getMonthsToNextEscalation", () => {
  it("returns null when no tiers or fewer than 2 tiers", () => {
    expect(getMonthsToNextEscalation({})).toBeNull();
    expect(getMonthsToNextEscalation({ escalationTiers: [] })).toBeNull();
    expect(
      getMonthsToNextEscalation({
        agreementStart: "2025-01-01",
        escalationTiers: [{ amount: 15000, durationMonths: 12 }],
      })
    ).toBeNull();
  });

  it("returns null when no agreementStart", () => {
    expect(
      getMonthsToNextEscalation({
        escalationTiers: [
          { amount: 15000, durationMonths: 12 },
          { amount: 18000, durationMonths: 12 },
        ],
      })
    ).toBeNull();
  });

  it("returns months remaining in first tier", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    // 3 months elapsed, 9 remaining in first tier
    expect(getMonthsToNextEscalation(p, "2025-04")).toBe(9);
  });

  it("returns months remaining when at start of agreement", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getMonthsToNextEscalation(p, "2025-01")).toBe(12);
  });

  it("returns months remaining in second tier", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
        { amount: 20000, durationMonths: 12 },
      ],
    };
    // 14 months elapsed: past first tier (12 months). In 2nd tier, 10 months remaining.
    expect(getMonthsToNextEscalation(p, "2026-03")).toBe(10);
  });

  it("returns null when in the last tier (no next escalation)", () => {
    const p = {
      agreementStart: "2024-01-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    // 30 months elapsed -> past all tiers
    expect(getMonthsToNextEscalation(p, "2026-07")).toBeNull();
  });

  it("returns null when reference is before agreement start", () => {
    const p = {
      agreementStart: "2025-06-01",
      escalationTiers: [
        { amount: 15000, durationMonths: 12 },
        { amount: 18000, durationMonths: 12 },
      ],
    };
    expect(getMonthsToNextEscalation(p, "2025-01")).toBeNull();
  });

  it("defaults durationMonths to 12 when not provided", () => {
    const p = {
      agreementStart: "2025-01-01",
      escalationTiers: [
        { amount: 15000 }, // defaults to 12
        { amount: 18000 },
      ],
    };
    expect(getMonthsToNextEscalation(p, "2025-04")).toBe(9);
  });
});
