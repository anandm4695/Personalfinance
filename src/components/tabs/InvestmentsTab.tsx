// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Coins,
  Repeat,
  FileText,
  Shield,
  Briefcase,
  BarChart3,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  Activity,
  IndianRupee,
  Receipt,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fdMaturity, rdMaturity, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

interface InvestmentsTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  subTab?: string;
}

/* ── shared input style (matches GoalModal) ─────────────────────────── */
const inp = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
} as const;

/* ── sub-tab metadata ─────────────────────────────────────────────────── */
const SUBS = [
  { id: "fd",     label: "Fixed Deposits",     icon: Coins,     stateKey: "fixedDeposits"     },
  { id: "rd",     label: "Recurring Deposits", icon: Repeat,    stateKey: "recurringDeposits" },
  { id: "bond",   label: "Bonds",              icon: FileText,  stateKey: "bonds"             },
  { id: "ppf",    label: "PPF",                icon: Shield,    stateKey: "ppf"               },
  { id: "nps",    label: "NPS",                icon: Briefcase, stateKey: "nps"               },
  { id: "mf",     label: "Mutual Funds",       icon: BarChart3, stateKey: "mutualFunds"       },
  { id: "lic",    label: "LIC",                icon: Shield,    stateKey: "lic"               },
  { id: "income", label: "Yield Tracker",      icon: Activity,  stateKey: null                },
];

/* ══════════════════════════════════════════════════════════════════════
   ADD INVESTMENT MODAL
══════════════════════════════════════════════════════════════════════ */
const AddInvestmentModal = ({ sub, onClose, onSave }: any) => {
  const subMeta = SUBS.find(s => s.id === sub);

  // ── FD State ──
  const [fd, setFd] = useState({ bank: "", principal: "", rate: "", years: "", startDate: today(), maturityDate: "" });
  // ── RD State ──
  const [rd, setRd] = useState({ bank: "", monthly: "", rate: "", tenureMonths: "", startDate: today() });
  // ── Bond State ──
  const [bond, setBond] = useState({ name: "", issuer: "", faceValue: "", coupon: "", maturityDate: "" });
  // ── PPF State ──
  const [ppf, setPpf] = useState({ institution: "", balance: "", accountNumber: "" });
  // ── NPS State ──
  const [nps, setNps] = useState({ tier: "I", pran: "", balance: "" });
  // ── MF State ──
  const [mf, setMf] = useState({ name: "", category: "Equity", investedValue: "", currentValue: "", units: "", currentNav: "" });
  // ── LIC State ──
  const [lic, setLic] = useState({ planName: "", policyNumber: "", sumAssured: "", annualPremium: "", premiumPaid: "" });

  const handleSave = () => {
    switch (sub) {
      case "fd":
        if (!fd.bank || !fd.principal || !fd.rate) return;
        onSave("fixedDeposits", fd);
        break;
      case "rd":
        if (!rd.bank || !rd.monthly || !rd.rate) return;
        onSave("recurringDeposits", rd);
        break;
      case "bond":
        if (!bond.name || !bond.faceValue || !bond.coupon) return;
        onSave("bonds", bond);
        break;
      case "ppf":
        if (!ppf.balance) return;
        onSave("ppf", ppf);
        break;
      case "nps":
        if (!nps.balance) return;
        onSave("nps", nps);
        break;
      case "mf":
        if (!mf.name || !mf.investedValue) return;
        onSave("mutualFunds", mf);
        break;
      case "lic":
        if (!lic.planName || !lic.policyNumber || !lic.sumAssured) return;
        onSave("lic", lic);
        break;
      default:
        break;
    }
  };

  const title = `Add ${subMeta?.label || "Investment"}`;

  return (
    <Modal title={title} onClose={onClose}>

      {/* ── Fixed Deposit ── */}
      {sub === "fd" && (
        <>
          <Field label="Bank / Institution">
            <input style={inp} value={fd.bank} onChange={e => setFd({ ...fd, bank: e.target.value })} placeholder="e.g. SBI, HDFC Bank" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Principal Amount (₹)">
              <input style={inp} type="number" value={fd.principal} onChange={e => setFd({ ...fd, principal: e.target.value })} placeholder="500000" />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input style={inp} type="number" value={fd.rate} onChange={e => setFd({ ...fd, rate: e.target.value })} placeholder="7.5" step="0.1" />
            </Field>
            <Field label="Tenure (Years)">
              <input style={inp} type="number" value={fd.years} onChange={e => setFd({ ...fd, years: e.target.value })} placeholder="2" step="0.5" />
            </Field>
            <Field label="Start Date">
              <input style={inp} type="date" value={fd.startDate} onChange={e => setFd({ ...fd, startDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Maturity Date">
            <input style={inp} type="date" value={fd.maturityDate} onChange={e => setFd({ ...fd, maturityDate: e.target.value })} />
          </Field>
        </>
      )}

      {/* ── Recurring Deposit ── */}
      {sub === "rd" && (
        <>
          <Field label="Bank / Institution">
            <input style={inp} value={rd.bank} onChange={e => setRd({ ...rd, bank: e.target.value })} placeholder="e.g. Axis Bank, Post Office" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Monthly Installment (₹)">
              <input style={inp} type="number" value={rd.monthly} onChange={e => setRd({ ...rd, monthly: e.target.value })} placeholder="10000" />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input style={inp} type="number" value={rd.rate} onChange={e => setRd({ ...rd, rate: e.target.value })} placeholder="7.0" step="0.1" />
            </Field>
            <Field label="Tenure (Months)">
              <input style={inp} type="number" value={rd.tenureMonths} onChange={e => setRd({ ...rd, tenureMonths: e.target.value })} placeholder="24" />
            </Field>
            <Field label="Start Date">
              <input style={inp} type="date" value={rd.startDate} onChange={e => setRd({ ...rd, startDate: e.target.value })} />
            </Field>
          </div>
        </>
      )}

      {/* ── Bonds ── */}
      {sub === "bond" && (
        <>
          <Field label="Bond Name">
            <input style={inp} value={bond.name} onChange={e => setBond({ ...bond, name: e.target.value })} placeholder="e.g. SGB 2025-I, NHAI Bond" />
          </Field>
          <Field label="Issuer">
            <input style={inp} value={bond.issuer} onChange={e => setBond({ ...bond, issuer: e.target.value })} placeholder="e.g. RBI, NHAI, Govt of India" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Face Value (₹)">
              <input style={inp} type="number" value={bond.faceValue} onChange={e => setBond({ ...bond, faceValue: e.target.value })} placeholder="100000" />
            </Field>
            <Field label="Coupon Rate (% p.a.)">
              <input style={inp} type="number" value={bond.coupon} onChange={e => setBond({ ...bond, coupon: e.target.value })} placeholder="7.5" step="0.1" />
            </Field>
          </div>
          <Field label="Maturity Date">
            <input style={inp} type="date" value={bond.maturityDate} onChange={e => setBond({ ...bond, maturityDate: e.target.value })} />
          </Field>
        </>
      )}

      {/* ── PPF ── */}
      {sub === "ppf" && (
        <>
          <Field label="Bank / Post Office">
            <input style={inp} value={ppf.institution} onChange={e => setPpf({ ...ppf, institution: e.target.value })} placeholder="e.g. SBI, Post Office" />
          </Field>
          <Field label="Account Number">
            <input style={inp} value={ppf.accountNumber} onChange={e => setPpf({ ...ppf, accountNumber: e.target.value })} placeholder="PPF account number" />
          </Field>
          <Field label="Current Balance (₹)">
            <input style={inp} type="number" value={ppf.balance} onChange={e => setPpf({ ...ppf, balance: e.target.value })} placeholder="250000" />
          </Field>
        </>
      )}

      {/* ── NPS ── */}
      {sub === "nps" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tier">
              <select style={inp} value={nps.tier} onChange={e => setNps({ ...nps, tier: e.target.value })}>
                <option value="I">Tier I</option>
                <option value="II">Tier II</option>
              </select>
            </Field>
            <Field label="PRAN Number">
              <input style={inp} value={nps.pran} onChange={e => setNps({ ...nps, pran: e.target.value })} placeholder="12-digit PRAN" />
            </Field>
          </div>
          <Field label="Current Corpus (₹)">
            <input style={inp} type="number" value={nps.balance} onChange={e => setNps({ ...nps, balance: e.target.value })} placeholder="500000" />
          </Field>
        </>
      )}

      {/* ── Mutual Funds ── */}
      {sub === "mf" && (
        <>
          <Field label="Fund Name">
            <input style={inp} value={mf.name} onChange={e => setMf({ ...mf, name: e.target.value })} placeholder="e.g. Mirae Asset Large Cap Fund" />
          </Field>
          <Field label="Category">
            <select style={inp} value={mf.category} onChange={e => setMf({ ...mf, category: e.target.value })}>
              <option>Equity</option>
              <option>Debt</option>
              <option>Hybrid</option>
              <option>ELSS</option>
              <option>Index</option>
              <option>Liquid</option>
              <option>International</option>
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Amount Invested (₹)">
              <input style={inp} type="number" value={mf.investedValue} onChange={e => setMf({ ...mf, investedValue: e.target.value })} placeholder="100000" />
            </Field>
            <Field label="Current Value (₹)">
              <input style={inp} type="number" value={mf.currentValue} onChange={e => setMf({ ...mf, currentValue: e.target.value })} placeholder="115000" />
            </Field>
            <Field label="Units Held">
              <input style={inp} type="number" value={mf.units} onChange={e => setMf({ ...mf, units: e.target.value })} placeholder="1234.56" step="0.01" />
            </Field>
            <Field label="Current NAV (₹)">
              <input style={inp} type="number" value={mf.currentNav} onChange={e => setMf({ ...mf, currentNav: e.target.value })} placeholder="93.22" step="0.01" />
            </Field>
          </div>
        </>
      )}

      {/* ── LIC ── */}
      {sub === "lic" && (
        <>
          <Field label="Plan Name">
            <input style={inp} value={lic.planName} onChange={e => setLic({ ...lic, planName: e.target.value })} placeholder="e.g. LIC Jeevan Anand, Money Back" />
          </Field>
          <Field label="Policy Number">
            <input style={inp} value={lic.policyNumber} onChange={e => setLic({ ...lic, policyNumber: e.target.value })} placeholder="Policy number" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sum Assured (₹)">
              <input style={inp} type="number" value={lic.sumAssured} onChange={e => setLic({ ...lic, sumAssured: e.target.value })} placeholder="1000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input style={inp} type="number" value={lic.annualPremium} onChange={e => setLic({ ...lic, annualPremium: e.target.value })} placeholder="30000" />
            </Field>
          </div>
          <Field label="Total Premium Paid So Far (₹)">
            <input style={inp} type="number" value={lic.premiumPaid} onChange={e => setLic({ ...lic, premiumPaid: e.target.value })} placeholder="90000" />
          </Field>
        </>
      )}

      <ModalActions onSave={handleSave} onClose={onClose} saveLabel={`Add ${subMeta?.label || ""}`} />
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN TAB COMPONENT
══════════════════════════════════════════════════════════════════════ */
export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  state,
  addItem,
  removeItem,
  updateItem,
  subTab,
}) => {
  const [sub, setSub] = useState(subTab || "fd");
  const [showModal, setShowModal] = useState(false);

  // Sync internal sub when parent drives subTab via sidebar click
  useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const subs = SUBS.map(s => ({
    ...s,
    count: s.stateKey ? (state[s.stateKey]?.length ?? 0) : undefined,
  }));

  const handleSave = (key: string, data: any) => {
    addItem(key, data);
    setShowModal(false);
  };

  const canAdd = sub !== "income";

  const renderContent = () => {
    const onAdd = () => setShowModal(true);
    switch (sub) {
      case "fd":    return <FDSection   items={state.fixedDeposits}     removeItem={removeItem} onAdd={onAdd} />;
      case "rd":    return <RDSection   items={state.recurringDeposits} removeItem={removeItem} onAdd={onAdd} />;
      case "bond":  return <BondSection items={state.bonds}             removeItem={removeItem} onAdd={onAdd} />;
      case "ppf":   return <PPFSection  items={state.ppf}               removeItem={removeItem} onAdd={onAdd} />;
      case "nps":   return <NPSSection  items={state.nps}               removeItem={removeItem} onAdd={onAdd} />;
      case "mf":    return <MFSection   items={state.mutualFunds}       removeItem={removeItem} onAdd={onAdd} />;
      case "lic":   return <LICSection  items={state.lic}               removeItem={removeItem} onAdd={onAdd} />;
      case "income":return <YieldTracker state={state} />;
      default:      return null;
    }
  };

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Investments Portfolio</h2>
          <div style={{ fontSize: 14, color: THEME.muted, marginTop: 4 }}>
            Growth, preservation, and yield instruments across multiple asset classes
          </div>
        </div>
        {canAdd && (
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
            Add {subs.find(s => s.id === sub)?.label || "Investment"}
          </Button>
        )}
      </div>

      <div>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {subs.find(s => s.id === sub)?.label}
          </h3>
        </div>
        {renderContent()}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <AddInvestmentModal
          sub={sub}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

/* ── Empty state helper ─────────────────────────────────────────────── */
const EmptyState = ({ label, onAdd }: { label: string; onAdd: () => void }) => (
  <Card style={{ padding: 48, textAlign: "center" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
      No {label} yet
    </div>
    <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
      Add your first {label.toLowerCase()} to start tracking.
    </div>
    <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
      Add {label}
    </Button>
  </Card>
);

/* ── FD Section ─────────────────────────────────────────────────────── */
const FDSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="Fixed Deposit" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((f: any) => {
            const maturity = fdMaturity(Number(f.principal), Number(f.rate), Number(f.years));
            return (
              <Card key={f.id} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <Badge variant="muted">{f.bank}</Badge>
                  <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("fixedDeposits", f.id)} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>{fmtINRFull(f.principal)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Rate: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.rate}%</span></div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Tenure: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.years} yrs</span></div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Start: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.startDate || "—"}</span></div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Matures: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.maturityDate || "—"}</span></div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: THEME.muted }}>Maturity Value</span>
                  <span style={{ fontWeight: 800, color: THEME.sage, fontSize: 15 }}>{fmtINR(maturity)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
  </div>
);

/* ── RD Section ─────────────────────────────────────────────────────── */
const RDSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="Recurring Deposit" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((r: any) => {
            const maturity = rdMaturity(Number(r.monthly), Number(r.rate), Number(r.tenureMonths));
            return (
              <Card key={r.id} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <Badge variant="muted">{r.bank}</Badge>
                  <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("recurringDeposits", r.id)} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
                  {fmtINRFull(r.monthly)}<span style={{ fontSize: 14, color: THEME.muted }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
                  {r.rate}% p.a. · {r.tenureMonths} months
                </div>
                <div className="progress-track" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: "40%", background: THEME.accent }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: THEME.muted }}>Projected Maturity</span>
                  <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(maturity)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
  </div>
);

/* ── Bond Section ───────────────────────────────────────────────────── */
const BondSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="Bond" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((b: any) => (
            <Card key={b.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <Badge variant="gold">{b.issuer || "Bond"}</Badge>
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("bonds", b.id)} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{b.name}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>{fmtINRFull(b.faceValue)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ fontSize: 11, color: THEME.muted }}>Coupon: <span style={{ color: THEME.accent, fontWeight: 700 }}>{b.coupon}%</span></div>
                <div style={{ fontSize: 11, color: THEME.muted }}>Maturity: <span style={{ color: THEME.ink, fontWeight: 700 }}>{b.maturityDate || "—"}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}
  </div>
);

/* ── PPF Section ────────────────────────────────────────────────────── */
const PPFSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="PPF Account" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((p: any) => (
            <Card key={p.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <Badge variant="accent">PPF Account</Badge>
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("ppf", p.id)} />
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Balance</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage }}>{fmtINRFull(p.balance)}</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 12 }}>
                Bank/Post Office: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.institution || "—"}</span>
              </div>
              {p.accountNumber && (
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                  A/C: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.accountNumber}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
  </div>
);

/* ── NPS Section ────────────────────────────────────────────────────── */
const NPSSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="NPS Account" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((n: any) => (
            <Card key={n.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <Badge variant="gold">NPS Tier {n.tier || "I"}</Badge>
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("nps", n.id)} />
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Current Corpus</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtINRFull(n.balance)}</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 12 }}>
                PRAN: <span style={{ color: THEME.ink, fontWeight: 600 }}>{n.pran || "—"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
  </div>
);

/* ── MF Section ─────────────────────────────────────────────────────── */
const MFSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="Mutual Fund" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((m: any) => {
            const current = Number(m.currentValue) || (Number(m.units) * Number(m.currentNav));
            const invested = Number(m.investedValue) || 0;
            const pnl = current - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            return (
              <Card key={m.id} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <Badge variant="accent">{m.category || "Equity"}</Badge>
                  <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("mutualFunds", m.id)} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{m.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", marginBottom: 2 }}>Invested</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtINR(invested)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", marginBottom: 2 }}>Current</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: THEME.accent }}>{fmtINR(current)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Returns</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                    {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
  </div>
);

/* ── LIC Section ────────────────────────────────────────────────────── */
const LICSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="LIC Policy" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {items.map((l: any) => (
            <Card key={l.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <Badge variant="rust">LIC Policy</Badge>
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("lic", l.id)} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{l.planName}</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>Policy: {l.policyNumber}</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: THEME.muted }}>Sum Assured</span>
                  <span style={{ fontWeight: 700 }}>{fmtINRFull(l.sumAssured)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: THEME.muted }}>Annual Premium</span>
                  <span style={{ fontWeight: 700 }}>{fmtINRFull(l.annualPremium)}/yr</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: THEME.muted }}>Premium Paid</span>
                  <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(l.premiumPaid)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
  </div>
);

/* ── Yield Tracker ──────────────────────────────────────────────────── */
const YieldTracker = ({ state }: any) => {
  const fdInterest = state.fixedDeposits.reduce((s: number, f: any) => s + (Number(f.principal) * Number(f.rate)) / 100, 0);
  const bondInterest = state.bonds.reduce((s: number, b: any) => s + (Number(b.faceValue) * Number(b.coupon)) / 100, 0);
  const totalAnnual = fdInterest + bondInterest;

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Card variant="tile">
          <div className="tile-icon"><IndianRupee size={18} /></div>
          <div className="tile-label">Annual Yield</div>
          <div className="tile-value">{fmtINRFull(totalAnnual)}</div>
          <div className="tile-sub">Fixed income projection</div>
        </Card>
        <Card variant="tile">
          <div className="tile-icon"><Receipt size={18} /></div>
          <div className="tile-label">Monthly Income</div>
          <div className="tile-value">{fmtINRFull(totalAnnual / 12)}</div>
          <div className="tile-sub">Average cash flow</div>
        </Card>
      </div>
      <Card style={{ padding: 24 }}>
        <div className="section-label">Yield Breakdown</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${THEME.line}` }}>
            <span style={{ fontWeight: 600 }}>Fixed Deposit Interest</span>
            <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(fdInterest)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${THEME.line}` }}>
            <span style={{ fontWeight: 600 }}>Bond Coupon Payments</span>
            <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(bondInterest)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 800 }}>
            <span>Total Estimated Yield</span>
            <span style={{ color: THEME.accent }}>{fmtINRFull(totalAnnual)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
