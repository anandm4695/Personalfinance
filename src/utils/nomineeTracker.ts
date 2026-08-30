// Shared nominee-coverage scanning logic — the single source of truth for
// "which assets have a nominee assigned" used by both NomineeTrackerTab (the
// full Will & Nominee Tracker) and AnalyticsTab's dashboard widget. Previously
// each screen had its own independent copy of this list with different asset
// coverage, so the two screens showed different coverage percentages for the
// same data. Keep them pointed at this file so they can never diverge again.
import {
  fmtINRFull,
  today,
  monthsBetween,
  rdMaturity,
  calculateEpfBalance,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
} from "./finance";

export interface AssetTypeConfig {
  key: string;
  label: string;
  nameField: string;
  valueField: string | null;
  calcValue?: (a: any, state?: any) => number;
  idLabel: (a: any) => string;
}

// In India, a nominee is registered once per demat account (covering every
// stock held in it) and once per mutual fund folio (covering every scheme
// under that folio) — never per individual stock or scheme. So stocks roll
// up into their demat account, and mutual fund schemes roll up into their
// folio group, instead of each getting their own nominee entry. Demat and
// mutual funds are handled separately below (not in this list) because of
// that roll-up.
export const assetTypes: AssetTypeConfig[] = [
  {
    key: "bankAccounts",
    label: "Bank Account",
    nameField: "bankName",
    valueField: "balance",
    idLabel: (a: any) => a.accountNumber || "",
  },
  {
    key: "fixedDeposits",
    label: "Fixed Deposit",
    nameField: "bank",
    valueField: "principal",
    idLabel: (a: any) => `${fmtINRFull(a.principal)} @ ${a.rate}%`,
  },
  {
    key: "recurringDeposits",
    label: "Recurring Deposit",
    nameField: "bank",
    valueField: null,
    calcValue: (a: any) => {
      const elapsed = a.startDate
        ? Math.min(Number(a.tenureMonths || 0), Math.max(0, monthsBetween(a.startDate, today())))
        : Number(a.tenureMonths || 0);
      return rdMaturity(Number(a.monthly || 0), Number(a.rate || 0), elapsed);
    },
    idLabel: (a: any) => `${fmtINRFull(a.monthly)}/mo`,
  },
  {
    key: "bonds",
    label: "Bond",
    nameField: "name",
    valueField: null,
    calcValue: (a: any) =>
      Number(a.totalInvestmentAmount || a.totalPrincipalAmount || a.faceValue || 0),
    idLabel: (a: any) => a.isin || "",
  },
  {
    key: "goldHoldings",
    label: "Gold / SGB",
    nameField: "type",
    valueField: null,
    calcValue: (a: any, state?: any) => {
      const grams = Number(a.grams || 0);
      if (grams > 0) {
        const goldPrice = getGoldPricePerGram(state);
        const purityMul = a.type === "physical" ? GOLD_PURITY_FACTOR[a.purity] || 1 : 1;
        return grams * goldPrice * purityMul;
      }
      return Number(a.currentValue || a.investedAmount || 0);
    },
    idLabel: (a: any) => a.subType || a.form || "",
  },
  {
    key: "ppf",
    label: "PPF",
    nameField: "institution",
    valueField: "balance",
    idLabel: (a: any) => a.accountNumber || "",
  },
  {
    key: "nps",
    label: "NPS",
    nameField: "fundManager",
    valueField: null,
    calcValue: (a: any) => {
      const bal = Number(a.balance) || 0;
      if (bal > 0) return bal;
      return (a.transactions || []).reduce(
        (s: number, t: any) =>
          s + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      );
    },
    idLabel: (a: any) => a.pran || "",
  },
  {
    key: "epf",
    label: "EPF",
    nameField: "employer",
    valueField: null,
    calcValue: (a: any) => calculateEpfBalance(a),
    idLabel: (a: any) => a.uan || "",
  },
  {
    key: "lic",
    label: "LIC Policy",
    nameField: "planName",
    valueField: "sumAssured",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "termPlans",
    label: "Term Plan",
    nameField: "insurer",
    valueField: "coverAmount",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "investmentPlans",
    label: "Investment Plan",
    nameField: "insurer",
    valueField: "sumAssured",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "realEstateProperties",
    label: "Real Estate",
    nameField: "name",
    valueField: "marketValue",
    idLabel: (a: any) => a.location || "",
  },
  {
    key: "vehicles",
    label: "Vehicle",
    nameField: "name",
    valueField: "currentValue",
    idLabel: (a: any) => a.registration || "",
  },
  {
    key: "govtSchemes",
    label: "Govt Scheme",
    nameField: "schemeName",
    valueField: null,
    calcValue: (a: any) => Number(a.currentBalance || 0),
    idLabel: (a: any) => a.accountNumber || a.schemeType || "",
  },
];

// Groups asset types into sections for the tracker UI. Stocks and mutual
// fund schemes are deliberately absent here — they're not nominee-able on
// their own (see flattenAssets below).
export const CATEGORY_MAP: Record<string, string> = {
  bankAccounts: "Bank & Deposits",
  fixedDeposits: "Bank & Deposits",
  recurringDeposits: "Bank & Deposits",
  demat: "Investments",
  mutualFunds: "Investments",
  bonds: "Investments",
  goldHoldings: "Investments",
  ppf: "Retirement",
  nps: "Retirement",
  epf: "Retirement",
  lic: "Insurance",
  termPlans: "Insurance",
  investmentPlans: "Insurance",
  realEstateProperties: "Property & Vehicles",
  vehicles: "Property & Vehicles",
  govtSchemes: "Govt Schemes",
};
export const CATEGORY_ORDER = [
  "Bank & Deposits",
  "Investments",
  "Retirement",
  "Insurance",
  "Govt Schemes",
  "Property & Vehicles",
];

export const RELATION_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];

export interface FlatAsset {
  key: string;
  label: string;
  id: string;
  ids: string[];
  name: string;
  identifier: string;
  value: number;
  nominee: string;
  nomineeRelation: string;
  covered: boolean;
  category: string;
}

export function flattenAssets(state: any): FlatAsset[] {
  const result: FlatAsset[] = [];

  for (const at of assetTypes) {
    const items = state[at.key] || [];
    for (const item of items) {
      const val = at.valueField
        ? Number(item[at.valueField]) || 0
        : at.calcValue
          ? at.calcValue(item, state)
          : 0;
      result.push({
        key: at.key,
        label: at.label,
        id: item.id,
        ids: [item.id],
        name: item[at.nameField] || at.label,
        identifier: at.idLabel(item),
        value: val,
        nominee: item.nominee || "",
        nomineeRelation: item.nomineeRelation || "",
        covered: !!(item.nominee && item.nominee.trim()),
        category: CATEGORY_MAP[at.key] || "Other",
      });
    }
  }

  // Demat accounts — nominee lives on the account; its value is every
  // linked stock holding's current value.
  const stocks = state.stocks || [];
  for (const d of state.demat || []) {
    const linkedStocks = stocks.filter((s: any) => s.dematId === d.id);
    const val = linkedStocks.reduce(
      (s: number, st: any) =>
        s + (Number(st.qty) || 0) * (Number(st.currentPrice || st.avgPrice) || 0),
      0
    );
    result.push({
      key: "demat",
      label: "Demat Account",
      id: d.id,
      ids: [d.id],
      name: d.broker || "Demat Account",
      identifier: d.accountId || d.dpId || "",
      value: val,
      nominee: d.nominee || "",
      nomineeRelation: d.nomineeRelation || "",
      covered: !!(d.nominee && d.nominee.trim()),
      category: "Investments",
    });
  }

  // Mutual funds — nominee lives on the folio (one folio = one AMC
  // enrollment); schemes without a folio number can't be safely grouped, so
  // each stays its own entry until a folio is recorded.
  const mfGroups: Record<string, any[]> = {};
  for (const mf of state.mutualFunds || []) {
    const folio = (mf.folioNumber || "").trim();
    const groupKey = folio ? `folio:${folio}` : `item:${mf.id}`;
    (mfGroups[groupKey] = mfGroups[groupKey] || []).push(mf);
  }
  for (const groupKey of Object.keys(mfGroups)) {
    const items = mfGroups[groupKey];
    const withNominee = items.find((m) => m.nominee && m.nominee.trim());
    const rep = withNominee || items[0];
    const val = items.reduce(
      (s, m) => s + (Number(m.units) || 0) * (Number(m.currentNav || m.buyNav) || 0),
      0
    );
    const schemeNames = Array.from(new Set(items.map((m) => m.name).filter(Boolean)));
    result.push({
      key: "mutualFunds",
      label: "Mutual Fund",
      id: groupKey,
      ids: items.map((m) => m.id),
      name:
        schemeNames.length > 1
          ? `${schemeNames[0]} +${schemeNames.length - 1} more`
          : schemeNames[0] || "Mutual Fund",
      identifier: rep.folioNumber ? `Folio ${rep.folioNumber}` : "",
      value: val,
      nominee: rep.nominee || "",
      nomineeRelation: rep.nomineeRelation || "",
      covered: !!(rep.nominee && rep.nominee.trim()),
      category: "Investments",
    });
  }

  return result;
}
