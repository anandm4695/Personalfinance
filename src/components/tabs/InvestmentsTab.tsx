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
  TrendingDown,
  Activity,
  IndianRupee,
  Receipt,
  Upload,
  CheckCircle2,
  AlertCircle,
  List,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fdMaturity, rdMaturity, today, uid } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
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
  { id: "epf",    label: "EPF (EPFO)",          icon: Shield,    stateKey: "epf"               },
  { id: "mf",     label: "Mutual Funds",       icon: BarChart3, stateKey: "mutualFunds"       },
  { id: "lic",    label: "LIC",                icon: Shield,    stateKey: "lic"               },
  { id: "income", label: "Yield Tracker",      icon: Activity,  stateKey: null                },
];

/* ══════════════════════════════════════════════════════════════════════
   ADD INVESTMENT MODAL
══════════════════════════════════════════════════════════════════════ */
const AddInvestmentModal = ({ sub, onClose, onSave }: any) => {
  const { mfCategories } = useMasterData();
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
  // ── EPF State ──
  const [epf, setEpf] = useState({ uan: "", employer: "", balance: "" });
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
      case "epf":
        if (!epf.balance) return;
        onSave("epf", epf);
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

      {/* ── EPF ── */}
      {sub === "epf" && (
        <>
          <Field label="UAN (Universal Account Number)">
            <input style={inp} value={epf.uan} onChange={e => setEpf({ ...epf, uan: e.target.value })} placeholder="12-digit UAN" maxLength={12} />
          </Field>
          <Field label="Employer / Company Name">
            <input style={inp} value={epf.employer} onChange={e => setEpf({ ...epf, employer: e.target.value })} placeholder="e.g. Infosys, TCS, Your Company Ltd." />
          </Field>
          <Field label="Current EPF Corpus (₹)">
            <input style={inp} type="number" value={epf.balance} onChange={e => setEpf({ ...epf, balance: e.target.value })} placeholder="500000" />
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
              {mfCategories.map((c: string) => <option key={c}>{c}</option>)}
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
      case "ppf":   return <PPFSection  items={state.ppf}               removeItem={removeItem} updateItem={updateItem} onAdd={onAdd} />;
      case "nps":   return <NPSSection  items={state.nps}               removeItem={removeItem} onAdd={onAdd} />;
      case "epf":   return <EPFSection  items={state.epf || []}         removeItem={removeItem} updateItem={updateItem} onAdd={onAdd} />;
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
      Add your first {label} to start tracking.
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

/* ── PPF Transaction Modal ───────────────────────────────────────────── */
function PPFTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(initial || { date: today(), type: "deposit", amount: "", note: "" });
  const valid = form.amount && Number(form.amount) > 0;
  return (
    <Modal title={initial ? "Edit Transaction" : "Add PPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="deposit">Deposit (Load Money)</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input style={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50000" min="1" />
      </Field>
      <Field label="Note (optional)">
        <input style={inp} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Annual contribution FY 2025-26" />
      </Field>
      <ModalActions onSave={() => valid && onSave(form)} onClose={onClose} saveLabel={initial ? "Save Changes" : "Add Transaction"} />
    </Modal>
  );
}

/* ── PPF CSV Import Panel ────────────────────────────────────────────── */
function PPFCsvPanel({ onImport }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const parseCsvText = (text: string) => {
    setCsvError(""); setCsvPreview([]); setImportDone(false);
    try {
      const lines = text.trim().split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) { setCsvError("No data rows found."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need date, type, amount (got: "${line}")`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const t = type.toLowerCase();
        if (!["deposit", "withdrawal", "d", "w"].includes(t)) throw new Error(`Row ${i + 1}: type must be deposit or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return { date, type: t.startsWith("d") ? "deposit" : "withdrawal", amount: amt, note: note || "", id: `ppftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
      });
      setCsvPreview(rows);
    } catch (e: any) { setCsvError(e.message); }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content = "# PPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: deposit or withdrawal\n2025-04-05,deposit,150000,Annual contribution FY 2025-26\n2025-10-10,deposit,50000,Mid-year top up\n2026-01-15,withdrawal,25000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ppf_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview);
    setImportDone(true);
    setCsvPreview([]); setCsvText(""); setCsvFileName("");
  };

  const btnStyle = { padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" };

  return (
    <div style={{ padding: 18, borderRadius: 12, marginBottom: 16, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.22)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 8 }}><FileText size={15} /> Bulk Import via CSV</div>
        <button onClick={downloadTemplate} style={{ ...btnStyle, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8" }}>Download Template</button>
      </div>
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12, padding: "8px 12px", background: "rgba(128,128,128,0.06)", borderRadius: 8, lineHeight: 1.6 }}>
        <b style={{ color: THEME.ink }}>Format:</b> <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>date, type, amount, note</code><br />
        Deposit: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2025-04-05, deposit, 150000, Annual contribution</code>
        &nbsp;&nbsp;Withdrawal: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2026-01-15, withdrawal, 25000, Partial</code>
      </div>
      <label
        style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", border: "1.5px dashed rgba(99,102,241,0.4)", borderRadius: 10, cursor: "pointer", marginBottom: 12, background: "rgba(99,102,241,0.03)" }}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      >
        <Upload size={22} color="#818cf8" />
        <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{csvFileName || "Drop CSV file here or click to browse"}</div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 6, textAlign: "center" as const }}>— or paste CSV text below —</div>
      <textarea
        style={{ width: "100%", minHeight: 80, padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 12, fontFamily: "monospace", resize: "vertical" as const, boxSizing: "border-box" as const }}
        value={csvText}
        onChange={e => { setCsvText(e.target.value); setCsvPreview([]); setCsvError(""); setImportDone(false); }}
        placeholder={"2025-04-05, deposit, 150000, Annual contribution FY 2025-26\n2025-10-10, deposit, 50000, Mid-year top up"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button style={{ ...btnStyle, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#818cf8" }} onClick={() => parseCsvText(csvText)}>Preview Data</button>
        {csvPreview.length > 0 && !importDone && (
          <button style={{ ...btnStyle, border: "none", background: "#818cf8", color: "#fff" }} onClick={doImport}>
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.sage, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={15} /> Imported!</div>}
      </div>
      {csvError && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", color: THEME.rust, fontSize: 12, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.07)", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>{csvPreview.length} rows ready — preview:</div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead><tr style={{ background: "rgba(128,128,128,0.04)" }}>
                {["Date","Type","Amount","Note"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.date}</td>
                    <td style={{ padding: "6px 10px" }}><span style={{ color: r.type === "deposit" ? THEME.sage : THEME.rust, fontWeight: 600, textTransform: "capitalize" as const }}>{r.type}</span></td>
                    <td style={{ padding: "6px 10px", fontWeight: 700 }}>{fmtINR(r.amount)}</td>
                    <td style={{ padding: "6px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PPF Account Card with Ledger ────────────────────────────────────── */
function PPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs] = useState<any[]>(p.transactions || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
  const totalDeposits = txs.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = txs.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);

  const persist = (updated: any[]) => {
    setTxs(updated);
    updateItem("ppf", p.id, { transactions: updated });
  };

  const saveTx = (form: any) => {
    const updated = editTx
      ? txs.map(t => t.id === editTx.id ? { ...form, id: editTx.id } : t)
      : [...txs, { ...form, id: uid() }];
    persist(updated);
    setShowTxModal(false); setEditTx(null);
  };

  const removeTx = (id: string) => persist(txs.filter(t => t.id !== id));
  const importRows = (rows: any[]) => { persist([...txs, ...rows]); setShowCsvImport(false); };

  const btnGhost = { background: "transparent", border: `1px solid ${THEME.line}`, borderRadius: 8, color: THEME.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12, padding: "7px 14px" } as const;

  return (
    <Card style={{ padding: 20 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Badge variant="accent">PPF Account</Badge>
          {(p.institution || p.bank) && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
              Bank/Post Office: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.institution || p.bank}</span>
            </div>
          )}
          {p.accountNumber && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
              A/C: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.accountNumber}</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("ppf", p.id)} />
      </div>

      {/* Balance */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Current Balance</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage, letterSpacing: "-0.02em" }}>{fmtINRFull(p.balance)}</div>

      {/* Stats row */}
      {txs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            { label: "Total Deposits", value: totalDeposits, color: THEME.sage, Icon: TrendingUp },
            { label: "Total Withdrawals", value: totalWithdrawals, color: THEME.rust, Icon: TrendingDown },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.line}`, background: "var(--t-paper)" }}>
              <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon size={10} color={color} /> {label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color }}>{fmtINR(value)}</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>{txs.filter(t => (label === "Total Deposits" ? t.type === "deposit" : t.type === "withdrawal")).length} entries</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button style={btnGhost} onClick={() => { setShowTxModal(true); setEditTx(null); setShowCsvImport(false); }}>
          <Plus size={13} /> Add Transaction
        </button>
        <button style={{ ...btnGhost, color: "#818cf8", borderColor: "rgba(129,140,248,0.4)" }} onClick={() => { setShowCsvImport(v => !v); setShowLedger(true); }}>
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger(v => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <PPFCsvPanel onImport={(rows: any[]) => { importRows(rows); setShowCsvImport(false); }} />
        </div>
      )}

      {/* Transaction Ledger */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Transaction Ledger</div>
          <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.06)" }}>
                  {["Date","Type","Amount","Note",""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 10px", textAlign: i >= 3 ? "right" as const : "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 11, color: t.type === "deposit" ? THEME.sage : THEME.rust }}>
                        {t.type === "deposit" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {t.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: t.type === "deposit" ? THEME.sage : THEME.rust }}>
                      {t.type === "withdrawal" ? "-" : "+"}{fmtINR(t.amount)}
                    </td>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.note || "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" as const }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => { setEditTx(t); setShowTxModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 2, display: "flex" }}><Pencil size={12} /></button>
                        <button onClick={() => removeTx(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {txs.length === 0 && <div style={{ padding: "20px 0", textAlign: "center" as const, color: THEME.muted, fontSize: 12 }}>No transactions yet — add manually or import CSV above</div>}
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showTxModal && (
        <PPFTransactionModal
          initial={editTx ? { date: editTx.date, type: editTx.type, amount: String(editTx.amount), note: editTx.note || "" } : undefined}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
          onSave={saveTx}
        />
      )}
    </Card>
  );
}

/* ── PPF Section ────────────────────────────────────────────────────── */
const PPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="PPF Account" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {items.map((p: any) => (
            <PPFAccountCard key={p.id} p={p} removeItem={removeItem} updateItem={updateItem} />
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

/* ── EPF Account Card ────────────────────────────────────────────────── */
const EPF_TX_TYPES = [
  { value: "employee_contribution", label: "Employee Contribution", color: "#6366f1" },
  { value: "employer_contribution", label: "Employer Contribution", color: "#0ea5e9" },
  { value: "interest_credit",       label: "Interest Credit (EPFO)", color: "#22c55e" },
  { value: "withdrawal",            label: "Withdrawal",             color: "#ef4444" },
];

function EPFTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(initial || { date: today(), type: "employee_contribution", amount: "", note: "" });
  const valid = form.amount && Number(form.amount) > 0;
  return (
    <Modal title={initial ? "Edit Transaction" : "Add EPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {EPF_TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input style={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" min="1" />
      </Field>
      <Field label="Note (optional)">
        <input style={inp} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. April 2025 contribution" />
      </Field>
      <ModalActions onSave={() => valid && onSave(form)} onClose={onClose} saveLabel={initial ? "Save Changes" : "Add Transaction"} />
    </Modal>
  );
}

function EPFCsvPanel({ onImport }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const TYPE_MAP: Record<string, string> = {
    employee: "employee_contribution", emp: "employee_contribution", e: "employee_contribution", employee_contribution: "employee_contribution",
    employer: "employer_contribution", er: "employer_contribution", employer_contribution: "employer_contribution",
    interest: "interest_credit", i: "interest_credit", interest_credit: "interest_credit",
    withdrawal: "withdrawal", w: "withdrawal",
  };

  const parseCsvText = (text: string) => {
    setCsvError(""); setCsvPreview([]); setImportDone(false);
    try {
      const lines = text.trim().split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) { setCsvError("No data rows found."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need date, type, amount`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const mappedType = TYPE_MAP[type.toLowerCase().replace(/\s+/g, "_")];
        if (!mappedType) throw new Error(`Row ${i + 1}: type must be employee, employer, interest, or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return { date, type: mappedType, amount: amt, note: note || "", id: `epftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
      });
      setCsvPreview(rows);
    } catch (e: any) { setCsvError(e.message); }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content = "# EPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: employee | employer | interest | withdrawal\n2025-04-30,employee,5000,April 2025 employee share\n2025-04-30,employer,5000,April 2025 employer share\n2026-03-31,interest,41250,EPFO interest FY 2025-26 @ 8.25%\n2026-02-15,withdrawal,50000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "epf_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview); setImportDone(true);
    setCsvPreview([]); setCsvText(""); setCsvFileName("");
  };

  const btnStyle = { padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" };
  const typeInfo = (t: string) => EPF_TX_TYPES.find(x => x.value === t) || { label: t, color: THEME.muted };

  return (
    <div style={{ padding: 18, borderRadius: 12, marginBottom: 16, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.22)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 8 }}><FileText size={15} /> Bulk Import via CSV</div>
        <button onClick={downloadTemplate} style={{ ...btnStyle, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8" }}>Download Template</button>
      </div>
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12, padding: "8px 12px", background: "rgba(128,128,128,0.06)", borderRadius: 8, lineHeight: 1.6 }}>
        <b style={{ color: THEME.ink }}>Format:</b> <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>date, type, amount, note</code><br />
        Type values: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>employee</code> &nbsp;
        <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>employer</code> &nbsp;
        <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>interest</code> &nbsp;
        <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>withdrawal</code>
      </div>
      <label
        style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", border: "1.5px dashed rgba(99,102,241,0.4)", borderRadius: 10, cursor: "pointer", marginBottom: 12, background: "rgba(99,102,241,0.03)" }}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      >
        <Upload size={22} color="#818cf8" />
        <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{csvFileName || "Drop CSV file here or click to browse"}</div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 6, textAlign: "center" as const }}>— or paste CSV text below —</div>
      <textarea
        style={{ width: "100%", minHeight: 80, padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 12, fontFamily: "monospace", resize: "vertical" as const, boxSizing: "border-box" as const }}
        value={csvText}
        onChange={e => { setCsvText(e.target.value); setCsvPreview([]); setCsvError(""); setImportDone(false); }}
        placeholder={"2025-04-30, employee, 5000, April 2025\n2025-04-30, employer, 5000, April 2025\n2026-03-31, interest, 41250, EPFO FY 2025-26"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button style={{ ...btnStyle, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#818cf8" }} onClick={() => parseCsvText(csvText)}>Preview Data</button>
        {csvPreview.length > 0 && !importDone && (
          <button style={{ ...btnStyle, border: "none", background: "#818cf8", color: "#fff" }} onClick={doImport}>Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}</button>
        )}
        {importDone && <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.sage, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={15} /> Imported!</div>}
      </div>
      {csvError && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", color: THEME.rust, fontSize: 12, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.07)", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>{csvPreview.length} rows ready — preview:</div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead><tr style={{ background: "rgba(128,128,128,0.04)" }}>
                {["Date","Type","Amount","Note"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {csvPreview.map((r, i) => {
                  const ti = typeInfo(r.type);
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "6px 10px" }}>{r.date}</td>
                      <td style={{ padding: "6px 10px" }}><span style={{ color: ti.color, fontWeight: 600, fontSize: 11 }}>{ti.label}</span></td>
                      <td style={{ padding: "6px 10px", fontWeight: 700 }}>{fmtINR(r.amount)}</td>
                      <td style={{ padding: "6px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs] = useState<any[]>(p.transactions || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));

  const byType = (t: string) => txs.filter(x => x.type === t).reduce((s, x) => s + Number(x.amount), 0);
  const totalEmployee = byType("employee_contribution");
  const totalEmployer = byType("employer_contribution");
  const totalInterest = byType("interest_credit");
  const totalWithdrawal = byType("withdrawal");

  const persist = (updated: any[]) => { setTxs(updated); updateItem("epf", p.id, { transactions: updated }); };
  const saveTx = (form: any) => {
    const updated = editTx
      ? txs.map(t => t.id === editTx.id ? { ...form, id: editTx.id } : t)
      : [...txs, { ...form, id: uid() }];
    persist(updated); setShowTxModal(false); setEditTx(null);
  };
  const removeTx = (id: string) => persist(txs.filter(t => t.id !== id));
  const importRows = (rows: any[]) => { persist([...txs, ...rows]); setShowCsvImport(false); };

  const typeInfo = (t: string) => EPF_TX_TYPES.find(x => x.value === t) || { label: t, color: THEME.muted };
  const btnGhost = { background: "transparent", border: `1px solid ${THEME.line}`, borderRadius: 8, color: THEME.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12, padding: "7px 14px" } as const;

  const stats = [
    { label: "Employee", value: totalEmployee, color: "#6366f1" },
    { label: "Employer", value: totalEmployer, color: "#0ea5e9" },
    { label: "Interest (EPFO)", value: totalInterest, color: THEME.sage },
    { label: "Withdrawn", value: totalWithdrawal, color: THEME.rust },
  ].filter(s => s.value > 0);

  return (
    <Card style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Badge variant="accent">EPF Account</Badge>
          {(p.employer || p.bank) && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
              Employer: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.employer || p.bank}</span>
            </div>
          )}
          {(p.uan || p.accountNumber) && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
              UAN: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.uan || p.accountNumber}</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("epf", p.id)} />
      </div>

      {/* Balance */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Total Corpus</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#6366f1", letterSpacing: "-0.02em" }}>{fmtINRFull(p.balance)}</div>

      {/* Stats from transactions */}
      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          {stats.map(s => (
            <div key={s.label} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${THEME.line}`, background: "var(--t-paper)" }}>
              <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{fmtINR(s.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button style={btnGhost} onClick={() => { setShowTxModal(true); setEditTx(null); setShowCsvImport(false); }}>
          <Plus size={13} /> Add Transaction
        </button>
        <button style={{ ...btnGhost, color: "#818cf8", borderColor: "rgba(129,140,248,0.4)" }} onClick={() => { setShowCsvImport(v => !v); setShowLedger(true); }}>
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger(v => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* CSV Panel */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <EPFCsvPanel onImport={(rows: any[]) => { importRows(rows); setShowCsvImport(false); }} />
        </div>
      )}

      {/* Ledger */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Transaction Ledger</div>
          <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.06)" }}>
                  {["Date","Type","Amount","Note",""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 10px", textAlign: i >= 3 ? "right" as const : "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => {
                  const ti = typeInfo(t.type);
                  const isOut = t.type === "withdrawal";
                  return (
                    <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ fontWeight: 700, fontSize: 11, color: ti.color }}>{ti.label}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 800, color: isOut ? THEME.rust : ti.color }}>
                        {isOut ? "-" : "+"}{fmtINR(t.amount)}
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.note || "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" as const }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => { setEditTx(t); setShowTxModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 2, display: "flex" }}><Pencil size={12} /></button>
                          <button onClick={() => removeTx(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showTxModal && (
        <EPFTransactionModal
          initial={editTx ? { date: editTx.date, type: editTx.type, amount: String(editTx.amount), note: editTx.note || "" } : undefined}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
          onSave={saveTx}
        />
      )}
    </Card>
  );
}

/* ── EPF Section ─────────────────────────────────────────────────────── */
const EPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EmptyState label="EPF Account" onAdd={onAdd} />
      : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {items.map((e: any) => (
            <EPFAccountCard key={e.id} p={e} removeItem={removeItem} updateItem={updateItem} />
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
