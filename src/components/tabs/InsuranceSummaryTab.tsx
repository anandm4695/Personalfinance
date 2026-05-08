// @ts-nocheck
import React from "react";
import { Shield, Heart, Wallet, Zap } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";

// Internal helper components
const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Tile = ({ icon: Icon, label, value, sub, subColor }: any) => (
  <div style={{ background: "var(--surface-0)", padding: 20, borderRadius: 12, border: `1px solid ${THEME.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
      <Icon size={14} /> {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: subColor || THEME.muted, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <Shield size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const th = { textAlign: "left" as const, padding: "12px 8px", color: THEME.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const td = { padding: "16px 8px" };

export function InsuranceSummaryTab({ state }: any) {
  const totalLICAssured = state.lic.reduce((s: number, l: any) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = state.termPlans.reduce((s: number, t: any) => s + Number(t.coverAmount || 0), 0);
  const licAnnualPremium = state.lic.reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = state.termPlans.reduce((s: number, t: any) => s + Number(t.annualPremium || 0), 0);
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium;
  const annualIncome = state.income.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const recommended15x = annualIncome * 15;
  const recommended10x = annualIncome * 10;
  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel = coverRatio >= 15 ? "excellent" : coverRatio >= 10 ? "adequate" : coverRatio >= 5 ? "low" : "critical";
  const adequacyColor = { excellent: THEME.sage, adequate: THEME.gold, low: THEME.gold, critical: THEME.rust }[adequacyLevel];
  const adequacyLabel = { excellent: "Excellent (≥15×)", adequate: "Adequate (10–15×)", low: "Low (5–10×)", critical: "Critical (<5×)" }[adequacyLevel];

  return (
    <div>
      <SectionTitle sub="Life Insurance, LIC policies and term plan coverage at a glance">
        Insurance Summary
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Shield} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} />
        <Tile icon={Heart} label="Total Term Cover" value={fmtINRFull(totalTermCover)} />
        <Tile icon={Wallet} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} />
        <Tile icon={Zap} label="Cover Ratio" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} sub={adequacyLabel} subColor={adequacyColor} />
      </div>

      {annualIncome > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Coverage Adequacy Checker · 15× Rule</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 20px", alignItems: "center", marginBottom: 20 }}>
            {[
              { label: "Your annual income", val: fmtINRFull(annualIncome) },
              { label: "Recommended cover (10× minimum)", val: fmtINRFull(recommended10x) },
              { label: "Recommended cover (15× ideal)", val: fmtINRFull(recommended15x) },
              { label: "Your term cover", val: fmtINRFull(totalTermCover) },
              { label: "Gap to 15×", val: totalTermCover >= recommended15x ? "None — fully covered!" : fmtINRFull(recommended15x - totalTermCover) },
            ].map(({ label, val }, i) => (
              <React.Fragment key={i}>
                <div style={{ fontSize: 13, color: THEME.muted }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: i === 3 ? (adequacyColor as string) : i === 4 ? (totalTermCover >= recommended15x ? THEME.sage : THEME.rust) : THEME.ink }}>{val}</div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ height: 12, background: THEME.line, borderRadius: 6, overflow: "visible", position: "relative", marginBottom: 10 }}>
            <div style={{ height: "100%", width: Math.min((totalTermCover / recommended15x) * 100, 100) + "%", background: adequacyColor, borderRadius: 6, transition: "width 0.6s" }} />
            {[10, 15].map((mult) => {
              const pct = Math.min((annualIncome * mult / recommended15x) * 100, 100);
              return <div key={mult} style={{ position: "absolute", top: -4, left: pct + "%", width: 2, height: 20, background: THEME.ink, opacity: 0.35 }} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 11, color: THEME.muted }}>
            <span><span style={{ background: THEME.rust, borderRadius: 2, padding: "1px 6px", color: "#fff", marginRight: 4 }}>|</span> 10× mark</span>
            <span><span style={{ background: THEME.ink, borderRadius: 2, padding: "1px 6px", color: "#fff", opacity: 0.4, marginRight: 4 }}>|</span> 15× ideal</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: adequacyColor as string }}>{adequacyLabel}</span>
          </div>
        </div>
      )}

      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Life Insurance (LIC)</div>
        {state.lic.length === 0 ? (
          <EmptyHint text="No LIC policies added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Policy No</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Sum Assured</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Maturity Date</th>
              </tr>
            </thead>
            <tbody>
              {state.lic.map((l: any) => (
                <tr key={l.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>****{String(l.policyNumber || "").slice(-4)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{l.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.sumAssured)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.annualPremium)}</td>
                  <td style={td}>{l.maturityDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Term Plans</div>
        {state.termPlans.length === 0 ? (
          <EmptyHint text="No term plans added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Insurer</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Cover Amount</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {state.termPlans.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>{t.insurer}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.coverAmount)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.annualPremium)}</td>
                  <td style={td}>{t.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
