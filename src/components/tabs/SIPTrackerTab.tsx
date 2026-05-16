// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, Repeat, Sparkles, Plus, Trash2 } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

// Internal helper components




const SIPEmptyState = ({ onAdd }: any) => (
  <Card style={{ padding: "64px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#0d9488 0%,#5eead4 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(13,148,136,0.2)" }}>
      <Repeat size={28} color="#fff" />
    </div>
    <div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>No SIPs Tracked Yet</h3>
      <p style={{ fontSize: 14, color: THEME.muted, maxWidth: 420, lineHeight: 1.6, margin: "0 auto" }}>
        Add your systematic investment plans to project your corpus, track installments paid, and visualise your wealth-building journey.
      </p>
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      {["Mutual Fund SIPs", "Corpus Projections", "Installment Progress", "Monthly Tracking"].map(f => (
        <Badge key={f} variant="muted" style={{ padding: "6px 14px", fontSize: 11 }}>● {f}</Badge>
      ))}
    </div>
    <Button variant="accent" size="lg" icon={<Plus size={18} />} onClick={onAdd} style={{ marginTop: 8 }}>
      Add First SIP
    </Button>
  </Card>
);

const th = { textAlign: "left" as const, padding: "12px 10px", color: THEME.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", borderBottom: `1px solid ${THEME.line}` };
const td = { padding: "16px 10px", fontSize: 14 };

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
    <div className="tab-content-enter">
      <SectionTitle 
        sub="Track your systematic investment plans across mutual funds"
        rightElement={
          sipsWithCalc.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add SIP
            </Button>
          )
        }
      >
        SIP Tracker
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard 
          icon={<Activity />} 
          label="Monthly SIP" 
          value={fmtINRFull(totalMonthly)} 
          color={THEME.accent}
          sub="Total monthly commitment"
        />
        <StatCard 
          icon={<TrendingUp />} 
          label="Total Invested" 
          value={fmtINRFull(totalInvested)} 
          color={THEME.sage}
          sub="Cumulative capital put in"
        />
        <StatCard 
          icon={<Repeat />} 
          label="Active SIPs" 
          value={sipsWithCalc.length} 
          color={THEME.muted}
          sub="Running investment plans"
        />
        <StatCard 
          icon={<Sparkles />} 
          label="Projected Corpus" 
          value={fmtINRFull(totalProjected)} 
          color={THEME.gold}
          sub={`@${sipProjRate}% p.a. estimation`}
        />
      </div>

      {sipsWithCalc.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: 20, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(128,128,128,0.04)", padding: "4px 14px", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Projection rate:</span>
            <input 
              style={{ width: 44, fontSize: 13, background: "transparent", border: "none", color: THEME.ink, fontWeight: 800, padding: 0, textAlign: "center" }} 
              type="number" 
              value={sipProjRate} 
              onChange={(e) => setSipProjRate(e.target.value)} 
            />
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>% p.a.</span>
          </div>
        </div>
      )}

      {sipsWithCalc.length === 0 ? (
        <SIPEmptyState onAdd={() => setShow(true)} />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                  <th style={th}>Scheme</th>
                  <th style={th}>Type</th>
                  <th style={{ ...th, textAlign: "right" }}>Amount/mo</th>
                  <th style={th}>Started</th>
                  <th style={{ ...th, textAlign: "right" }}>Paid/Total</th>
                  <th style={{ ...th, textAlign: "right" }}>Invested</th>
                  <th style={{ ...th, textAlign: "right" }}>Projected Corpus</th>
                  <th style={{ ...th, width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {sipsWithCalc.map((sip) => (
                  <tr key={sip.id} style={{ borderBottom: `1px solid ${THEME.line}`, transition: "background 0.2s" }} className="table-row-hover">
                    <td style={{ ...td, fontWeight: 800, color: THEME.ink }}>{sip.scheme}</td>
                    <td style={td}><Badge variant="muted" style={{ fontSize: 10 }}>{sip.fundType}</Badge></td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{fmtINRFull(sip.amount)}</td>
                    <td style={{ ...td, color: THEME.muted }}>{sip.startDate}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{sip.paid} / <span style={{ color: THEME.muted }}>{sip.totalInstallments}</span></td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: THEME.ink }}>{fmtINRFull(sip.totalInvested)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={{ fontWeight: 900, color: THEME.sage, fontSize: 15 }}>{fmtINRFull(sip.projectedCorpus)}</div>
                      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>{sip.remaining > 0 ? `${sip.remaining} mo left` : "Complete"}</div>
                    </td>
                    <td style={td}>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("sips", sip.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
        <select className="form-input" value={f.owner} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input className="form-input" value={f.scheme} onChange={(e) => setF({ ...f, scheme: e.target.value })} placeholder="e.g. Parag Parikh Flexi Cap" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select className="form-input" value={f.fundType} onChange={(e) => setF({ ...f, fundType: e.target.value })}>
            {mfCategories.map((c: string) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Frequency">
          <select className="form-input" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Amount (₹)">
          <input className="form-input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input className="form-input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Total Installments">
          <input className="form-input" type="number" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.scheme && f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
