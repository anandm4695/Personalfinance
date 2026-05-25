// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, Repeat, Sparkles, Plus, Trash2, Pencil } from "lucide-react";
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
import { EmptyState } from "../ui/EmptyState";





export function SIPTrackerTab({ state, addItem, removeItem, updateItem, metrics }: any) {
  const [show, setShow] = useState(false);
  const [editSip, setEditSip] = useState<any>(null);
  const todayStr = today();
  const [sipProjRate, setSipProjRate] = useState("12");

  const sipsWithCalc = useMemo(() => {
    return (state.sips || []).map((sip: any) => {
      const isQuarterly = sip.frequency === "quarterly";
      const periodMonths = isQuarterly ? 3 : 1;
      // r = return per period (quarterly vs monthly)
      const r = (Number(sipProjRate) || 12) / (isQuarterly ? 4 : 12) / 100;
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const paid = Math.min(Math.floor(monthsElapsed / periodMonths), Number(sip.totalInstallments || 0));
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard
          icon={<Activity />}
          label="Monthly SIP"
          value={fmtINRFull(totalMonthly)}
          color={THEME.accent}
          sub={metrics?.monthIncome > 0 ? `${((totalMonthly / metrics.monthIncome) * 100).toFixed(1)}% of monthly income` : "Total monthly commitment"}
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
        <EmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#0d9488 0%,#5eead4 100%)"
          dotColor="#0d9488"
          title="No SIPs Tracked Yet"
          description="Add your systematic investment plans to project your corpus, track installments paid, and visualise your wealth-building journey."
          pills={["Mutual Fund SIPs", "Corpus Projections", "Installment Progress", "Monthly Tracking"]}
          buttonLabel="Add First SIP"
          onAdd={() => setShow(true)}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          {sipsWithCalc.map((sip) => (
            <Card key={sip.id} style={{ padding: "18px 20px", borderLeft: `3px solid ${THEME.sage}`, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Icon Box */}
                <div style={{ 
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center" 
                }}>
                  <Activity size={22} color={THEME.sage} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, letterSpacing: "-0.01em" }}>{sip.scheme}</span>
                    <Badge variant="muted" style={{ fontSize: 9 }}>{sip.fundType}</Badge>
                    {sip.frequency && sip.frequency !== "monthly" && (
                      <Badge variant="accent" style={{ fontSize: 9 }}>{sip.frequency}</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                    <span style={{ color: THEME.sage }}>{fmtINRFull(sip.amount)}/{sip.frequency === "quarterly" ? "qtr" : "mo"}</span>
                    <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                    <span>Paid {sip.paid}/{sip.totalInstallments}</span>
                  </div>
                </div>

                {/* Values */}
                <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>{fmtINRFull(sip.projectedCorpus)}</div>
                  <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>projected</div>
                </div>

                {/* Actions */}
                <div style={{ flexShrink: 0, display: "flex", gap: 2 }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditSip(sip)} style={{ padding: 6, color: THEME.accent }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeItem("sips", sip.id)} style={{ padding: 6, color: THEME.rust }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("sips", v); setShow(false); }}
        />
      )}
      {editSip && (
        <SIPModal
          initial={editSip}
          onClose={() => setEditSip(null)}
          onSave={(v: any) => { updateItem("sips", editSip.id, v); setEditSip(null); }}
        />
      )}
    </div>
  );
}

function SIPModal({ onClose, onSave, initial }: any) {
  const { mfCategories } = useMasterData();
  const [f, setF] = useState(initial
    ? { owner: initial.owner || "self", scheme: initial.scheme || "", fundType: initial.fundType || mfCategories[0] || "Equity", amount: String(initial.amount || ""), frequency: initial.frequency || "monthly", startDate: initial.startDate || today(), totalInstallments: String(initial.totalInstallments || "12") }
    : { owner: "self", scheme: "", fundType: mfCategories[0] || "Equity", amount: "", frequency: "monthly", startDate: today(), totalInstallments: "12" });
  return (
    <Modal title={initial ? "Edit SIP" : "Add SIP"} onClose={onClose}>
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
      <ModalActions onSave={() => f.scheme && f.amount && onSave(f)} onClose={onClose} saveLabel={initial ? "Save Changes" : "Add SIP"} />
    </Modal>
  );
}
