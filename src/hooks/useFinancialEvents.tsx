// @ts-nocheck
import { useMemo } from "react";
import {
  Landmark,
  Repeat,
  FileText,
  Coins,
  Heart,
  CreditCard,
  Users,
  Bell,
  Star,
  Building2,
  Wallet,
  Car,
  Wrench,
  Milestone,
  Shield,
} from "lucide-react";
import { THEME } from "../utils/constants";
import {
  fmtINRExact,
  today,
  fdMaturity,
  rdMaturity,
  nextAnnualOccurrence,
  addMonthsToDateStr,
  annualizePremium,
  getCCDueDate,
  getEffectiveRent,
} from "../utils/finance";
import { SCHEME_RULES, projectSchemeValue } from "../utils/govtSchemes";
import { Money } from "../components/ui/Money";
import { dueStatus } from "../utils/dueStatus";

/**
 * Single source of truth for "what financial events/payments are coming up" —
 * extracted verbatim from FinancialCalendarTab and PaymentCalendarTab (Phase 1
 * of the alerts/reminders consolidation plan). Two purpose-shaped exports, not
 * one unified shape: milestone events carry presentation (icon/color/JSX
 * detail) for the dismissible list view; recurring payments are plain data for
 * month-grid plotting. Behavior is unchanged from the original inline
 * computations — this is relocation, not a rewrite. `useMilestoneEvents`
 * still takes an explicit `cutoffDate` rather than being horizon-agnostic
 * (matches the original component exactly); callers that want "everything,
 * no horizon" can pass a far-future date. Later phases point
 * useAlerts.ts/useNotifications.ts at these same two hooks instead of each
 * recomputing the same walks over `state` independently — see the published
 * scoping report for the full plan.
 */

// Duplicated (not imported) from FinancialCalendarTab.tsx, which still needs
// its own copies for rendering (formatDate/MONTH_NAMES appear in JSX outside
// the extracted block) — importing from a component file back into this hook
// would invert the dependency direction. Tiny, business-logic-free helpers,
// not the kind of duplication worth centralizing further.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getDaysUntil = (dateStr) => {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date(today() + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

export function useMilestoneEvents(state: any, cutoffDate: string) {
  return useMemo(() => {
    const items = [];
    const todayStr = today();
    // `cutoffDate` (computed above from the selected horizon, with proper
    // month-length clamping) is the real end of the forecast window. Every
    // block below filters `dateStr <= cutoffDate` — a plain ISO "YYYY-MM-DD"
    // string comparison is safe because lexicographic order matches
    // chronological order for that format. Previously this variable was
    // computed but never used, and every block instead filtered on
    // `days <= horizon * 31 + 10`, a crude padded approximation that could
    // over- or under-shoot the real N-month boundary by over a week.
    // Overdue events (dateStr in the past) always satisfy `<= cutoffDate`
    // too, so they keep showing regardless of the selected horizon.

    // FD Maturities
    (state.fixedDeposits || []).forEach((fd) => {
      if (!fd.maturityDate) return;
      if (fd.maturityDate > cutoffDate) return;
      const days = getDaysUntil(fd.maturityDate);
      const tenureYears =
        Number(fd.years || 0) ||
        (fd.startDate && fd.maturityDate
          ? Math.max(
              0,
              (new Date(fd.maturityDate).getTime() - new Date(fd.startDate).getTime()) /
                (365.25 * 24 * 3600 * 1000)
            )
          : 0);
      const maturityAmt =
        fdMaturity && tenureYears > 0
          ? fdMaturity(Number(fd.principal || 0), Number(fd.rate || 0), tenureYears)
          : Number(fd.principal || 0) * (1 + Number(fd.rate || 0) / 100);
      items.push({
        id: `fd_maturity_${fd.id || fd.maturityDate}`,
        type: "fd_maturity",
        source: fd,
        category: "Fixed Deposit",
        icon: Landmark,
        // Amount deliberately NOT embedded in the plain-text `name` (rendered
        // unmasked as the card title) — it's already shown correctly masked via
        // <Money> in the amount column and in `detail` below; embedding it here too
        // would leak the principal in Privacy Mode.
        name: fd.bank || "FD",
        date: fd.maturityDate,
        days,
        amount: Number(fd.principal || 0),
        maturityAmount: maturityAmt,
        rate: fd.rate,
        color: THEME.accent,
        detail: (
          <>
            {fd.rate}% p.a. • Principal: <Money value={fd.principal} variant="exact" />
          </>
        ),
      });
    });

    // RD Maturities
    (state.recurringDeposits || []).forEach((rd) => {
      if (!rd.maturityDate && !rd.startDate) return;
      let matDate = rd.maturityDate;
      if (!matDate && rd.startDate && rd.tenureMonths) {
        // Clamp day-of-month so e.g. 31 Jan + 1mo lands on 28/29 Feb, not
        // overflows into March (plain setMonth() silently rolls over).
        matDate = addMonthsToDateStr(rd.startDate, Number(rd.tenureMonths));
      }
      if (!matDate || matDate > cutoffDate) return;
      const days = getDaysUntil(matDate);
      const matAmt = rdMaturity
        ? rdMaturity(Number(rd.monthly || 0), Number(rd.rate || 0), Number(rd.tenureMonths || 0))
        : Number(rd.monthly || 0) * Number(rd.tenureMonths || 0);
      items.push({
        id: `rd_maturity_${rd.id || matDate}`,
        type: "rd_maturity",
        category: "Recurring Deposit",
        icon: Repeat,
        // Amount deliberately NOT embedded in the plain-text `name` (rendered
        // unmasked as the card title) — the monthly instalment amount now
        // moves to `detail` wrapped in <Money> instead, alongside the amount
        // column, so Privacy Mode actually hides it.
        name: rd.bank || "RD",
        date: matDate,
        days,
        amount: Number(rd.monthly || 0) * Number(rd.tenureMonths || 0),
        maturityAmount: matAmt,
        rate: rd.rate,
        color: THEME.violet,
        detail: (
          <>
            {rd.rate}% p.a. • {rd.tenureMonths} months • <Money value={rd.monthly} variant="exact" />/mo
          </>
        ),
      });
    });

    // Bond Maturities
    (state.bonds || []).forEach((b) => {
      if (!b.maturityDate || b.maturityDate > cutoffDate) return;
      const days = getDaysUntil(b.maturityDate);
      items.push({
        id: `bond_maturity_${b.id || b.maturityDate}`,
        type: "bond_maturity",
        source: b,
        category: "Bond",
        icon: FileText,
        name: b.name || "Bond",
        date: b.maturityDate,
        days,
        amount: Number(b.faceValue || b.totalPrincipalAmount || 0),
        color: THEME.cyan,
        detail: (
          <>
            Coupon: {b.coupon || 0}% • Face Value:{" "}
            <Money value={b.faceValue || b.totalPrincipalAmount} variant="exact" />
          </>
        ),
      });
    });

    // Dividend History — project next dividends based on past patterns.
    // Uses the same local-safe `nextAnnualOccurrence` helper as govt-scheme
    // premiums below instead of a hand-rolled `new Date(str)` + `setFullYear`
    // loop, which parsed as UTC (bare "YYYY-MM-DD" is UTC midnight) and
    // didn't clamp a Feb 29 last-dividend date on a non-leap projected year.
    // Note: there is also a dedicated, more sophisticated Dividend Calendar
    // tab (state.stocks + live ex-dividend data) — see audit report for the
    // overlap this creates.
    const dividendsBySymbol = {};
    (state.dividends || []).forEach((d) => {
      const key = d.symbol || d.name || "Unknown";
      if (!dividendsBySymbol[key]) dividendsBySymbol[key] = [];
      dividendsBySymbol[key].push(d);
    });

    Object.entries(dividendsBySymbol).forEach(([symbol, divs]) => {
      const sorted = divs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      if (sorted.length === 0 || !sorted[0].date) return;
      const lastDiv = sorted[0];
      const nextDateStr = nextAnnualOccurrence(lastDiv.date, todayStr);
      if (nextDateStr > cutoffDate) return;
      const days = getDaysUntil(nextDateStr);
      items.push({
        id: `dividend_${symbol}`,
        type: "dividend",
        category: "Dividend",
        icon: Coins,
        name: `${symbol} — Expected Dividend`,
        date: nextDateStr,
        days,
        amount: Number(lastDiv.amount || 0),
        color: THEME.sage,
        detail: (
          <>
            Based on last dividend of <Money value={lastDiv.amount} variant="exact" /> on{" "}
            {formatDate(lastDiv.date)}
          </>
        ),
        projected: true,
      });
    });

    // Insurance Premium Due — next annual-renewal date computed with the
    // same local-safe, leap-day-clamping `nextAnnualOccurrence` helper used
    // for govt-scheme premiums below (previously this block hand-rolled its
    // own `new Date(startDate)` / `setFullYear` version, which both parsed
    // dates as UTC and could overflow a Feb 29 anniversary into March).
    const addInsurancePremium = (policies, label) => {
      (policies || []).forEach((p) => {
        const premium = annualizePremium(p.premium, p.premiumFrequency, p.annualPremium);
        if (!premium) return;
        const startDate = p.commencementDate || p.startDate;
        if (!startDate) return;
        // A matured/expired policy stops charging premiums — without this check
        // nextAnnualOccurrence keeps projecting an annual "due" date forever,
        // which useAlerts.ts's independent copy of this same logic already
        // guarded against (`pol.expiry && pol.expiry < todayStr`). Found via a
        // direct comparison between the two while scoping Phase 3 of the
        // alerts consolidation plan.
        const expiry = p.maturityDate || p.expiryDate;
        if (expiry && expiry < todayStr) return;

        const nextDueStr = nextAnnualOccurrence(startDate, todayStr);
        if (nextDueStr > cutoffDate) return;
        const days = getDaysUntil(nextDueStr);
        items.push({
          id: `insurance_premium_${p.id || `${label}_${startDate}`}`,
          type: "insurance_premium",
          source: p,
          sourceLabel: label,
          category: "Insurance",
          icon: Heart,
          name: `${p.planName || p.insurer || p.policyName || p.provider || label} — Premium Due`,
          date: nextDueStr,
          days,
          amount: premium,
          color: THEME.pink,
          detail: (
            <>
              Annual Premium: <Money value={premium} variant="exact" />
            </>
          ),
        });
      });
    };
    addInsurancePremium(state.lic, "LIC");
    addInsurancePremium(state.termPlans, "Term Plan");
    addInsurancePremium(state.investmentPlans, "Investment Plan");

    // Health Insurance premium renewal — previously surfaced nowhere outside
    // the Health Insurance tab itself.
    (state.healthInsurance || []).forEach((p: any) => {
      if (!p.renewalDate) return;
      if (p.renewalDate > cutoffDate) return;
      const days = getDaysUntil(p.renewalDate);
      const annualPrem = annualizePremium(p.premium, p.premiumFrequency);
      items.push({
        id: `health_insurance_${p.id || p.renewalDate}`,
        type: "health_insurance",
        source: p,
        category: "Health Insurance",
        icon: Shield,
        name: `${p.insurer || p.policyName || "Health Policy"} — Renewal`,
        date: p.renewalDate,
        days,
        amount: annualPrem,
        color: THEME.chart3,
        detail: (
          <>
            {p.policyName ? `${p.policyName} • ` : ""}Premium: <Money value={annualPrem} variant="exact" />
          </>
        ),
      });
    });

    // Loan EMI end dates / closures
    (state.loansTaken || []).forEach((l) => {
      if (!l.monthsRemaining || !l.emi) return;
      // Clamp day-of-month (see RD maturity fallback above) so long remaining
      // tenures don't overflow into the wrong month.
      const closureDateStr = addMonthsToDateStr(todayStr, Number(l.monthsRemaining));
      if (closureDateStr > cutoffDate) return;
      const days = getDaysUntil(closureDateStr);
      items.push({
        id: `loan_closure_${l.id || closureDateStr}`,
        type: "loan_closure",
        category: "Loan",
        icon: CreditCard,
        name: `${l.lender || l.lenderBorrower || "Loan"} — Closure`,
        date: closureDateStr,
        days,
        amount: Number(l.outstanding || 0),
        color: THEME.rust,
        detail: (
          <>
            EMI: <Money value={l.emi} variant="exact" /> • Outstanding: <Money value={l.outstanding} variant="exact" />
          </>
        ),
      });
    });

    // Loans Given — expected repayment due date (money coming back in).
    // Previously loans given to others never appeared in any calendar view.
    (state.loansGiven || []).forEach((l: any) => {
      const outstanding = Number(l.outstanding || 0);
      if (outstanding <= 0 || !l.dueDate) return; // settled — nothing to track
      if (l.dueDate > cutoffDate) return;
      const days = getDaysUntil(l.dueDate);
      items.push({
        id: `loan_given_repayment_${l.id || l.dueDate}`,
        type: "loan_given_repayment",
        source: l,
        category: "Loan Given",
        icon: Users,
        name: `${l.borrower || "Borrower"} — Repayment Due`,
        date: l.dueDate,
        days,
        amount: outstanding,
        color: THEME.sage,
        detail: (
          <>
            Outstanding: <Money value={outstanding} variant="exact" />
            {l.rate ? ` • ${l.rate}% p.a.` : ""}
          </>
        ),
      });
    });

    // Credit Card Annual Fee Due — was missing the closed-card and
    // feeMonth-actually-set guards useAlerts.ts's independent copy of this
    // same logic already had, so a closed card (or one where feeMonth was
    // never configured) could surface a fee milestone here that shouldn't
    // exist, silently defaulting the unset month to January.
    (state.creditCards || []).forEach((cc) => {
      if ((cc.status || "").toLowerCase() === "closed") return;
      const feeAmt = Number(cc.annualFee || 0);
      if (!feeAmt || !cc.feeMonth) return;
      const feeMonth = cc.feeMonth || 1;
      const feeDay = cc.feeDay || 1;
      // `now` must be constructed the same way as `feeDate` (both LOCAL midnight). Parsing
      // todayStr ("YYYY-MM-DD") alone makes it UTC midnight, which in a positive-UTC-offset
      // timezone (e.g. IST, +5:30) is actually today ~5:30am local — LATER than feeDate's local
      // 00:00. That mismatch made a fee due exactly "today" look already past, silently pushing
      // it a year forward and hiding it from the calendar.
      const now = new Date(todayStr + "T00:00:00");
      let feeDate = new Date(now.getFullYear(), feeMonth - 1, feeDay);
      if (feeDate < now) feeDate = new Date(now.getFullYear() + 1, feeMonth - 1, feeDay);
      // feeDate is LOCAL midnight (multi-arg constructor). Serializing it with .toISOString()
      // (UTC) would shift the date a day EARLIER for positive-UTC-offset timezones like IST,
      // since local midnight is still the previous evening in UTC. Format from local fields
      // instead, the same way the rest of this file's dates round-trip safely.
      const feeDateStr = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, "0")}-${String(feeDate.getDate()).padStart(2, "0")}`;
      if (feeDateStr > cutoffDate) return;
      const days = getDaysUntil(feeDateStr);
      items.push({
        id: `cc_fee_${cc.id || feeDateStr}`,
        type: "cc_fee",
        source: cc,
        category: "Credit Card",
        icon: CreditCard,
        name: `${cc.issuer || cc.name || "CC"} — Annual Fee`,
        date: feeDateStr,
        days,
        amount: feeAmt,
        color: THEME.accent,
        detail: (
          <>
            Annual Fee: <Money value={feeAmt} variant="exact" />
          </>
        ),
      });
    });

    // Subscription Renewals (yearly only — monthly ones are always upcoming)
    (state.subscriptions || []).forEach((s) => {
      if (s.paused || !s.renewalDate) return;
      if (s.cycle !== "yearly" && s.cycle !== "quarterly") return;
      if (s.renewalDate > cutoffDate) return;
      const days = getDaysUntil(s.renewalDate);
      items.push({
        id: `subscription_${s.id || s.renewalDate}`,
        type: "subscription",
        category: "Subscription",
        icon: Bell,
        name: `${s.name || s.provider || "Subscription"} — Renewal`,
        date: s.renewalDate,
        days,
        amount: Number(s.amount || 0),
        color: THEME.gold,
        detail: (
          <>
            {s.cycle} • <Money value={s.amount} variant="exact" />
          </>
        ),
      });
    });

    // PPF maturity (15 year term) — uses the same clamped month-add helper
    // as loan closures above instead of a bare `new Date(str)` +
    // `setFullYear` + `.toISOString()` round trip, which parsed as UTC and
    // didn't guard against a Feb 29 open-date overflowing into March.
    (state.ppf || []).forEach((p) => {
      const startDate = p.startDate || p.openDate;
      if (!startDate) return;
      const matDateStr = addMonthsToDateStr(startDate, 180); // 15 years
      if (matDateStr > cutoffDate) return;
      const days = getDaysUntil(matDateStr);
      items.push({
        id: `ppf_maturity_${p.id || matDateStr}`,
        type: "ppf_maturity",
        category: "PPF",
        icon: Shield,
        name: `${p.institution || "PPF"} — Maturity`,
        date: matDateStr,
        days,
        amount: Number(p.balance || 0),
        color: THEME.sage,
        detail: (
          <>
            Balance: <Money value={p.balance} variant="exact" />
          </>
        ),
      });
    });

    // Govt Scheme maturities (SSY/SCSS/NSC/KVP/POST_MIS/RBI_BOND/NPS_LITE) — these
    // never appeared anywhere outside the Govt Schemes tab itself, so a matured
    // scheme (e.g. a 5-year NSC or KVP) could go unnoticed indefinitely.
    (state.govtSchemes || []).forEach((sc) => {
      if (!sc.maturityDate || sc.maturityDate > cutoffDate) return;
      const rule = SCHEME_RULES[sc.schemeType];
      if (!rule || rule.growth === "none") return; // insurance schemes have no maturity corpus
      const days = getDaysUntil(sc.maturityDate);
      const projection = projectSchemeValue(sc);
      items.push({
        id: `govt_scheme_maturity_${sc.id || sc.maturityDate}`,
        type: "govt_scheme_maturity",
        source: sc,
        category: "Govt Scheme",
        icon: Star,
        name: `${sc.schemeName || sc.schemeType}${sc.memberName ? ` — ${sc.memberName}` : ""} — Maturity`,
        date: sc.maturityDate,
        days,
        amount: Number(sc.currentBalance || 0),
        maturityAmount: projection?.mode === "compounding" ? projection.value : undefined,
        rate: sc.interestRate,
        color: THEME.gold,
        detail: (
          <>
            {sc.interestRate ? `${sc.interestRate}% p.a. • ` : ""}Balance:{" "}
            <Money value={sc.currentBalance} variant="exact" />
          </>
        ),
      });
    });

    // Govt Scheme premium due (PMJJBY/PMSBY annual renewal)
    (state.govtSchemes || []).forEach((sc) => {
      const rule = SCHEME_RULES[sc.schemeType];
      if (!rule || rule.growth !== "none") return;
      const premium = Number(sc.premium || 0);
      if (!premium || !sc.startDate) return;
      const nextDueStr = nextAnnualOccurrence(sc.startDate, todayStr);
      if (nextDueStr > cutoffDate) return;
      const days = getDaysUntil(nextDueStr);
      items.push({
        id: `govt_scheme_premium_${sc.id || nextDueStr}`,
        type: "govt_scheme_premium",
        source: sc,
        category: "Govt Scheme",
        icon: Star,
        name: `${sc.schemeName || sc.schemeType} — Premium Due`,
        date: nextDueStr,
        days,
        amount: premium,
        color: THEME.pink,
        detail: (
          <>
            Annual Premium: <Money value={premium} variant="exact" />
          </>
        ),
      });
    });

    // Real Estate builder demand letters (under-construction properties only) —
    // one-off milestone dues, not a recurring cycle, so unlike everything else in
    // this file each occurrence is a distinct existing record rather than a
    // projected next-due date. Previously these dues appeared nowhere outside the
    // Real Estate tab itself, so a milestone payment could be missed entirely.
    const ucPropertyIds = new Set(
      (state.realEstateProperties || [])
        .filter((p: any) => p.status === "under-construction")
        .map((p: any) => p.id)
    );
    (state.realEstateDemands || []).forEach((d: any) => {
      if (!ucPropertyIds.has(d.propertyId) || d.status === "paid" || !d.dueDate) return;
      if (d.dueDate > cutoffDate) return;
      const totalAmt = Number(d.totalAmount || d.amount || 0);
      const paidForDemand = (state.realEstatePayments || [])
        .filter((p: any) => p.demandId === d.id)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalAmt - paidForDemand);
      if (remaining <= 0) return;
      const days = getDaysUntil(d.dueDate);
      const property = (state.realEstateProperties || []).find((p: any) => p.id === d.propertyId);
      items.push({
        id: `realestate_demand_${d.id}`,
        type: "realestate_demand",
        source: d,
        sourceProperty: property,
        sourceRemaining: remaining,
        category: "Real Estate",
        icon: Building2,
        name: `${property?.name || "Property"} — ${d.milestone || "Demand"}`,
        date: d.dueDate,
        days,
        amount: remaining,
        color: THEME.gold,
        detail: (
          <>
            Demand: <Money value={totalAmt} variant="exact" />
            {paidForDemand > 0 ? (
              <>
                {" "}
                • Paid: <Money value={paidForDemand} variant="exact" />
              </>
            ) : (
              ""
            )}
          </>
        ),
      });
    });

    // Rent receivable (landlord side — `state.rentalProperties` is entirely
    // "rented out" properties by definition; RentalTab.tsx's own `propertiesOut`
    // alias confirms it, and `propertyType` on these records means property
    // category like "shop"/"flat", not a rent direction — a pre-existing filter
    // elsewhere in this file mistakenly checked propertyType for direction and
    // matched nothing, see the dead-code note in useRecurringPayments below).
    // Phase 2 of the alerts consolidation plan: Payments only ever tracked the
    // tenant-paid side (it's framed as "recurring outflows"), so a landlord's
    // incoming rent had no home in Calendar at all — ported from RemindersTab's
    // independent version of this same logic, which already had it. Projects
    // the single next due date (current cycle if unpaid, else next month's),
    // same current/next-cycle pattern RemindersTab uses, not a full recurring
    // series — that's the right shape for this list, unlike Payments' month-grid.
    (state.rentalProperties || [])
      .filter((p: any) => p.isActive !== false)
      .forEach((p: any) => {
        const rentAmt = getEffectiveRent(p);
        if (!rentAmt) return;
        const dueDay = Number(p.dueDay || 1);
        const now = new Date(todayStr + "T00:00:00");
        const clamp = (year: number, month: number) => {
          const lastDay = new Date(year, month + 1, 0).getDate();
          return new Date(year, month, Math.min(dueDay, lastDay));
        };
        const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const receivedInMonth = (monthStr: string) =>
          (p.receipts || []).some((r: any) => r.date && r.date.startsWith(monthStr));
        let dueDate = clamp(now.getFullYear(), now.getMonth());
        if (receivedInMonth(ym(dueDate))) {
          const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          dueDate = clamp(next.getFullYear(), next.getMonth());
        }
        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
        if (dueDateStr > cutoffDate) return;
        const days = getDaysUntil(dueDateStr);
        items.push({
          id: `rent_receivable_${p.id}`,
          type: "rent_receivable",
          category: "Rent Receivable",
          icon: Building2,
          name: `${p.propertyName || "Property"} — Rent Receivable`,
          date: dueDateStr,
          days,
          amount: rentAmt,
          color: THEME.sage,
          detail: (
            <>
              Expected: <Money value={rentAmt} variant="exact" />
            </>
          ),
        });
      });

    // Prepaid card expiries — previously surfaced nowhere outside the Credit tab
    // itself, so a card could lapse with unused balance still loaded on it.
    (state.prepaidCards || []).forEach((pc: any) => {
      if (!pc.expiryDate || (pc.status || "").toLowerCase() === "closed") return;
      if (pc.expiryDate > cutoffDate) return;
      const days = getDaysUntil(pc.expiryDate);
      const txns = pc.transactions || [];
      const loaded = txns
        .filter((t: any) => t.type === "load")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t: any) => t.type === "spend")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      items.push({
        id: `prepaid_card_expiry_${pc.id || pc.expiryDate}`,
        type: "prepaid_card_expiry",
        source: pc,
        category: "Prepaid Card",
        icon: Wallet,
        name: `${pc.cardName || "Prepaid Card"} — Expiry`,
        date: pc.expiryDate,
        days,
        amount: Math.max(0, loaded - spent),
        color: THEME.gold,
        detail: (
          <>
            Balance: <Money value={Math.max(0, loaded - spent)} variant="exact" /> — use or transfer before
            expiry
          </>
        ),
      });
    });

    // Vehicle Insurance / PUC / Next-Service reminders — previously surfaced
    // nowhere outside the Vehicles tab itself, so a lapsed motor policy or
    // pollution certificate could go unnoticed. These are compliance
    // deadlines, not scheduled costs, so they carry no known rupee amount.
    (state.vehicles || []).forEach((v: any) => {
      const vehicleName = [v.make, v.model].filter(Boolean).join(" ") || v.registrationNumber || "Vehicle";
      const regSuffix = v.registrationNumber ? `Reg: ${v.registrationNumber}` : "";

      if (v.insuranceExpiry && v.insuranceExpiry <= cutoffDate) {
        items.push({
          id: `vehicle_insurance_${v.id}`,
          type: "vehicle_insurance",
          category: "Vehicle",
          icon: Car,
          name: `${vehicleName} — Insurance Renewal`,
          date: v.insuranceExpiry,
          days: getDaysUntil(v.insuranceExpiry),
          amount: 0,
          color: THEME.chart4,
          detail: regSuffix || "Motor insurance renewal due",
        });
      }
      if (v.pucExpiry && v.pucExpiry <= cutoffDate) {
        items.push({
          id: `vehicle_puc_${v.id}`,
          type: "vehicle_puc",
          category: "Vehicle",
          icon: Car,
          name: `${vehicleName} — PUC Renewal`,
          date: v.pucExpiry,
          days: getDaysUntil(v.pucExpiry),
          amount: 0,
          color: THEME.chart5,
          detail: regSuffix || "Pollution certificate renewal due",
        });
      }
      if (v.nextServiceDueDate && v.nextServiceDueDate <= cutoffDate) {
        items.push({
          id: `vehicle_service_${v.id}`,
          type: "vehicle_service",
          category: "Vehicle",
          icon: Wrench,
          name: `${vehicleName} — Service Due`,
          date: v.nextServiceDueDate,
          days: getDaysUntil(v.nextServiceDueDate),
          amount: 0,
          color: THEME.chart6,
          detail: v.nextServiceDueOdometer
            ? `Due by this date or ${Number(v.nextServiceDueOdometer).toLocaleString("en-IN")} km, whichever first`
            : "Scheduled maintenance due",
        });
      }
    });

    // Life Events (Life Event Planner) — previously surfaced nowhere outside that
    // tab itself. Uses the nominal `estimatedCost` (not the inflation-adjusted
    // projection LifeEventPlannerTab shows) to avoid re-deriving that tab's
    // per-event-type inflation-rate table here and risking the two drifting apart —
    // same simplification SmartAlertsTab's goal-deadline alert already makes.
    (state.lifeEvents || []).forEach((e: any) => {
      if (!e.targetDate || e.targetDate > cutoffDate) return;
      const cost = Number(e.estimatedCost || 0);
      const saved = Number(e.currentSaved || 0);
      const remaining = Math.max(0, cost - saved);
      const days = getDaysUntil(e.targetDate);
      items.push({
        id: `life_event_${e.id}`,
        type: "life_event",
        category: "Life Event",
        icon: Milestone,
        name: `${e.name || "Life Event"}`,
        date: e.targetDate,
        days,
        amount: remaining,
        color: THEME.pink,
        detail: (
          <>
            Target: <Money value={cost} variant="exact" />
            {saved > 0 ? (
              <>
                {" "}
                • Saved: <Money value={saved} variant="exact" />
              </>
            ) : (
              ""
            )}
          </>
        ),
      });
    });

    return items.sort((a, b) => a.days - b.days);
  }, [state, cutoffDate]);
}

  // ── Collect all recurring payment items ──────────────────────────────
export function useRecurringPayments(state: any, todayStr: string, todayDate: Date) {
  return useMemo(() => {
    const items: any[] = [];

    // Loan EMIs
    (state.loansTaken || []).forEach((l: any) => {
      if (!l.emi || Number(l.emi) <= 0) return;
      if (Number(l.monthsRemaining || 0) <= 0) return;
      items.push({
        id: `loan-${l.id}`,
        name: `${l.lenderBorrower || l.type || "Loan"} EMI`,
        type: "emi",
        amount: Number(l.emi),
        frequency: "monthly",
        dueDay: Number(l.dueDay || 5),
        owner: l.owner,
        monthsLeft: Number(l.monthsRemaining),
        startedAt: todayDate,
      });
    });

    // SIPs
    (state.sips || []).forEach((s: any) => {
      if (!s.amount || Number(s.amount) <= 0) return;
      const dueDay = s.startDate ? new Date(s.startDate + "T00:00:00").getDate() : 5;
      items.push({
        id: `sip-${s.id}`,
        name: s.scheme || s.fundName || "SIP",
        type: "sip",
        amount: Number(s.amount),
        frequency: s.frequency === "quarterly" ? "quarterly" : "monthly",
        dueDay,
        owner: s.owner,
        monthsLeft: s.totalInstallments
          ? Number(s.totalInstallments) - (s.paidInstallments || 0)
          : 9999,
        startDate: s.startDate,
      });
    });

    // Recurring Deposits
    (state.recurringDeposits || []).forEach((rd: any) => {
      if (!rd.monthly || Number(rd.monthly) <= 0) return;
      if (rd.maturityDate && rd.maturityDate <= todayStr) return;
      const dueDay = rd.startDate ? new Date(rd.startDate + "T00:00:00").getDate() : 5;
      items.push({
        id: `rd-${rd.id}`,
        name: `${rd.bank || "RD"} Instalment`,
        type: "rd",
        amount: Number(rd.monthly),
        frequency: "monthly",
        dueDay,
        owner: rd.owner,
        monthsLeft: 9999,
        maturityDate: rd.maturityDate,
      });
    });

    // Subscriptions
    (state.subscriptions || []).forEach((s: any) => {
      if (!s.amount || s.paused) return;
      const dueDay = s.renewalDate ? new Date(s.renewalDate + "T00:00:00").getDate() : 1;
      items.push({
        id: `sub-${s.id}`,
        name: s.name || s.provider || "Subscription",
        type: "subscription",
        amount: Number(s.amount),
        frequency: s.cycle || "monthly",
        dueDay,
        owner: s.owner,
        monthsLeft: 9999,
        renewalDate: s.renewalDate,
        // isActiveInMonth's quarterly branch anchors its every-3rd-month pattern
        // off `startDate`. Subscriptions only ever carried `renewalDate`, so a
        // quarterly-cycle subscription had no startDate to match on, fell through
        // to the unconditional `return true`, and appeared (at full amount) in
        // every single month instead of every 3rd — inflating "Due This Month"
        // and the 12-month bar overview by up to 3x. Reusing renewalDate as the
        // anchor fixes quarterly without changing yearly/monthly, which already
        // keyed off renewalDate/fallthrough respectively.
        startDate: s.renewalDate,
      });
    });

    // Insurance Premiums — LIC / Term / Investment Plans / Health
    const addInsurance = (policies: any[], tag: string, typeKey: string) => {
      (policies || []).forEach((p: any) => {
        const premium = annualizePremium(p.premium, p.premiumFrequency, p.annualPremium);
        if (!premium) return;
        const startDate = p.commencementDate || p.startDate;
        const dueDay = startDate ? new Date(startDate + "T00:00:00").getDate() : 1;
        items.push({
          id: `${tag}-${p.id}`,
          name: `${p.planName || p.insurer || tag} Premium`,
          type: typeKey,
          amount: premium,
          frequency: "yearly",
          dueDay,
          owner: p.owner,
          monthsLeft: 9999,
          startDate,
        });
      });
    };
    addInsurance(state.lic, "LIC", "insurance");
    addInsurance(state.termPlans, "Term", "insurance");
    addInsurance(state.investmentPlans, "Inv. Plan", "insurance");
    addInsurance(state.healthInsurance, "Health", "health");

    // Utility bills (electricity, gas, water, broadband, mobile, etc.) — this is
    // exactly the same kind of recurring monthly due-date commitment as EMIs/SIPs/
    // subscriptions above, but was previously missing from this calendar entirely.
    // Included regardless of auto-pay: it's still real money going out each month,
    // auto-pay only changes who initiates it. `autoPay` and `paidThisCycle` (via
    // the shared `dueStatus` helper, cross-referenced against billPaymentHistory)
    // are carried onto the item so the calendar can tell "already handled" apart
    // from "genuinely needs your action" instead of dimming every past date alike.
    const billHistory = state.billPaymentHistory || [];
    (state.billPayments || []).forEach((b: any) => {
      if (!b.amount || Number(b.amount) <= 0 || !b.dueDay) return;
      const hist = billHistory
        .filter((h: any) => h.billId === b.id)
        .sort((x: any, y: any) => (y.paidDate || "").localeCompare(x.paidDate || ""));
      const status = dueStatus(Number(b.dueDay), hist[0]?.paidDate);
      items.push({
        id: `bill-${b.id}`,
        billId: b.id,
        name: b.nickname || b.provider || "Bill",
        type: "bill",
        amount: Number(b.amount),
        frequency: "monthly",
        dueDay: Number(b.dueDay),
        owner: b.owner,
        monthsLeft: 9999,
        autoPay: !!b.autoPay,
        paidThisCycle: status.paid,
      });
    });

    // Credit Card statement dues — uses the exact same `getCCDueDate` formula as
    // CreditTab and the global useAlerts hook (single source of truth for CC
    // due-date math), instead of the generic dueDay-clamping every other item
    // type above uses. Unlike EMIs/SIPs (fixed recurring amounts), a card's
    // outstanding balance is only known for its CURRENT cycle — next month's
    // statement total doesn't exist yet — so this resolves to exactly the one
    // upcoming due date getCCDueDate returns (this month or next) rather than
    // being projected forward across the whole 12-month window like the others.
    (state.creditCards || []).forEach((c: any) => {
      if ((c.status || "active").toLowerCase() === "closed") return;
      if (!c.dueDay) return;
      const outstanding = Number(c.outstanding || 0);
      if (outstanding <= 0) return;
      const dueDateStr = getCCDueDate(c, todayDate);
      if (!dueDateStr) return;
      const [dY, dM, dD] = dueDateStr.split("-").map(Number);
      items.push({
        id: `cc-${c.id}`,
        name: `${c.issuer || "Card"} •${c.last4 || "····"}`,
        type: "creditcard",
        amount: outstanding,
        frequency: "monthly",
        dueDay: dD,
        dueYear: dY,
        dueMonth: dM - 1,
        owner: c.owner,
        monthsLeft: 9999,
        autoPay: !!c.autoPay,
      });
    });

    // Rent paid (rented-in properties) — Phase 2 of the alerts consolidation
    // plan: uses the escalation-aware effective rent (not the static
    // `monthlyRent` field, which is only ever set once at creation and never
    // updated as escalation tiers advance) and carries `paidThisCycle` (has
    // the current month already been logged in `p.payments`?) so the
    // calendar can tell "already paid" apart from "needs action," matching
    // the pattern bills already use above. Both fixes port RemindersTab's
    // more-correct independent rent logic into this shared hook instead of
    // leaving Payments on the weaker of the two.
    const currentMonthStr = todayStr.slice(0, 7);
    const addRentItem = (p: any, idPrefix: string) => {
      const rentAmt = getEffectiveRent(p);
      if (!rentAmt) return;
      const paidThisCycle = (p.payments || []).some(
        (pay: any) => pay.date && pay.date.startsWith(currentMonthStr)
      );
      items.push({
        id: `${idPrefix}-${p.id}`,
        name: `Rent — ${p.propertyName || p.landlordName || "Property"}`,
        type: "rent",
        amount: rentAmt,
        frequency: "monthly",
        dueDay: Number(p.dueDay || 1),
        owner: p.owner,
        monthsLeft: 9999,
        paidThisCycle,
      });
    };
    // `state.rentalProperties` (landlord-side, "rented out") deliberately isn't
    // included here — it was previously gated behind `p.propertyType === "in"`,
    // a condition that can never be true (propertyType holds a property
    // category like "shop"/"flat" on those records, not a rent direction; see
    // RentalTab.tsx's own `propertiesOut` alias), so it silently matched zero
    // records. Landlord-received rent belongs in Payments' "outflows" framing
    // even less than it belonged in that dead filter — it's tracked correctly
    // now as its own inflow-typed milestone in useMilestoneEvents above.
    (state.rentedProperties || []).forEach((p: any) => addRentItem(p, "rent"));

    return items;
  }, [state, todayStr, todayDate]);
}
