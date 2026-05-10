// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, Repeat, Sparkles, Plus, Trash2 } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

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
      <div style={{ fontSize: 22, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || THEME.muted, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
);

const SIPEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#0d9488 0%,#5eead4 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Repeat size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No SIPs Tracked Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Add your systematic investment plans to project your corpus, track installments paid, and visualise your wealth-building journey.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Mutual Fund SIPs", "Corpus Projections", "Installment Progress", "Monthly Tracking"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(13,148,136,0.08)", color: "#0d9488", fontWeight: 600, border: "1px solid rgba(13,148,136,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#0d9488 0%,#5eead4 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add First SIP
    </button>
  </div>
);

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const iconBtn = {
  padding: 6,
  background: "transparent",
  border: "none",
  color: THEME.muted,
  cursor: "pointer",
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const th = { textAlign: "left" as const, padding: "12px 8px", color: THEME.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const td = { padding: "16px 8px" };

export function SIPTrackerTab({ state, addItem, removeItem }: any) {
  const [show, setShow] = useState(false);
  const todayStr = today();
  const [sipProjRate, setSipProjRate] = useState("12");

  const sipsWithCalc = useMemo(() => {
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    return (state.sips || []).map((sip: any) => {
      const paid = Math.min(Math.max(0, monthsBetween(sip.startDate, todayStr)), Number(sip.totalInstallments || 0));
      const totalInvested = paid * Number(sip.amount || 0);
      const remaining = Math.max(0, Number(sip.totalInstallments || 0) - paid);
      const m = Number(sip.amount || 0);
      const currentCorpus = r === 0 ? totalInvested : m * (Math.pow(1 + r, paid) - 1) / r * (1 + r);
      const projectedCorpus = r === 0 ? currentCorpus + m * remaining : currentCorpus * Math.pow(1 + r, remaining) + m * (Math.pow(1 + r, remaining) - 1) / r * (1 + r);
      return { ...sip, paid, totalInvested, remaining, currentCorpus, projectedCorpus };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const totalMonthly = sipsWithCalc.reduce((s: number, sip: any) => s + Number(sip.amount || 0), 0);
  const totalInvested = sipsWithCalc.reduce((s: number, sip: any) => s + sip.totalInvested, 0);
  const totalProjected = sipsWithCalc.reduce((s: number, sip: any) => s + sip.projectedCorpus, 0);

  return (
    <div>
      <SectionTitle sub="Track your systematic investment plans across mutual funds">
        SIP Tracker
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Activity} label="Monthly SIP" value={fmtINRFull(totalMonthly)} gradient="linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)" />
        <Tile icon={TrendingUp} label="Total Invested" value={fmtINRFull(totalInvested)} gradient="linear-gradient(135deg,#059669 0%,#34d399 100%)" />
        <Tile icon={Repeat} label="Active SIPs" value={sipsWithCalc.length} gradient="linear-gradient(135deg,#0d9488 0%,#5eead4 100%)" />
        <Tile icon={Sparkles} label="Projected Corpus" value={fmtINRFull(totalProjected)} sub={`@${sipProjRate}% p.a.`} subColor={THEME.sage} gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)" />
      </div>

      {sipsWithCalc.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: THEME.muted }}>Projection rate:</span>
            <input style={{ ...input, width: 64, fontSize: 13, padding: "4px 8px" }} type="number" value={sipProjRate} onChange={(e) => setSipProjRate(e.target.value)} />
            <span style={{ fontSize: 12, color: THEME.muted }}>% p.a.</span>
          </div>
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add SIP
          </button>
        </div>
      )}

      {sipsWithCalc.length === 0 ? (
        <div style={card}><SIPEmptyState onAdd={() => setShow(true)} /></div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Scheme</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: "right" }}>Amount/mo</th>
                <th style={th}>Started</th>
                <th style={{ ...th, textAlign: "right" }}>Paid/Total</th>
                <th style={{ ...th, textAlign: "right" }}>Invested</th>
                <th style={{ ...th, textAlign: "right" }}>Projected Corpus</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sipsWithCalc.map((sip) => (
                <tr key={sip.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sip.scheme}</td>
                  <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{sip.fundType}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(sip.amount)}</td>
                  <td style={td}>{sip.startDate}</td>
                  <td style={{ ...td, textAlign: "right" }}>{sip.paid} / {sip.totalInstallments}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmtINRFull(sip.totalInvested)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>
                    {fmtINRFull(sip.projectedCorpus)}
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 400 }}>{sip.remaining > 0 ? `${sip.remaining} mo left` : "Complete"}</div>
                  </td>
                  <td style={td}>
                    <button onClick={() => removeItem("sips", sip.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("sips", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function SIPModal({ onClose, onSave }: any) {
  const { mfCategories } = useMasterData();
  const [f, setF] = useState({ owner: "self", scheme: "", fundType: mfCategories[0] || "Equity", amount: "", frequency: "monthly", startDate: today(), totalInstallments: "12" });
  return (
    <Modal title="Add SIP" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input style={input} value={f.scheme} onChange={(e) => setF({ ...f, scheme: e.target.value })} placeholder="e.g. Parag Parikh Flexi Cap" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select style={input} value={f.fundType} onChange={(e) => setF({ ...f, fundType: e.target.value })}>
            {mfCategories.map((c: string) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Frequency">
          <select style={input} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input style={input} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Total Installments">
          <input style={input} type="number" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.scheme && f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
