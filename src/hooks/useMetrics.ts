import { useMemo } from "react";
import {
  fmtINRFull,
  today,
  monthsBetween,
  calculateEpfBalance,
  rdMaturity,
  getCCDueDate,
  calcTaxNew,
  calcTaxOld,
  getTaxDueForDashboard,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  getEmergencyFundLiquidAssets,
  getEmergencyFundMonthlyExpense,
  getEmergencyFundStatus,
  EMERGENCY_FUND_TARGET_MONTHS,
} from "../utils/finance";
import { getCurrentFY } from "../utils/appConstants";
import { DEFAULT_MASTER_DATA, FamilyProfile } from "../utils/masterData";

export function getFilteredStateForProfile(state: any, profileId: string) {
  if (profileId === "all") return state;
  const filterByOwner = (arr: any[]) =>
    (Array.isArray(arr) ? arr : []).filter((item) => item.owner === profileId);
  // Real estate properties can be jointly held (see `owners: [{id, sharePct}]`),
  // so a co-owner must still see the property in their filtered view even when
  // they aren't the primary `owner`.
  const filterRealEstateByOwner = (arr: any[]) =>
    (Array.isArray(arr) ? arr : []).filter(
      (item) =>
        item.owner === profileId ||
        (Array.isArray(item.owners) && item.owners.some((o: any) => o?.id === profileId))
    );
  // billPaymentHistory rows don't carry their own `owner` — they reference a bill
  // via `billId`. Cross-reference against the (already owner-filtered) bills so
  // payment history for another family member's bills doesn't leak through.
  const ownedBillIds = new Set(
    (Array.isArray(state.billPayments) ? state.billPayments : [])
      .filter((b: any) => b.owner === profileId)
      .map((b: any) => b.id)
  );
  // realEstateDemands/realEstatePayments don't carry an `owner` field either — they
  // reference a property via `propertyId`. Previously these went through the plain
  // `filterByOwner` above, which checks `item.owner === profileId`; since that field
  // never exists on demand/payment rows, the filter silently returned an EMPTY array
  // for every specific profile (only "all" — which skips filtering entirely — ever
  // showed them). That zeroed out this profile's real-estate outstanding-demand
  // liability in every net-worth calc and blanked the RealEstateTab demand-letter/
  // payment tables whenever a specific family member was selected. Cross-reference
  // against the (already co-owner-aware) filtered properties instead, same pattern
  // as ownedBillIds above.
  const ownedPropertyIds = new Set(
    filterRealEstateByOwner(state.realEstateProperties || []).map((p: any) => p.id)
  );
  return {
    ...state,
    bankAccounts: filterByOwner(state.bankAccounts),
    transactions: filterByOwner(state.transactions),
    fixedDeposits: filterByOwner(state.fixedDeposits),
    recurringDeposits: filterByOwner(state.recurringDeposits),
    bonds: filterByOwner(state.bonds),
    ppf: filterByOwner(state.ppf),
    nps: filterByOwner(state.nps),
    epf: filterByOwner(state.epf),
    lic: filterByOwner(state.lic),
    termPlans: filterByOwner(state.termPlans),
    investmentPlans: filterByOwner(state.investmentPlans),
    mutualFunds: filterByOwner(state.mutualFunds),
    stocks: filterByOwner(state.stocks),
    demat: filterByOwner(state.demat),
    creditCards: filterByOwner(state.creditCards),
    prepaidCards: filterByOwner(state.prepaidCards),
    loansTaken: filterByOwner(state.loansTaken),
    loansGiven: filterByOwner(state.loansGiven),
    informalBorrowed: filterByOwner(state.informalBorrowed || []),
    informalLent: filterByOwner(state.informalLent || []),
    rentalProperties: filterByOwner(state.rentalProperties || []),
    rentedProperties: filterByOwner(state.rentedProperties || []),
    realEstateProperties: filterRealEstateByOwner(state.realEstateProperties || []),
    realEstateDemands: (Array.isArray(state.realEstateDemands) ? state.realEstateDemands : []).filter(
      (d: any) => ownedPropertyIds.has(d.propertyId)
    ),
    realEstatePayments: (Array.isArray(state.realEstatePayments) ? state.realEstatePayments : []).filter(
      (p: any) => ownedPropertyIds.has(p.propertyId)
    ),
    vehicles: filterByOwner(state.vehicles || []),
    dividends: filterByOwner(state.dividends || []),
    documents: filterByOwner(state.documents || []),
    subscriptions: filterByOwner(state.subscriptions),
    goals: filterByOwner(state.goals),
    income: filterByOwner(state.income),
    taxPayments: filterByOwner(state.taxPayments),
    budgets: filterByOwner(state.budgets),
    recurringExpenses: filterByOwner(state.recurringExpenses || []),
    sips: filterByOwner(state.sips),
    stockSells: filterByOwner(state.stockSells || []),
    mfSells: filterByOwner(state.mfSells || []),
    corporateActions: filterByOwner(state.corporateActions || []),
    goldHoldings: filterByOwner(state.goldHoldings || []),
    lifeEvents: filterByOwner(state.lifeEvents || []),
    govtSchemes: filterByOwner(state.govtSchemes || []),
    reminders: filterByOwner(state.reminders || []),
    healthInsurance: filterByOwner(state.healthInsurance || []),
    creditScores: filterByOwner(state.creditScores || []),
    billPayments: filterByOwner(state.billPayments || []),
    billPaymentHistory: (Array.isArray(state.billPaymentHistory) ? state.billPaymentHistory : []).filter(
      (h: any) => ownedBillIds.has(h.billId)
    ),
    salarySlips: filterByOwner(state.salarySlips || []),
    // wishlists / wishlistItems are intentionally NOT owner-filtered here: they are
    // account-wide stock watchlists (no `owner` field exists anywhere in their
    // schema — see WishlistModal/WishlistItemModal in DematTab.tsx and migration
    // 49_rename_wishlists_to_watchlists.sql), not per-family-member financial
    // records, so there is nothing to cross-reference and no leak to fix.
    netWorthHistory: [],
  };
}

// Fraction of a real estate property's value attributable to a given family
// profile. Falls back to the legacy single `owner` field (100% share) for
// properties saved before joint ownership (`owners: [{id, sharePct}]`) existed.
function realEstateShareForOwner(property: any, profileId: string): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === profileId);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === profileId ? 1 : 0;
}

// Sentinel owner id for a co-owner who isn't one of this household's tracked
// family profiles (e.g. a parent on the property papers) — see EXTERNAL_OWNER_ID
// in RealEstateTab.tsx.
const EXTERNAL_OWNER_ID = "external";

// Fraction of a property's value attributable to THIS household (i.e. all
// tracked family profiles combined), excluding any share held by an untracked
// "external" co-owner. Used for the "all profiles" aggregate view so a
// property co-owned with, say, a parent doesn't get counted at its full
// market value when only part of it belongs to this household's net worth.
// Falls back to 100% for legacy single-owner properties.
function realEstateTrackedShare(property: any): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    return (
      property.owners.reduce(
        (s: number, o: any) => (o?.id !== EXTERNAL_OWNER_ID ? s + Number(o.sharePct || 0) : s),
        0
      ) / 100
    );
  }
  return 1;
}

export function calculateProfileNWAndCover(pState: any, marketData: any, profileId?: string) {
  const cashInBanks = (pState.bankAccounts || []).reduce(
    (s: number, a: any) => s + Number(a.balance || 0),
    0
  );
  const fdValue = (pState.fixedDeposits || []).reduce(
    (s: number, f: any) => s + Number(f.principal || 0),
    0
  );
  const govtSchemesValue = (pState.govtSchemes || []).reduce(
    (s: number, sc: any) => s + Number(sc.currentBalance || 0),
    0
  );
  const rdValue = (pState.recurringDeposits || []).reduce((s: number, r: any) => {
    const elapsed = r.startDate
      ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
      : Number(r.tenureMonths || 0);
    return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  }, 0);
  const bondValue = (pState.bonds || []).reduce(
    (s: number, b: any) =>
      s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
    0
  );
  const ppfValue = (pState.ppf || []).reduce(
    (s: number, pp: any) => s + Number(pp.balance || 0),
    0
  );
  const npsValue = (pState.nps || []).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    const txTotal = (n.transactions || []).reduce(
      (ss: number, t: any) =>
        ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
      0
    );
    return s + txTotal;
  }, 0);
  const epfValue = (pState.epf || []).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
  const licValue = (pState.lic || []).reduce((s: number, l: any) => {
    const txTotal = (l.transactions || []).reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );
    return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);
  const investmentValue = (pState.investmentPlans || []).reduce((s: number, ip: any) => {
    const txTotal = (ip.transactions || []).reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );
    return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
  }, 0);
  const mfValue = (pState.mutualFunds || []).reduce((s: number, m: any) => {
    const liveNav = Number(m.currentNav || 0);
    const fallbackNav =
      liveNav ||
      Number(m.buyNav || 0) ||
      (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
    return s + Number(m.units || 0) * fallbackNav;
  }, 0);
  const stockValue = (pState.stocks || []).reduce((sum: number, s: any) => {
    const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
    const md = marketData?.[yfSym];
    const price = md?.price ?? Number(s.currentPrice || 0);
    return sum + Number(s.qty || 0) * price;
  }, 0);
  const loansGivenValue = (pState.loansGiven || []).reduce(
    (s: number, l: any) => s + Number(l.amount || 0),
    0
  );
  const prepaidValue = (pState.prepaidCards || [])
    .filter((pc: any) => (pc.status || "").toLowerCase() !== "closed")
    .reduce((s: number, pc: any) => {
      const txns = pc.transactions || [];
      const loaded = txns
        .filter((t: any) => t.type === "load")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t: any) => t.type === "spend")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + (loaded - spent);
    }, 0);
  const rentedDepositAsset = (pState.rentedProperties || []).reduce(
    (s: number, p: any) => s + Number(p.securityDeposit || 0),
    0
  );
  const informalLentValue = (pState.informalLent || []).reduce(
    (s: number, l: any) => s + Number(l.amount || 0),
    0
  );
  const rentalPropertiesAsset = (pState.rentalProperties || []).reduce(
    (s: number, r: any) => s + Number(r.marketValue || r.value || 0),
    0
  );
  const realEstateAsset = (pState.realEstateProperties || [])
    .filter((p: any) => p.status !== "sold")
    .reduce((s: number, p: any) => {
      const value = Number(p.marketValue || p.agreementValue || 0);
      const share = profileId ? realEstateShareForOwner(p, profileId) : 1;
      return s + value * share;
    }, 0);
  const vehicleAsset = (pState.vehicles || []).reduce(
    (s: number, v: any) => s + Number(v.currentValue || v.purchasePrice || 0),
    0
  );

  const goldPrice = getGoldPricePerGram(pState);
  const goldValue = (pState.goldHoldings || []).reduce((s: number, h: any) => {
    const grams = Number(h.grams || 0);
    const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
    const currentValue = grams * goldPrice * purityMul;
    return s + currentValue;
  }, 0);

  const totalAssets =
    cashInBanks +
    fdValue +
    rdValue +
    bondValue +
    ppfValue +
    npsValue +
    epfValue +
    licValue +
    investmentValue +
    mfValue +
    stockValue +
    loansGivenValue +
    prepaidValue +
    rentedDepositAsset +
    informalLentValue +
    rentalPropertiesAsset +
    realEstateAsset +
    vehicleAsset +
    goldValue +
    govtSchemesValue;

  const ccOutstanding = (pState.creditCards || []).reduce(
    (s: number, c: any) => s + Number(c.outstanding || 0),
    0
  );
  const loansTakenValue = (pState.loansTaken || []).reduce(
    (s: number, l: any) => s + Number(l.outstandingPrincipal || l.amount || 0),
    0
  );
  const rentalDepositLiability = (pState.rentalProperties || []).reduce(
    (s: number, r: any) => s + Number(r.securityDeposit || 0),
    0
  );
  const informalBorrowedValue = (pState.informalBorrowed || []).reduce(
    (s: number, b: any) => s + Number(b.amount || 0),
    0
  );

  // Scale each under-construction property's outstanding builder demand by this
  // profile's ownership share — mirrors realEstateAsset above so a jointly-owned
  // property's payment obligation isn't counted in full against a co-owner who
  // only holds part of it (e.g. an external co-owner's share isn't this
  // household member's liability).
  const realEstateOutstanding = (pState.realEstateProperties || [])
    .filter((p: any) => p.status === "under-construction")
    .reduce((total: number, p: any) => {
      const share = profileId ? realEstateShareForOwner(p, profileId) : 1;
      const demanded = (pState.realEstateDemands || [])
        .filter((d: any) => d.propertyId === p.id)
        .reduce((s: number, d: any) => s + Number(d.totalAmount || d.amount || 0), 0);
      const paid = (pState.realEstatePayments || [])
        .filter((pm: any) => pm.propertyId === p.id)
        .reduce((s: number, pm: any) => s + Number(pm.amount || 0), 0);
      return total + Math.max(0, demanded - paid) * share;
    }, 0);

  const totalLiabilities =
    ccOutstanding +
    loansTakenValue +
    rentalDepositLiability +
    informalBorrowedValue +
    realEstateOutstanding;

  const netWorth = totalAssets - totalLiabilities;

  const termCover = (pState.termPlans || []).reduce(
    (s: number, t: any) => s + Number(t.coverAmount || t.sumAssured || 0),
    0
  );
  const licCover = (pState.lic || []).reduce(
    (s: number, l: any) => s + Number(l.sumAssured || 0),
    0
  );
  const totalCover = termCover + licCover;

  return { netWorth, totalCover };
}

export function useMetrics(
  state: any,
  activeProfile: string,
  marketData: any
): {
  filteredState: any;
  metrics: any;
  assetBreakdown: any[];
  trendData: any[];
  greeting: { title: string; subtitle: string };
} {
  // Read directly from state rather than useMasterData(): this hook is invoked from
  // FinanceDashboard's render body before that component's own MasterDataContext.Provider
  // is mounted, so useContext here would only ever see the default value, not live edits.
  const familyProfiles: FamilyProfile[] =
    state.masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles;

  const filteredState = useMemo(() => {
    return getFilteredStateForProfile(state, activeProfile);
  }, [state, activeProfile]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const sState = filteredState;
    const cashInBanks = (sState.bankAccounts || []).reduce(
      (s: number, a: any) => s + Number(a.balance || 0),
      0
    );
    const fdValue = sState.fixedDeposits.reduce(
      (s: number, f: any) => s + Number(f.principal || 0),
      0
    );
    const govtSchemesValue = (sState.govtSchemes || []).reduce(
      (s: number, sc: any) => s + Number(sc.currentBalance || 0),
      0
    );
    const rdValue = sState.recurringDeposits.reduce((s: number, r: any) => {
      const elapsed = r.startDate
        ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
        : Number(r.tenureMonths || 0);
      return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
    }, 0);
    const bondValue = sState.bonds.reduce(
      (s: number, b: any) =>
        s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
      0
    );
    const ppfValue = sState.ppf.reduce((s: number, p: any) => s + Number(p.balance || 0), 0);
    const npsValue = sState.nps.reduce((s: number, n: any) => {
      const bal = Number(n.balance) || 0;
      if (bal > 0) return s + bal;
      const txTotal = (n.transactions || []).reduce(
        (ss: number, t: any) =>
          ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      );
      return s + txTotal;
    }, 0);
    const epfValue = (sState.epf || []).reduce(
      (s: number, e: any) => s + calculateEpfBalance(e),
      0
    );
    const licValue = sState.lic.reduce((s: number, l: any) => {
      const txTotal = (l.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
    }, 0);
    const investmentValue = sState.investmentPlans.reduce((s: number, ip: any) => {
      const txTotal = (ip.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
    }, 0);
    const mfValue = sState.mutualFunds.reduce((s: number, m: any) => {
      const liveNav = Number(m.currentNav || 0);
      const fallbackNav =
        liveNav ||
        Number(m.buyNav || 0) ||
        (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
      return s + Number(m.units || 0) * fallbackNav;
    }, 0);
    const mfInvested = sState.mutualFunds.reduce(
      (s: number, m: any) =>
        s + (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : Number(m.invested || 0)),
      0
    );
    const stockValue = sState.stocks.reduce((s: number, st: any) => {
      const yfSym = `${st.symbol.replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
      const md = marketData[yfSym];
      const livePrice = md?.price ?? Number(st.currentPrice || 0);
      const fallbackPrice = livePrice || Number(st.avgPrice || 0);
      return s + Number(st.qty || 0) * fallbackPrice;
    }, 0);
    const stockInvested = sState.stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = sState.loansGiven.reduce(
      (s: number, l: any) => s + Number(l.outstanding || 0),
      0
    );
    const prepaidValue = sState.prepaidCards
      .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
      .reduce((s: number, p: any) => {
        const txns = p.transactions || [];
        const loaded = txns
          .filter((t: any) => t.type === "load")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const spent = txns
          .filter((t: any) => t.type === "spend")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (loaded - spent);
      }, 0);

    const ccOutstanding = sState.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
    const loansTakenValue = sState.loansTaken.reduce(
      (s: number, l: any) => s + Number(l.outstanding || 0),
      0
    );
    const rentalDepositLiability = (sState.rentalProperties || []).reduce((s: number, p: any) => {
      const actualDeposit =
        p.depositTransactions && p.depositTransactions.length > 0
          ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
          : Number(p.securityDeposit || 0);
      const deducted = (p.depositDeductions || []).reduce(
        (a: number, d: any) => a + Number(d.amount || 0),
        0
      );
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - deducted - returned);
    }, 0);
    const rentedDepositAsset = (sState.rentedProperties || []).reduce((s: number, p: any) => {
      const actualDeposit =
        p.depositTransactions && p.depositTransactions.length > 0
          ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
          : Number(p.securityDeposit || 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - returned);
    }, 0);

    const informalLentValue = (sState.informalLent || []).reduce((s: number, person: any) => {
      const tranches = person.tranches || [];
      const payments = person.payments || [];
      const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      return s + Math.max(0, totalT - totalP);
    }, 0);

    const informalBorrowedValue = (sState.informalBorrowed || []).reduce(
      (s: number, person: any) => {
        const tranches = person.tranches || [];
        const payments = person.payments || [];
        const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        return s + Math.max(0, totalT - totalP);
      },
      0
    );

    const rentalPropertiesAsset = (sState.rentalProperties || []).reduce(
      (s: number, r: any) => s + Number(r.propertyValue || 0),
      0
    );

    // Vehicles: counted at current market value (user-maintained estimate), fallback to purchase price
    const vehicleAsset = (sState.vehicles || []).reduce(
      (s: number, v: any) => s + Number(v.currentValue || v.purchasePrice || 0),
      0
    );

    // Gold & SGBs: value at current gold price (DB-synced via state.settings), fallback to purchase price
    const goldPrice = getGoldPricePerGram(sState);
    const goldValue = (sState.goldHoldings || []).reduce((s: number, h: any) => {
      const grams = Number(h.grams || 0);
      const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
      const currentValue = grams * goldPrice * purityMul;
      return s + currentValue;
    }, 0);

    // Real estate: owned + under-construction properties counted at market value (or agreement
    // value). When viewing a single family profile, a jointly-owned property only contributes
    // that profile's ownership share, not the full value — see realEstateShareForOwner. When
    // viewing all profiles combined, a property co-owned with an untracked "external" party
    // (e.g. a parent) only contributes this household's tracked share, not the full value —
    // see realEstateTrackedShare — otherwise the externally-owned share would be double-counted
    // into this household's assets and net worth.
    const realEstateAsset = (sState.realEstateProperties || [])
      .filter((p: any) => p.status !== "sold")
      .reduce((s: number, p: any) => {
        const value = Number(p.marketValue || p.agreementValue || 0);
        const share =
          activeProfile !== "all" ? realEstateShareForOwner(p, activeProfile) : realEstateTrackedShare(p);
        return s + value * share;
      }, 0);

    // Outstanding builder demands for under-construction properties = contractual cash
    // obligations. Scaled per-property by the same ownership share as realEstateAsset
    // above, so a jointly-owned property's payment obligation isn't counted in full
    // against a co-owner (or this household) who only holds part of it.
    const realEstateOutstanding = (sState.realEstateProperties || [])
      .filter((p: any) => p.status === "under-construction")
      .reduce((total: number, p: any) => {
        const share =
          activeProfile !== "all" ? realEstateShareForOwner(p, activeProfile) : realEstateTrackedShare(p);
        const demanded = (sState.realEstateDemands || [])
          .filter((d: any) => d.propertyId === p.id)
          .reduce((s: number, d: any) => s + Number(d.totalAmount || d.amount || 0), 0);
        const paid = (sState.realEstatePayments || [])
          .filter((pm: any) => pm.propertyId === p.id)
          .reduce((s: number, pm: any) => s + Number(pm.amount || 0), 0);
        return total + Math.max(0, demanded - paid) * share;
      }, 0);

    const totalAssets =
      cashInBanks +
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      epfValue +
      licValue +
      investmentValue +
      mfValue +
      stockValue +
      loansGivenValue +
      prepaidValue +
      rentedDepositAsset +
      informalLentValue +
      rentalPropertiesAsset +
      realEstateAsset +
      vehicleAsset +
      goldValue +
      govtSchemesValue;
    const totalLiabilities =
      ccOutstanding +
      loansTakenValue +
      rentalDepositLiability +
      informalBorrowedValue +
      realEstateOutstanding;
    const netWorth = totalAssets - totalLiabilities;

    // Income/Expense current month
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTxns = sState.transactions.filter((t: any) => t.date && t.date.startsWith(ym));

    // Prefer current month's manual/explicit income ledger entries if present, fallback to credit transactions
    const explicitIncomeMonth = (sState.income || [])
      .filter((i: any) => i.date && i.date.startsWith(ym))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncomeMonth = monthTxns
      .filter(
        (t: any) =>
          t.type === "credit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const monthIncomeBase = explicitIncomeMonth > 0 ? explicitIncomeMonth : txnIncomeMonth;

    const rentPaidThisMonth = (sState.rentedProperties || []).reduce((sum: number, p: any) => {
      const paymentsThisMonth = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(ym))
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return sum + paymentsThisMonth;
    }, 0);

    // Rent RECEIVED (landlord side, `rentalProperties[].receipts`) had no ledger-only
    // inclusion path even though rent PAID above does — manually-logged receipts (not
    // tied to a bank transaction) were invisible to Dashboard/Monthly Report income.
    // Mirrors rentPaidThisMonth's guard: skip the ledger top-up for a month that already
    // has a bank-linked "Rent" credit transaction counted in txnIncomeMonth, to avoid
    // double-counting (BanksTab's applyLinkedTxn auto-posts into receipts AND transactions).
    const rentReceivedThisMonth = (sState.rentalProperties || []).reduce(
      (sum: number, p: any) => {
        const receiptsThisMonth = (p.receipts || [])
          .filter((r: any) => r.date && r.date.startsWith(ym))
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        return sum + receiptsThisMonth;
      },
      0
    );
    const hasRentReceivedTxn = monthTxns.some(
      (t: any) => t.type === "credit" && t.category === "Rent"
    );
    const monthIncome =
      monthIncomeBase + (rentReceivedThisMonth > 0 && !hasRentReceivedTxn ? rentReceivedThisMonth : 0);

    const txnDebitTotal = monthTxns
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.category !== "Investment"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const hasRentTxn = monthTxns.some((t: any) => t.type === "debit" && t.category === "Rent");
    const monthExpense =
      txnDebitTotal + (rentPaidThisMonth > 0 && !hasRentTxn ? rentPaidThisMonth : 0);

    // Emergency Fund: computed once here and reused everywhere it's surfaced
    // (dedicated tab, dashboard widget, Financial Health Score, Smart Insights,
    // gamification badges, alerts, AI assistant, peer benchmark) — see the
    // helpers' comments in finance.ts for why this used to drift per-consumer.
    const efMonthlyExpense = getEmergencyFundMonthlyExpense(sState, monthExpense);
    const { liquidAssets: efLiquidAssets, nearTermFDValue: efNearTermFDValue, liquidMFValue: efLiquidMFValue } =
      getEmergencyFundLiquidAssets(sState, cashInBanks, prepaidValue);
    const efMonthsCovered = efMonthlyExpense > 0 ? efLiquidAssets / efMonthlyExpense : 0;
    const efTargetAmount = efMonthlyExpense * EMERGENCY_FUND_TARGET_MONTHS;
    const efGap = Math.max(0, efTargetAmount - efLiquidAssets);
    const emergencyFund = {
      liquidAssets: efLiquidAssets,
      cashInBanks,
      nearTermFDValue: efNearTermFDValue,
      liquidMFValue: efLiquidMFValue,
      prepaidValue,
      monthlyExpense: efMonthlyExpense,
      monthsCovered: efMonthsCovered,
      targetMonths: EMERGENCY_FUND_TARGET_MONTHS,
      targetAmount: efTargetAmount,
      gap: efGap,
      coveragePct: Math.min(100, (efMonthsCovered / EMERGENCY_FUND_TARGET_MONTHS) * 100),
      ...getEmergencyFundStatus(efMonthsCovered),
    };

    // Annual income from income ledger
    const fyStart = new Date(`${(sState.profile?.fy || getCurrentFY()).split("-")[0]}-04-01`);
    const explicitIncome = sState.income
      .filter((i: any) => new Date(i.date) >= fyStart)
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncome = sState.transactions
      .filter(
        (t: any) =>
          t.type === "credit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.date &&
          new Date(t.date) >= fyStart
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const annualizedCurrentMonth = (monthIncome || 0) * 12;
    // Manually-logged rent receipts (not bank-linked) for the FY — same ledger-only gap as
    // rentReceivedThisMonth above. Bank-linked receipts (id `bank-${txnId}`, see BanksTab's
    // applyLinkedTxn) are excluded here since they're already counted via txnIncome/monthIncome.
    const rentReceivedFY = (sState.rentalProperties || []).reduce((sum: number, p: any) => {
      const receiptsInFY = (p.receipts || [])
        .filter(
          (r: any) =>
            r.date && new Date(r.date) >= fyStart && !String(r.id || "").startsWith("bank-")
        )
        .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      return sum + receiptsInFY;
    }, 0);
    // Prefer explicit ledger -> FY-to-date credit txns -> annualised single month (least accurate)
    const annualIncome = (explicitIncome || txnIncome || annualizedCurrentMonth || 0) + rentReceivedFY;

    const subTotal = sState.subscriptions
      .filter((sub: any) => !sub.paused)
      .reduce((s: number, sub: any) => {
        const m =
          sub.cycle === "yearly"
            ? Number(sub.amount || 0) / 12
            : sub.cycle === "quarterly"
              ? Number(sub.amount || 0) / 3
              : Number(sub.amount || 0);
        return s + m;
      }, 0);

    const liquidAssets = cashInBanks + mfValue + stockValue + prepaidValue + goldValue;
    const lockedAssets =
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      epfValue +
      licValue +
      investmentValue +
      loansGivenValue +
      informalLentValue +
      rentedDepositAsset +
      rentalPropertiesAsset +
      realEstateAsset +
      vehicleAsset +
      govtSchemesValue;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    // FOIR: total monthly EMI / monthly income -- safe lending threshold is <40%
    // Only include active loans (monthsRemaining unset OR > 0; explicitly 0 means fully paid)
    const totalMonthlyEMI = (sState.loansTaken || [])
      .filter((l: any) => Number(l.monthsRemaining ?? 1) > 0)
      .reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const foir = monthIncome > 0 ? (totalMonthlyEMI / monthIncome) * 100 : 0;

    // Credit utilization: cc outstanding / cc total limit (shared-pool deduplication)
    const activeCC = (sState.creditCards || []).filter(
      (c: any) => (c.status || "").toLowerCase() !== "closed"
    );
    const ccGroupPools: Record<string, number> = {};
    activeCC.forEach((c: any) => {
      if (c.sharedGroup) {
        ccGroupPools[c.sharedGroup] = Math.max(
          ccGroupPools[c.sharedGroup] || 0,
          Number(c.sharedGroupLimit) || 0
        );
      }
    });
    const totalCCLimit =
      activeCC
        .filter((c: any) => !c.sharedGroup)
        .reduce(
          (s: number, c: any) => s + Number((c as any).limit || (c as any).cardLimit || 0),
          0
        ) + (Object.values(ccGroupPools) as number[]).reduce((s: number, v: number) => s + v, 0);
    const creditUtilization = totalCCLimit > 0 ? (ccOutstanding / totalCCLimit) * 100 : 0;

    // Compute FY-aware tax liability with auto-detected deductions and manual overrides
    const taxDue = getTaxDueForDashboard(sState, annualIncome);

    const expenseBreakdownMap: Record<string, number> = monthTxns
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.category !== "Investment"
      )
      .reduce(
        (acc: Record<string, number>, t: any) => {
          const cat = t.category || "Uncategorized";
          acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
          return acc;
        },
        {} as Record<string, number>
      );

    // Add rental-ledger rent only when there are no "Rent"-categorised debit transactions
    // for the month. If the user already logged rent in the bank transactions tab, adding
    // rentPaidThisMonth on top would double-count the same outflow.
    if (rentPaidThisMonth > 0 && !expenseBreakdownMap["Rent"]) {
      expenseBreakdownMap["Rent"] = rentPaidThisMonth;
    }

    const expenseBreakdown = Object.keys(expenseBreakdownMap)
      .map((k) => ({
        name: k,
        value: expenseBreakdownMap[k],
      }))
      .sort((a, b) => b.value - a.value);

    const portfolioPerformance = [
      { name: "Mutual Funds", Invested: mfInvested, Current: mfValue },
      { name: "Stocks", Invested: stockInvested, Current: stockValue },
    ].filter((x) => x.Invested > 0 || x.Current > 0);

    const totalGoalTarget = sState.goals.reduce(
      (s: number, g: any) => s + Number(g.targetAmount || 0),
      0
    );
    const totalGoalSaved = sState.goals.reduce(
      (s: number, g: any) => s + Number(g.currentAmount || 0),
      0
    );
    const totalGoalRemaining = Math.max(0, totalGoalTarget - totalGoalSaved);
    const overallGoalPct = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;
    const goalsCompleted = sState.goals.filter(
      (g: any) => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)
    ).length;
    return {
      cashInBanks,
      fdValue,
      rdValue,
      bondValue,
      ppfValue,
      npsValue,
      epfValue,
      licValue,
      investmentValue,
      mfValue,
      mfInvested,
      stockValue,
      stockInvested,
      ccOutstanding,
      loansTakenValue,
      loansGivenValue,
      prepaidValue,
      rentalDepositLiability,
      rentedDepositAsset,
      govtSchemesValue,
      totalAssets,
      totalLiabilities,
      netWorth,
      monthIncome,
      monthExpense,
      annualIncome,
      subTotal,
      mfPnL: mfValue - mfInvested,
      stockPnL: stockValue - stockInvested,
      liquidAssets,
      lockedAssets,
      emergencyFund,
      realEstateAsset,
      realEstateOutstanding,
      vehicleAsset,
      informalLentValue,
      informalBorrowedValue,
      rentalPropertiesAsset,
      goldValue,
      savingsRate,
      debtToAssetRatio,
      taxDue,
      expenseBreakdown,
      portfolioPerformance,
      totalGoalTarget,
      totalGoalSaved,
      totalGoalRemaining,
      overallGoalPct,
      goalsCompleted,
      totalMonthlyEMI,
      foir,
      totalCCLimit,
      creditUtilization,
      stockSectorBreakdown: (() => {
        const sectors: Record<string, number> = {};
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const sector = md?.sector || "Others";
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;
          sectors[sector] = (sectors[sector] || 0) + value;
        });
        return Object.entries(sectors)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      })(),
      stockCapBreakdown: (() => {
        const caps: Record<string, number> = {
          "Large Cap": 0,
          "Mid Cap": 0,
          "Small Cap": 0,
          "Micro Cap": 0,
        };
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const mCap = Number(md?.marketCap || 0);
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;

          // Cap Definitions (INR)
          // 1 Cr = 10,000,000
          // Large Cap: > 20,000 Cr = 200,000,000,000
          // Mid Cap: 5,000 Cr - 20,000 Cr
          // Small Cap: 500 Cr - 5,000 Cr
          // Micro Cap: < 500 Cr
          if (mCap >= 200000000000) caps["Large Cap"] += value;
          else if (mCap >= 50000000000) caps["Mid Cap"] += value;
          else if (mCap >= 5000000000) caps["Small Cap"] += value;
          else caps["Micro Cap"] += value;
        });
        return Object.entries(caps)
          .map(([name, value]) => ({ name, value }))
          .filter((c) => c.value > 0);
      })(),
      familyBreakdown: familyProfiles.map((p) => {
        const pState = getFilteredStateForProfile(state, p.id);
        const { netWorth, totalCover } = calculateProfileNWAndCover(pState, marketData, p.id);
        return {
          ...p,
          nw: netWorth,
          totalCover,
        };
      }),
    };
    // Note: `state` itself is only used here to build `familyBreakdown` (via
    // getFilteredStateForProfile / calculateProfileNWAndCover). Narrowed to the
    // specific collections those two functions actually read, instead of the
    // whole `state` object, so this ~30-field memo doesn't re-run on every
    // unrelated state mutation elsewhere in the app.
  }, [
    filteredState,
    marketData,
    familyProfiles,
    state.bankAccounts,
    state.fixedDeposits,
    state.govtSchemes,
    state.recurringDeposits,
    state.bonds,
    state.ppf,
    state.nps,
    state.epf,
    state.lic,
    state.investmentPlans,
    state.mutualFunds,
    state.stocks,
    state.loansGiven,
    state.prepaidCards,
    state.rentedProperties,
    state.informalLent,
    state.rentalProperties,
    state.realEstateProperties,
    state.vehicles,
    state.goldHoldings,
    state.creditCards,
    state.loansTaken,
    state.informalBorrowed,
    state.realEstateDemands,
    state.realEstatePayments,
    state.termPlans,
  ]);

  const assetBreakdown = useMemo(
    () =>
      [
        { name: "Bank Cash", value: metrics.cashInBanks },
        { name: "Fixed Deposits", value: metrics.fdValue },
        { name: "Recurring Deposits", value: metrics.rdValue },
        { name: "Mutual Funds", value: metrics.mfValue },
        { name: "Stocks", value: metrics.stockValue },
        { name: "PPF", value: metrics.ppfValue },
        { name: "NPS", value: metrics.npsValue },
        { name: "EPF", value: metrics.epfValue },
        { name: "Bonds", value: metrics.bondValue },
        { name: "LIC", value: metrics.licValue },
        { name: "Investment Plans", value: metrics.investmentValue },
        { name: "Loans Given", value: metrics.loansGivenValue },
        { name: "Informal Loans Given", value: metrics.informalLentValue },
        { name: "Rental Properties", value: metrics.rentalPropertiesAsset },
        { name: "Security Deposit", value: metrics.rentedDepositAsset },
        { name: "Prepaid Cards", value: metrics.prepaidValue },
        { name: "Real Estate", value: metrics.realEstateAsset },
        { name: "Vehicles", value: metrics.vehicleAsset },
        { name: "Gold & SGBs", value: metrics.goldValue },
        { name: "Govt Schemes", value: metrics.govtSchemesValue },
      ].filter((x) => x.value > 0),
    [metrics]
  );

  // Monthly trend for last 12 months -- mirrors monthExpense by including rental payments
  const trendData = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = filteredState.transactions.filter((t: any) => t.date && t.date.startsWith(ym));
      // Mirror metrics.monthIncome: prefer explicit income ledger for this month,
      // fall back to credit transactions -- exactly the same priority as the dashboard.
      const explicitInc = (filteredState.income || [])
        .filter((inc: any) => inc.date && inc.date.startsWith(ym))
        .reduce((s: number, inc: any) => s + Number(inc.amount || 0), 0);
      const txnInc = txns
        .filter(
          (t: any) =>
            t.type === "credit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const inc = explicitInc > 0 ? explicitInc : txnInc;
      const txnExp = txns
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      // Include rent paid via rental ledger (rentedProperties.payments) so the
      // trend chart stays consistent with the monthExpense metric on the dashboard.
      const hasRentTxnTrend = txns.some((t: any) => t.type === "debit" && t.category === "Rent");
      const rentExp = hasRentTxnTrend
        ? 0
        : (filteredState.rentedProperties || []).reduce((sum: number, p: any) => {
            return (
              sum +
              (p.payments || [])
                .filter((pay: any) => pay.date && pay.date.startsWith(ym))
                .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
            );
          }, 0);
      const exp = txnExp + rentExp;
      arr.push({ month: label, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [filteredState.transactions, filteredState.rentedProperties, filteredState.income]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const name = state.profile?.name || "there";

    const todayMidnight = new Date(today() + "T00:00:00").getTime();
    const day = 86400000;
    let currentWeek = 0;
    let prevWeek = 0;
    filteredState.transactions
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.category !== "Investment" &&
          t.date
      )
      .forEach((t: any) => {
        const txMidnight = new Date(t.date + "T00:00:00").getTime();
        const diff = todayMidnight - txMidnight;
        if (diff >= 0 && diff < 7 * day) currentWeek += Number(t.amount);
        else if (diff >= 7 * day && diff < 14 * day) prevWeek += Number(t.amount);
      });

    let spendInsight = "";
    if (prevWeek > 0) {
      const pct = Math.abs((currentWeek - prevWeek) / prevWeek) * 100;
      if (currentWeek < prevWeek)
        spendInsight = `Your spending is down ${pct.toFixed(0)}% this week.`;
      else if (currentWeek > prevWeek + 500)
        spendInsight = `Your spending is up ${pct.toFixed(0)}% this week.`;
    } else if (currentWeek > 0) {
      spendInsight = `You've spent ${fmtINRFull(currentWeek)} this week.`;
    }

    return { title: `Good ${timeOfDay}, ${name}.`, subtitle: spendInsight };
  }, [filteredState.transactions, state.profile]);

  return { filteredState, metrics, assetBreakdown, trendData, greeting };
}
