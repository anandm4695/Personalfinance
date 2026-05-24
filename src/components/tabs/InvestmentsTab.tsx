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
import { Prv } from "../../context/PrivacyContext";
import { useMasterData } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";

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
  const [bond, setBond] = useState({
    name: "", issuer: "", isin: "", securityNature: "", orderId: "",
    faceValuePerUnit: "", numberOfUnits: "", coupon: "", ytmRate: "",
    maturityDate: "", orderDate: today(),
    principalRepayment: "At Maturity", interestPaymentDate: "Annually",
    cleanPricePerUnit: "", accruedInterestPerUnit: "",
    brokerage: "0", stampDuty: "0",
    buyerName: "", sellerName: "",
  });
  // ── PPF State ──
  const [ppf, setPpf] = useState({ institution: "", balance: "", accountNumber: "" });
  // ── NPS State ──
  const [nps, setNps] = useState({ tier: "I", pran: "", balance: "" });
  // ── EPF State ──
  const [epf, setEpf] = useState({ uan: "", employer: "", balance: "" });
  const [mf, setMf] = useState({ name: "", category: "Equity", investedValue: "", currentValue: "", units: "", currentNav: "" });

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
      case "bond": {
        if (!bond.name || !bond.coupon) return;
        const units = Number(bond.numberOfUnits) || 0;
        const fvpu = Number(bond.faceValuePerUnit) || 0;
        const cppu = Number(bond.cleanPricePerUnit) || 0;
        const aipu = Number(bond.accruedInterestPerUnit) || 0;
        const totalPrincipal = units * fvpu;
        const totalAccrued = units * aipu;
        const totalConsideration = units * cppu + totalAccrued;
        const totalInvestment = totalConsideration + Number(bond.brokerage || 0) + Number(bond.stampDuty || 0);
        onSave("bonds", {
          ...bond,
          faceValue: totalPrincipal || Number(bond.faceValuePerUnit) || 0,
          totalPrincipalAmount: totalPrincipal,
          totalAccruedInterest: totalAccrued,
          totalConsideration: totalConsideration,
          totalInvestmentAmount: totalInvestment,
        });
        break;
      }
      case "ppf":
        if (!ppf.balance) return;
        onSave("ppf", ppf);
        break;
      case "nps":
        if (!nps.balance) return;
        onSave("nps", nps);
        break;
      case "epf":
        onSave("epf", epf);
        break;
      case "mf":
        if (!mf.name || !mf.investedValue) return;
        onSave("mutualFunds", mf);
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
      {sub === "bond" && (() => {
        const units = Number(bond.numberOfUnits) || 0;
        const fvpu  = Number(bond.faceValuePerUnit) || 0;
        const cppu  = Number(bond.cleanPricePerUnit) || 0;
        const aipu  = Number(bond.accruedInterestPerUnit) || 0;
        const brok  = Number(bond.brokerage) || 0;
        const sdut  = Number(bond.stampDuty) || 0;
        const totalPrincipal    = units * fvpu;
        const totalAccrued      = units * aipu;
        const totalConsideration = units * cppu + totalAccrued;
        const totalInvestment   = totalConsideration + brok + sdut;
        const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: THEME.muted, marginTop: 16, marginBottom: 4, borderTop: `1px solid ${THEME.line}`, paddingTop: 12 };
        return (
          <>
            <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>Bond Identity</div>
            <Field label="Bond / Product Name *">
              <input style={inp} value={bond.name} onChange={e => setBond({ ...bond, name: e.target.value })} placeholder="e.g. IIFL Samasta Mar'25" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Issuer">
                <input style={inp} value={bond.issuer} onChange={e => setBond({ ...bond, issuer: e.target.value })} placeholder="e.g. IIFL, NHAI" />
              </Field>
              <Field label="Security Nature">
                <input style={inp} value={bond.securityNature} onChange={e => setBond({ ...bond, securityNature: e.target.value })} placeholder="Senior Secured Bond" />
              </Field>
              <Field label="ISIN">
                <input style={inp} value={bond.isin} onChange={e => setBond({ ...bond, isin: e.target.value })} placeholder="INE413U07335" />
              </Field>
              <Field label="Order ID">
                <input style={inp} value={bond.orderId} onChange={e => setBond({ ...bond, orderId: e.target.value })} placeholder="1514021" />
              </Field>
            </div>

            <div style={labelStyle}>Financial Terms</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Face Value per Unit (₹)">
                <input style={inp} type="number" value={bond.faceValuePerUnit} onChange={e => setBond({ ...bond, faceValuePerUnit: e.target.value })} placeholder="1000" />
              </Field>
              <Field label="Number of Units">
                <input style={inp} type="number" value={bond.numberOfUnits} onChange={e => setBond({ ...bond, numberOfUnits: e.target.value })} placeholder="10" />
              </Field>
              <Field label="Coupon Rate (% p.a.) *">
                <input style={inp} type="number" value={bond.coupon} onChange={e => setBond({ ...bond, coupon: e.target.value })} placeholder="9.6" step="0.01" />
              </Field>
              <Field label="YTM Rate (% after brokerage)">
                <input style={inp} type="number" value={bond.ytmRate} onChange={e => setBond({ ...bond, ytmRate: e.target.value })} placeholder="11.25" step="0.01" />
              </Field>
              <Field label="Maturity Date">
                <input style={inp} type="date" value={bond.maturityDate} onChange={e => setBond({ ...bond, maturityDate: e.target.value })} />
              </Field>
              <Field label="Order Date">
                <input style={inp} type="date" value={bond.orderDate} onChange={e => setBond({ ...bond, orderDate: e.target.value })} />
              </Field>
              <Field label="Principal Repayment">
                <select style={inp} value={bond.principalRepayment} onChange={e => setBond({ ...bond, principalRepayment: e.target.value })}>
                  <option>At Maturity</option>
                  <option>Installments</option>
                </select>
              </Field>
              <Field label="Interest Payment">
                <select style={inp} value={bond.interestPaymentDate} onChange={e => setBond({ ...bond, interestPaymentDate: e.target.value })}>
                  <option>Annually</option>
                  <option>Semi-Annually</option>
                  <option>Quarterly</option>
                  <option>Monthly</option>
                  <option>At Maturity</option>
                </select>
              </Field>
            </div>

            <div style={labelStyle}>Transaction Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Clean Price per Unit (₹)">
                <input style={inp} type="number" value={bond.cleanPricePerUnit} onChange={e => setBond({ ...bond, cleanPricePerUnit: e.target.value })} placeholder="991.087" step="0.001" />
              </Field>
              <Field label="Accrued Interest per Unit (₹)">
                <input style={inp} type="number" value={bond.accruedInterestPerUnit} onChange={e => setBond({ ...bond, accruedInterestPerUnit: e.target.value })} placeholder="47.8685" step="0.0001" />
              </Field>
              <Field label="Brokerage incl. GST (₹)">
                <input style={inp} type="number" value={bond.brokerage} onChange={e => setBond({ ...bond, brokerage: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Stamp Duty (₹)">
                <input style={inp} type="number" value={bond.stampDuty} onChange={e => setBond({ ...bond, stampDuty: e.target.value })} placeholder="0" />
              </Field>
            </div>

            {/* Live computed summary */}
            {(units > 0 || cppu > 0) && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(128,128,128,0.04)", border: `1px solid ${THEME.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Total Principal",       fmtINRFull(totalPrincipal)],
                  ["Total Accrued Interest", fmtINRFull(totalAccrued)],
                  ["Total Consideration",   fmtINRFull(totalConsideration)],
                  ["Total Investment",      fmtINRFull(totalInvestment)],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{lbl}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={labelStyle}>Parties</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Buyer Name">
                <input style={inp} value={bond.buyerName} onChange={e => setBond({ ...bond, buyerName: e.target.value })} placeholder="Your name" />
              </Field>
              <Field label="Seller Name">
                <input style={inp} value={bond.sellerName} onChange={e => setBond({ ...bond, sellerName: e.target.value })} placeholder="e.g. Ambium Finserve" />
              </Field>
            </div>
          </>
        );
      })()}

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

  // Portfolio Calculations
  const totalPrincipal = 
    (state.fixedDeposits?.reduce((s: number, x: any) => s + (Number(x.principal) || 0), 0) || 0) +
    (state.recurringDeposits?.reduce((s: number, x: any) => s + (Number(x.monthly) * (Number(x.tenureMonths) || 0)), 0) || 0) +
    (state.bonds?.reduce((s: number, x: any) => s + (Number(x.faceValue) || 0), 0) || 0) +
    (state.ppf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.mutualFunds?.reduce((s: number, x: any) => s + (Number(x.investedValue) || 0), 0) || 0) +
    (state.lic?.reduce((s: number, x: any) => s + (Number(x.premiumPaid) || 0), 0) || 0);

  const totalCurrent = 
    (state.fixedDeposits?.reduce((s: number, x: any) => s + (Number(x.principal) || 0), 0) || 0) + // Approximating principal as current for now
    (state.recurringDeposits?.reduce((s: number, x: any) => s + (Number(x.monthly) * (Number(x.tenureMonths) || 0)), 0) || 0) +
    (state.bonds?.reduce((s: number, x: any) => s + (Number(x.faceValue) || 0), 0) || 0) +
    (state.ppf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.mutualFunds?.reduce((s: number, x: any) => s + (Number(x.currentValue) || Number(x.investedValue) || 0), 0) || 0) +
    (state.lic?.reduce((s: number, x: any) => s + (Number(x.premiumPaid) || 0), 0) || 0);

  const netGain = totalCurrent - totalPrincipal;
  const gainPct = totalPrincipal > 0 ? (netGain / totalPrincipal) * 100 : 0;


  const renderContent = () => {
    const onAdd = () => setShowModal(true);
    switch (sub) {
      case "fd":    return <FDSection   items={state.fixedDeposits}     removeItem={removeItem} onAdd={onAdd} />;
      case "rd":    return <RDSection   items={state.recurringDeposits} removeItem={removeItem} onAdd={onAdd} />;
      case "bond":  return <BondSection items={state.bonds}             removeItem={removeItem} updateItem={updateItem} onAdd={onAdd} />;
      case "ppf":   return <PPFSection  items={state.ppf}               removeItem={removeItem} updateItem={updateItem} onAdd={onAdd} />;
      case "nps":   return <NPSSection  items={state.nps}               removeItem={removeItem} onAdd={onAdd} />;
      case "epf":   return <EPFSection  items={state.epf || []}         removeItem={removeItem} updateItem={updateItem} onAdd={onAdd} />;
      case "mf":    return <MFSection   items={state.mutualFunds}       removeItem={removeItem} onAdd={onAdd} />;
      case "income":return <YieldTracker state={state} />;
      default:      return null;
    }
  };

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <SectionTitle 
        sub="Growth, preservation, and yield instruments across multiple asset classes"
        rightElement={
          canAdd && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Add {subs.find(s => s.id === sub)?.label || "Investment"}
            </Button>
          )
        }
      >
        Investments Portfolio
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 32 }}>
        <StatCard 
          label="Total Invested" 
          value={fmtINRFull(totalPrincipal)} 
          icon={<Briefcase />} 
          color={THEME.accent}
          sub="Principal contributions"
        />
        <StatCard 
          label="Current Value" 
          value={fmtINRFull(totalCurrent)} 
          icon={<Activity />} 
          color={THEME.sage}
          sub="Estimated portfolio value"
        />
        <StatCard 
          label="Net Returns" 
          value={fmtINRFull(netGain)} 
          icon={<TrendingUp />} 
          color={netGain >= 0 ? THEME.sage : THEME.rust}
          sub={netGain >= 0 ? `${gainPct.toFixed(1)}% overall gain` : `${Math.abs(gainPct).toFixed(1)}% overall loss`}
        />
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

/* ── Edit Bond Modal ────────────────────────────────────────────────── */
function EditBondModal({ bond: initial, onClose, onSave }: any) {
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: THEME.muted, marginTop: 16, marginBottom: 4, borderTop: `1px solid ${THEME.line}`, paddingTop: 12 };
  const [bond, setBond] = useState({
    name: initial.name || "",
    issuer: initial.issuer || "",
    isin: initial.isin || "",
    securityNature: initial.securityNature || "",
    orderId: initial.orderId || "",
    faceValuePerUnit: initial.faceValuePerUnit != null ? String(initial.faceValuePerUnit) : "",
    numberOfUnits: initial.numberOfUnits != null ? String(initial.numberOfUnits) : "",
    coupon: initial.coupon != null ? String(initial.coupon) : "",
    ytmRate: initial.ytmRate != null ? String(initial.ytmRate) : "",
    maturityDate: initial.maturityDate || "",
    orderDate: initial.orderDate || today(),
    principalRepayment: initial.principalRepayment || "At Maturity",
    interestPaymentDate: initial.interestPaymentDate || "Annually",
    cleanPricePerUnit: initial.cleanPricePerUnit != null ? String(initial.cleanPricePerUnit) : "",
    accruedInterestPerUnit: initial.accruedInterestPerUnit != null ? String(initial.accruedInterestPerUnit) : "",
    brokerage: initial.brokerage != null ? String(initial.brokerage) : "0",
    stampDuty: initial.stampDuty != null ? String(initial.stampDuty) : "0",
    buyerName: initial.buyerName || "",
    sellerName: initial.sellerName || "",
  });

  const units = Number(bond.numberOfUnits) || 0;
  const fvpu  = Number(bond.faceValuePerUnit) || 0;
  const cppu  = Number(bond.cleanPricePerUnit) || 0;
  const aipu  = Number(bond.accruedInterestPerUnit) || 0;
  const brok  = Number(bond.brokerage) || 0;
  const sdut  = Number(bond.stampDuty) || 0;
  const totalPrincipal     = units * fvpu;
  const totalAccrued       = units * aipu;
  const totalConsideration = units * cppu + totalAccrued;
  const totalInvestment    = totalConsideration + brok + sdut;

  const handleSave = () => {
    if (!bond.name || !bond.coupon) return;
    onSave({
      ...bond,
      faceValue: totalPrincipal || Number(bond.faceValuePerUnit) || 0,
      totalPrincipalAmount: totalPrincipal,
      totalAccruedInterest: totalAccrued,
      totalConsideration,
      totalInvestmentAmount: totalInvestment,
    });
  };

  return (
    <Modal title="Edit Bond" onClose={onClose}>
      <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>Bond Identity</div>
      <Field label="Bond / Product Name *">
        <input style={inp} value={bond.name} onChange={e => setBond({ ...bond, name: e.target.value })} placeholder="e.g. IIFL Samasta Mar'25" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input style={inp} value={bond.issuer} onChange={e => setBond({ ...bond, issuer: e.target.value })} placeholder="e.g. IIFL, NHAI" />
        </Field>
        <Field label="Security Nature">
          <input style={inp} value={bond.securityNature} onChange={e => setBond({ ...bond, securityNature: e.target.value })} placeholder="Senior Secured Bond" />
        </Field>
        <Field label="ISIN">
          <input style={inp} value={bond.isin} onChange={e => setBond({ ...bond, isin: e.target.value })} placeholder="INE413U07335" />
        </Field>
        <Field label="Order ID">
          <input style={inp} value={bond.orderId} onChange={e => setBond({ ...bond, orderId: e.target.value })} placeholder="1514021" />
        </Field>
      </div>

      <div style={labelStyle}>Financial Terms</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Face Value per Unit (₹)">
          <input style={inp} type="number" value={bond.faceValuePerUnit} onChange={e => setBond({ ...bond, faceValuePerUnit: e.target.value })} placeholder="1000" />
        </Field>
        <Field label="Number of Units">
          <input style={inp} type="number" value={bond.numberOfUnits} onChange={e => setBond({ ...bond, numberOfUnits: e.target.value })} placeholder="10" />
        </Field>
        <Field label="Coupon Rate (% p.a.) *">
          <input style={inp} type="number" value={bond.coupon} onChange={e => setBond({ ...bond, coupon: e.target.value })} placeholder="9.6" step="0.01" />
        </Field>
        <Field label="YTM Rate (% after brokerage)">
          <input style={inp} type="number" value={bond.ytmRate} onChange={e => setBond({ ...bond, ytmRate: e.target.value })} placeholder="11.25" step="0.01" />
        </Field>
        <Field label="Maturity Date">
          <input style={inp} type="date" value={bond.maturityDate} onChange={e => setBond({ ...bond, maturityDate: e.target.value })} />
        </Field>
        <Field label="Order Date">
          <input style={inp} type="date" value={bond.orderDate} onChange={e => setBond({ ...bond, orderDate: e.target.value })} />
        </Field>
        <Field label="Principal Repayment">
          <select style={inp} value={bond.principalRepayment} onChange={e => setBond({ ...bond, principalRepayment: e.target.value })}>
            <option>At Maturity</option>
            <option>Installments</option>
          </select>
        </Field>
        <Field label="Interest Payment">
          <select style={inp} value={bond.interestPaymentDate} onChange={e => setBond({ ...bond, interestPaymentDate: e.target.value })}>
            <option>Annually</option>
            <option>Semi-Annually</option>
            <option>Quarterly</option>
            <option>Monthly</option>
            <option>At Maturity</option>
          </select>
        </Field>
      </div>

      <div style={labelStyle}>Transaction Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Clean Price per Unit (₹)">
          <input style={inp} type="number" value={bond.cleanPricePerUnit} onChange={e => setBond({ ...bond, cleanPricePerUnit: e.target.value })} placeholder="991.087" step="0.001" />
        </Field>
        <Field label="Accrued Interest per Unit (₹)">
          <input style={inp} type="number" value={bond.accruedInterestPerUnit} onChange={e => setBond({ ...bond, accruedInterestPerUnit: e.target.value })} placeholder="47.8685" step="0.0001" />
        </Field>
        <Field label="Brokerage incl. GST (₹)">
          <input style={inp} type="number" value={bond.brokerage} onChange={e => setBond({ ...bond, brokerage: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Stamp Duty (₹)">
          <input style={inp} type="number" value={bond.stampDuty} onChange={e => setBond({ ...bond, stampDuty: e.target.value })} placeholder="0" />
        </Field>
      </div>

      {(units > 0 || cppu > 0) && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(128,128,128,0.04)", border: `1px solid ${THEME.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Total Principal",        fmtINRFull(totalPrincipal)],
            ["Total Accrued Interest", fmtINRFull(totalAccrued)],
            ["Total Consideration",    fmtINRFull(totalConsideration)],
            ["Total Investment",       fmtINRFull(totalInvestment)],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{lbl}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={labelStyle}>Parties</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Buyer Name">
          <input style={inp} value={bond.buyerName} onChange={e => setBond({ ...bond, buyerName: e.target.value })} placeholder="Your name" />
        </Field>
        <Field label="Seller Name">
          <input style={inp} value={bond.sellerName} onChange={e => setBond({ ...bond, sellerName: e.target.value })} placeholder="e.g. Ambium Finserve" />
        </Field>
      </div>
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

/* ── Investment-specific empty state ────────────────────────────────── */
function InvestmentEmptyState({ icon: Icon, gradient, dotColor, title, description, pills, buttonLabel, onAdd }: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Icon size={30} color="#fff" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8, letterSpacing: "-0.02em" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380, margin: "0 auto 12px", lineHeight: 1.6 }}>
        {description}
      </div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 24, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" as const }}>
        {pills.map((t: string) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block" }} /> {t}
          </span>
        ))}
      </div>
      <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
        {buttonLabel}
      </Button>
    </Card>
  );
}

/* ── FD Section ─────────────────────────────────────────────────────── */
const FDSection = ({ items, removeItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <InvestmentEmptyState
          icon={Coins}
          gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)"
          dotColor="#f59e0b"
          title="No Fixed Deposits Added Yet"
          description="Track all your FD accounts — bank, interest rate, maturity date, and projected returns in one place."
          pills={["Principal Amount", "Interest Rate", "Maturity Date", "Projected Returns"]}
          buttonLabel="Add Fixed Deposit"
          onAdd={onAdd}
        />
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
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}><Prv>{fmtINRFull(f.principal)}</Prv></div>
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
      ? <InvestmentEmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)"
          dotColor="#0ea5e9"
          title="No Recurring Deposits Added Yet"
          description="Track your monthly RD installments, interest rate, tenure, and projected maturity value."
          pills={["Monthly Installment", "Interest Rate", "Tenure", "Maturity Value"]}
          buttonLabel="Add Recurring Deposit"
          onAdd={onAdd}
        />
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
function BondSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editBond, setEditBond] = useState<any>(null);

  const totalInvested = items.reduce((s: number, b: any) =>
    s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0), 0);
  const annualIncome = items.reduce((s: number, b: any) => {
    const principal = Number(b.totalPrincipalAmount || 0) ||
      (Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0));
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  const maturityCountdown = (dateStr: string) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: "Matured", color: THEME.muted };
    if (days <= 30) return { text: `${days}d left`, color: THEME.rust };
    if (days <= 365) return { text: `${Math.ceil(days / 30)}m left`, color: "#d97706" };
    const yrs = Math.floor(days / 365);
    const mos = Math.ceil((days % 365) / 30);
    return { text: `${yrs}y ${mos}m`, color: THEME.muted };
  };

  const BOND_AMBER = "#d97706";
  const lbl = { fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 };

  return (
    <div className="animate-fade-in-up">
      {items.length === 0
        ? <InvestmentEmptyState
            icon={FileText}
            gradient="linear-gradient(135deg,#92400e 0%,#d97706 100%)"
            dotColor="#d97706"
            title="No Bonds Added Yet"
            description="Track government bonds, SGBs, and corporate bonds with full order slip details — coupon rate, YTM, maturity, and investment breakdown."
            pills={["Senior Secured", "Govt / SGB", "Coupon & YTM", "Order Details"]}
            buttonLabel="Add Bond"
            onAdd={onAdd}
          />
        : (
          <>
            {/* Summary strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Invested", value: fmtINRFull(totalInvested), color: BOND_AMBER },
                { label: "Annual Coupon", value: fmtINRFull(annualIncome), color: THEME.sage },
                { label: "Bonds Held", value: String(items.length), color: THEME.accent },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${THEME.line}`, background: "var(--t-paper)" }}>
                  <div style={{ fontSize: 9, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 5, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: "-0.01em" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Bond cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
              {items.map((b: any) => {
                const investmentAmt = Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0);
                const ml = maturityCountdown(b.maturityDate);
                const annualCoupon = ((Number(b.totalPrincipalAmount || 0) ||
                  (Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0))) * Number(b.coupon || 0)) / 100;
                const charges = Number(b.brokerage || 0) + Number(b.stampDuty || 0);

                return (
                  <Card key={b.id} style={{ padding: 22, borderTop: `3px solid ${BOND_AMBER}` }}>

                    {/* Header: badges + actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, flex: 1, marginRight: 8 }}>
                        {b.securityNature && <Badge variant="gold" style={{ fontSize: 9 }}>{b.securityNature}</Badge>}
                        {b.issuer && <Badge variant="muted" style={{ fontSize: 9 }}>{b.issuer}</Badge>}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <Button variant="ghost" size="sm" icon={<Pencil size={12} />} onClick={() => setEditBond(b)} />
                        <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("bonds", b.id)} />
                      </div>
                    </div>

                    {/* Bond name + ISIN */}
                    <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, marginBottom: 2, lineHeight: 1.25 }}>{b.name}</div>
                    {b.isin
                      ? <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 14, fontFamily: "monospace", letterSpacing: "0.04em" }}>{b.isin}</div>
                      : <div style={{ marginBottom: 14 }} />}

                    {/* Investment amount (primary) */}
                    <div style={lbl}>Total Investment</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: BOND_AMBER, letterSpacing: "-0.02em", marginBottom: 16 }}>
                      <Prv>{fmtINRFull(investmentAmt)}</Prv>
                    </div>

                    {/* Key metrics — 4 amber pills */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
                      {[
                        ["Coupon", b.coupon ? `${b.coupon}%` : "—"],
                        ["YTM", b.ytmRate ? `${b.ytmRate}%` : "—"],
                        ["Units", b.numberOfUnits || "—"],
                        ["FV/Unit", b.faceValuePerUnit ? fmtINR(b.faceValuePerUnit) : "—"],
                      ].map(([l, v]) => (
                        <div key={l} style={{ padding: "8px 6px", background: "rgba(217,119,6,0.06)", borderRadius: 8, border: "1px solid rgba(217,119,6,0.14)", textAlign: "center" as const }}>
                          <div style={{ ...lbl, marginBottom: 3 }}>{l}</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Maturity + Annual Income row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0", borderTop: `1px solid ${THEME.line}`, borderBottom: `1px solid ${THEME.line}`, marginBottom: 14 }}>
                      <div>
                        <div style={lbl}>Maturity Date</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{b.maturityDate || "—"}</div>
                        {ml && <div style={{ fontSize: 10, fontWeight: 700, color: ml.color, marginTop: 2 }}>{ml.text}</div>}
                      </div>
                      <div>
                        <div style={lbl}>Annual Income</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>{annualCoupon > 0 ? fmtINRFull(annualCoupon) : "—"}</div>
                        {b.interestPaymentDate && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>{b.interestPaymentDate}</div>}
                      </div>
                    </div>

                    {/* Investment breakdown — 3 col */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        ["Principal", b.totalPrincipalAmount],
                        ["Accrued Int.", b.totalAccruedInterest],
                        ["Consideration", b.totalConsideration],
                      ].map(([label, val]) => (
                        <div key={label as string}>
                          <div style={lbl}>{label}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                            {val ? fmtINRFull(val) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer meta row */}
                    <div style={{ paddingTop: 10, borderTop: `1px solid ${THEME.line}`, display: "flex", flexWrap: "wrap" as const, gap: "3px 14px" }}>
                      {b.principalRepayment && <span style={{ fontSize: 10, color: THEME.muted }}>Principal: <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.principalRepayment}</span></span>}
                      {charges > 0 && <span style={{ fontSize: 10, color: THEME.muted }}>Charges: <span style={{ color: THEME.ink, fontWeight: 600 }}>{fmtINRFull(charges)}</span></span>}
                      {b.orderId && <span style={{ fontSize: 10, color: THEME.muted }}>Order #: <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderId}</span></span>}
                      {b.orderDate && <span style={{ fontSize: 10, color: THEME.muted }}>Ordered: <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderDate}</span></span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      {editBond && (
        <EditBondModal
          bond={editBond}
          onClose={() => setEditBond(null)}
          onSave={(updated: any) => {
            updateItem("bonds", editBond.id, updated);
            setEditBond(null);
          }}
        />
      )}
    </div>
  );
}

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
      <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage, letterSpacing: "-0.02em" }}><Prv>{fmtINRFull(p.balance)}</Prv></div>

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
      ? <InvestmentEmptyState
          icon={Shield}
          gradient="linear-gradient(135deg,#15803d 0%,#22c55e 100%)"
          dotColor="#16a34a"
          title="No PPF Account Added Yet"
          description="Track your Public Provident Fund — deposits, withdrawals, and full transaction ledger with CSV import."
          pills={["Annual Deposits", "Partial Withdrawals", "Transaction Ledger", "CSV Import"]}
          buttonLabel="Add PPF Account"
          onAdd={onAdd}
        />
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
      ? <InvestmentEmptyState
          icon={Briefcase}
          gradient="linear-gradient(135deg,#c2410c 0%,#fb923c 100%)"
          dotColor="#ea580c"
          title="No NPS Account Added Yet"
          description="Track your National Pension System corpus — Tier I and Tier II accounts with PRAN details."
          pills={["Tier I Account", "Tier II Account", "PRAN Number", "Corpus Growth"]}
          buttonLabel="Add NPS Account"
          onAdd={onAdd}
        />
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
  { value: "monthly_contribution",  label: "Monthly Contribution (Passbook)", color: "#8b5cf6" },
  { value: "employee_contribution", label: "Employee Contribution",           color: "#6366f1" },
  { value: "employer_contribution", label: "Employer Contribution",           color: "#0ea5e9" },
  { value: "interest_credit",       label: "Interest Credit (EPFO)",          color: "#22c55e" },
  { value: "withdrawal",            label: "Withdrawal",                      color: "#ef4444" },
];

function EPFTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(() => {
    if (!initial) return {
      date: today(), type: "monthly_contribution", amount: "",  note: "",
      wageMonth: "", particulars: "", epfWages: "", epsWages: "",
      employeeShare: "", employerShare: "", pensionShare: "",
    };
    return {
      date: initial.date || today(),
      type: initial.type || "monthly_contribution",
      amount: initial.amount != null ? String(initial.amount) : "",
      note: initial.note || "",
      wageMonth: initial.wageMonth || "",
      particulars: initial.particulars || "",
      epfWages: initial.epfWages != null ? String(initial.epfWages) : "",
      epsWages: initial.epsWages != null ? String(initial.epsWages) : "",
      employeeShare: initial.employeeShare != null ? String(initial.employeeShare) : "",
      employerShare: initial.employerShare != null ? String(initial.employerShare) : "",
      pensionShare: initial.pensionShare != null ? String(initial.pensionShare) : "",
    };
  });

  const isMonthly = form.type === "monthly_contribution";
  const isInterest = form.type === "interest_credit";
  const monthlyHasAmount = Number(form.employeeShare || 0) > 0 || Number(form.employerShare || 0) > 0 || Number(form.pensionShare || 0) > 0;
  const interestHasAmount = Number(form.employeeShare || 0) > 0 || Number(form.employerShare || 0) > 0;
  const valid = isMonthly
    ? (!!form.wageMonth && monthlyHasAmount)
    : isInterest
    ? interestHasAmount
    : (!!form.amount && Number(form.amount) > 0);

  return (
    <Modal title={initial ? "Edit Transaction" : "Add EPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Transaction Date">
          <input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {EPF_TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      {isMonthly ? (
        <>
          <div style={{ marginTop: 4, padding: "9px 12px", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 11, color: "#818cf8", marginBottom: 4 }}>
            Enter one row from your EPFO passbook — each wage month is one entry.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Wage Month *">
              <input style={inp} value={form.wageMonth} onChange={e => setForm({ ...form, wageMonth: e.target.value })} placeholder="e.g. Apr-2021" />
            </Field>
            <Field label="Particulars">
              <input style={inp} value={form.particulars} onChange={e => setForm({ ...form, particulars: e.target.value })} placeholder="Cont. For Due-Month 052021" />
            </Field>
            <Field label="EPF Wages (₹)">
              <input style={inp} type="number" value={form.epfWages} onChange={e => setForm({ ...form, epfWages: e.target.value })} placeholder="15000" />
            </Field>
            <Field label="EPS Wages (₹)">
              <input style={inp} type="number" value={form.epsWages} onChange={e => setForm({ ...form, epsWages: e.target.value })} placeholder="15000" />
            </Field>
            <Field label="Employee Share 12% (₹)">
              <input style={inp} type="number" value={form.employeeShare} onChange={e => setForm({ ...form, employeeShare: e.target.value })} placeholder="1800" />
            </Field>
            <Field label="Employer Share 3.67% (₹)">
              <input style={inp} type="number" value={form.employerShare} onChange={e => setForm({ ...form, employerShare: e.target.value })} placeholder="550" />
            </Field>
            <Field label="Pension Share 8.33% (₹)">
              <input style={inp} type="number" value={form.pensionShare} onChange={e => setForm({ ...form, pensionShare: e.target.value })} placeholder="1250" />
            </Field>
          </div>
        </>
      ) : isInterest ? (
        <>
          <div style={{ marginTop: 4, padding: "9px 12px", borderRadius: 8, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#16a34a", marginBottom: 4 }}>
            EPFO credits interest separately to Employee PF and Employer PF — enter both splits exactly as shown in your passbook.
          </div>
          <Field label="Period / Label (optional)">
            <input style={inp} value={form.particulars} onChange={e => setForm({ ...form, particulars: e.target.value })} placeholder="e.g. Int. Updated upto 31/03/2026" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Employee PF Interest (₹)">
              <input style={inp} type="number" value={form.employeeShare} onChange={e => setForm({ ...form, employeeShare: e.target.value })} placeholder="668" />
            </Field>
            <Field label="Employer PF Interest (₹)">
              <input style={inp} type="number" value={form.employerShare} onChange={e => setForm({ ...form, employerShare: e.target.value })} placeholder="204" />
            </Field>
            <Field label="Pension Interest (₹)">
              <input style={inp} type="number" value={form.pensionShare} onChange={e => setForm({ ...form, pensionShare: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input style={inp} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. EPFO Interest FY 2025-26 @ 8.25%" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Amount (₹)">
            <input style={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" min="1" />
          </Field>
          <Field label="Note (optional)">
            <input style={inp} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. April 2025 contribution" />
          </Field>
        </>
      )}
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

/* ── Add / Edit Establishment (Service History) ─────────────────────── */
function AddEstablishmentModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(initial || {
    employerName: "", estId: "", memberId: "", joiningDate: "", exitDate: "", ncpDays: "0",
  });
  const calcService = () => {
    if (!form.joiningDate) return "";
    const from = new Date(form.joiningDate);
    const to   = form.exitDate ? new Date(form.exitDate) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth()    - from.getMonth();
    let dys = to.getDate()     - from.getDate();
    if (dys < 0) { mos--; dys += 30; }
    if (mos < 0) { yrs--; mos += 12; }
    return `${yrs} Years ${mos} Months ${dys} Days`;
  };
  const svc = calcService();
  return (
    <Modal title={initial ? "Edit Establishment" : "Add Establishment (Service History)"} onClose={onClose}>
      <Field label="Employer / Organisation Name *">
        <input style={inp} value={form.employerName} onChange={e => setForm({ ...form, employerName: e.target.value })} placeholder="e.g. SAROJ LANDMARK REALTY LLP" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Establishment ID (Est Id)">
          <input style={inp} value={form.estId} onChange={e => setForm({ ...form, estId: e.target.value })} placeholder="e.g. KDMAL1612627000" />
        </Field>
        <Field label="Member ID">
          <input style={inp} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} placeholder="e.g. KDMAL16126270000010147" />
        </Field>
        <Field label="Joining Date">
          <input style={inp} type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
        </Field>
        <Field label="Exit Date (blank = currently working)">
          <input style={inp} type="date" value={form.exitDate} onChange={e => setForm({ ...form, exitDate: e.target.value })} />
        </Field>
        <Field label="NCP Days">
          <input style={inp} type="number" value={form.ncpDays} onChange={e => setForm({ ...form, ncpDays: e.target.value })} placeholder="0" min="0" />
        </Field>
        {svc && (
          <div style={{ display: "flex", flexDirection: "column" as const, justifyContent: "flex-end", paddingBottom: 2 }}>
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Total Service</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{svc}</div>
          </div>
        )}
      </div>
      <ModalActions onSave={() => form.employerName.trim() && onSave(form)} onClose={onClose} saveLabel={initial ? "Save Changes" : "Add Establishment"} />
    </Modal>
  );
}

function EditEPFModal({ epf: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    uan: initial.uan || initial.accountNumber || "",
    employer: initial.employer || initial.bank || "",
    balance: initial.balance != null ? String(initial.balance) : "",
  });
  const valid = form.balance !== "" && Number(form.balance) >= 0;
  return (
    <Modal title="Edit EPF Account" onClose={onClose}>
      <Field label="UAN (Universal Account Number)">
        <input style={inp} value={form.uan} onChange={e => setForm({ ...form, uan: e.target.value })} placeholder="12-digit UAN" maxLength={12} />
      </Field>
      <Field label="Employer / Company Name">
        <input style={inp} value={form.employer} onChange={e => setForm({ ...form, employer: e.target.value })} placeholder="e.g. Infosys, TCS, Your Company Ltd." />
      </Field>
      <Field label="Current EPF Corpus (₹)">
        <input style={inp} type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="500000" min="0" />
      </Field>
      <ModalActions onSave={() => valid && onSave(form)} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

function EPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs]               = useState<any[]>(p.transactions   || []);
  const [ests, setEsts]             = useState<any[]>(p.establishments  || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal]   = useState(false);
  const [editTx, setEditTx]             = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showEstModal, setShowEstModal] = useState(false);
  const [editEst, setEditEst]           = useState<any>(null);

  // Sync local state when parent data changes (e.g. after fetchAllData refresh)
  useEffect(() => {
    setTxs(p.transactions  || []);
    setEsts(p.establishments || []);
  }, [p.id]);

  /* ── helpers ── */
  const typeInfo = (t: string) => EPF_TX_TYPES.find(x => x.value === t) || { label: t, color: THEME.muted };
  const btnGhost = { background: "transparent", border: `1px solid ${THEME.line}`, borderRadius: 8, color: THEME.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12, padding: "7px 14px" } as const;

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtMY   = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
  const calcService = (join: string, exit: string) => {
    if (!join) return "—";
    const from = new Date(join); const to = exit ? new Date(exit) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth()    - from.getMonth();
    let dys = to.getDate()     - from.getDate();
    if (dys < 0) { mos--; dys += 30; } if (mos < 0) { yrs--; mos += 12; }
    return `${yrs}Y ${mos}M ${dys}D`;
  };

  /* ── stats ── */
  const byType = (t: string) => txs.filter(x => x.type === t).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthlyRows = txs.filter(x => x.type === "monthly_contribution");
  const totalEmployee  = byType("employee_contribution") + monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0);
  const totalEmployer  = byType("employer_contribution") + monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const totalPension   = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const interestRows = txs.filter(x => x.type === "interest_credit");
  const totalInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined || x.employerShare !== undefined)
      return s + Number(x.employeeShare || 0) + Number(x.employerShare || 0);
    return s + Number(x.amount || 0);
  }, 0);
  const totalWithdrawal = byType("withdrawal");

  // Compute closing balances from passbook (like EPFO passbook "Closing Balance" row)
  const empInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
    return s + Number(x.amount || 0); // backward compat: old single-amount interest → employee
  }, 0);
  const erInterest       = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const closingEmployee  = totalEmployee + empInterest;
  const closingEmployer  = totalEmployer + erInterest;
  const closingPension   = totalPension;
  const closingTotal     = closingEmployee + closingEmployer + closingPension - totalWithdrawal;
  const hasPassbook      = txs.some(t => t.type === "monthly_contribution" || t.type === "interest_credit");
  const displayCorpus    = hasPassbook ? closingTotal : Number(p.balance || 0);

  const stats = [
    ...(totalInterest  > 0 ? [{ label: "Interest (EPFO)",   value: totalInterest,  color: THEME.sage }] : []),
    ...(totalWithdrawal > 0 ? [{ label: "Withdrawn",         value: totalWithdrawal, color: THEME.rust }] : []),
  ].filter(s => s.value > 0);

  /* ── refs to avoid stale closures when both arrays are updated close together ── */
  const txsRef  = React.useRef(txs);
  const estsRef = React.useRef(ests);
  txsRef.current  = txs;
  estsRef.current = ests;

  /* ── persist ── */
  const persistTxs  = (updated: any[]) => { setTxs(updated);  updateItem("epf", p.id, { transactions: updated,         establishments: estsRef.current }); };
  const persistEsts = (updated: any[]) => { setEsts(updated); updateItem("epf", p.id, { transactions: txsRef.current,  establishments: updated         }); };

  const saveTx = (form: any) => {
    let entry: any;
    if (form.type === "monthly_contribution") {
      entry = {
        date:          form.date,
        type:          form.type,
        wageMonth:     form.wageMonth,
        particulars:   form.particulars   || "",
        epfWages:      Number(form.epfWages      || 0),
        epsWages:      Number(form.epsWages      || 0),
        employeeShare: Number(form.employeeShare || 0),
        employerShare: Number(form.employerShare || 0),
        pensionShare:  Number(form.pensionShare  || 0),
        amount:        Number(form.employeeShare || 0),
        note:          form.note || "",
      };
    } else if (form.type === "interest_credit") {
      const empInt = Number(form.employeeShare || 0);
      const erInt  = Number(form.employerShare  || 0);
      const penInt = Number(form.pensionShare   || 0);
      entry = {
        date:          form.date,
        type:          form.type,
        particulars:   form.particulars || "",
        employeeShare: empInt,
        employerShare: erInt,
        pensionShare:  penInt,
        amount:        empInt + erInt,
        note:          form.note || "",
      };
    } else {
      entry = {
        date:   form.date,
        type:   form.type,
        amount: Number(form.amount || 0),
        note:   form.note || "",
      };
    }
    const updated = editTx
      ? txs.map(t => t.id === editTx.id ? { ...entry, id: editTx.id } : t)
      : [...txs, { ...entry, id: uid() }];
    persistTxs(updated); setShowTxModal(false); setEditTx(null);
  };
  const removeTx = (id: string) => persistTxs(txs.filter(t => t.id !== id));
  const importRows = (rows: any[]) => { persistTxs([...txs, ...rows]); setShowCsvImport(false); };

  const saveEst = (form: any) => {
    const clean = { ...form, ncpDays: Number(form.ncpDays || 0) };
    const updated = editEst
      ? ests.map(e => e.id === editEst.id ? { ...clean, id: editEst.id } : e)
      : [...ests, { ...clean, id: uid() }];
    persistEsts(updated); setShowEstModal(false); setEditEst(null);
  };
  const removeEst = (id: string) => persistEsts(ests.filter(e => e.id !== id));

  /* ── sorted ledger split ── */
  const sortedTxs     = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const passbookRows  = sortedTxs.filter(t => t.type === "monthly_contribution" || t.type === "interest_credit");
  const regularRows   = sortedTxs.filter(t => t.type !== "monthly_contribution" && t.type !== "interest_credit");
  const sortedEsts    = [...ests].sort((a, b) => (b.joiningDate || "").localeCompare(a.joiningDate || ""));

  return (
    <Card style={{ padding: 20 }}>

      {/* ── Account Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Badge variant="accent">EPF Account</Badge>
          {(p.employer || p.bank) && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>Employer: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.employer || p.bank}</span></div>}
          {(p.uan || p.accountNumber) && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>UAN: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.uan || p.accountNumber}</span></div>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" icon={<Pencil size={12} />} onClick={() => setShowEditAccount(true)} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("epf", p.id)} />
        </div>
      </div>

      {/* ── Corpus ── */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
        Total Corpus{hasPassbook && <span style={{ fontSize: 10, color: THEME.sage, marginLeft: 6, fontWeight: 600 }}>auto-calculated from passbook</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#6366f1", letterSpacing: "-0.02em", marginBottom: hasPassbook ? 10 : 20 }}>
        <Prv>{fmtINRFull(displayCorpus)}</Prv>
      </div>
      {hasPassbook && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          <div style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.04)" }}>
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>Employee PF</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}><Prv>{fmtINR(closingEmployee)}</Prv></div>
          </div>
          <div style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(14,165,233,0.2)", background: "rgba(14,165,233,0.04)" }}>
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>Employer PF</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0ea5e9" }}><Prv>{fmtINR(closingEmployer)}</Prv></div>
          </div>
          <div style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>EPS (Pension)</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}><Prv>{fmtINR(closingPension)}</Prv></div>
          </div>
        </div>
      )}

      {/* ── Service History ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Service History</div>
          <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px", color: "#6366f1", borderColor: "rgba(99,102,241,0.3)" }}
            onClick={() => { setEditEst(null); setShowEstModal(true); }}>
            <Plus size={11} /> Add Employer
          </button>
        </div>

        {ests.length === 0 ? (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.04)", border: "1px dashed rgba(99,102,241,0.2)", fontSize: 11, color: THEME.muted, textAlign: "center" as const }}>
            Add your EPFO service history — Est ID, Member ID, Joining &amp; Exit dates
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 32 }}>
            <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: "rgba(99,102,241,0.2)", borderRadius: 2 }} />
            {sortedEsts.map((est, idx) => {
              const isCurrent = !est.exitDate;
              const dateLabel = isCurrent
                ? `${fmtMY(est.joiningDate)} — Present`
                : `${fmtMY(est.joiningDate)} — ${fmtMY(est.exitDate)}`;
              return (
                <div key={est.id} style={{ position: "relative", marginBottom: idx < sortedEsts.length - 1 ? 14 : 0 }}>
                  <div style={{ position: "absolute", left: -32, top: 10, width: 22, height: 22, borderRadius: "50%", background: isCurrent ? "#6366f1" : "rgba(99,102,241,0.15)", border: `2px solid ${isCurrent ? "#6366f1" : "rgba(99,102,241,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: isCurrent ? "#fff" : "#6366f1" }}>
                    {idx + 1}
                  </div>
                  <div style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${THEME.line}`, background: "var(--t-paper)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: isCurrent ? "#3730a3" : "rgba(128,128,128,0.1)", color: isCurrent ? "#fff" : THEME.muted }}>
                        {dateLabel}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => { setEditEst(est); setShowEstModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, display: "flex" }}><Pencil size={11} /></button>
                        <button onClick={() => removeEst(est.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4, display: "flex" }}><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.02em" }}>{est.employerName}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "4px 10px", fontSize: 10 }}>
                      <span style={{ color: THEME.muted }}>Est Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>{est.estId || "—"}</span>
                      <span style={{ color: THEME.muted }}>Joining</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{fmtDate(est.joiningDate)}</span>
                      <span style={{ color: THEME.muted }}>Member Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>{est.memberId || "—"}</span>
                      <span style={{ color: THEME.muted }}>Exit</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{est.exitDate ? fmtDate(est.exitDate) : "—"}</span>
                      <span style={{ color: THEME.muted }}>NCP Days</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{est.ncpDays || "0"} Days</span>
                      <span style={{ color: THEME.muted }}>Total Service</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{calcService(est.joiningDate, est.exitDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Interest / Withdrawal Stats ── */}
      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
          {stats.map(s => (
            <div key={s.label} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${THEME.line}`, background: "var(--t-paper)" }}>
              <div style={{ fontSize: 9, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{fmtINR(s.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
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

      {/* ── CSV Panel ── */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <EPFCsvPanel onImport={(rows: any[]) => { importRows(rows); setShowCsvImport(false); }} />
        </div>
      )}

      {/* ── Ledger ── */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>

          {/* Passbook (monthly_contribution) table */}
          {passbookRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                EPFO Passbook ({passbookRows.length} entries)
              </div>
              <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" as const }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 11, minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: "rgba(99,102,241,0.06)" }}>
                        {[
                          ["Wage Month / Description", false], ["Trans. Date", false], ["Particulars / Note", false],
                          ["EPF Wages", true], ["EPS Wages", true],
                          ["Emp. Share\n12%", true], ["Empr. Share\n3.67%", true], ["Pension\n8.33%", true], ["", false],
                        ].map(([h, right], i) => (
                          <th key={i} style={{ padding: "7px 10px", textAlign: right ? "right" as const : "left" as const, fontWeight: 700, fontSize: 9, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "pre-line" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {passbookRows.map(t => {
                        const isIntRow = t.type === "interest_credit";
                        const descLabel = isIntRow
                          ? (t.particulars || `Int. Updated upto ${new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`)
                          : (t.wageMonth || "—");
                        const empVal = isIntRow
                          ? (t.employeeShare !== undefined ? t.employeeShare : t.amount)
                          : (t.employeeShare || 0);
                        const erVal  = t.employerShare || 0;
                        const penVal = t.pensionShare  || 0;
                        return (
                          <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}`, background: isIntRow ? "rgba(34,197,94,0.04)" : undefined }}>
                            <td style={{ padding: "6px 10px", fontWeight: 700, color: isIntRow ? "#16a34a" : THEME.ink }}>{descLabel}</td>
                            <td style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}>{t.date || "—"}</td>
                            <td style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}>{isIntRow ? (t.note || "—") : (t.particulars || "—")}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" as const, fontWeight: 600 }}>{(!isIntRow && t.epfWages) ? fmtINR(t.epfWages) : "—"}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" as const, fontWeight: 600 }}>{(!isIntRow && t.epsWages) ? fmtINR(t.epsWages) : "—"}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" as const, fontWeight: 800, color: isIntRow ? "#16a34a" : "#6366f1" }}>{fmtINR(empVal)}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" as const, fontWeight: 800, color: isIntRow ? "#16a34a" : "#0ea5e9" }}>{fmtINR(erVal)}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" as const, fontWeight: 800, color: isIntRow ? THEME.muted : "#f59e0b" }}>{fmtINR(penVal)}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                                <button onClick={() => { setEditTx(t); setShowTxModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 2, display: "flex" }}><Pencil size={11} /></button>
                                <button onClick={() => removeTx(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}><Trash2 size={11} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${THEME.line}`, background: "rgba(99,102,241,0.04)" }}>
                        <td colSpan={3} style={{ padding: "7px 10px", fontWeight: 700, fontSize: 9, color: THEME.muted, textTransform: "uppercase" as const }}>Total</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 800 }}>{fmtINR(passbookRows.filter(t => t.type === "monthly_contribution").reduce((s, t) => s + Number(t.epfWages || 0), 0))}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 800 }}>{fmtINR(passbookRows.filter(t => t.type === "monthly_contribution").reduce((s, t) => s + Number(t.epsWages || 0), 0))}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 900, color: "#6366f1" }}>{fmtINR(passbookRows.reduce((s, t) => {
                          if (t.type === "interest_credit") return s + Number(t.employeeShare !== undefined ? t.employeeShare : t.amount || 0);
                          return s + Number(t.employeeShare || 0);
                        }, 0))}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 900, color: "#0ea5e9" }}>{fmtINR(passbookRows.reduce((s, t) => s + Number(t.employerShare || 0), 0))}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 900, color: "#f59e0b" }}>{fmtINR(passbookRows.filter(t => t.type === "monthly_contribution").reduce((s, t) => s + Number(t.pensionShare || 0), 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Regular transactions */}
          {regularRows.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                Other Transactions ({regularRows.length})
              </div>
              <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.06)" }}>
                      {["Date","Type","Amount","Note",""].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: i >= 2 ? "right" as const : "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regularRows.map(t => {
                      const ti = typeInfo(t.type);
                      const isOut = t.type === "withdrawal";
                      return (
                        <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                          <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                          <td style={{ padding: "8px 10px" }}><span style={{ fontWeight: 700, fontSize: 11, color: ti.color }}>{ti.label}</span></td>
                          <td style={{ padding: "8px 10px", textAlign: "right" as const, fontWeight: 800, color: isOut ? THEME.rust : ti.color }}>{isOut ? "-" : "+"}{fmtINR(t.amount)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" as const, color: THEME.muted }}>{t.note || "—"}</td>
                          <td style={{ padding: "8px 10px" }}>
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
        </div>
      )}

      {showTxModal && (
        <EPFTransactionModal
          initial={editTx}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
          onSave={saveTx}
        />
      )}
      {showEstModal && (
        <AddEstablishmentModal
          initial={editEst}
          onClose={() => { setShowEstModal(false); setEditEst(null); }}
          onSave={saveEst}
        />
      )}
      {showEditAccount && (
        <EditEPFModal
          epf={p}
          onClose={() => setShowEditAccount(false)}
          onSave={(updated: any) => {
            updateItem("epf", p.id, { ...updated, transactions: txs, establishments: ests });
            setShowEditAccount(false);
          }}
        />
      )}
    </Card>
  );
}

/* ── EPF Empty State ─────────────────────────────────────────────────── */
function EPFEmptyState({ onAdd }: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#6366f1 0%,#818cf8 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Shield size={30} color="#fff" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8, letterSpacing: "-0.02em" }}>
        No EPF Account Added Yet
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 8, maxWidth: 360, margin: "0 auto 8px", lineHeight: 1.6 }}>
        Track your Employee Provident Fund — employee &amp; employer contributions, EPFO interest credits, and withdrawals.
      </div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 24, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" as const }}>
        {["Employee Contribution", "Employer Contribution", "EPFO Interest", "Withdrawals"].map(t => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} /> {t}
          </span>
        ))}
      </div>
      <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
        Add EPF Account
      </Button>
    </Card>
  );
}

/* ── EPF Section ─────────────────────────────────────────────────────── */
const EPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0
      ? <EPFEmptyState onAdd={onAdd} />
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
      ? <InvestmentEmptyState
          icon={BarChart3}
          gradient="linear-gradient(135deg,#5b21b6 0%,#8b5cf6 100%)"
          dotColor="#7c3aed"
          title="No Mutual Funds Added Yet"
          description="Track all your MF investments — fund name, category, NAV, units, invested value, and P&L returns."
          pills={["Invested Value", "Current Value", "P&L Returns", "NAV Tracking"]}
          buttonLabel="Add Mutual Fund"
          onAdd={onAdd}
        />
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


/* ── Yield Tracker ──────────────────────────────────────────────────── */
const YieldTracker = ({ state }: any) => {
  const fdInterest = state.fixedDeposits.reduce((s: number, f: any) => s + (Number(f.principal) * Number(f.rate)) / 100, 0);
  const bondInterest = state.bonds.reduce((s: number, b: any) =>
    s + (Number(b.totalPrincipalAmount || b.faceValue || 0) * Number(b.coupon || 0)) / 100, 0);
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
