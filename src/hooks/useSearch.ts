import { useMemo } from "react";
import { fmtINRFull, calculateEpfBalance } from "../utils/finance";

export interface SearchResult {
  type: string;
  name: string;
  detail: string;
  tab: string;
}

export function useSearch(state: any, search: string): SearchResult[] {
  return useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    const match = (v: string) => (v || "").toLowerCase().includes(q);
    const results: SearchResult[] = [];

    // Bank Accounts
    state.bankAccounts.forEach((b: any) => {
      if (match(b.bankName) || match(b.accountNumber)) {
        results.push({
          type: "Bank Account",
          name: b.bankName,
          detail: `${b.accountNumber} · ${fmtINRFull(b.balance)}`,
          tab: "banks",
        });
      }
    });
    // Transactions
    state.transactions.forEach((t: any) => {
      if (match(t.note) || match(t.category)) {
        results.push({
          type: "Transaction",
          name: t.note || t.category,
          detail: `${t.date} · ${fmtINRFull(t.amount)}`,
          tab: "banks",
        });
      }
    });
    // Stocks
    state.stocks.forEach((s: any) => {
      if (match(s.symbol) || match(s.name)) {
        results.push({
          type: "Stock",
          name: s.symbol,
          detail: fmtINRFull(Number(s.qty) * Number(s.currentPrice)),
          tab: "demat",
        });
      }
    });
    // Mutual Funds
    state.mutualFunds.forEach((m: any) => {
      const mfName = m.name || m.scheme || "";
      if (match(mfName)) {
        results.push({
          type: "Mutual Fund",
          name: mfName,
          detail: fmtINRFull(
            Number(m.units || 0) * Number(m.currentNav || 0) || Number(m.invested || 0)
          ),
          tab: "investments",
        });
      }
    });
    // Fixed Deposits
    (state.fixedDeposits || []).forEach((f: any) => {
      if (match(f.bank) || match(f.bankName)) {
        results.push({
          type: "Fixed Deposit",
          name: f.bank || f.bankName || "FD",
          detail: fmtINRFull(f.principal),
          tab: "investments",
        });
      }
    });
    // Recurring Deposits
    (state.recurringDeposits || []).forEach((r: any) => {
      if (match(r.bank) || match(r.bankName)) {
        results.push({
          type: "Recurring Deposit",
          name: r.bank || r.bankName || "RD",
          detail: `${fmtINRFull(r.monthly)}/mo`,
          tab: "investments",
        });
      }
    });
    // Bonds
    (state.bonds || []).forEach((b: any) => {
      if (match(b.name)) {
        results.push({
          type: "Bond",
          name: b.name,
          detail: fmtINRFull(b.faceValue || b.principal),
          tab: "investments",
        });
      }
    });
    // PPF
    (state.ppf || []).forEach((p: any) => {
      if (match(p.institution) || match(p.bank) || match("ppf")) {
        results.push({
          type: "PPF",
          name: p.institution || p.bank || "PPF",
          detail: fmtINRFull(p.balance),
          tab: "investments",
        });
      }
    });
    // NPS
    (state.nps || []).forEach((n: any) => {
      if (match(n.bank) || match(n.accountNumber) || match("nps")) {
        const npsBal = Number(n.balance) || 0;
        const npsTxVal =
          npsBal > 0
            ? npsBal
            : (n.transactions || []).reduce(
                (s: number, t: any) =>
                  s + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
                0
              );
        results.push({
          type: "NPS",
          name: n.bank || "NPS",
          detail: fmtINRFull(npsTxVal),
          tab: "investments",
        });
      }
    });
    // EPF
    (state.epf || []).forEach((e: any) => {
      if (match(e.employer) || match(e.bank) || match("epf") || match("pf")) {
        results.push({
          type: "EPF",
          name: e.employer || e.bank || "EPF",
          detail: fmtINRFull(calculateEpfBalance(e)),
          tab: "investments",
        });
      }
    });
    // Goals
    state.goals.forEach((g: any) => {
      if (match(g.name)) {
        results.push({
          type: "Goal",
          name: g.name,
          detail: `${fmtINRFull(g.currentAmount)} / ${fmtINRFull(g.targetAmount)}`,
          tab: "goals",
        });
      }
    });
    // Credit Cards
    state.creditCards.forEach((c: any) => {
      if (match(c.issuer) || (c.last4 || "").includes(q)) {
        results.push({
          type: "Credit Card",
          name: c.issuer,
          detail: `**** ${c.last4} · ${fmtINRFull(c.outstanding)}`,
          tab: "credit",
        });
      }
    });
    // Prepaid Cards
    (state.prepaidCards || []).forEach((p: any) => {
      if (match(p.cardName) || match(p.cardType) || (p.last4 || "").includes(q)) {
        const txns = p.transactions || [];
        const loaded = txns
          .filter((t: any) => t.type === "load")
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        const spent = txns
          .filter((t: any) => t.type === "spend")
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        results.push({
          type: "Prepaid Card",
          name: p.cardName || p.cardType || "Prepaid",
          detail: `**** ${p.last4 || ""} · ${fmtINRFull(loaded - spent)}`,
          tab: "credit",
        });
      }
    });
    // Loans Taken
    state.loansTaken.forEach((l: any) => {
      if (match(l.lender) || match(l.type)) {
        results.push({
          type: "Loan Taken",
          name: l.lender,
          detail: `${l.type} · ${fmtINRFull(l.outstanding)}`,
          tab: "credit",
        });
      }
    });
    // Loans Given
    (state.loansGiven || []).forEach((l: any) => {
      if (match(l.lender) || match(l.name)) {
        results.push({
          type: "Loan Given",
          name: l.lender || l.name,
          detail: fmtINRFull(l.outstanding),
          tab: "credit",
        });
      }
    });
    // Informal Borrowed
    (state.informalBorrowed || []).forEach((p: any) => {
      if (match(p.name)) {
        const total = (p.tranches || []).reduce(
          (s: number, t: any) => s + Number(t.amount || 0),
          0
        );
        results.push({
          type: "Borrowed From",
          name: p.name,
          detail: fmtINRFull(total),
          tab: "credit",
        });
      }
    });
    // Informal Lent
    (state.informalLent || []).forEach((p: any) => {
      if (match(p.name)) {
        const total = (p.tranches || []).reduce(
          (s: number, t: any) => s + Number(t.amount || 0),
          0
        );
        results.push({ type: "Lent To", name: p.name, detail: fmtINRFull(total), tab: "credit" });
      }
    });
    // Subscriptions
    state.subscriptions.forEach((s: any) => {
      if (match(s.name)) {
        results.push({
          type: "Subscription",
          name: s.name,
          detail: `${fmtINRFull(s.amount)} / ${s.cycle || s.billingCycle || "monthly"}`,
          tab: "subs",
        });
      }
    });
    // SIPs
    (state.sips || []).forEach((s: any) => {
      if (match(s.scheme) || match(s.name)) {
        results.push({
          type: "SIP",
          name: s.scheme || s.name,
          detail: `${fmtINRFull(s.amount)}/${s.frequency === "quarterly" ? "qtr" : "mo"}`,
          tab: "sip",
        });
      }
    });
    // Insurance (LIC + Term Plans)
    (state.lic || []).forEach((l: any) => {
      if (match(l.planName) || match(l.name)) {
        results.push({
          type: "Insurance (LIC)",
          name: l.planName || l.name,
          detail: fmtINRFull(l.sumAssured || l.coverAmount),
          tab: "insurance",
        });
      }
    });
    (state.termPlans || []).forEach((t: any) => {
      if (match(t.planName) || match(t.name)) {
        results.push({
          type: "Term Plan",
          name: t.planName || t.name || "Term Plan",
          detail: fmtINRFull(t.coverAmount || t.sumAssured),
          tab: "insurance",
        });
      }
    });
    // Rental Properties (owned)
    (state.rentalProperties || []).forEach((p: any) => {
      if (match(p.propertyName) || match(p.tenantName)) {
        results.push({
          type: "Rental Property",
          name: p.propertyName,
          detail: fmtINRFull(p.monthlyRent),
          tab: "rental",
        });
      }
    });
    // Rented Properties (tenant)
    (state.rentedProperties || []).forEach((p: any) => {
      if (match(p.propertyName) || match(p.landlordName)) {
        results.push({
          type: "Rented Property",
          name: p.propertyName || "Rented",
          detail: fmtINRFull(p.monthlyRent),
          tab: "rental",
        });
      }
    });
    // Real Estate
    (state.realEstateProperties || []).forEach((p: any) => {
      if (match(p.name)) {
        results.push({
          type: "Real Estate",
          name: p.name,
          detail: fmtINRFull(p.currentValue || p.purchasePrice),
          tab: "realestate",
        });
      }
    });
    // Vehicles
    (state.vehicles || []).forEach((v: any) => {
      const vName = `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle";
      if (match(v.make) || match(v.model) || match(v.registrationNumber)) {
        results.push({
          type: "Vehicle",
          name: vName,
          detail: v.registrationNumber || "",
          tab: "vehicles",
        });
      }
    });
    // Reminders
    (state.reminders || []).forEach((r: any) => {
      if (match(r.title) || match(r.note)) {
        results.push({
          type: "Reminder",
          name: r.title,
          detail: r.dueDate || "",
          tab: "reminders",
        });
      }
    });
    return results.slice(0, 15);
  }, [search, state]);
}
