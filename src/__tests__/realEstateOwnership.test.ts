import { describe, it, expect } from "vitest";
import { getFilteredStateForProfile, calculateProfileNWAndCover } from "../hooks/useMetrics";

// Regression test for a bug found during a Real Estate audit (Jul 2026): a joint-owner's
// filtered view of the app (activeProfile !== "all") went through getFilteredStateForProfile,
// which filtered realEstateDemands/realEstatePayments with the generic `filterByOwner` helper
// (`item.owner === profileId`). Demand-letter and payment records never carry an `owner` field
// (they only carry `propertyId`), so that filter silently returned an EMPTY array for every
// specific profile — blanking the RealEstateTab demand/payment tables whenever a non-"all"
// family member was selected, and zeroing out `realEstateOutstanding` (and therefore
// understating net worth liabilities) for every individual in FamilyView's per-member
// breakdown. Fixed by cross-referencing propertyId against the (already co-owner-aware)
// filtered realEstateProperties set, mirroring the existing ownedBillIds pattern.
function minimalState(overrides: any = {}) {
  return {
    bankAccounts: [],
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [],
    ppf: [],
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
    dividends: [],
    documents: [],
    subscriptions: [],
    goals: [],
    income: [],
    taxPayments: [],
    budgets: [],
    recurringExpenses: [],
    sips: [],
    stockSells: [],
    mfSells: [],
    corporateActions: [],
    goldHoldings: [],
    lifeEvents: [],
    govtSchemes: [],
    reminders: [],
    healthInsurance: [],
    creditScores: [],
    billPayments: [],
    billPaymentHistory: [],
    salarySlips: [],
    netWorthHistory: [],
    ...overrides,
  };
}

// A single under-construction property jointly held 60/40 between "self" and "wife",
// with a ₹10L demand letter of which ₹2L has been paid — so ₹8L is outstanding on the
// full property, ₹4.8L attributable to "self" and ₹3.2L to "wife".
function jointPropertyState() {
  return minimalState({
    realEstateProperties: [
      {
        id: "p1",
        status: "under-construction",
        marketValue: 0,
        agreementValue: 0,
        owner: "self",
        owners: [
          { id: "self", sharePct: 60 },
          { id: "wife", sharePct: 40 },
        ],
      },
    ],
    realEstateDemands: [
      { id: "d1", propertyId: "p1", totalAmount: 1000000, dueDate: "2026-08-01", status: "pending" },
    ],
    realEstatePayments: [{ id: "pay1", propertyId: "p1", amount: 200000 }],
  });
}

describe("getFilteredStateForProfile — real estate demands/payments", () => {
  it("includes a co-owner's demands/payments for a specific profile (not just the primary owner)", () => {
    const state = jointPropertyState();

    const wifeState = getFilteredStateForProfile(state, "wife");
    expect(wifeState.realEstateDemands).toHaveLength(1);
    expect(wifeState.realEstatePayments).toHaveLength(1);

    const selfState = getFilteredStateForProfile(state, "self");
    expect(selfState.realEstateDemands).toHaveLength(1);
    expect(selfState.realEstatePayments).toHaveLength(1);
  });

  it("excludes demands/payments for a property this profile has no share in", () => {
    const state = jointPropertyState();
    const daughterState = getFilteredStateForProfile(state, "daughter");
    expect(daughterState.realEstateDemands).toHaveLength(0);
    expect(daughterState.realEstatePayments).toHaveLength(0);
  });
});

describe("calculateProfileNWAndCover — realEstateOutstanding ownership-share scaling", () => {
  it("scales a jointly-owned property's outstanding builder demand by each profile's own share", () => {
    const state = jointPropertyState();

    const wifePState = getFilteredStateForProfile(state, "wife");
    const { netWorth: wifeNW } = calculateProfileNWAndCover(wifePState, {}, "wife");
    // (1,000,000 - 200,000) * 40% = 320,000 liability, no assets → netWorth = -320,000
    expect(wifeNW).toBeCloseTo(-320000, 5);

    const selfPState = getFilteredStateForProfile(state, "self");
    const { netWorth: selfNW } = calculateProfileNWAndCover(selfPState, {}, "self");
    // (1,000,000 - 200,000) * 60% = 480,000 liability
    expect(selfNW).toBeCloseTo(-480000, 5);
  });
});
