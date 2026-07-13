/* eslint-disable */
// @ts-nocheck
import React, { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Shield,
  Landmark,
  Repeat,
  FileText,
  Briefcase,
  Activity,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  calcXIRR,
  fmtINRFull,
  fmtINRExact,
  today,
  fdMaturity,
  rdMaturity,
  getLocalDateString,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const th: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.muted,
  fontWeight: 800,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: `2px solid ${THEME.line}`,
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 500,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

const xirrColor = (x: number | null): string => {
  if (x === null) return THEME.muted;
  if (x >= 15) return THEME.sage;
  if (x >= 10) return THEME.accent;
  if (x >= 6) return THEME.gold;
  return THEME.rust;
};

const xirrLabel = (x: number | null): string => {
  if (x === null) return "N/A";
  return `${x.toFixed(2)}%`;
};

const holdingLabel = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return "—";
  const days = Math.ceil(
    (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "<1d";
  if (days < 365) return `${days}d`;
  return `${(days / 365).toFixed(1)}y`;
};

/* ─── Premium XIRR Bento Card ─────────────────────────────────── */
const XIRRStatCard = ({ label, value, icon: Icon, color }: any) => {
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderTop: `4px solid ${color || THEME.accent}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `color-mix(in srgb, ${color || THEME.accent} 12%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || THEME.accent,
            flexShrink: 0,
          }}
        >
          {Icon}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      </div>
      <div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: THEME.ink,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

export function XIRRReportTab({ state }: any) {
  const todayStr = today();

  const rows = useMemo(() => {
    const results: any[] = [];

    // ── Fixed Deposits ──────────────────────────────────────────────────
    (state.fixedDeposits || []).forEach((fd: any) => {
      if (!fd.startDate || !fd.principal) return;
      const years = Number(fd.years || 1);
      const matDate =
        fd.maturityDate ||
        (() => {
          const d = new Date(fd.startDate + "T00:00:00");
          d.setFullYear(d.getFullYear() + years);
          return getLocalDateString(d);
        })();

      const isMature = matDate <= todayStr;
      const endDate = isMature ? matDate : todayStr;
      const elapsed =
        (new Date(endDate + "T00:00:00").getTime() -
          new Date(fd.startDate + "T00:00:00").getTime()) /
        (365.25 * 24 * 3600 * 1000);
      // Use the same quarterly-compounding formula (fdMaturity) for both branches —
      // previously the active branch used simple annual compounding while the matured
      // branch used fdMaturity's quarterly compounding, causing a valuation
      // discontinuity right at the maturity boundary.
      const currentVal = isMature
        ? fdMaturity(Number(fd.principal), Number(fd.rate), years)
        : fdMaturity(Number(fd.principal), Number(fd.rate), Math.max(0, elapsed));

      const cashFlows = [
        { date: fd.startDate, amount: -Number(fd.principal) },
        { date: endDate, amount: currentVal },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        name: fd.bank || "FD",
        type: "Fixed Deposit",
        icon: Landmark,
        color: "#6366F1",
        invested: Number(fd.principal),
        currentValue: currentVal,
        startDate: fd.startDate,
        endDate,
        xirr,
        status: isMature ? "matured" : "active",
        owner: fd.owner,
      });
    });

    // ── Recurring Deposits ──────────────────────────────────────────────
    (state.recurringDeposits || []).forEach((rd: any) => {
      if (!rd.startDate || !rd.monthly || !rd.tenureMonths) return;
      const months = Number(rd.tenureMonths);
      const monthly = Number(rd.monthly);

      const cashFlows: any[] = [];
      for (let i = 0; i < months; i++) {
        const d = new Date(rd.startDate + "T00:00:00");
        d.setMonth(d.getMonth() + i);
        const ds = getLocalDateString(d);
        if (ds <= todayStr) cashFlows.push({ date: ds, amount: -monthly });
      }
      if (cashFlows.length === 0) return;

      const matDate =
        rd.maturityDate ||
        (() => {
          const d = new Date(rd.startDate + "T00:00:00");
          d.setMonth(d.getMonth() + months);
          return getLocalDateString(d);
        })();

      const isMature = matDate <= todayStr;
      const paidMonths = cashFlows.length;
      const matAmt = rdMaturity(monthly, Number(rd.rate), months);
      const currentVal = isMature ? matAmt : rdMaturity(monthly, Number(rd.rate), paidMonths);
      const endDate = isMature ? matDate : todayStr;

      cashFlows.push({ date: endDate, amount: currentVal });
      const xirr = calcXIRR(cashFlows);

      results.push({
        name: rd.bank || "RD",
        type: "Recurring Deposit",
        icon: Repeat,
        color: "#8B5CF6",
        invested: monthly * paidMonths,
        currentValue: currentVal,
        startDate: rd.startDate,
        endDate,
        xirr,
        status: isMature ? "matured" : "active",
        owner: rd.owner,
      });
    });

    // ── Mutual Funds ────────────────────────────────────────────────────
    (state.mutualFunds || []).forEach((mf: any) => {
      if (!mf.buyDate || !mf.invested || !mf.units) return;
      const currentVal = Number(mf.units) * Number(mf.currentNav || 0);
      if (currentVal <= 0) return;

      const cashFlows = [
        { date: mf.buyDate, amount: -Number(mf.invested) },
        { date: todayStr, amount: currentVal },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        name: mf.name || mf.scheme || "MF",
        type: "Mutual Fund",
        icon: BarChart3,
        color: "#10B981",
        invested: Number(mf.invested),
        currentValue: currentVal,
        startDate: mf.buyDate,
        endDate: todayStr,
        xirr,
        status: "active",
        owner: mf.owner,
      });
    });

    // ── Stocks ──────────────────────────────────────────────────────────
    (state.stocks || []).forEach((s: any) => {
      const buyDate = s.buyDate || s.purchaseDate;
      if (!buyDate || !s.avgPrice || !s.qty) return;
      const invested = Number(s.avgPrice) * Number(s.qty);
      const currentVal = Number(s.currentPrice || s.avgPrice) * Number(s.qty);

      const cashFlows = [
        { date: buyDate, amount: -invested },
        { date: todayStr, amount: currentVal },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        name: s.symbol || s.name || "Stock",
        type: "Stocks",
        icon: TrendingUp,
        color: "#F59E0B",
        invested,
        currentValue: currentVal,
        startDate: buyDate,
        endDate: todayStr,
        xirr,
        status: "active",
        owner: s.owner,
      });
    });

    // ── PPF ─────────────────────────────────────────────────────────────
    (state.ppf || [])
      .filter((p: any) => !p.type || p.type === "PPF")
      .forEach((p: any) => {
        const txns = (p.transactions || []).filter(
          (t: any) => t.date && (t.type === "deposit" || Number(t.amount) > 0)
        );
        if (txns.length === 0) return;

        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -Math.abs(Number(t.amount)),
        }));
        cashFlows.push({ date: todayStr, amount: Number(p.balance || 0) });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);

        results.push({
          name: p.institution || p.name || "PPF",
          type: "PPF",
          icon: Shield,
          color: "#059669",
          invested,
          currentValue: Number(p.balance || 0),
          startDate: txns[0]?.date,
          endDate: todayStr,
          xirr,
          status: "active",
          owner: p.owner,
        });
      });

    // ── EPF ─────────────────────────────────────────────────────────────
    (state.epf || [])
      .filter((p: any) => p.type === "EPF")
      .forEach((p: any) => {
        const txns = (p.transactions || []).filter(
          (t: any) => t.date && Number(t.employee || 0) > 0
        );
        if (txns.length === 0) return;

        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -Number(t.employee),
        }));
        cashFlows.push({ date: todayStr, amount: Number(p.balance || 0) });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce((s: number, t: any) => s + Number(t.employee), 0);

        results.push({
          name: p.employer || p.institution || "EPF",
          type: "EPF",
          icon: Shield,
          color: "#0891B2",
          invested,
          currentValue: Number(p.balance || 0),
          startDate: txns[0]?.date,
          endDate: todayStr,
          xirr,
          status: "active",
          owner: p.owner,
        });
      });

    // ── NPS ─────────────────────────────────────────────────────────────
    (state.nps || [])
      .filter((p: any) => p.type === "NPS")
      .forEach((p: any) => {
        const txns = (p.transactions || []).filter((t: any) => t.date && Number(t.amount) > 0);
        if (txns.length === 0) return;

        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -Number(t.amount),
        }));
        cashFlows.push({ date: todayStr, amount: Number(p.balance || 0) });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);

        results.push({
          name: `${p.institution || "NPS"}${p.tier ? ` (Tier ${p.tier})` : ""}`,
          type: "NPS",
          icon: Briefcase,
          color: "#7C3AED",
          invested,
          currentValue: Number(p.balance || 0),
          startDate: txns[0]?.date,
          endDate: todayStr,
          xirr,
          status: "active",
          owner: p.owner,
        });
      });

    // ── Bonds ───────────────────────────────────────────────────────────
    (state.bonds || []).forEach((b: any) => {
      const purchaseDate = b.purchaseDate || b.settlementDate;
      if (!purchaseDate || !b.totalInvestmentAmount) return;

      const faceVal = Number(b.totalPrincipalAmount || b.totalInvestmentAmount);
      const couponRate = Number(b.coupon || b.ytmRate || 0) / 100;
      const annualCoupon = faceVal * couponRate;

      const cashFlows: any[] = [{ date: purchaseDate, amount: -Number(b.totalInvestmentAmount) }];

      if (b.maturityDate && annualCoupon > 0) {
        const couponEnd = b.maturityDate < todayStr ? b.maturityDate : todayStr;
        const d = new Date(purchaseDate + "T00:00:00");
        d.setFullYear(d.getFullYear() + 1);
        while (getLocalDateString(d) <= couponEnd) {
          cashFlows.push({
            date: getLocalDateString(d),
            amount: annualCoupon,
          });
          d.setFullYear(d.getFullYear() + 1);
        }
      }

      const isMature = b.maturityDate && b.maturityDate <= todayStr;
      cashFlows.push({
        date: isMature ? b.maturityDate : todayStr,
        amount: faceVal,
      });

      const xirr = calcXIRR(cashFlows);

      results.push({
        name: b.name || b.issuer || "Bond",
        type: "Bonds",
        icon: FileText,
        color: "#0EA5E9",
        invested: Number(b.totalInvestmentAmount),
        currentValue: faceVal,
        startDate: purchaseDate,
        endDate: b.maturityDate || todayStr,
        xirr,
        status: isMature ? "matured" : "active",
        owner: b.owner,
      });
    });

    return results.sort((a, b) => (b.xirr ?? -Infinity) - (a.xirr ?? -Infinity));
  }, [state, todayStr]);

  // Portfolio-level blended XIRR
  const portfolioXIRR = useMemo(() => {
    if (rows.length === 0) return null;
    const flowMap = new Map<string, number>();
    rows.forEach((r) => {
      if (!r.startDate || !r.invested) return;
      flowMap.set(r.startDate, (flowMap.get(r.startDate) || 0) - r.invested);
    });
    const totalCurrent = rows.reduce((s: number, r) => s + (r.currentValue || 0), 0);
    flowMap.set(todayStr, (flowMap.get(todayStr) || 0) + totalCurrent);
    const flows = Array.from(flowMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));
    return calcXIRR(flows);
  }, [rows, todayStr]);

  const totalInvested = rows.reduce((s: number, r) => s + (r.invested || 0), 0);
  const totalCurrent = rows.reduce((s: number, r) => s + (r.currentValue || 0), 0);
  const totalGain = totalCurrent - totalInvested;

  const typeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    rows.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div>
        <SectionTitle sub="Extended Internal Rate of Return across all your investments">
          XIRR Report
        </SectionTitle>
        <EmptyState
          icon={Activity}
          title="No Investment Data"
          description="Add FDs, Mutual Funds, Stocks, PPF, EPF or Bonds with dates to calculate XIRR."
        />
      </div>
    );
  }

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <SectionTitle sub="True annualised return accounting for actual cash flow timing — the only metric that compares across all investment types">
        XIRR Report
      </SectionTitle>

      {/* Summary Bento Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <XIRRStatCard
          label="Portfolio XIRR"
          value={xirrLabel(portfolioXIRR)}
          icon={<Activity size={16} />}
          color={xirrColor(portfolioXIRR)}
        />
        <XIRRStatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          icon={<Coins size={16} />}
          color="var(--accent)"
        />
        <XIRRStatCard
          label="Current Value"
          value={fmtINRFull(totalCurrent)}
          icon={<TrendingUp size={16} />}
          color={THEME.sage}
        />
        <XIRRStatCard
          label="Total Gain / Loss"
          value={(totalGain >= 0 ? "+" : "") + fmtINRFull(Math.abs(totalGain))}
          icon={totalGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          color={totalGain >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* Per-type tables */}
      {Object.entries(typeGroups).map(([type, items]) => {
        const typeInvested = items.reduce((s: number, r) => s + (r.invested || 0), 0);
        const typeCurrent = items.reduce((s: number, r) => s + (r.currentValue || 0), 0);
        const typeGain = typeCurrent - typeInvested;
        const TypeIcon = items[0]?.icon || Activity;

        return (
          <Card key={type} style={{ overflow: "hidden", border: `1.5px solid ${THEME.line}` }}>
            <div style={{ padding: "20px 22px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${items[0]?.color || "var(--accent)"} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: items[0]?.color || "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    <TypeIcon size={14} />
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: THEME.ink,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      background: `color-mix(in srgb, ${items[0]?.color || "var(--accent)"} 10%, transparent)`,
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    fontSize: 12.5,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: THEME.muted, fontWeight: 500 }}>
                    Invested:{" "}
                    <b style={{ color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                      <Prv>{fmtINRExact(typeInvested)}</Prv>
                    </b>
                  </span>
                  <span style={{ color: THEME.muted, fontWeight: 500 }}>
                    Value:{" "}
                    <b style={{ color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                      <Prv>{fmtINRExact(typeCurrent)}</Prv>
                    </b>
                  </span>
                  <span
                    style={{
                      color: typeGain >= 0 ? THEME.sage : THEME.rust,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {typeGain >= 0 ? "+" : ""}
                    <Prv>{fmtINRExact(Math.abs(typeGain))}</Prv>
                  </span>
                </div>
              </div>

              <div
                style={{ overflowX: "auto", border: `1.5px solid ${THEME.line}`, borderRadius: 12 }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      <th style={{ ...th, textAlign: "left" }}>Name</th>
                      <th style={th}>Invested</th>
                      <th style={th}>Current Value</th>
                      <th style={th}>Gain / Loss</th>
                      <th style={th}>Period</th>
                      <th style={th}>XIRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => {
                      const gain = (row.currentValue || 0) - (row.invested || 0);
                      const gainPct = row.invested > 0 ? (gain / row.invested) * 100 : 0;
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "var(--surface-1)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: `${row.color}14`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <row.icon size={14} style={{ color: row.color }} />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    fontSize: 13.5,
                                  }}
                                >
                                  {row.name}
                                </div>
                                {row.owner && row.owner !== "self" && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: THEME.muted,
                                      fontWeight: 500,
                                      marginTop: 2,
                                    }}
                                  >
                                    {row.owner}
                                  </div>
                                )}
                              </div>
                              {row.status === "matured" && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    color: THEME.muted,
                                    border: `1px solid ${THEME.line}`,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  matured
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={td}>
                            <Prv>{fmtINRExact(row.invested)}</Prv>
                          </td>
                          <td style={{ ...td, fontWeight: 700 }}>
                            <Prv>{fmtINRExact(row.currentValue)}</Prv>
                          </td>
                          <td
                            style={{
                              ...td,
                              color: gain >= 0 ? THEME.sage : THEME.rust,
                              fontWeight: 700,
                            }}
                          >
                            <Prv>
                              {gain >= 0 ? "+" : ""}
                              {fmtINRExact(Math.abs(gain))}
                              <span
                                style={{
                                  fontSize: 11,
                                  marginLeft: 5,
                                  opacity: 0.8,
                                  fontWeight: 500,
                                }}
                              >
                                ({gainPct >= 0 ? "+" : ""}
                                {gainPct.toFixed(1)}%)
                              </span>
                            </Prv>
                          </td>
                          <td style={td}>{holdingLabel(row.startDate, row.endDate)}</td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: xirrColor(row.xirr),
                                background: `color-mix(in srgb, ${xirrColor(row.xirr)} 12%, transparent)`,
                                padding: "4px 10px",
                                borderRadius: 8,
                                display: "inline-block",
                              }}
                            >
                              {xirrLabel(row.xirr)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        );
      })}

      {/* XIRR colour guide */}
      <Card style={{ border: `1.5px solid ${THEME.line}` }}>
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: THEME.muted,
            }}
          >
            <Info size={14} />
            <span
              style={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                fontSize: 10.5,
              }}
            >
              XIRR Benchmarks (Annualised):
            </span>
          </div>
          {[
            { label: "≥ 15% — Excellent", color: THEME.sage },
            { label: "10 – 15% — Good", color: THEME.accent },
            { label: "6 – 10% — Moderate", color: THEME.gold },
            { label: "< 6% — Below FD rate", color: THEME.rust },
          ].map((g) => (
            <div
              key={g.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: g.color,
                }}
              />
              <span style={{ color: THEME.ink }}>{g.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
