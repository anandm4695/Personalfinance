/**
 * Reconstructs net worth as of a past month from each asset's own dated
 * records, instead of relying on frozen monthly snapshots (state.netWorthHistory).
 *
 * Mirrors the category formulas in the canonical `metrics` useMemo
 * (src/hooks/useMetrics.ts:301-524) one-for-one, adding a month cutoff to
 * each category based on whatever date field that entity actually has:
 *
 * - Tier 1 (ledger-based): filter the entity's own dated transaction/lot
 *   array by `date <= asOfYm`.
 * - Tier 2 (single current-value field with an unused start/purchase/open/
 *   order date): gate inclusion by that date; the value itself still uses
 *   today's number since no historical value series exists.
 * - Tier 3 (no date data anywhere on the entity): included at full current
 *   value for every past month — same as today's behavior, and a real
 *   limitation until those entities gain a date field.
 *
 * Known limitations (see plan doc for full detail):
 * - Stocks/MF/Gold: only the *timing* of a holding is reconstructed. The
 *   value at any past month still uses today's price/NAV/gold rate, because
 *   no historical price series exists anywhere in this app.
 * - EPF/LIC/Investment Plans/NPS records with no transaction ledger at all
 *   fall back to a static field (balance/premiumPaid) with no date to gate
 *   on, so those specific records behave like Tier 3 regardless of category.
 * - A record missing its gating date field is never excluded (conservative
 *   default) — it's included for every month, same as Tier 3.
 */

import { monthsBetween, rdMaturity, calculateEpfBalance, today } from "./finance";

function ym(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Include unless the record has a date AND that date is strictly after asOfYm. */
function gateInclude(dateStr: string | undefined | null, asOfYm: string): boolean {
  if (!dateStr) return true;
  return ym(dateStr) <= asOfYm;
}

// Sentinel owner id for a co-owner who isn't one of this household's tracked
// family profiles — see EXTERNAL_OWNER_ID in useMetrics.ts / RealEstateTab.tsx.
const EXTERNAL_OWNER_ID = "external";

/** Fraction of a property's value attributable to this household, excluding
 * any share held by an untracked "external" co-owner. Mirrors
 * `realEstateTrackedShare` in useMetrics.ts — kept in sync so this
 * reconstruction matches the canonical current-month net worth figure. */
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

/** Single family profile's own share, mirroring `realEstateShareForOwner` in useMetrics.ts.
 * Without this, a single-profile view (activeProfile !== "all") would fall through to
 * realEstateTrackedShare and show the WHOLE household's combined share of a jointly-owned
 * property under one member's individual net worth, instead of just their own slice. */
function realEstateShareForOwner(property: any, profileId: string): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === profileId);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === profileId ? 1 : 0;
}

function nextYm(ymStr: string): string {
  const [y, m] = ymStr.split("-").map(Number);
  const d = new Date(y, m, 1); // m is already 1-indexed month -> +1 month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsAgoYm(fromYm: string, n: number): string {
  const [y, m] = fromYm.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Stock / MF price resolution ────────────────────────────────────────────
// Currently-held rows can use the same live-price fallback chain metrics.ts
// uses. Sold-and-added-back rows (from stockSells/mfSells) only ever carry
// buyPrice/buyNav — they never had a currentPrice/currentNav field.

function stockPriceHeld(st: any, marketData: any): number {
  const yfSym = `${String(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
  const md = marketData?.[yfSym];
  const livePrice = md?.price ?? Number(st.currentPrice || 0);
  return livePrice || Number(st.avgPrice || 0);
}

function stockPriceSold(sell: any, marketData: any): number {
  const yfSym = `${String(sell.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(sell.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
  const md = marketData?.[yfSym];
  const livePrice = md?.price ?? 0;
  return livePrice || Number(sell.buyPrice || 0);
}

function mfNavHeld(m: any): number {
  return (
    Number(m.currentNav || 0) ||
    Number(m.buyNav || 0) ||
    (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0)
  );
}

function mfNavSold(sell: any): number {
  return Number(sell.buyNav || 0);
}

export interface NetWorthAsOfResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: { name: string; value: number }[];
}

export function computeNetWorthAsOf(
  filteredState: any,
  asOfYm: string,
  marketData: any,
  profileId?: string
): NetWorthAsOfResult {
  const s = filteredState;

  // Tier 3 — no date data on the entity at all.
  const cashInBanks = (s.bankAccounts || []).reduce(
    (sum: number, a: any) => sum + Number(a.balance || 0),
    0
  );
  const loansGivenValue = (s.loansGiven || []).reduce(
    (sum: number, l: any) => sum + Number(l.outstanding || 0),
    0
  );
  const loansTakenValue = (s.loansTaken || []).reduce(
    (sum: number, l: any) => sum + Number(l.outstanding || 0),
    0
  );
  const rentalPropertiesAsset = (s.rentalProperties || []).reduce(
    (sum: number, r: any) => sum + Number(r.propertyValue || 0),
    0
  );

  // Tier 2 — single current value, gated by an unused start/purchase/open/order date.
  const fdValue = (s.fixedDeposits || [])
    .filter((f: any) => gateInclude(f.startDate, asOfYm))
    .reduce((sum: number, f: any) => sum + Number(f.principal || 0), 0);

  const govtSchemesValue = (s.govtSchemes || [])
    .filter((sc: any) => gateInclude(sc.startDate, asOfYm))
    .reduce((sum: number, sc: any) => sum + Number(sc.currentBalance || 0), 0);

  const bondValue = (s.bonds || [])
    .filter((b: any) => gateInclude(String(b.orderDate || "").trim(), asOfYm))
    .reduce(
      (sum: number, b: any) =>
        sum + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
      0
    );

  const ppfValue = (s.ppf || [])
    .filter((p: any) => gateInclude(p.startDate || p.openDate, asOfYm))
    .reduce((sum: number, p: any) => sum + Number(p.balance || 0), 0);

  const vehicleAsset = (s.vehicles || [])
    .filter((v: any) => gateInclude(v.purchaseDate, asOfYm))
    .reduce((sum: number, v: any) => sum + Number(v.currentValue || v.purchasePrice || 0), 0);

  const goldPrice = (() => {
    try {
      return Number(localStorage.getItem("gold_price_per_gram")) || 7200;
    } catch {
      return 7200;
    }
  })();
  const PURITY_FACTOR: Record<string, number> = {
    "24K": 1,
    "22K": 22 / 24,
    "18K": 18 / 24,
    "14K": 14 / 24,
  };
  const goldValue = (s.goldHoldings || [])
    .filter((h: any) => gateInclude(h.purchaseDate, asOfYm))
    .reduce((sum: number, h: any) => {
      const grams = Number(h.grams || 0);
      const purityMul = h.type === "physical" ? PURITY_FACTOR[h.purity] || 1 : 1;
      return sum + grams * goldPrice * purityMul;
    }, 0);

  const realEstateAsset = (s.realEstateProperties || [])
    .filter((p: any) => p.status !== "sold")
    .filter((p: any) => gateInclude(p.purchaseDate, asOfYm))
    .reduce((sum: number, p: any) => {
      const share =
        profileId && profileId !== "all"
          ? realEstateShareForOwner(p, profileId)
          : realEstateTrackedShare(p);
      return sum + Number(p.marketValue || p.agreementValue || 0) * share;
    }, 0);

  // A currently-"closed" card must still count as a liability for months before it
  // closed. Gate by closedDate (not the live status field) whenever we have it; a
  // closed card with no closedDate on record has no date to reconstruct from, so it's
  // excluded for every month — the one case where "closed" status alone still governs,
  // needed to keep this in sync with metrics.ts's current-month calculation.
  const ccOutstanding = (s.creditCards || [])
    .filter((c: any) => {
      const isClosed = (c.status || "").toLowerCase() === "closed";
      if (!isClosed) return true;
      if (!c.closedDate) return false;
      return ym(c.closedDate) > asOfYm;
    })
    .reduce((sum: number, c: any) => sum + Number(c.outstanding || 0), 0);

  // Tier 1 — ledger-based, filter dated entries by <= asOfYm.
  const rdValue = (s.recurringDeposits || []).reduce((sum: number, r: any) => {
    if (!r.startDate) {
      return sum + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), Number(r.tenureMonths || 0));
    }
    if (ym(r.startDate) > asOfYm) return sum; // not opened yet as of this month
    const elapsed = Math.min(
      Number(r.tenureMonths || 0),
      Math.max(0, monthsBetween(r.startDate, `${asOfYm}-01`))
    );
    return sum + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  }, 0);

  const npsValue = (s.nps || []).reduce((sum: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return sum + bal; // static balance field, ungateable (Tier 3 within this category)
    const txTotal = (n.transactions || [])
      .filter((t: any) => gateInclude(t.date, asOfYm))
      .reduce(
        (ss: number, t: any) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      );
    return sum + txTotal;
  }, 0);

  const epfValue = (s.epf || []).reduce(
    (sum: number, e: any) => sum + calculateEpfBalance(e, asOfYm),
    0
  );

  const licValue = (s.lic || []).reduce((sum: number, l: any) => {
    const txns = (l.transactions || []).filter((t: any) => gateInclude(t.date, asOfYm));
    const txTotal = txns.reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
    return sum + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);

  const investmentValue = (s.investmentPlans || []).reduce((sum: number, ip: any) => {
    const txns = (ip.transactions || []).filter((t: any) => gateInclude(t.date, asOfYm));
    const txTotal = txns.reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
    return sum + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
  }, 0);

  const prepaidValue = (s.prepaidCards || [])
    .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
    .reduce((sum: number, p: any) => {
      const txns = (p.transactions || []).filter((t: any) => gateInclude(t.date, asOfYm));
      const loaded = txns
        .filter((t: any) => t.type === "load")
        .reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t: any) => t.type === "spend")
        .reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
      return sum + (loaded - spent);
    }, 0);

  const rentalDepositLiability = (s.rentalProperties || []).reduce((sum: number, p: any) => {
    const depTx = (p.depositTransactions || []).filter((t: any) => gateInclude(t.date, asOfYm));
    const actualDeposit =
      depTx.length > 0
        ? depTx.reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const deducted = (p.depositDeductions || [])
      .filter((d: any) => gateInclude(d.date, asOfYm))
      .reduce((ss: number, d: any) => ss + Number(d.amount || 0), 0);
    const returned = Number(p.depositReturned || 0);
    return sum + Math.max(0, actualDeposit - deducted - returned);
  }, 0);

  const rentedDepositAsset = (s.rentedProperties || []).reduce((sum: number, p: any) => {
    const depTx = (p.depositTransactions || []).filter((t: any) => gateInclude(t.date, asOfYm));
    const actualDeposit =
      depTx.length > 0
        ? depTx.reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const returned = Number(p.depositReturned || 0);
    return sum + Math.max(0, actualDeposit - returned);
  }, 0);

  const informalLentValue = (s.informalLent || []).reduce((sum: number, person: any) => {
    const totalT = (person.tranches || [])
      .filter((t: any) => gateInclude(t.date, asOfYm))
      .reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
    const totalP = (person.payments || [])
      .filter((p: any) => gateInclude(p.date, asOfYm))
      .reduce((ss: number, p: any) => ss + Number(p.amount || 0), 0);
    return sum + Math.max(0, totalT - totalP);
  }, 0);

  const informalBorrowedValue = (s.informalBorrowed || []).reduce((sum: number, person: any) => {
    const totalT = (person.tranches || [])
      .filter((t: any) => gateInclude(t.date, asOfYm))
      .reduce((ss: number, t: any) => ss + Number(t.amount || 0), 0);
    const totalP = (person.payments || [])
      .filter((p: any) => gateInclude(p.date, asOfYm))
      .reduce((ss: number, p: any) => ss + Number(p.amount || 0), 0);
    return sum + Math.max(0, totalT - totalP);
  }, 0);

  const realEstateOutstanding = (() => {
    const ucIds = new Set(
      (s.realEstateProperties || [])
        .filter((p: any) => p.status === "under-construction")
        .map((p: any) => p.id)
    );
    const demanded = (s.realEstateDemands || [])
      .filter((d: any) => ucIds.has(d.propertyId))
      .filter((d: any) => gateInclude(d.demandDate || d.dueDate, asOfYm))
      .reduce((sum: number, d: any) => sum + Number(d.totalAmount || d.amount || 0), 0);
    const paid = (s.realEstatePayments || [])
      .filter((p: any) => ucIds.has(p.propertyId))
      .filter((p: any) => gateInclude(p.paymentDate || p.date, asOfYm))
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    return Math.max(0, demanded - paid);
  })();

  // Stocks — held rows bought by asOfYm, plus sold rows bought by asOfYm but not yet sold by then.
  const stockValue =
    (s.stocks || [])
      .filter((st: any) => gateInclude(st.buyDate, asOfYm))
      .reduce((sum: number, st: any) => sum + Number(st.qty || 0) * stockPriceHeld(st, marketData), 0) +
    (s.stockSells || [])
      .filter((sell: any) => sell.buyDate && ym(sell.buyDate) <= asOfYm)
      .filter((sell: any) => sell.sellDate && ym(sell.sellDate) > asOfYm)
      .reduce(
        (sum: number, sell: any) => sum + Number(sell.qty || 0) * stockPriceSold(sell, marketData),
        0
      );

  // Mutual Funds — same reconstruction as stocks, via units/NAV.
  const mfValue =
    (s.mutualFunds || [])
      .filter((m: any) => gateInclude(m.buyDate, asOfYm))
      .reduce((sum: number, m: any) => sum + Number(m.units || 0) * mfNavHeld(m), 0) +
    (s.mfSells || [])
      .filter((sell: any) => sell.buyDate && ym(sell.buyDate) <= asOfYm)
      .filter((sell: any) => sell.sellDate && ym(sell.sellDate) > asOfYm)
      .reduce((sum: number, sell: any) => sum + Number(sell.units || 0) * mfNavSold(sell), 0);

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

  const assetBreakdown = [
    { name: "Bank Cash", value: cashInBanks },
    { name: "Fixed Deposits", value: fdValue },
    { name: "Recurring Deposits", value: rdValue },
    { name: "Mutual Funds", value: mfValue },
    { name: "Stocks", value: stockValue },
    { name: "PPF", value: ppfValue },
    { name: "NPS", value: npsValue },
    { name: "EPF", value: epfValue },
    { name: "Bonds", value: bondValue },
    { name: "LIC", value: licValue },
    { name: "Investment Plans", value: investmentValue },
    { name: "Loans Given", value: loansGivenValue },
    { name: "Informal Loans Given", value: informalLentValue },
    { name: "Rental Properties", value: rentalPropertiesAsset },
    { name: "Security Deposit", value: rentedDepositAsset },
    { name: "Prepaid Cards", value: prepaidValue },
    { name: "Real Estate", value: realEstateAsset },
    { name: "Vehicles", value: vehicleAsset },
    { name: "Gold & SGBs", value: goldValue },
    { name: "Govt Schemes", value: govtSchemesValue },
  ].filter((x) => x.value > 0);

  return { totalAssets, totalLiabilities, netWorth, assetBreakdown };
}

const MIN_LOOKBACK_MONTHS = 12;

/**
 * Earliest month with any dated record this module gates on, floored at
 * today - 12mo (so there's always at least a year of history even if every
 * record is recent). No upper limit on how far back a genuine record can
 * push this — a user's real PPF/EPF/LIC/real-estate dates can legitimately
 * predate any fixed cutoff. Falls back to 12 months back if no dated field
 * exists anywhere in the user's data.
 */
export function getEarliestNetWorthMonth(filteredState: any): string {
  const s = filteredState;
  const todayYm = ym(today());
  const dates: string[] = [];
  const pushAll = (arr: any[] | undefined, ...fields: string[]) => {
    (arr || []).forEach((item: any) => {
      for (const f of fields) {
        if (item?.[f]) dates.push(String(item[f]));
      }
    });
  };
  const pushNested = (arr: any[] | undefined, nestedKey: string, ...fields: string[]) => {
    (arr || []).forEach((item: any) => pushAll(item?.[nestedKey], ...fields));
  };

  pushAll(s.fixedDeposits, "startDate");
  pushAll(s.govtSchemes, "startDate");
  pushAll(s.bonds, "orderDate");
  pushAll(s.ppf, "startDate", "openDate");
  pushAll(s.vehicles, "purchaseDate");
  pushAll(s.goldHoldings, "purchaseDate");
  pushAll(s.realEstateProperties, "purchaseDate");
  pushAll(s.creditCards, "closedDate");
  pushAll(s.recurringDeposits, "startDate");
  pushAll(s.stocks, "buyDate");
  pushAll(s.stockSells, "buyDate", "sellDate");
  pushAll(s.mutualFunds, "buyDate");
  pushAll(s.mfSells, "buyDate", "sellDate");
  pushNested(s.nps, "transactions", "date");
  pushNested(s.epf, "transactions", "date");
  pushNested(s.lic, "transactions", "date");
  pushNested(s.investmentPlans, "transactions", "date");
  pushNested(s.prepaidCards, "transactions", "date");
  pushNested(s.rentalProperties, "depositTransactions", "date");
  pushNested(s.rentalProperties, "depositDeductions", "date");
  pushNested(s.rentedProperties, "depositTransactions", "date");
  pushNested(s.informalLent, "tranches", "date");
  pushNested(s.informalLent, "payments", "date");
  pushNested(s.informalBorrowed, "tranches", "date");
  pushNested(s.informalBorrowed, "payments", "date");
  pushAll(s.realEstateDemands, "demandDate", "dueDate");
  pushAll(s.realEstatePayments, "paymentDate", "date");

  const valid = dates
    .map((d) => (d && /^\d{4}-\d{2}/.test(d) ? ym(d) : null))
    .filter((v): v is string => !!v);

  if (valid.length === 0) return monthsAgoYm(todayYm, MIN_LOOKBACK_MONTHS);

  const earliest = valid.reduce((min, v) => (v < min ? v : min), valid[0]);
  const ceiling = monthsAgoYm(todayYm, MIN_LOOKBACK_MONTHS);
  if (earliest > ceiling) return ceiling;
  return earliest;
}

export { nextYm };
