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
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];

export const Section80TrackerTab = ({ state, metrics }) => {
  const data = useMemo(() => {
    // 80C components
    const ppfContrib = (state.ppf || []).reduce((s, p) => s + Number(p.thisYearContribution || 0), 0);
    const elss = (state.mutualFunds || [])
      .filter((m) => (m.category || m.type || "").toLowerCase().includes("elss"))
      .reduce((s, m) => s + Number(m.invested || 0), 0);
    const licPremium = (state.lic || []).reduce((s, l) => s + Number(l.annualPremium || 0), 0);
    const epfContrib = (state.epf || []).reduce((s, e) => {
      const txns = e.transactions || [];
      return s + txns.filter((t) => t.type === "employee").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }, 0);
    const homeLoanPrincipal = (state.loansTaken || [])
      .filter((l) => (l.type || "").toLowerCase().includes("home"))
      .reduce((s, l) => s + Number(l.emi || 0) * 12 * 0.3, 0); // ~30% of EMI is principal early on
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
    const npsContrib = (state.nps || []).reduce((s, n) => s + Number(n.thisYearContribution || n.yearContribution || 0), 0);
    const sec80CCD1B_limit = 50000;
    const sec80CCD1B_used = Math.min(npsContrib, sec80CCD1B_limit);
    const sec80CCD1B_remaining = Math.max(0, sec80CCD1B_limit - npsContrib);

    // 80CCD(2) — Employer NPS
    const npsEmployer = (state.nps || []).reduce((s, n) => s + Number(n.employerContribution || 0), 0);

    // 80D — Health Insurance
    const selfHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() !== "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const parentsHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() === "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const sec80D_self_limit = 25000;
    const sec80D_parents_limit = 50000; // 50k if parents are senior citizens
    const sec80D_self_used = Math.min(selfHealthPremium, sec80D_self_limit);
    const sec80D_parents_used = Math.min(parentsHealthPremium, sec80D_parents_limit);
    const sec80D_total = sec80D_self_used + sec80D_parents_used;

    // 80TTA — Savings interest
    const savingsInterest = (state.bankAccounts || [])
      .filter((a) => (a.type || "").toLowerCase() === "savings")
      .reduce((s, a) => s + Math.min(Number(a.balance || 0) * 0.03, 10000), 0);
    const sec80TTA_limit = 10000;
    const sec80TTA_used = Math.min(savingsInterest, sec80TTA_limit);

    // Section 24 — Home loan interest
    const homeLoanInterest = (state.loansTaken || [])
      .filter((l) => (l.type || "").toLowerCase().includes("home"))
      .reduce((s, l) => s + Number(l.outstanding || l.principal || 0) * (Number(l.rate || 0) / 100), 0);
    const sec24_limit = 200000;
    const sec24_used = Math.min(homeLoanInterest, sec24_limit);
    const sec24_remaining = Math.max(0, sec24_limit - homeLoanInterest);

    // HRA exemption (estimate)
    const monthlyRent = (state.rentedProperties || []).reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
    const annualRent = monthlyRent * 12;

    const totalDeductions = sec80C_used + sec80CCD1B_used + npsEmployer + sec80D_total + sec80TTA_used + sec24_used;

    // Tax savings estimate (assuming 30% bracket)
    const taxSaved = totalDeductions * 0.3;

    return {
      sec80C: { items: sec80C_items, total: sec80C_total, used: sec80C_used, remaining: sec80C_remaining, limit: sec80C_limit },
      sec80CCD1B: { total: npsContrib, used: sec80CCD1B_used, remaining: sec80CCD1B_remaining, limit: sec80CCD1B_limit },
      sec80CCD2: { total: npsEmployer },
      sec80D: { self: sec80D_self_used, parents: sec80D_parents_used, total: sec80D_total, selfLimit: sec80D_self_limit, parentsLimit: sec80D_parents_limit },
      sec80TTA: { total: sec80TTA_used, limit: sec80TTA_limit },
      sec24: { total: sec24_used, remaining: sec24_remaining, limit: sec24_limit },
      hra: { annualRent },
      totalDeductions, taxSaved,
    };
  }, [state]);

  const ProgressBar = ({ used, limit, color }) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textSecondary, marginBottom: 4 }}>
        <span>{fmtINRFull(used)} used</span>
        <span>{fmtINRFull(Math.max(0, limit - used))} remaining</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: THEME.border, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (used / limit) * 100)}%`, borderRadius: 4, background: color, transition: "width 0.5s" }} />
      </div>
    </div>
  );

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
      <SectionTitle sub="Track tax-saving investments and deductions">Section 80C / 80D Tracker</SectionTitle>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Card style={{ padding: 20, background: "#10B98108", border: "1px solid #10B98130" }}>
          <div style={{ fontSize: 12, color: THEME.textSecondary }}>Total Deductions</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#10B981" }}><Prv>{fmtINRFull(data.totalDeductions)}</Prv></div>
        </Card>
        <Card style={{ padding: 20, background: "var(--accent)08", border: "1px solid var(--accent)30" }}>
          <div style={{ fontSize: 12, color: THEME.textSecondary }}>Estimated Tax Saved</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}><Prv>{fmtINRFull(data.taxSaved)}</Prv></div>
          <div style={{ fontSize: 11, color: THEME.textSecondary }}>At 30% tax bracket</div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: THEME.textSecondary }}>80C Remaining</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: data.sec80C.remaining > 0 ? "#F59E0B" : "#10B981" }}>
            <Prv>{fmtINRFull(data.sec80C.remaining)}</Prv>
          </div>
          <div style={{ fontSize: 11, color: THEME.textSecondary }}>
            {data.sec80C.remaining > 0 ? "Room to invest more" : "Limit exhausted!"}
          </div>
        </Card>
      </div>

      {/* Pie Chart + Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {pieData.length > 0 && (
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Deduction Mix</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtINRFull(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* 80C Breakdown */}
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Section 80C Breakdown</h3>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 16 }}>Limit: ₹1,50,000</div>
          <ProgressBar used={data.sec80C.used} limit={data.sec80C.limit} color="#3B82F6" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {data.sec80C.items.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: THEME.bg }}>
                <span style={{ fontSize: 13, color: THEME.text }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}><Prv>{fmtINRFull(item.amount)}</Prv></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Other Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {/* 80CCD(1B) */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>80CCD(1B) — NPS Self Contribution</h4>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Additional deduction up to ₹50,000</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#8B5CF6" }}><Prv>{fmtINRFull(data.sec80CCD1B.used)}</Prv></div>
          <ProgressBar used={data.sec80CCD1B.used} limit={data.sec80CCD1B.limit} color="#8B5CF6" />
        </Card>

        {/* 80CCD(2) */}
        {data.sec80CCD2.total > 0 && (
          <Card style={{ padding: 20 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>80CCD(2) — Employer NPS</h4>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>No cap (up to 10% of basic salary)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#6366F1" }}><Prv>{fmtINRFull(data.sec80CCD2.total)}</Prv></div>
          </Card>
        )}

        {/* 80D */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>80D — Health Insurance</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>Self & Family</span>
              <span style={{ fontWeight: 600, color: THEME.text }}><Prv>{fmtINRFull(data.sec80D.self)}</Prv> / {fmtINRFull(data.sec80D.selfLimit)}</span>
            </div>
            <ProgressBar used={data.sec80D.self} limit={data.sec80D.selfLimit} color="#EC4899" />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>Parents</span>
              <span style={{ fontWeight: 600, color: THEME.text }}><Prv>{fmtINRFull(data.sec80D.parents)}</Prv> / {fmtINRFull(data.sec80D.parentsLimit)}</span>
            </div>
            <ProgressBar used={data.sec80D.parents} limit={data.sec80D.parentsLimit} color="#F59E0B" />
          </div>
        </Card>

        {/* Section 24 */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>Section 24 — Home Loan Interest</h4>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Max deduction: ₹2,00,000 for self-occupied</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#F59E0B" }}><Prv>{fmtINRFull(data.sec24.total)}</Prv></div>
          <ProgressBar used={data.sec24.total} limit={data.sec24.limit} color="#F59E0B" />
        </Card>

        {/* 80TTA */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>80TTA — Savings Interest</h4>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Max: ₹10,000 on savings account interest</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#14B8A6" }}><Prv>{fmtINRFull(data.sec80TTA.total)}</Prv></div>
          <ProgressBar used={data.sec80TTA.total} limit={data.sec80TTA.limit} color="#14B8A6" />
        </Card>

        {/* HRA */}
        {data.hra.annualRent > 0 && (
          <Card style={{ padding: 20 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: THEME.text }}>HRA Exemption</h4>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Based on rent paid: {fmtINRFull(data.hra.annualRent)}/year</div>
            <div style={{ fontSize: 13, color: THEME.textSecondary }}>
              Enter full HRA details in Tax Tools for exact calculation.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
