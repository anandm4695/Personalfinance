// @ts-nocheck
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
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, isHomeLoan, loanOutstanding } from "../../utils/finance";
import { getCurrentFY } from "../../utils/appConstants";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

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
      <span>{fmtINRFull(used)} used</span>
      <span>{fmtINRFull(Math.max(0, limit - used))} remaining</span>
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

export const Section80TrackerTab = ({ state, metrics }) => {
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
    const ppfLedgerThisYear = (state.ppfLedger || [])
      .filter(
        (t) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const ppfContrib =
      ppfLedgerThisYear > 0
        ? ppfLedgerThisYear
        : (state.ppf || []).reduce((s, p) => s + Number(p.thisYearContribution || 0), 0);
    const elss = (state.mutualFunds || [])
      .filter((m) => (m.category || m.type || "").toLowerCase().includes("elss"))
      .reduce((s, m) => s + Number(m.invested || 0), 0);
    const licPremium = (state.lic || []).reduce((s, l) => s + Number(l.annualPremium || 0), 0);
    const epfContrib = (state.epf || []).reduce((s, e) => {
      const txns = e.transactions || [];
      return (
        s +
        txns
          .filter((t) => t.type === "employee_contribution" || t.type === "monthly_contribution")
          .reduce((sum, t) => sum + Number(t.employeeShare || t.amount || 0), 0)
      );
    }, 0);
    const homeLoans = (state.loansTaken || []).filter(isHomeLoan);
    // This FY's interest first (see Section 24 below), then principal repaid =
    // annual EMI outflow minus that interest — far closer to the real amortization
    // split than a flat "~30% of EMI" guess, without needing a loan-origination
    // date to run a full schedule.
    const homeLoanInterest = homeLoans.reduce(
      (s, l) => s + loanOutstanding(l) * (Number(l.rate || 0) / 100),
      0
    );
    const homeLoanAnnualEMI = homeLoans.reduce((s, l) => s + Number(l.emi || 0) * 12, 0);
    const homeLoanPrincipal = Math.max(0, homeLoanAnnualEMI - homeLoanInterest);
    const childTuition = 0; // User can track manually
    const nscInvestment = 0;
    const sukanyaSamriddhi = 0;

    const sec80C_items = [
      { label: "EPF (Employee)", amount: epfContrib, icon: Briefcase },
      { label: "PPF", amount: ppfContrib, icon: Shield },
      { label: "ELSS", amount: elss, icon: TrendingUp },
      { label: "LIC Premium", amount: licPremium, icon: Heart },
      { label: "Home Loan Principal", amount: homeLoanPrincipal, icon: Home },
    ].filter((i) => i.amount > 0);

    const sec80C_total = sec80C_items.reduce((s, i) => s + i.amount, 0);
    const sec80C_limit = 150000;
    const sec80C_used = Math.min(sec80C_total, sec80C_limit);
    const sec80C_remaining = Math.max(0, sec80C_limit - sec80C_total);

    // 80CCC — Pension
    const pensionContrib = (state.investmentPlans || [])
      .filter((p) => (p.name || "").toLowerCase().includes("pension"))
      .reduce((s, p) => s + Number(p.annualPremium || 0), 0);

    // 80CCD(1B) — NPS extra
    const npsContrib = (state.nps || []).reduce(
      (s, n) => s + Number(n.thisYearContribution || n.yearContribution || 0),
      0
    );
    const sec80CCD1B_limit = 50000;
    const sec80CCD1B_used = Math.min(npsContrib, sec80CCD1B_limit);
    const sec80CCD1B_remaining = Math.max(0, sec80CCD1B_limit - npsContrib);

    // 80CCD(2) — Employer NPS
    const npsEmployer = (state.nps || []).reduce(
      (s, n) => s + Number(n.employerContribution || 0),
      0
    );

    // 80D — Health Insurance
    const selfHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() !== "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const parentsHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() === "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const sec80D_self_limit = 25000;
    // Sec 80D parents' cap is ₹50,000 only if the parents are senior citizens
    // (60+), else ₹25,000. There's no senior-citizen flag tracked anywhere in
    // the data model (termPlans has no age/DOB field), so defaulting to the
    // higher ₹50,000 cap would silently overstate the deduction — and thus
    // "Total Deductions" / "Estimated Tax Saved" — for anyone whose parents
    // aren't senior citizens. Default to the safe, non-senior-citizen cap.
    const sec80D_parents_limit = 25000;
    const sec80D_self_used = Math.min(selfHealthPremium, sec80D_self_limit);
    const sec80D_parents_used = Math.min(parentsHealthPremium, sec80D_parents_limit);
    const sec80D_total = sec80D_self_used + sec80D_parents_used;

    // 80TTA — Savings interest
    const savingsInterest = (state.bankAccounts || [])
      .filter((a) => (a.type || "").toLowerCase() === "savings")
      .reduce((s, a) => s + Math.min(Number(a.balance || 0) * 0.03, 10000), 0);
    const sec80TTA_limit = 10000;
    const sec80TTA_used = Math.min(savingsInterest, sec80TTA_limit);

    // Section 24 — Home loan interest (computed above, alongside homeLoanPrincipal)
    const sec24_limit = 200000;
    const sec24_used = Math.min(homeLoanInterest, sec24_limit);
    const sec24_remaining = Math.max(0, sec24_limit - homeLoanInterest);

    // HRA exemption (estimate)
    const monthlyRent = (state.rentedProperties || []).reduce(
      (s, p) => s + Number(p.monthlyRent || 0),
      0
    );
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
      },
      sec80TTA: { total: sec80TTA_used, limit: sec80TTA_limit },
      sec24: { total: sec24_used, remaining: sec24_remaining, limit: sec24_limit },
      hra: { annualRent },
      totalDeductions,
      taxSaved,
    };
  }, [state]);

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
          padding: "10px 14px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 22%, transparent)`,
          fontSize: 12,
          color: THEME.muted,
        }}
      >
        <b style={{ color: THEME.text }}>Old Regime only:</b> These deductions only reduce tax if
        you file under the Old Tax Regime — the New Regime (default) disallows all of them except
        80CCD(2) employer NPS. Check the Tax Vault's regime comparison before assuming this
        "Estimated Tax Saved" applies to you.
      </div>

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
          icon={<CheckCircle />}
          color={THEME.sage}
        />
        <StatCard
          label="Estimated Tax Saved"
          value={fmtINRFull(data.taxSaved)}
          sub="At 30% tax bracket"
          icon={<IndianRupee />}
          color={THEME.accent}
        />
        <StatCard
          label="80C Remaining"
          value={fmtINRFull(data.sec80C.remaining)}
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
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
              Deduction Mix
            </h3>
            <div style={{ width: "100%", height: 280, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtINRFull(v)}
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
            </ResponsiveContainer></div>
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
                  <Prv>{fmtINRFull(item.amount)}</Prv>
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
          <div className="amount-md" style={{ color: THEME.violet }}>
            <Prv>{fmtINRFull(data.sec80CCD1B.used)}</Prv>
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
            <div className="amount-md" style={{ color: THEME.accent }}>
              <Prv>{fmtINRFull(data.sec80CCD2.total)}</Prv>
            </div>
          </Card>
        )}

        {/* 80D */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
            80D — Health Insurance
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>Self & Family</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Prv>{fmtINRFull(data.sec80D.self)}</Prv> / {fmtINRFull(data.sec80D.selfLimit)}
              </span>
            </div>
            <ProgressBar used={data.sec80D.self} limit={data.sec80D.selfLimit} color={THEME.pink} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>Parents</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Prv>{fmtINRFull(data.sec80D.parents)}</Prv> /{" "}
                {fmtINRFull(data.sec80D.parentsLimit)}
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
          <div className="amount-md" style={{ color: THEME.gold }}>
            <Prv>{fmtINRFull(data.sec24.total)}</Prv>
          </div>
          <ProgressBar used={data.sec24.total} limit={data.sec24.limit} color={THEME.gold} />
        </Card>

        {/* 80TTA */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>
            80TTA — Savings Interest
          </h4>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
            Max: ₹10,000 on savings account interest
          </div>
          <div className="amount-md" style={{ color: THEME.sage }}>
            <Prv>{fmtINRFull(data.sec80TTA.total)}</Prv>
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
              Based on rent paid: {fmtINRFull(data.hra.annualRent)}/year
            </div>
            <div style={{ fontSize: 13, color: THEME.textSecondary }}>
              Enter full HRA details in Tax Tools for exact calculation.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
