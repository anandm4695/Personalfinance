// @ts-nocheck
import React from "react";
import { Shield, Heart, Wallet, Zap, Plus } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";

// Internal helper components
const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Tile = ({ icon: Icon, label, value, sub, subColor, gradient }: any) => (
  <div style={{ background: "var(--surface-0)", padding: "18px 20px", borderRadius: 14, border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{ width: 42, height: 42, borderRadius: 12, background: gradient || "linear-gradient(135deg,#94a3b8 0%,#64748b 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={18} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.02em" }}><Prv>{value}</Prv></div>
      {sub && <div style={{ fontSize: 11, color: subColor || THEME.muted, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
);

const LICEmptyState = () => (
  <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#dc2626 0%,#fca5a5 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Shield size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>No LIC Policies Added</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360 }}>Add your LIC policies from the <b>Investments</b> tab → LIC section to see sum assured, premiums, and maturity details here.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Sum Assured", "Annual Premium", "Maturity Dates", "Policy Number"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(220,38,38,0.07)", color: "#dc2626", fontWeight: 600, border: "1px solid rgba(220,38,38,0.15)" }}>● {f}</span>
      ))}
    </div>
  </div>
);

const TermPlanEmptyState = () => (
  <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#e11d48 0%,#fb7185 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Heart size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>No Term Plans Added</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360 }}>Add your term insurance plans from the <b>Investments</b> tab → Term Plans section to track cover adequacy, premiums, and expiry.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Cover Amount", "Annual Premium", "Expiry Date", "15× Cover Rule"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(225,29,72,0.07)", color: "#e11d48", fontWeight: 600, border: "1px solid rgba(225,29,72,0.15)" }}>● {f}</span>
      ))}
    </div>
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
        <Tile icon={Shield} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} gradient="linear-gradient(135deg,#dc2626 0%,#fca5a5 100%)" />
        <Tile icon={Heart} label="Total Term Cover" value={fmtINRFull(totalTermCover)} gradient="linear-gradient(135deg,#e11d48 0%,#fb7185 100%)" />
        <Tile icon={Wallet} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)" />
        <Tile icon={Zap} label="Cover Ratio" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} sub={adequacyLabel} subColor={adequacyColor} gradient={adequacyLevel === "excellent" || adequacyLevel === "adequate" ? "linear-gradient(135deg,#059669 0%,#34d399 100%)" : "linear-gradient(135deg,#dc2626 0%,#fca5a5 100%)"} />
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
          <LICEmptyState />
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
          <TermPlanEmptyState />
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
