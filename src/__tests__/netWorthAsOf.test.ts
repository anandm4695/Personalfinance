import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { computeNetWorthAsOf, getEarliestNetWorthMonth } from "../utils/netWorthAsOf";
import { useMetrics } from "../hooks/useMetrics";

function ymMonthsAgo(n: number): string {
  const d = new Date();
  d.setDate(1); // avoid month-length overflow before subtracting
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateMonthsAgo(n: number): string {
  return `${ymMonthsAgo(n)}-15`;
}

const todayYm = ymMonthsAgo(0);

function emptyState(overrides: any = {}) {
  return {
    profile: { name: "Test", fy: "2026-27", regime: "new", savingsTarget: 20 },
    settings: {},
    masterData: {},
    dismissedAlerts: {},
    bankAccounts: [],
    transactions: [],
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [],
    ppf: [],
    ppfLedger: [],
    nps: [],
    epf: [],
    lic: [],
    termPlans: [],
    investmentPlans: [],
    mutualFunds: [],
    stocks: [],
    demat: [],
    creditCards: [],
    prepaidCards: [],
    loansTaken: [],
    loansGiven: [],
    informalBorrowed: [],
    informalLent: [],
    rentalProperties: [],
    rentedProperties: [],
    realEstateProperties: [],
    realEstateDemands: [],
    realEstatePayments: [],
    vehicles: [],
    goldHoldings: [],
    govtSchemes: [],
    subscriptions: [],
    goals: [],
    income: [],
    taxPayments: [],
    budgets: [],
    recurringExpenses: [],
    reminders: [],
    stockSells: [],
    mfSells: [],
    netWorthHistory: [],
    sips: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Current-month invariant: computeNetWorthAsOf must exactly match the real
// metrics.netWorth the rest of the app shows, for the current month.
// ---------------------------------------------------------------------------
describe("computeNetWorthAsOf — current-month invariant", () => {
  it("matches useMetrics().metrics.netWorth exactly, across every category", () => {
    const state = emptyState({
      bankAccounts: [{ id: "b1", balance: 50000 }],
      fixedDeposits: [{ id: "f1", principal: 100000, startDate: dateMonthsAgo(6) }],
      govtSchemes: [{ id: "g1", currentBalance: 20000, startDate: dateMonthsAgo(10) }],
      recurringDeposits: [
        { id: "r1", monthly: 1000, rate: 6, tenureMonths: 24, startDate: dateMonthsAgo(5) },
      ],
      bonds: [{ id: "bo1", totalInvestmentAmount: 30000, orderDate: dateMonthsAgo(4) }],
      ppf: [{ id: "p1", balance: 40000, startDate: dateMonthsAgo(20) }],
      nps: [
        { id: "n1", balance: 15000 },
        {
          id: "n2",
          balance: 0,
          transactions: [{ date: dateMonthsAgo(3), employeeAmount: 1000, employerAmount: 500 }],
        },
      ],
      epf: [
        {
          id: "e1",
          transactions: [
            {
              type: "monthly_contribution",
              date: dateMonthsAgo(3),
              employeeShare: 5000,
              employerShare: 3000,
              pensionShare: 1000,
            },
          ],
          establishments: [],
        },
      ],
      lic: [
        { id: "l1", transactions: [{ date: dateMonthsAgo(2), amount: 12000 }] },
        { id: "l2", premiumPaid: 8000 },
      ],
      investmentPlans: [{ id: "ip1", transactions: [{ date: dateMonthsAgo(2), amount: 9000 }] }],
      mutualFunds: [
        { id: "m1", units: 100, currentNav: 50, buyNav: 40, buyDate: dateMonthsAgo(8) },
      ],
      stocks: [
        {
          id: "s1",
          symbol: "TCS",
          exchange: "NSE",
          qty: 10,
          currentPrice: 3500,
          avgPrice: 3000,
          buyDate: dateMonthsAgo(9),
        },
      ],
      loansGiven: [{ id: "lg1", outstanding: 25000 }],
      loansTaken: [{ id: "lt1", outstanding: 60000 }],
      prepaidCards: [
        {
          id: "pc1",
          status: "active",
          transactions: [
            { type: "load", amount: 5000, date: dateMonthsAgo(4) },
            { type: "spend", amount: 1200, date: dateMonthsAgo(1) },
          ],
        },
      ],
      creditCards: [{ id: "cc1", status: "active", outstanding: 7000 }],
      rentalProperties: [
        {
          id: "rp1",
          propertyValue: 500000,
          depositTransactions: [{ amount: 20000, date: dateMonthsAgo(7) }],
        },
      ],
      rentedProperties: [
        { id: "rd1", depositTransactions: [{ amount: 15000, date: dateMonthsAgo(6) }] },
      ],
      informalLent: [
        {
          id: "il1",
          tranches: [{ amount: 10000, date: dateMonthsAgo(5) }],
          payments: [{ amount: 2000, date: dateMonthsAgo(1) }],
        },
      ],
      informalBorrowed: [
        { id: "ib1", tranches: [{ amount: 8000, date: dateMonthsAgo(5) }], payments: [] },
      ],
      realEstateProperties: [
        { id: "re1", status: "owned", marketValue: 2000000, purchaseDate: dateMonthsAgo(15) },
        {
          id: "re2",
          status: "under-construction",
          marketValue: 1500000,
          purchaseDate: dateMonthsAgo(3),
        },
      ],
      realEstateDemands: [
        { id: "d1", propertyId: "re2", totalAmount: 300000, demandDate: dateMonthsAgo(2) },
      ],
      realEstatePayments: [
        { id: "pay1", propertyId: "re2", amount: 100000, paymentDate: dateMonthsAgo(1) },
      ],
      vehicles: [{ id: "v1", currentValue: 400000, purchaseDate: dateMonthsAgo(11) }],
      goldHoldings: [{ id: "gh1", type: "physical", grams: 10, purity: "24K", purchaseDate: dateMonthsAgo(14) }],
    });

    const { result } = renderHook(() => useMetrics(state, "all", {}));
    const asOf = computeNetWorthAsOf(state, todayYm, {});

    expect(asOf.netWorth).toBe(result.current.metrics.netWorth);
    expect(asOf.totalAssets).toBe(result.current.metrics.totalAssets);
    expect(asOf.totalLiabilities).toBe(result.current.metrics.totalLiabilities);
  });
});

// ---------------------------------------------------------------------------
// Tier 1 — stock/MF lot reconstruction
// ---------------------------------------------------------------------------
describe("computeNetWorthAsOf — stock/MF lot reconstruction", () => {
  it("excludes a lot bought after the as-of month", () => {
    const state = emptyState({
      stocks: [{ id: "s1", symbol: "TCS", exchange: "NSE", qty: 10, avgPrice: 100, buyDate: dateMonthsAgo(1) }],
    });
    const asOf = computeNetWorthAsOf(state, ymMonthsAgo(3), {});
    expect(asOf.assetBreakdown.find((x) => x.name === "Stocks")).toBeUndefined();
  });

  it("includes a currently-held lot bought before the as-of month", () => {
    const state = emptyState({
      stocks: [{ id: "s1", symbol: "TCS", exchange: "NSE", qty: 10, avgPrice: 100, buyDate: dateMonthsAgo(5) }],
    });
    const asOf = computeNetWorthAsOf(state, ymMonthsAgo(1), {});
    expect(asOf.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(1000);
  });

  it("adds back a fully-sold lot for months before it was sold", () => {
    // Lot bought 6 months ago, fully sold 2 months ago -> current `stocks` has no row for it.
    const state = emptyState({
      stocks: [],
      stockSells: [
        {
          id: "ss1",
          symbol: "TCS",
          exchange: "NSE",
          qty: 10,
          buyPrice: 100,
          buyDate: dateMonthsAgo(6),
          sellDate: dateMonthsAgo(2),
        },
      ],
    });
    // As of 4 months ago (bought, not yet sold) — should still count.
    const asOfHeld = computeNetWorthAsOf(state, ymMonthsAgo(4), {});
    expect(asOfHeld.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(1000);
    // As of 1 month ago (after the sale) — should not count.
    const asOfAfterSale = computeNetWorthAsOf(state, ymMonthsAgo(1), {});
    expect(asOfAfterSale.assetBreakdown.find((x) => x.name === "Stocks")).toBeUndefined();
  });

  it("handles multiple partial sells of the same original lot correctly", () => {
    // Originally 30 qty bought 8 months ago. Sold 10 five months ago, sold another
    // 10 two months ago, 10 remain in the live `stocks` row today.
    const state = emptyState({
      stocks: [{ id: "s1", symbol: "TCS", exchange: "NSE", qty: 10, avgPrice: 100, buyDate: dateMonthsAgo(8) }],
      stockSells: [
        { id: "ss1", symbol: "TCS", exchange: "NSE", qty: 10, buyPrice: 100, buyDate: dateMonthsAgo(8), sellDate: dateMonthsAgo(5) },
        { id: "ss2", symbol: "TCS", exchange: "NSE", qty: 10, buyPrice: 100, buyDate: dateMonthsAgo(8), sellDate: dateMonthsAgo(2) },
      ],
    });
    // As of 6 months ago: only the first sell (5mo ago) hasn't happened yet -> full 30 held.
    const at6 = computeNetWorthAsOf(state, ymMonthsAgo(6), {});
    expect(at6.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(3000);
    // As of 3 months ago: first sell done, second (2mo ago) hasn't -> 20 held.
    const at3 = computeNetWorthAsOf(state, ymMonthsAgo(3), {});
    expect(at3.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(2000);
    // As of today: both sells done -> only the remaining 10 in the live row.
    const now = computeNetWorthAsOf(state, todayYm, {});
    expect(now.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(1000);
  });

  it("excludes a lot bought and sold within the same as-of month (value-at-month-end semantics)", () => {
    const state = emptyState({
      stocks: [],
      stockSells: [
        {
          id: "ss1",
          symbol: "TCS",
          exchange: "NSE",
          qty: 10,
          buyPrice: 100,
          buyDate: dateMonthsAgo(3),
          sellDate: dateMonthsAgo(3),
        },
      ],
    });
    const asOf = computeNetWorthAsOf(state, ymMonthsAgo(3), {});
    expect(asOf.assetBreakdown.find((x) => x.name === "Stocks")).toBeUndefined();
  });

  it("always includes a legacy lot with no buyDate", () => {
    const state = emptyState({
      stocks: [{ id: "s1", symbol: "TCS", exchange: "NSE", qty: 10, avgPrice: 100, buyDate: "" }],
    });
    const asOf = computeNetWorthAsOf(state, ymMonthsAgo(50), {});
    expect(asOf.assetBreakdown.find((x) => x.name === "Stocks")?.value).toBe(1000);
  });

  it("reconstructs mutual fund units the same way via mfSells", () => {
    const state = emptyState({
      mutualFunds: [],
      mfSells: [
        { id: "mfs1", scheme: "X", units: 50, buyNav: 20, buyDate: dateMonthsAgo(6), sellDate: dateMonthsAgo(2) },
      ],
    });
    const held = computeNetWorthAsOf(state, ymMonthsAgo(4), {});
    expect(held.assetBreakdown.find((x) => x.name === "Mutual Funds")?.value).toBe(1000);
    const afterSale = computeNetWorthAsOf(state, ymMonthsAgo(1), {});
    expect(afterSale.assetBreakdown.find((x) => x.name === "Mutual Funds")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tier 2 — gate by an unused start/purchase/open/order date
// ---------------------------------------------------------------------------
describe("computeNetWorthAsOf — Tier 2 gating", () => {
  it("Fixed Deposit: excluded before startDate, included from startDate onward", () => {
    const state = emptyState({
      fixedDeposits: [{ id: "f1", principal: 100000, startDate: dateMonthsAgo(3) }],
    });
    expect(computeNetWorthAsOf(state, ymMonthsAgo(5), {}).assetBreakdown.find((x) => x.name === "Fixed Deposits")).toBeUndefined();
    expect(computeNetWorthAsOf(state, ymMonthsAgo(1), {}).assetBreakdown.find((x) => x.name === "Fixed Deposits")?.value).toBe(100000);
  });

  it("Fixed Deposit: a record missing startDate is never excluded (conservative fallback)", () => {
    const state = emptyState({
      fixedDeposits: [{ id: "f1", principal: 100000 }],
    });
    expect(computeNetWorthAsOf(state, ymMonthsAgo(60), {}).assetBreakdown.find((x) => x.name === "Fixed Deposits")?.value).toBe(100000);
  });

  it("Bond: gates by orderDate stored as text", () => {
    const state = emptyState({
      bonds: [{ id: "b1", faceValue: 50000, orderDate: dateMonthsAgo(2) }],
    });
    expect(computeNetWorthAsOf(state, ymMonthsAgo(4), {}).assetBreakdown.find((x) => x.name === "Bonds")).toBeUndefined();
    expect(computeNetWorthAsOf(state, todayYm, {}).assetBreakdown.find((x) => x.name === "Bonds")?.value).toBe(50000);
  });

  it("Vehicle: gates by purchaseDate", () => {
    const state = emptyState({
      vehicles: [{ id: "v1", currentValue: 300000, purchaseDate: dateMonthsAgo(2) }],
    });
    expect(computeNetWorthAsOf(state, ymMonthsAgo(4), {}).assetBreakdown.find((x) => x.name === "Vehicles")).toBeUndefined();
  });

  it("Credit Card: excludes outstanding for months strictly after closedDate", () => {
    const state = emptyState({
      creditCards: [{ id: "cc1", status: "closed", outstanding: 5000, closedDate: dateMonthsAgo(2) }],
    });
    expect(computeNetWorthAsOf(state, ymMonthsAgo(4), {}).totalLiabilities).toBe(5000);
    expect(computeNetWorthAsOf(state, todayYm, {}).totalLiabilities).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tier 3 — no date data anywhere, always included
// ---------------------------------------------------------------------------
describe("computeNetWorthAsOf — Tier 3 always included", () => {
  it("bank cash, loans given/taken, and rental property value are flat across all months", () => {
    const state = emptyState({
      bankAccounts: [{ id: "b1", balance: 50000 }],
      loansGiven: [{ id: "lg1", outstanding: 10000 }],
      loansTaken: [{ id: "lt1", outstanding: 20000 }],
      rentalProperties: [{ id: "rp1", propertyValue: 500000 }],
    });
    const far = computeNetWorthAsOf(state, ymMonthsAgo(60), {});
    const now = computeNetWorthAsOf(state, todayYm, {});
    expect(far.totalAssets).toBe(now.totalAssets);
    expect(far.totalLiabilities).toBe(now.totalLiabilities);
  });
});

// ---------------------------------------------------------------------------
// getEarliestNetWorthMonth
// ---------------------------------------------------------------------------
describe("getEarliestNetWorthMonth", () => {
  it("falls back to 12 months back when no dated field exists anywhere", () => {
    const state = emptyState({
      bankAccounts: [{ id: "b1", balance: 1000 }],
      loansGiven: [{ id: "lg1", outstanding: 500 }],
    });
    expect(getEarliestNetWorthMonth(state)).toBe(ymMonthsAgo(12));
  });

  it("returns the earliest month found across dated fields", () => {
    const state = emptyState({
      fixedDeposits: [{ id: "f1", principal: 1000, startDate: dateMonthsAgo(20) }],
      stocks: [{ id: "s1", symbol: "TCS", exchange: "NSE", qty: 1, avgPrice: 1, buyDate: dateMonthsAgo(30) }],
    });
    expect(getEarliestNetWorthMonth(state)).toBe(ymMonthsAgo(30));
  });

  it("clamps to 120 months back for an outlier-old date", () => {
    const state = emptyState({
      fixedDeposits: [{ id: "f1", principal: 1000, startDate: "1990-01-01" }],
    });
    expect(getEarliestNetWorthMonth(state)).toBe(ymMonthsAgo(120));
  });
});
