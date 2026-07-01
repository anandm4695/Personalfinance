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
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

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
          return d.toISOString().slice(0, 10);
        })();

      const isMature = matDate <= todayStr;
      const endDate = isMature ? matDate : todayStr;
      const elapsed =
        (new Date(endDate + "T00:00:00").getTime() -
          new Date(fd.startDate + "T00:00:00").getTime()) /
        (365.25 * 24 * 3600 * 1000);
      const currentVal = isMature
        ? fdMaturity(Number(fd.principal), Number(fd.rate), years)
        : Number(fd.principal) * Math.pow(1 + Number(fd.rate) / 100, Math.max(0, elapsed));

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
        const ds = d.toISOString().slice(0, 10);
        if (ds <= todayStr) cashFlows.push({ date: ds, amount: -monthly });
      }
      if (cashFlows.length === 0) return;

      const matDate =
        rd.maturityDate ||
        (() => {
          const d = new Date(rd.startDate + "T00:00:00");
          d.setMonth(d.getMonth() + months);
          return d.toISOString().slice(0, 10);
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
        const invested = txns.reduce(
          (s: number, t: any) => s + Math.abs(Number(t.amount)),
          0
        );

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
        const invested = txns.reduce(
          (s: number, t: any) => s + Number(t.employee),
          0
        );

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
        const txns = (p.transactions || []).filter(
          (t: any) => t.date && Number(t.amount) > 0
        );
        if (txns.length === 0) return;

        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -Number(t.amount),
        }));
        cashFlows.push({ date: todayStr, amount: Number(p.balance || 0) });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce(
          (s: number, t: any) => s + Number(t.amount),
          0
        );

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

      const faceVal = Number(
        b.totalPrincipalAmount ||
          b.totalInvestmentAmount
      );
      const couponRate = Number(b.coupon || b.ytmRate || 0) / 100;
      const annualCoupon = faceVal * couponRate;

      const cashFlows: any[] = [
        { date: purchaseDate, amount: -Number(b.totalInvestmentAmount) },
      ];

      if (b.maturityDate && annualCoupon > 0) {
        const couponEnd =
          b.maturityDate < todayStr ? b.maturityDate : todayStr;
        const d = new Date(purchaseDate + "T00:00:00");
        d.setFullYear(d.getFullYear() + 1);
        while (d.toISOString().slice(0, 10) <= couponEnd) {
          cashFlows.push({
            date: d.toISOString().slice(0, 10),
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
    const totalCurrent = rows.reduce(
      (s: number, r) => s + (r.currentValue || 0),
      0
    );
    flowMap.set(todayStr, (flowMap.get(todayStr) || 0) + totalCurrent);
    const flows = Array.from(flowMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));
    return calcXIRR(flows);
  }, [rows, todayStr]);

  const totalInvested = rows.reduce(
    (s: number, r) => s + (r.invested || 0),
    0
  );
  const totalCurrent = rows.reduce(
    (s: number, r) => s + (r.currentValue || 0),
    0
  );
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
          subtitle="Add FDs, Mutual Funds, Stocks, PPF, EPF or Bonds with dates to calculate XIRR"
        />
      </div>
    );
  }

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="True annualised return accounting for actual cash flow timing — the only metric that compares across all investment types">
        XIRR Report
      </SectionTitle>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Portfolio XIRR"
          value={xirrLabel(portfolioXIRR)}
          icon={<Activity />}
          color={xirrColor(portfolioXIRR)}
        />
        <StatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          icon={<Coins />}
          color={THEME.accent}
        />
        <StatCard
          label="Current Value"
          value={fmtINRFull(totalCurrent)}
          icon={<TrendingUp />}
          color={THEME.sage}
        />
        <StatCard
          label="Total Gain / Loss"
          value={
            (totalGain >= 0 ? "+" : "") + fmtINRFull(Math.abs(totalGain))
          }
          icon={totalGain >= 0 ? <TrendingUp /> : <TrendingDown />}
          color={totalGain >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* Per-type tables */}
      {Object.entries(typeGroups).map(([type, items]) => {
        const typeInvested = items.reduce(
          (s: number, r) => s + (r.invested || 0),
          0
        );
        const typeCurrent = items.reduce(
          (s: number, r) => s + (r.currentValue || 0),
          0
        );
        const typeGain = typeCurrent - typeInvested;
        const TypeIcon = items[0]?.icon || Activity;

        return (
          <Card key={type} style={{ marginBottom: 16 }}>
            <div style={{ padding: "18px 20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <TypeIcon size={16} style={{ color: items[0]?.color }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: THEME.ink,
                    }}
                  >
                    {type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      background: "rgba(99,102,241,0.08)",
                      padding: "1px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    fontSize: 13,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: THEME.muted }}>
                    Invested:{" "}
                    <b style={{ color: THEME.ink }}>
                      <Prv>{fmtINRExact(typeInvested)}</Prv>
                    </b>
                  </span>
                  <span style={{ color: THEME.muted }}>
                    Value:{" "}
                    <b style={{ color: THEME.sage }}>
                      <Prv>{fmtINRExact(typeCurrent)}</Prv>
                    </b>
                  </span>
                  <span
                    style={{
                      color: typeGain >= 0 ? THEME.sage : THEME.rust,
                      fontWeight: 700,
                    }}
                  >
                    {typeGain >= 0 ? "+" : ""}
                    <Prv>{fmtINRExact(Math.abs(typeGain))}</Prv>
                  </span>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{ borderBottom: `1.5px solid ${THEME.line}` }}
                    >
                      {[
                        "Name",
                        "Invested",
                        "Current Value",
                        "Gain / Loss",
                        "Period",
                        "XIRR",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign: h === "Name" ? "left" : "right",
                            color: THEME.muted,
                            fontWeight: 600,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => {
                      const gain =
                        (row.currentValue || 0) - (row.invested || 0);
                      const gainPct =
                        row.invested > 0
                          ? (gain / row.invested) * 100
                          : 0;
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(99,102,241,0.04)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 7,
                                  background: `${row.color}18`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <row.icon
                                  size={13}
                                  style={{ color: row.color }}
                                />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: THEME.ink,
                                    fontSize: 13,
                                  }}
                                >
                                  {row.name}
                                </div>
                                {row.owner && row.owner !== "self" && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: THEME.muted,
                                    }}
                                  >
                                    {row.owner}
                                  </div>
                                )}
                              </div>
                              {row.status === "matured" && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: THEME.muted,
                                    border: `1px solid ${THEME.line}`,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  matured
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              color: THEME.muted,
                            }}
                          >
                            <Prv>{fmtINRExact(row.invested)}</Prv>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: THEME.ink,
                            }}
                          >
                            <Prv>{fmtINRExact(row.currentValue)}</Prv>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              color:
                                gain >= 0 ? THEME.sage : THEME.rust,
                              fontWeight: 600,
                            }}
                          >
                            <Prv>
                              {gain >= 0 ? "+" : ""}
                              {fmtINRExact(Math.abs(gain))}
                              <span
                                style={{
                                  fontSize: 11,
                                  marginLeft: 5,
                                  opacity: 0.75,
                                }}
                              >
                                ({gainPct >= 0 ? "+" : ""}
                                {gainPct.toFixed(1)}%)
                              </span>
                            </Prv>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              color: THEME.muted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {holdingLabel(row.startDate, row.endDate)}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: xirrColor(row.xirr),
                                background: `${xirrColor(row.xirr)}18`,
                                padding: "3px 10px",
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
      <Card>
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: THEME.muted,
            }}
          >
            <Info size={13} />
            <span style={{ fontWeight: 600 }}>
              XIRR benchmarks (annualised):
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
                gap: 6,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: g.color,
                }}
              />
              <span style={{ color: THEME.muted }}>{g.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
