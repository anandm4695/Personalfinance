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
