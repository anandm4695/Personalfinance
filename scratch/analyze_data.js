const fs = require('fs');
const path = require('path');

// ── IST offset helpers ─────────────────────────────────────────────────────────
function nowIST() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330); // UTC+5:30
  return d;
}

function istDayOfWeek() {
  return nowIST().getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
}

function istDate() {
  return nowIST().getUTCDate();
}

function today() {
  const d = nowIST();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1);
  const b = new Date(d2);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function rdMaturity(monthly, rate, months) {
  const n = 4;
  const r = rate / 100;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const t = (months - i) / 12;
    total += monthly * Math.pow(1 + r / n, n * t);
  }
  return total;
}

function snakeToCamel(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const res = {};
  for (const k in obj) {
    const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camel] = obj[k] !== null && typeof obj[k] === "object" ? snakeToCamel(obj[k]) : obj[k];
  }
  return res;
}

const data = JSON.parse(fs.readFileSync('/Users/anandmohta/Anand Mac book/Personal/Personal Finance by Anand Mohta/scratch/demo_data_dump.json', 'utf8'));

// Format and construct state
const state = {
  bankAccounts: snakeToCamel(data.bank_accounts || []),
  transactions: snakeToCamel(data.transactions || []),
  mutualFunds: snakeToCamel(data.mutual_funds || []).map(m => ({
    ...m,
    currentNav: m.currentNav || m.buyNav // no live fetch here for now, use stored
  })),
  stocks: snakeToCamel(data.stocks || []),
  fixedDeposits: snakeToCamel(data.fixed_deposits || []),
  recurringDeposits: snakeToCamel(data.recurring_deposits || []),
  bonds: snakeToCamel(data.bonds || []),
  ppf: snakeToCamel((data.ppf_nps || []).filter(x => x.type === 'ppf')),
  nps: snakeToCamel((data.ppf_nps || []).filter(x => x.type === 'nps')),
  epf: snakeToCamel(data.epf || []), // note: table epf is empty in initial dump check
  goals: snakeToCamel(data.goals || []),
  budgets: snakeToCamel(data.budgets || []).map(b => ({
    ...b,
    monthly: b.monthlyLimit
  })),
  subscriptions: snakeToCamel(data.subscriptions || []),
  reminders: snakeToCamel(data.reminders || []),
  rentedProperties: snakeToCamel(data.rental_properties || []).filter(p => p.type === 'rented'), // wait, what type?
  rentalProperties: snakeToCamel(data.rental_properties || []).filter(p => p.type === 'rented_out' || !p.type), // let's check
  income: snakeToCamel(data.income_entries || []),
  lic: snakeToCamel(data.lic_policies || []),
  investmentPlans: snakeToCamel(data.investment_plans || []),
  prepaidCards: snakeToCamel(data.prepaid_cards || []),
  informalLent: snakeToCamel((data.informal_loans || []).filter(x => x.type === 'lent')),
  informalBorrowed: snakeToCamel((data.informal_loans || []).filter(x => x.type === 'borrowed')),
  realEstateProperties: snakeToCamel(data.real_estate_properties || []),
  realEstateDemands: snakeToCamel(data.real_estate_demands || []),
  realEstatePayments: snakeToCamel(data.real_estate_payments || []),
  vehicles: snakeToCamel(data.vehicles || []),
  goldHoldings: snakeToCamel(data.gold_holdings || []),
  govtSchemes: snakeToCamel(data.govt_schemes || []),
  creditCards: snakeToCamel(data.credit_cards || []).map(c => ({
    ...c,
    limit: c.cardLimit ?? c.limit
  }))
};

console.log("EPF count:", state.epf.length);
console.log("Rented properties count:", state.rentedProperties.length);
console.log("Rental properties count:", state.rentalProperties.length);
console.log("Informal lent count:", state.informalLent.length);
console.log("Informal borrowed count:", state.informalBorrowed.length);

// Compute using same logic
const bankTotal = state.bankAccounts.reduce((s, b) => s + (Number(b.balance) || 0), 0);
const mfTotal = state.mutualFunds.reduce((s, m) => s + Number(m.units || 0) * (Number(m.currentNav || m.buyNav || 0)), 0);
const stockTotal = state.stocks.reduce((s, st) => s + Number(st.qty || 0) * (Number(st.currentPrice || st.avgPrice || 0)), 0);
const fdTotal = state.fixedDeposits.reduce((s, x) => s + (Number(x.principal) || 0), 0);
const rdTotal = state.recurringDeposits.reduce((s, r) => {
  const elapsed = r.startDate
    ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
    : Number(r.tenureMonths || 0);
  return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
}, 0);
const ppfTotal = state.ppf.reduce((s, x) => s + (Number(x.balance) || 0), 0);
const npsTotal = state.nps.reduce((s, x) => {
  const bal = Number(x.balance) || 0;
  if (bal > 0) return s + bal;
  return s + (x.transactions || []).reduce((ss, t) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0), 0);
}, 0);
const epfTotal = 0; // epf table not in data dump list? Let's check epf balance calculation or if ppf_nps is used

const bondsTotal = state.bonds.reduce((s, b) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0), 0);
const licTotal = state.lic.reduce((s, l) => {
  const txTotal = (l.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
}, 0);
const investmentTotalPlans = state.investmentPlans.reduce((s, ip) => {
  const txTotal = (ip.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
}, 0);

const investTotal = mfTotal + stockTotal + fdTotal + rdTotal + ppfTotal + npsTotal + epfTotal + bondsTotal + licTotal + investmentTotalPlans;

console.log("\n--- INVESTMENTS DETAILS ---");
console.log("Mutual Funds:", mfTotal);
console.log("Stocks:", stockTotal);
console.log("FD:", fdTotal);
console.log("RD:", rdTotal);
console.log("PPF:", ppfTotal);
console.log("NPS:", npsTotal);
console.log("EPF:", epfTotal);
console.log("Bonds:", bondsTotal);
console.log("LIC:", licTotal);
console.log("Investment Plans:", investmentTotalPlans);
console.log("Investments Total (Computed):", investTotal);

const activeCards = state.creditCards.filter(c => (c.status || "active").toLowerCase() !== "closed");
const creditOutstanding = activeCards.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);
const ccGroupPools = {};
activeCards.forEach((c) => {
  if (c.sharedGroup) {
    ccGroupPools[c.sharedGroup] = Math.max(
      ccGroupPools[c.sharedGroup] || 0,
      Number(c.sharedGroupLimit) || 0
    );
  }
});
const creditLimit =
  activeCards
    .filter((c) => !c.sharedGroup)
    .reduce((s, c) => s + (Number(c.limit || c.cardLimit) || 0), 0) +
  Object.values(ccGroupPools).reduce((s, v) => s + v, 0);
const creditUtil = creditLimit > 0 ? Math.round((creditOutstanding / creditLimit) * 100) : 0;

console.log("\n--- CREDIT CARDS ---");
console.log("Active cards count:", activeCards.length);
activeCards.forEach(c => {
  console.log(`Issuer: ${c.issuer}, Limit: ${c.limit}, CardLimit: ${c.cardLimit}, Outstanding: ${c.outstanding}`);
});
console.log("Total Credit Limit:", creditLimit);
console.log("Total Credit Outstanding:", creditOutstanding);
console.log("Credit Util:", creditUtil);

// Let's dump all tables sizes or values to check EPF or other columns
console.log("\n--- TABLE SIZES ---");
for (const [k, v] of Object.entries(data)) {
  console.log(`${k}: ${v.length} rows`);
}
