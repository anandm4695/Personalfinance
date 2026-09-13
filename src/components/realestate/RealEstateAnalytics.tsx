import React, { useMemo } from "react";
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
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Money } from "../ui/Money";
import {
  RealEstateProperty,
  TYPE_LABELS,
  realEstateTrackedShare,
  realEstateShareForOwner,
} from "./RealEstateTypes";

interface RealEstateAnalyticsProps {
  properties: RealEstateProperty[];
  valueView: "share" | "full";
  activeProfile?: string;
}

const PALETTE = [
  THEME.accent,
  THEME.sage,
  THEME.gold,
  THEME.rust,
  THEME.violet,
  THEME.cyan,
  THEME.pink,
];

export const RealEstateAnalytics: React.FC<RealEstateAnalyticsProps> = ({
  properties,
  valueView,
  activeProfile,
}) => {
  const shareOf = (p: any) =>
    valueView === "full"
      ? 1
      : activeProfile && activeProfile !== "all"
      ? realEstateShareForOwner(p, activeProfile)
      : realEstateTrackedShare(p);

  // 1. Property Type Allocation
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    properties.forEach((p) => {
      const type = TYPE_LABELS[p.type] || p.type || "Other";
      const val = Number(p.marketValue || p.agreementValue || 0) * shareOf(p);
      map[type] = (map[type] || 0) + val;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [properties, valueView, activeProfile]);

  // 2. Developer Allocation
  const devData = useMemo(() => {
    const map: Record<string, number> = {};
    properties.forEach((p) => {
      const dev = p.developerName || "Individual / Other";
      const val = Number(p.marketValue || p.agreementValue || 0) * shareOf(p);
      map[dev] = (map[dev] || 0) + val;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [properties, valueView, activeProfile]);

  // 3. Invested vs Market Value Comparison
  const comparisonData = useMemo(() => {
    return properties
      .map((p) => {
        const invested =
          (Number(p.agreementValue || 0) +
            Number(p.stampDuty || 0) +
            Number(p.tdsAmount || 0)) *
          shareOf(p);
        const marketVal = Number(p.marketValue || p.agreementValue || 0) * shareOf(p);
        return {
          name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
          Invested: invested,
          Valuation: marketVal,
        };
      })
      .filter((d) => d.Invested > 0 || d.Valuation > 0);
  }, [properties, valueView, activeProfile]);

  // 4. Rate per Sqft Data
  const rateData = useMemo(() => {
    return properties
      .filter((p) => Number(p.areaSqft || 0) > 0)
      .map((p) => {
        const area = Number(p.areaSqft);
        const buyRate = Number(p.agreementValue || 0) / area;
        const currentRate = Number(p.marketValue || p.agreementValue || 0) / area;
        return {
          name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
          BuyRate: Math.round(buyRate),
          CurrentRate: Math.round(currentRate),
        };
      });
  }, [properties]);

  const totalValuation = typeData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Top 2 charts: Type Allocation & Developer Allocation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {/* Type Allocation */}
        <Card variant="base" style={{ padding: 20, borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
            Property Type Allocation
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>
            Portfolio distribution by real estate asset category
          </div>

          <div style={{ height: 260, position: "relative" }}>
            {typeData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 100, color: THEME.muted, fontSize: 12 }}>
                No property valuation data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {typeData.map((_, idx) => (
                      <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [fmtINRFull(Number(val)), "Valuation"]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 10 }}>
            {typeData.map((item, idx) => {
              const pct = totalValuation > 0 ? ((item.value / totalValuation) * 100).toFixed(0) : 0;
              return (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: PALETTE[idx % PALETTE.length],
                    }}
                  />
                  <span style={{ color: THEME.ink, fontWeight: 600 }}>{item.name}:</span>
                  <span style={{ color: THEME.muted }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Developer Concentration */}
        <Card variant="base" style={{ padding: 20, borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
            Builder / Developer Exposure
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>
            Concentration of property investments by developer
          </div>

          <div style={{ height: 260 }}>
            {devData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 100, color: THEME.muted, fontSize: 12 }}>
                No developer data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={devData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`}
                    stroke={THEME.muted}
                    fontSize={11}
                  />
                  <YAxis type="category" dataKey="name" stroke={THEME.muted} fontSize={11} width={100} />
                  <Tooltip
                    formatter={(val: any) => [fmtINRFull(Number(val)), "Exposure"]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill={THEME.accent} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom 2 charts: Invested vs Market Value & Price / Sqft */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {/* Invested Cost vs Valuation */}
        <Card variant="base" style={{ padding: 20, borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
            Invested Cost vs Current Valuation
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>
            Acquisition cost basis compared to latest market valuation
          </div>

          <div style={{ height: 260 }}>
            {comparisonData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 100, color: THEME.muted, fontSize: 12 }}>
                No property data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" vertical={false} />
                  <XAxis dataKey="name" stroke={THEME.muted} fontSize={11} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    stroke={THEME.muted}
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={(val: any) => [fmtINRFull(Number(val)), ""]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Invested" fill={THEME.accent} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Valuation" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Price per Sq.Ft benchmark */}
        <Card variant="base" style={{ padding: 20, borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
            Price per Sq.Ft Benchmark (₹/sq.ft)
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>
            Purchase rate per sq.ft vs current estimated rate
          </div>

          <div style={{ height: 260 }}>
            {rateData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 100, color: THEME.muted, fontSize: 12 }}>
                No area sq.ft data recorded for properties
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rateData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" vertical={false} />
                  <XAxis dataKey="name" stroke={THEME.muted} fontSize={11} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    stroke={THEME.muted}
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}/sq.ft`, ""]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="BuyRate" name="Acquisition Rate" fill={THEME.cyan} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CurrentRate" name="Current Rate" fill={THEME.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
