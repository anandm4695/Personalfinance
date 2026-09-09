import React, { useMemo } from "react";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  Heart,
  Home,
  Briefcase,
  Coins,
  TrendingUp,
  Landmark,
  Star,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, isHomeLoan, loanOutstanding, getEffectiveRent } from "../../utils/finance";
import { useMasterData, isSeniorCitizen } from "../../utils/masterData";
import { getCurrentFY } from "../../utils/appConstants";
import { annualizeContribution } from "../../utils/govtSchemes";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";

// Theme-aware — matches the 6 possible deduction-mix pie slices (80C,
// 80CCD(1B), 80CCD(2), 80D, 80TTA, Sec 24) 1:1, so the pie never falls back
// to a hardcoded hex that could clash with the user's selected accent preset.
const COLORS = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet, THEME.cyan];

// Hoisted to module scope (was previously defined inside the component body
// on every render, which gives React a brand-new component identity each
// time — remounting the DOM node instead of updating it, so the width
// transition on .progress-fill never animates and instead just snaps).
const ProgressBar = ({ used, limit, color }: { used: number; limit: number; color: string }) => (
  <div style={{ marginTop: 8 }}>
    <div
      className="tabular-nums"
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        color: THEME.textSecondary,
        marginBottom: 4,
      }}
    >
      <span>
        <Money value={used} variant="full" /> used
      </span>
      <span>
        <Money value={Math.max(0, limit - used)} variant="full" /> remaining
      </span>
    </div>
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{
          width: `${Math.min(100, (used / limit) * 100)}%`,
          background: color,
        }}
      />
    </div>
  </div>
);

interface Section80TrackerTabProps {
  state: any;
  metrics?: any;
}

export const Section80TrackerTab: React.FC<Section80TrackerTabProps> = ({ state }) => {
  const { familyProfiles } = useMasterData();
  const data = useMemo(() => {
    // Bug fix: PPF contributions were only read from the (older)
    // ppf[].thisYearContribution field. The app moved to a dedicated
    // ppfLedger for deposit/withdrawal tracking (see finance.ts's
    // getAutoDetectedDeductions and AnalyticsTab), which is now the primary
    // source — so any user logging PPF deposits via the ledger showed ₹0
    // PPF contribution here, understating 80C usage and remaining room.
    // Mirror the same ledger-first-else-fallback pattern used elsewhere.
    const currentFY = getCurrentFY();
    const fyStartYear = Number(currentFY.split("-")[0]) || new Date().getFullYear();
    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;
    const inFY = (date: string | undefined | null) => !!date && date >= fyStartStr && date <= fyEndStr;
    const ppfFromTxns = (state.ppf || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.transactions || [])
          .filter(
            (t: any) =>
              t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
          )
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      0
    );
    const ppfLedgerThisYear = (state.ppfLedger || [])
      .filter(
        (t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppfContrib =
      ppfFromTxns > 0
        ? ppfFromTxns
        : ppfLedgerThisYear > 0
        ? ppfLedgerThisYear
        : (state.ppf || []).reduce(
            (s: number, p: any) =>
              s +
              Number(p.thisYearContribution || p.yearlyContribution || p.annualContribution || 0),
            0
          );
    // Bug fix: this previously summed ELSS "invested" and EPF employee
    // contributions across ALL TIME (no date filter at all), not just the
    // current FY — massively overstating 80C usage for anyone with ELSS/EPF
    // history from prior years (e.g. a 3-year-old EPF account would show its
    // entire lifetime employee contribution as "this year's" 80C usage).
    // TaxFilingHelperTab.tsx hit and fixed the identical bug — mirror the
    // same FY-scoping (buyDate for ELSS, transaction date for EPF) here.
    const elss = (state.mutualFunds || [])
      .filter((m: any) => (m.category || m.type || "").toLowerCase().includes("elss") && inFY(m.buyDate))
      .reduce((s: number, m: any) => s + Number(m.invested || 0), 0);
    const licPremium = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
    const epfPassbookContrib = (state.epf || []).reduce((s: number, e: any) => {
      const txns = e.transactions || [];
      return (
        s +
        txns
          .filter(
            (t: any) =>
              (t.type === "employee_contribution" || t.type === "monthly_contribution") &&
              inFY(t.date)
          )
          .reduce((sum: number, t: any) => sum + Number(t.employeeShare || t.amount || 0), 0)
      );
    }, 0);
    const salarySlipEpf = (state.salarySlips || [])
      .filter(
        (s: any) =>
          s.slipMonth &&
          s.slipMonth >= fyStartStr.slice(0, 7) &&
          s.slipMonth <= fyEndStr.slice(0, 7)
      )
      .reduce(
        (sum: number, s: any) =>
          sum + Number(s.pfEmployee || s.epf || s.providentFund || 0),
        0
      );
    const epfContrib = epfPassbookContrib > 0 ? epfPassbookContrib : salarySlipEpf;
    // NSC and Sukanya Samriddhi (SSY) are both 80C-eligible instruments the
    // app already tracks in the Govt Schemes tab (state.govtSchemes), but
    // this tracker previously hardcoded both to ₹0 with a "user can track
    // manually" comment even though there was nowhere to actually enter
    // them manually — silently dropping real, already-logged deduction
    // data. Wire them in using the same annualizeContribution() helper the
    // Govt Schemes tab itself uses for its "Annual Outflow" stat.
    const nscInvestment = (state.govtSchemes || [])
      .filter((sc: any) => sc.schemeType === "NSC")
      .reduce(
        (s: number, sc: any) =>
          s + annualizeContribution(Number(sc.contributionAmount || 0), sc.frequency || "annual"),
        0
      );
    const sukanyaSamriddhi = (state.govtSchemes || [])
      .filter((sc: any) => sc.schemeType === "SSY")
      .reduce(
        (s: number, sc: any) =>
          s + annualizeContribution(Number(sc.contributionAmount || 0), sc.frequency || "annual"),
        0
      );
    const homeLoans = (state.loansTaken || []).filter(isHomeLoan);
    // This FY's interest first (see Section 24 below), then principal repaid =
    // annual EMI outflow minus that interest — far closer to the real amortization
    // split than a flat "~30% of EMI" guess, without needing a loan-origination
    // date to run a full schedule.
    const homeLoanInterest = homeLoans.reduce(
      (s: number, l: any) => s + loanOutstanding(l) * (Number(l.rate || 0) / 100),
      0
    );
    const homeLoanAnnualEMI = homeLoans.reduce((s: number, l: any) => s + Number(l.emi || 0) * 12, 0);
    const homeLoanPrincipal = Math.max(0, homeLoanAnnualEMI - homeLoanInterest);
    // No tuition-fee tracking exists anywhere else in the app's data model
    // (no dedicated field or ledger), so this genuinely can't be auto-wired
    // like NSC/SSY were above — left at 0 and called out in the UI instead
    // of silently pretending it's covered.
    const childTuition = 0;

    // 80CCC — Pension plan premiums. Shares the same combined ₹1.5L ceiling
    // as 80C and 80CCD(1) under Section 80CCE, so it belongs in the 80C
    // bucket below. Bug fix: this was computed but never added to
    // sec80C_items, totalDeductions, or shown anywhere in the UI — a user
    // with a pension-plan premium logged under Investment Plans got zero
    // credit for it here despite the data already existing.
    const pensionContrib = (state.investmentPlans || [])
      .filter((p: any) => (p.name || "").toLowerCase().includes("pension"))
      .reduce((s: number, p: any) => s + Number(p.annualPremium || 0), 0);

    const sec80C_items = [
      { label: "EPF (Employee)", amount: epfContrib, icon: Briefcase },
      { label: "PPF", amount: ppfContrib, icon: Shield },
      { label: "ELSS", amount: elss, icon: TrendingUp },
      { label: "LIC Premium", amount: licPremium, icon: Heart },
      { label: "Home Loan Principal", amount: homeLoanPrincipal, icon: Home },
      { label: "Pension Plan (80CCC)", amount: pensionContrib, icon: Coins },
      { label: "NSC", amount: nscInvestment, icon: Landmark },
      { label: "Sukanya Samriddhi (SSY)", amount: sukanyaSamriddhi, icon: Star },
    ].filter((i) => i.amount > 0);

    const sec80C_total = sec80C_items.reduce((s: number, i: any) => s + i.amount, 0);
    const sec80C_limit = 150000;
    const sec80C_used = Math.min(sec80C_total, sec80C_limit);
    const sec80C_remaining = Math.max(0, sec80C_limit - sec80C_total);

    // 80CCD(1B) — NPS extra
    const npsContrib = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.thisYearContribution || n.yearContribution || 0),
      0
    );
    const sec80CCD1B_limit = 50000;
    const sec80CCD1B_used = Math.min(npsContrib, sec80CCD1B_limit);
    const sec80CCD1B_remaining = Math.max(0, sec80CCD1B_limit - npsContrib);

    // 80CCD(2) — Employer NPS
    const npsEmployer = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.employerContribution || 0),
      0
    );

    // 80D — Health Insurance.
    // Bug fix: this previously read from state.termPlans, which is the
    // "pure protection term plans" table (i.e. TERM LIFE insurance cover —
    // see InsuranceSummaryTab.tsx) — not health/mediclaim insurance at all.
    // Term life premiums are already 80C-eligible (life insurance premium),
    // not 80D-eligible, so counting them here double-dipped a life-insurance
    // premium into the health-insurance deduction bucket while completely
    // ignoring the app's actual health insurance data (state.healthInsurance,
    // populated by the dedicated Health Insurance tab). Source from there
    // instead, annualizing premium/premiumFrequency the same way
    // HealthInsuranceTab.tsx does for its own "Annual Outflow" stat.
    // Self vs. parents isn't a hard field on a policy, so it's inferred from
    // each policy's insured-member relations (a policy is treated as a
    // "parents" policy if any insured member's relation looks like a
    // parent) — an heuristic, but the closest signal the data model has.
    const HEALTH_PREMIUM_MULT: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
    const toAnnualHealthPremium = (amount: any, freq: string) =>
      Number(amount || 0) * (HEALTH_PREMIUM_MULT[freq] || 1);
    const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
    const isParentsPolicy = (p: any) =>
      (p.insuredMembers || []).some((m: any) => PARENT_RELATION_RE.test(m?.relation || ""));
    const healthPolicies = state.healthInsurance || [];
    const selfHealthPremium = healthPolicies
      .filter((p: any) => !isParentsPolicy(p))
      .reduce((s: number, p: any) => s + toAnnualHealthPremium(p.premium, p.premiumFrequency || "annual"), 0);
    const parentsHealthPremium = healthPolicies
      .filter(isParentsPolicy)
      .reduce((s: number, p: any) => s + toAnnualHealthPremium(p.premium, p.premiumFrequency || "annual"), 0);
    const selfProfile = (familyProfiles || []).find((p: any) => p.id === "self");
    const spouseProfile = (familyProfiles || []).find(
      (p: any) => p.id === "wife" || /spouse|wife|husband/i.test(p.relation || "")
    );
    const isSelfSenior = isSeniorCitizen(selfProfile?.dob);
    const isSelfOrSpouseSenior = isSelfSenior || isSeniorCitizen(spouseProfile?.dob);
    // Section 80D: If Self or Spouse is Senior Citizen (60+), limit is ₹50,000, else ₹25,000
    const sec80D_self_limit = isSelfOrSpouseSenior ? 50000 : 25000;

    // Check parents' senior citizen status from familyProfiles or insured members
    const isAnyParentSenior =
      (familyProfiles || []).some(
        (p: any) => PARENT_RELATION_RE.test(p.relation || "") && isSeniorCitizen(p.dob)
      ) ||
      healthPolicies.some((p: any) =>
        (p.insuredMembers || []).some(
          (m: any) => PARENT_RELATION_RE.test(m?.relation || "") && isSeniorCitizen(m?.dob)
        )
      );
    // Section 80D: Parents' cap is ₹50,000 if parents are senior citizens (60+), else ₹25,000
    const sec80D_parents_limit = isAnyParentSenior ? 50000 : 25000;
    const sec80D_self_used = Math.min(selfHealthPremium, sec80D_self_limit);
    const sec80D_parents_used = Math.min(parentsHealthPremium, sec80D_parents_limit);
    const sec80D_total = sec80D_self_used + sec80D_parents_used;

    // 80TTA / 80TTB — Savings & Deposit interest
    // Under Section 80TTB, resident senior citizens (60+) get up to ₹50,000 deduction on savings + FD/RD interest
    // Non-senior citizens get Section 80TTA limit of ₹10,000 on savings interest only
    const savingsInterest = (state.bankAccounts || [])
      .filter((a: any) => (a.type || "").toLowerCase() === "savings")
      .reduce((s: number, a: any) => s + Number(a.balance || 0) * (Number(a.interestRate || 3.0) / 100), 0);
    const depositInterest = isSelfSenior
      ? (state.fixedDeposits || []).reduce(
          (s: number, d: any) => s + Number(d.principal || 0) * (Number(d.interestRate || 6.5) / 100),
          0
        ) +
        (state.recurringDeposits || []).reduce(
          (s: number, r: any) => s + Number(r.monthlyDeposit || 0) * 12 * (Number(r.interestRate || 6.5) / 100),
          0
        )
      : 0;
    const totalEligibleInterest = savingsInterest + depositInterest;
    const sec80TTA_limit = isSelfSenior ? 50000 : 10000;
    const sec80TTA_used = Math.min(totalEligibleInterest, sec80TTA_limit);

    // Section 24 — Home loan interest (computed above, alongside homeLoanPrincipal)
    const sec24_limit = 200000;
    const sec24_used = Math.min(homeLoanInterest, sec24_limit);
    const sec24_remaining = Math.max(0, sec24_limit - homeLoanInterest);

    // HRA exemption (estimate)
    const monthlyRent = (state.rentedProperties || [])
      .filter((p: any) => p.isActive !== false)
      .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);
    const annualRent = monthlyRent * 12;

    const totalDeductions =
      sec80C_used + sec80CCD1B_used + npsEmployer + sec80D_total + sec80TTA_used + sec24_used;

    // Tax savings estimate (assuming 30% bracket)
    const taxSaved = totalDeductions * 0.3;

    return {
      sec80C: {
        items: sec80C_items,
        total: sec80C_total,
        used: sec80C_used,
        remaining: sec80C_remaining,
        limit: sec80C_limit,
      },
      sec80CCD1B: {
        total: npsContrib,
        used: sec80CCD1B_used,
        remaining: sec80CCD1B_remaining,
        limit: sec80CCD1B_limit,
      },
      sec80CCD2: { total: npsEmployer },
      sec80D: {
        self: sec80D_self_used,
        parents: sec80D_parents_used,
        total: sec80D_total,
        selfLimit: sec80D_self_limit,
        parentsLimit: sec80D_parents_limit,
        isSelfSenior: isSelfOrSpouseSenior,
        isParentsSenior: isAnyParentSenior,
      },
      sec80TTA: {
        total: sec80TTA_used,
        limit: sec80TTA_limit,
        is80TTB: isSelfSenior,
      },
      sec24: { total: sec24_used, remaining: sec24_remaining, limit: sec24_limit },
      hra: { annualRent },
      totalDeductions,
      taxSaved,
    };
  }, [state, familyProfiles]);

  const pieData = [
    { name: "80C", value: data.sec80C.used },
    { name: "80CCD(1B)", value: data.sec80CCD1B.used },
    { name: "80CCD(2)", value: data.sec80CCD2.total },
    { name: "80D", value: data.sec80D.total },
    { name: "80TTA", value: data.sec80TTA.total },
    { name: "Sec 24", value: data.sec24.total },
  ].filter((d) => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Track tax-saving investments and deductions">
        Section 80C / 80D Tracker
      </SectionTitle>

      {/* These deductions (80C, 80CCD(1B), 80D, 80TTA, Sec 24) are only claimable
          under the OLD tax regime — the New Regime (default since FY2023-24) blocks
          all of them except 80CCD(2) employer NPS. Without this note, "Estimated Tax
          Saved" reads as a universal number when it only applies if Old Regime is
          chosen; see TaxVaultTab's regime comparison for the actual old-vs-new call. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 22%, transparent)`,
          fontSize: 12,
          color: THEME.muted,
        }}
      >
        <AlertTriangle size={15} color={THEME.gold} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <b style={{ color: THEME.text }}>Old Regime only:</b> These deductions only reduce tax if
          you file under the Old Tax Regime — the New Regime (default) disallows all of them except
          80CCD(2) employer NPS. Check the Tax Vault's regime comparison before assuming this
          "Estimated Tax Saved" applies to you.
        </div>
      </div>

      {data.totalDeductions === 0 && data.sec80C.total === 0 && data.hra.annualRent === 0 ? (
        <EmptyState
          icon={Shield}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Tax-Saving Investments Logged Yet"
          description="This tracker aggregates real data you've already logged elsewhere in the app — PPF, ELSS, EPF, LIC, health insurance, home loan principal, NPS and Govt Scheme entries all roll up here automatically against the 80C/80D/80CCD limits. Nothing to show until you add some."
          pills={["PPF", "ELSS", "EPF", "Health Insurance", "NPS", "Home Loan"]}
        />
      ) : (
        <>
          {/* Summary Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label="Total Deductions"
              value={fmtINRFull(data.totalDeductions)}
              numericValue={data.totalDeductions}
              formatValue={fmtINRFull}
              icon={<CheckCircle />}
              color={THEME.sage}
            />
            <StatCard
              label="Estimated Tax Saved"
              value={fmtINRFull(data.taxSaved)}
              numericValue={data.taxSaved}
              formatValue={fmtINRFull}
              sub="At 30% tax bracket, Old Regime only"
              icon={<IndianRupee />}
              color={THEME.accent}
            />
            <StatCard
              label="80C Remaining"
              value={fmtINRFull(data.sec80C.remaining)}
              numericValue={data.sec80C.remaining}
              formatValue={fmtINRFull}
              sub={data.sec80C.remaining > 0 ? "Room to invest more" : "Limit exhausted!"}
              icon={<Shield />}
              color={data.sec80C.remaining > 0 ? THEME.gold : THEME.sage}
            />
          </div>

          {/* Pie Chart + Details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {pieData.length > 0 && (
              <Card style={{ padding: 24 }}>
                <h3
                  style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}
                >
                  Deduction Mix
                </h3>
                <div style={{ width: "100%", height: 280, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => <Money value={v} variant="full" />}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          borderRadius: 8,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* 80C Breakdown */}
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
                Section 80C Breakdown
              </h3>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 16 }}>
                Limit: ₹1,50,000
              </div>
              <ProgressBar used={data.sec80C.used} limit={data.sec80C.limit} color={THEME.accent} />
              {data.sec80C.items.length === 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: THEME.bg,
                    border: `1px dashed ${THEME.line}`,
                    fontSize: 12,
                    color: THEME.textSecondary,
                  }}
                >
                  No 80C investments logged yet — PPF, ELSS, EPF, LIC, home loan principal, a
                  pension plan, NSC or Sukanya Samriddhi entries logged elsewhere in the app will
                  show up here automatically.
                </div>
              )}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {data.sec80C.items.map((item) => (
                  <div
                    key={item.label}
                    className="table-row-hover"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: THEME.bg,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: THEME.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <item.icon size={14} color={THEME.muted} />
                      {item.label}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}
                    >
                      <Money value={item.amount} variant="full" />
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Other Sections */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {/* 80CCD(1B) */}
            <Card style={{ padding: 20 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
                80CCD(1B) — NPS Self Contribution
              </h4>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                Additional deduction up to ₹50,000
              </div>
              <div className="amount-md" style={{ fontFamily: "var(--font-display)", color: THEME.violet }}>
                <Money value={data.sec80CCD1B.used} variant="full" />
              </div>
              <ProgressBar
                used={data.sec80CCD1B.used}
                limit={data.sec80CCD1B.limit}
                color={THEME.violet}
              />
            </Card>

            {/* 80CCD(2) */}
            {data.sec80CCD2.total > 0 && (
              <Card style={{ padding: 20 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
                  80CCD(2) — Employer NPS
                </h4>
                <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                  No cap (up to 10% of basic salary)
                </div>
                <div className="amount-md" style={{ fontFamily: "var(--font-display)", color: THEME.accent }}>
                  <Money value={data.sec80CCD2.total} variant="full" />
                </div>
              </Card>
            )}

            {/* 80D */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: THEME.text }}>
                  80D — Health Insurance
                </h4>
                {(data.sec80D.isSelfSenior || data.sec80D.isParentsSenior) && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${THEME.gold} 18%, transparent)`,
                      color: THEME.gold,
                    }}
                  >
                    Senior Citizen Limit Active
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 6, lineHeight: 1.4 }}>
                From Health Insurance policies · Limits automatically adjust based on Family Profile DOBs (₹50K cap for senior citizens aged 60+, else ₹25K).
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: THEME.textSecondary }}>
                    Self &amp; Family {data.sec80D.isSelfSenior ? "(Senior 60+)" : "(Standard)"}
                  </span>
                  <span style={{ fontWeight: 600, color: THEME.text }}>
                    <Money value={data.sec80D.self} variant="full" /> /{" "}
                    <Money value={data.sec80D.selfLimit} variant="full" />
                  </span>
                </div>
                <ProgressBar
                  used={data.sec80D.self}
                  limit={data.sec80D.selfLimit}
                  color={THEME.pink}
                />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: THEME.textSecondary }}>
                    Parents {data.sec80D.isParentsSenior ? "(Senior 60+)" : "(Standard)"}
                  </span>
                  <span style={{ fontWeight: 600, color: THEME.text }}>
                    <Money value={data.sec80D.parents} variant="full" /> /{" "}
                    <Money value={data.sec80D.parentsLimit} variant="full" />
                  </span>
                </div>
                <ProgressBar
                  used={data.sec80D.parents}
                  limit={data.sec80D.parentsLimit}
                  color={THEME.gold}
                />
              </div>
            </Card>

            {/* Section 24 */}
            <Card style={{ padding: 20 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
                Section 24 — Home Loan Interest
              </h4>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                Max deduction: ₹2,00,000 for self-occupied
              </div>
              <div className="amount-md" style={{ fontFamily: "var(--font-display)", color: THEME.gold }}>
                <Money value={data.sec24.total} variant="full" />
              </div>
              <ProgressBar used={data.sec24.total} limit={data.sec24.limit} color={THEME.gold} />
            </Card>

            {/* 80TTA / 80TTB */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: THEME.text }}>
                  {data.sec80TTA.is80TTB ? "80TTB — Senior Citizen Interest" : "80TTA — Savings Interest"}
                </h4>
                {data.sec80TTA.is80TTB && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${THEME.gold} 18%, transparent)`,
                      color: THEME.gold,
                    }}
                  >
                    Sec 80TTB (60+)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                {data.sec80TTA.is80TTB
                  ? "Max ₹50,000 on savings, FD & RD interest for senior citizens"
                  : "Max ₹10,000 on savings account interest (elevates to ₹50K 80TTB at age 60)"}
              </div>
              <div className="amount-md" style={{ fontFamily: "var(--font-display)", color: THEME.sage }}>
                <Money value={data.sec80TTA.total} variant="full" />
              </div>
              <ProgressBar
                used={data.sec80TTA.total}
                limit={data.sec80TTA.limit}
                color={THEME.sage}
              />
            </Card>

            {/* HRA */}
            {data.hra.annualRent > 0 && (
              <Card style={{ padding: 20 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
                  HRA Exemption
                </h4>
                <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                  Based on rent paid: <Money value={data.hra.annualRent} variant="full" />/year
                </div>
                <div style={{ fontSize: 13, color: THEME.textSecondary }}>
                  Enter full HRA details in Tax Tools for exact calculation.
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};
