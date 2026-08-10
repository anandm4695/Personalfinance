// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Coins,
  Landmark,
  Repeat,
  Shield,
  FileText,
  Heart,
  CreditCard,
  Bell,
  Building2,
  Star,
  Wallet,
  Car,
  Wrench,
  Users,
  Download,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Milestone,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  fdMaturity,
  rdMaturity,
  nextAnnualOccurrence,
  addMonthsToDateStr,
  annualizePremium,
} from "../../utils/finance";
import { SCHEME_RULES, projectSchemeValue } from "../../utils/govtSchemes";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

// Maps each event type to the tab a user would go to in order to actually
// act on it (edit the policy, pay the bill, etc). Used by the optional
// `onNavigateToTab` prop for click-through — see prop docs below.
const EVENT_TYPE_TO_TAB: Record<string, string> = {
  fd_maturity: "investments",
  rd_maturity: "investments",
  bond_maturity: "investments",
  ppf_maturity: "investments",
  dividend: "dividendcal",
  insurance_premium: "insurance",
  loan_closure: "credit",
  loan_given_repayment: "credit",
  cc_fee: "credit",
  prepaid_card_expiry: "credit",
  subscription: "subs",
  govt_scheme_maturity: "govtschemes",
  govt_scheme_premium: "govtschemes",
  realestate_demand: "realestate",
  vehicle_insurance: "vehicles",
  vehicle_puc: "vehicles",
  vehicle_service: "vehicles",
  health_insurance: "healthinsurance",
  life_event: "lifeevents",
};

// Types that represent money coming IN (maturities, projected income) vs
// going OUT (premiums, fees, renewals). Shared by the stat totals and the
// monthly breakdown so the two can never drift apart.
const INFLOW_TYPES = [
  "fd_maturity",
  "rd_maturity",
  "bond_maturity",
  "dividend",
  "ppf_maturity",
  "govt_scheme_maturity",
  "loan_given_repayment",
];
const OUTFLOW_TYPES = [
  "insurance_premium",
  "health_insurance",
  "cc_fee",
  "subscription",
  "govt_scheme_premium",
];

// Persisted "mark as done" state for events (e.g. "I already paid this
// premium"). Keyed by a stable per-event id (source record id + type, not
// array index) so it survives horizon/filter changes and reloads. This is a
// display-only client-side dismiss, not a DB write — the underlying record
// (FD, policy, etc.) is untouched, so there's nothing to sync elsewhere.
const DISMISS_STORAGE_KEY = "finCalDismissedEvents_v1";
const loadDismissed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const saveDismissed = (ids: Set<string>) => {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* localStorage unavailable (private browsing etc) — dismiss just won't persist */
  }
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

const getUrgencyColor = (days) => {
  if (days < 0) return THEME.rust;
  if (days <= 7) return THEME.gold;
  if (days <= 30) return THEME.gold;
  if (days <= 90) return THEME.accent;
  return THEME.sage;
};

const getUrgencyLabel = (days) => {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${days}d`;
  if (days <= 90) return `${Math.ceil(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
};

// `onNavigateToTab` is optional and not yet wired up by the parent — see
// cross-file findings in the audit report for the one-line App.tsx change
// that would enable click-through from an event card to its source tab.
export const FinancialCalendarTab = ({
  state,
  metrics,
  onNavigateToTab = undefined,
  // Set by CalendarTab.tsx when rendering this as the "Milestones" view of
  // the merged Calendar tab — suppresses this component's own SectionTitle
  // since the wrapper already renders one shared header + view toggle.
  embedded = false,
}) => {
  const [horizon, setHorizon] = useState(6);
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [showDismissed, setShowDismissed] = useState(false);

  const toggleDismissed = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const cutoffDate = useMemo(() => {
    // Plain setMonth() overflows for day 29-31 starting dates when the target
    // month is shorter (e.g. 31 Jan + 1 month rolls into 2/3 Mar, not 28 Feb),
    // silently widening/narrowing the horizon window. Clamp to the target
    // month's last day instead.
    const d = new Date(today());
    const day = d.getDate();
    const total = d.getMonth() + horizon;
    const y = d.getFullYear() + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, daysInMonth)).toISOString().slice(0, 10);
  }, [horizon]);

  const events = useMemo(() => {
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
        category: "Fixed Deposit",
        icon: Landmark,
        // Amount deliberately NOT embedded in the plain-text `name` (rendered
        // unmasked as the card title) — it's already shown correctly masked via
        // <Prv> in the amount column and in `detail` below; embedding it here too
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
            {fd.rate}% p.a. • Principal: <Prv>{fmtINRExact(fd.principal)}</Prv>
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
        // moves to `detail` wrapped in <Prv> instead, alongside the amount
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
            {rd.rate}% p.a. • {rd.tenureMonths} months • <Prv>{fmtINRExact(rd.monthly)}</Prv>/mo
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
            <Prv>{fmtINRExact(b.faceValue || b.totalPrincipalAmount)}</Prv>
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
            Based on last dividend of <Prv>{fmtINRExact(lastDiv.amount)}</Prv> on{" "}
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

        const nextDueStr = nextAnnualOccurrence(startDate, todayStr);
        if (nextDueStr > cutoffDate) return;
        const days = getDaysUntil(nextDueStr);
        items.push({
          id: `insurance_premium_${p.id || `${label}_${startDate}`}`,
          type: "insurance_premium",
          category: "Insurance",
          icon: Heart,
          name: `${p.planName || p.insurer || p.policyName || p.provider || label} — Premium Due`,
          date: nextDueStr,
          days,
          amount: premium,
          color: THEME.pink,
          detail: (
            <>
              Annual Premium: <Prv>{fmtINRExact(premium)}</Prv>
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
        category: "Health Insurance",
        icon: Shield,
        name: `${p.insurer || p.policyName || "Health Policy"} — Renewal`,
        date: p.renewalDate,
        days,
        amount: annualPrem,
        color: THEME.chart3,
        detail: (
          <>
            {p.policyName ? `${p.policyName} • ` : ""}Premium: <Prv>{fmtINRExact(annualPrem)}</Prv>
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
            EMI: <Prv>{fmtINRExact(l.emi)}</Prv> • Outstanding: <Prv>{fmtINRExact(l.outstanding)}</Prv>
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
        category: "Loan Given",
        icon: Users,
        name: `${l.borrower || "Borrower"} — Repayment Due`,
        date: l.dueDate,
        days,
        amount: outstanding,
        color: THEME.sage,
        detail: (
          <>
            Outstanding: <Prv>{fmtINRExact(outstanding)}</Prv>
            {l.rate ? ` • ${l.rate}% p.a.` : ""}
          </>
        ),
      });
    });

    // Credit Card Annual Fee Due
    (state.creditCards || []).forEach((cc) => {
      const feeAmt = Number(cc.annualFee || 0);
      if (!feeAmt) return;
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
        category: "Credit Card",
        icon: CreditCard,
        name: `${cc.issuer || cc.name || "CC"} — Annual Fee`,
        date: feeDateStr,
        days,
        amount: feeAmt,
        color: THEME.accent,
        detail: (
          <>
            Annual Fee: <Prv>{fmtINRExact(feeAmt)}</Prv>
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
            {s.cycle} • <Prv>{fmtINRExact(s.amount)}</Prv>
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
            Balance: <Prv>{fmtINRExact(p.balance)}</Prv>
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
            <Prv>{fmtINRExact(sc.currentBalance)}</Prv>
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
        category: "Govt Scheme",
        icon: Star,
        name: `${sc.schemeName || sc.schemeType} — Premium Due`,
        date: nextDueStr,
        days,
        amount: premium,
        color: THEME.pink,
        detail: (
          <>
            Annual Premium: <Prv>{fmtINRExact(premium)}</Prv>
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
        category: "Real Estate",
        icon: Building2,
        name: `${property?.name || "Property"} — ${d.milestone || "Demand"}`,
        date: d.dueDate,
        days,
        amount: remaining,
        color: THEME.gold,
        detail: (
          <>
            Demand: <Prv>{fmtINRExact(totalAmt)}</Prv>
            {paidForDemand > 0 ? (
              <>
                {" "}
                • Paid: <Prv>{fmtINRExact(paidForDemand)}</Prv>
              </>
            ) : (
              ""
            )}
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
        category: "Prepaid Card",
        icon: Wallet,
        name: `${pc.cardName || "Prepaid Card"} — Expiry`,
        date: pc.expiryDate,
        days,
        amount: Math.max(0, loaded - spent),
        color: THEME.gold,
        detail: (
          <>
            Balance: <Prv>{fmtINRExact(Math.max(0, loaded - spent))}</Prv> — use or transfer before
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
            Target: <Prv>{fmtINRExact(cost)}</Prv>
            {saved > 0 ? (
              <>
                {" "}
                • Saved: <Prv>{fmtINRExact(saved)}</Prv>
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

  const filteredEvents = useMemo(() => {
    const base = activeFilter === "all" ? events : events.filter((e) => e.type.startsWith(activeFilter));
    if (showDismissed) return base;
    return base.filter((e) => !dismissed.has(e.id));
  }, [events, activeFilter, dismissed, showDismissed]);

  const dismissedCount = useMemo(
    () => events.filter((e) => dismissed.has(e.id)).length,
    [events, dismissed]
  );

  const stats = useMemo(() => {
    // Stats reflect "live" (non-dismissed) events only — a marked-done
    // premium shouldn't keep inflating "Expected Outflows".
    const liveEvents = events.filter((e) => !dismissed.has(e.id));
    const upcoming7 = liveEvents.filter((e) => e.days >= 0 && e.days <= 7).length;
    const upcoming30 = liveEvents.filter((e) => e.days >= 0 && e.days <= 30).length;
    const overdue = liveEvents.filter((e) => e.days < 0).length;
    const totalInflows = liveEvents
      .filter((e) => INFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0);
    const totalOutflows = liveEvents
      .filter((e) => OUTFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Monthly breakdown
    const monthlyMap = {};
    liveEvents
      .filter((e) => e.days >= 0)
      .forEach((e) => {
        const m = e.date?.slice(0, 7);
        if (!m) return;
        if (!monthlyMap[m]) monthlyMap[m] = { inflow: 0, outflow: 0, events: 0 };
        monthlyMap[m].events++;
        if (INFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].inflow += e.maturityAmount || e.amount || 0;
        } else if (OUTFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].outflow += e.amount || 0;
        }
        // Everything else (prepaid card expiry, vehicle compliance
        // reminders) is a deadline, not a cash movement, so it only counts
        // toward the "N events" tally, not inflow/outflow.
      });

    return { upcoming7, upcoming30, overdue, totalInflows, totalOutflows, monthlyMap };
  }, [events, dismissed]);

  const filterOptions = [
    { key: "all", label: "All Events" },
    { key: "fd", label: "FD/RD" },
    { key: "bond", label: "Bonds" },
    { key: "dividend", label: "Dividends" },
    { key: "insurance", label: "Insurance" },
    { key: "health_insurance", label: "Health Insurance" },
    { key: "loan", label: "Loans" },
    { key: "cc", label: "Credit Cards" },
    { key: "subscription", label: "Subscriptions" },
    { key: "realestate", label: "Real Estate" },
    { key: "govt_scheme", label: "Govt Schemes" },
    { key: "prepaid_card", label: "Prepaid Cards" },
    { key: "vehicle", label: "Vehicles" },
    { key: "life_event", label: "Life Events" },
  ];

  // ICS (iCalendar) export — one VEVENT per currently-filtered, non-dismissed
  // event, so the user can drop their financial due dates into their phone's
  // native calendar app. All-day events (DTSTART;VALUE=DATE) since these are
  // date-level deadlines, not specific times.
  const exportToICS = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeText = (s: string) => String(s || "").replace(/([,;])/g, "\\$1");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Personal Finance//Financial Calendar//EN",
      "CALSCALE:GREGORIAN",
    ];
    filteredEvents.forEach((e) => {
      const dt = e.date.replace(/-/g, "");
      // `e.detail` is JSX (built to let the money portion get individually
      // <Prv>-masked on screen), not plain text, so it can't be stringified
      // directly here — rebuild a plain description from the event's own
      // amount fields instead. Exports always carry real values regardless
      // of on-screen privacy mode, same as every CSV export elsewhere in
      // this app (a deliberate user-initiated data export of their own
      // data, not a masked UI surface).
      const amt = e.maturityAmount || e.amount;
      const description = amt
        ? `${e.category} • ${fmtINRExact(amt)} • Due ${formatDate(e.date)}`
        : `${e.category} • Due ${formatDate(e.date)}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@financial-calendar`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `SUMMARY:${escapeText(e.name)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-calendar-${today()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Same dismissed/showDismissed logic as filteredEvents, but ignoring the
  // category filter — used for filter-chip counts so they reflect what's
  // actually visible (a dismissed event hidden from the list shouldn't
  // still be counted in its chip).
  const visibleEvents = showDismissed ? events : events.filter((e) => !dismissed.has(e.id));
  const todayYM = today().slice(0, 7);

  if (events.length === 0) {
    return (
      <div>
        {!embedded && (
          <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
            Financial Calendar
          </SectionTitle>
        )}
        <EmptyState
          icon={Calendar}
          gradient={`linear-gradient(135deg, ${THEME.cyan} 0%, color-mix(in srgb, ${THEME.cyan} 55%, white) 100%)`}
          dotColor={THEME.cyan}
          title="No Upcoming Events"
          description="This calendar auto-populates from your Fixed Deposits, RDs, insurance policies, loans, vehicles, credit cards, PPF, govt schemes and subscriptions — add those elsewhere in the app and their due dates and maturities will show up here."
          pills={["FD / RD Maturities", "Premium Due Dates", "Loan Closures", "Vehicle Renewals", "Renewal Alerts"]}
        />
      </div>
    );
  }

  // Group events by month
  const groupedByMonth = {};
  filteredEvents.forEach((e) => {
    const m = e.date?.slice(0, 7) || "unknown";
    if (!groupedByMonth[m]) groupedByMonth[m] = [];
    groupedByMonth[m].push(e);
  });

  return (
    <div>
      {!embedded && (
        <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
          Financial Calendar
        </SectionTitle>
      )}

      {/* Horizon Toggle */}
      <div
        className="chip-row"
        style={{
          marginBottom: 20,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div className="chip-row" style={{ alignItems: "center", margin: 0 }}>
          <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600, marginRight: 2 }}>
            Forecast:
          </span>
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              aria-pressed={horizon === m}
              className={`chip ${horizon === m ? "active" : ""}`}
            >
              {m} Months
            </button>
          ))}
        </div>
        <div className="chip-row" style={{ alignItems: "center", margin: 0 }}>
          {dismissedCount > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className={`chip ${showDismissed ? "active" : ""}`}
              title={showDismissed ? "Hide completed events" : "Show events you've marked done"}
            >
              <RotateCcw size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
              {showDismissed ? "Hide" : "Show"} Done ({dismissedCount})
            </button>
          )}
          <Button variant="secondary" onClick={exportToICS} title="Download as .ics for your calendar app">
            <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Export .ics
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="This Week"
          value={String(stats.upcoming7)}
          numericValue={stats.upcoming7}
          formatValue={(n) => String(Math.round(n))}
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Next 30 Days"
          value={String(stats.upcoming30)}
          numericValue={stats.upcoming30}
          formatValue={(n) => String(Math.round(n))}
          icon={<Calendar />}
          color={THEME.accent}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          numericValue={stats.overdue}
          formatValue={(n) => String(Math.round(n))}
          sub={stats.overdue > 0 ? "Needs action" : "All caught up"}
          subColor={stats.overdue > 0 ? THEME.rust : undefined}
          icon={<AlertTriangle />}
          color={THEME.rust}
        />
        <StatCard
          label="Expected Inflows"
          value={fmtINRFull(stats.totalInflows)}
          numericValue={stats.totalInflows}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.sage}
        />
        <StatCard
          label="Expected Outflows"
          value={fmtINRFull(stats.totalOutflows)}
          numericValue={stats.totalOutflows}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.rust}
        />
      </div>

      {/* Monthly Summary Bar */}
      {Object.keys(stats.monthlyMap).length > 0 && (
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: THEME.ink }}>
              Monthly Breakdown
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 12,
              }}
            >
              {Object.entries(stats.monthlyMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(0, horizon)
                .map(([month, data]) => {
                  const [y, m] = month.split("-");
                  return (
                    <div
                      key={month}
                      style={{
                        textAlign: "center",
                        padding: 12,
                        borderRadius: 10,
                        background: "color-mix(in srgb, var(--t-accent) 6%, transparent)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                        {MONTH_NAMES[parseInt(m) - 1]} {y}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                        {data.events} events
                      </div>
                      {data.inflow > 0 && (
                        <div
                          style={{ fontSize: 12, color: THEME.sage, fontWeight: 600, marginTop: 6 }}
                        >
                          +<Prv>{fmtINRExact(data.inflow)}</Prv>
                        </div>
                      )}
                      {data.outflow > 0 && (
                        <div
                          style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginTop: 2 }}
                        >
                          -<Prv>{fmtINRExact(data.outflow)}</Prv>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Row — counts reflect the currently visible set (respecting
          the dismissed/"show done" toggle) so a chip's number always matches
          how many cards actually appear when you click it. */}
      <div className="chip-row" style={{ marginTop: 20, marginBottom: 12 }}>
        {filterOptions.map((f) => {
          const count =
            f.key === "all" ? visibleEvents.length : visibleEvents.filter((e) => e.type.startsWith(f.key)).length;
          if (count === 0 && f.key !== "all") return null;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              aria-pressed={activeFilter === f.key}
              className={`chip ${activeFilter === f.key ? "active" : ""}`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Urgency legend — the color system used for every card's left accent
          and the badge on the right, so a glance at the timeline tells you
          what's pressing without reading each date. */}
      <div
        className="chip-row"
        style={{ marginBottom: 20, gap: 16, fontSize: 12, color: THEME.muted, fontWeight: 600 }}
      >
        {[
          { label: "Overdue", color: THEME.rust },
          { label: "Due ≤ 30d", color: THEME.gold },
          { label: "Due ≤ 90d", color: THEME.accent },
          { label: "Later", color: THEME.sage },
        ].map((l) => (
          <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: l.color,
                display: "inline-block",
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.entries(groupedByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, monthEvents]) => {
            const [y, m] = month.split("-");
            const label = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
            const isCurrentMonth = month === todayYM;
            return (
              <Card
                key={month}
                style={
                  isCurrentMonth
                    ? { borderColor: "color-mix(in srgb, var(--t-accent) 35%, var(--t-line))" }
                    : undefined
                }
              >
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 14,
                      color: THEME.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Calendar size={16} style={{ color: THEME.accent }} />
                    {label}
                    {isCurrentMonth && (
                      <Badge variant="accent" style={{ marginLeft: 2 }}>
                        This month
                      </Badge>
                    )}
                    <Badge variant="muted" style={{ marginLeft: isCurrentMonth ? 0 : 8 }}>
                      {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {monthEvents.map((event) => {
                      const Icon = event.icon;
                      const urgencyColor = getUrgencyColor(event.days);
                      const isDismissed = dismissed.has(event.id);
                      const hasAmount = !!(event.maturityAmount || event.amount);
                      const targetTab = EVENT_TYPE_TO_TAB[event.type];
                      const clickable = !!onNavigateToTab && !!targetTab;
                      return (
                        <div
                          key={event.id}
                          className="fincal-event-row"
                          onClick={clickable ? () => onNavigateToTab(targetTab) : undefined}
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateToTab(targetTab);
                                  }
                                }
                              : undefined
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderRadius: 10,
                            opacity: isDismissed ? 0.5 : 1,
                            cursor: clickable ? "pointer" : "default",
                            background:
                              event.days < 0
                                ? "color-mix(in srgb, var(--t-rust) 6%, transparent)"
                                : event.days <= 7
                                  ? "color-mix(in srgb, var(--t-gold) 6%, transparent)"
                                  : "color-mix(in srgb, var(--t-accent) 4%, transparent)",
                            border: `1px solid ${event.days < 0 ? "color-mix(in srgb, var(--t-rust) 15%, transparent)" : THEME.line}`,
                          }}
                        >
                          <div
                            className="fincal-event-icon"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${event.color} 15%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={18} style={{ color: event.color }} />
                          </div>
                          <div className="fincal-event-main" style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: THEME.ink,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textDecoration: isDismissed ? "line-through" : "none",
                              }}
                            >
                              {event.name}
                              {event.projected && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: THEME.muted,
                                    marginLeft: 6,
                                    fontWeight: 500,
                                  }}
                                >
                                  projected
                                </span>
                              )}
                              {clickable && (
                                <ExternalLink
                                  size={11}
                                  style={{ marginLeft: 6, verticalAlign: -1, color: THEME.muted }}
                                />
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {event.detail}
                            </div>
                          </div>
                          <div className="fincal-event-amount" style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                              {hasAmount ? (
                                <Prv>{fmtINRExact(event.maturityAmount || event.amount)}</Prv>
                              ) : (
                                <span style={{ color: THEME.muted, fontWeight: 500 }}>Reminder</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {formatDate(event.date)}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${urgencyColor} 18%, transparent)`,
                              color: urgencyColor,
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                              minWidth: 40,
                              textAlign: "center",
                            }}
                          >
                            {getUrgencyLabel(event.days)}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDismissed(event.id);
                            }}
                            className="fincal-dismiss-btn"
                            aria-pressed={isDismissed}
                            title={isDismissed ? "Mark as not done" : "Mark as done"}
                            style={{
                              flexShrink: 0,
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: `1px solid ${isDismissed ? "color-mix(in srgb, var(--t-sage) 40%, transparent)" : THEME.line}`,
                              background: isDismissed
                                ? "color-mix(in srgb, var(--t-sage) 15%, transparent)"
                                : "transparent",
                              color: isDismissed ? THEME.sage : THEME.muted,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <style>{`
        .fincal-dismiss-btn:hover { border-color: color-mix(in srgb, var(--t-accent) 40%, transparent) !important; }
        .fincal-event-row:focus-visible { outline: 2px solid var(--t-accent); outline-offset: 2px; }
        @media (max-width: 640px) {
          .fincal-event-row {
            flex-wrap: wrap;
          }
          .fincal-event-main {
            min-width: 140px;
            order: 1;
          }
          .fincal-event-icon {
            order: 0;
          }
          .fincal-event-amount {
            order: 2;
            text-align: left !important;
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};
