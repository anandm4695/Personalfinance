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
  Clock,
  Zap,
  PiggyBank,
  Target,
  RefreshCw,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  fdMaturity,
  rdMaturity,
  today,
  uid,
  monthsBetween,
  calculateEpfBalance,
} from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { useMasterData } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";

interface InvestmentsTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  subTab?: string;
  onSubTabChange?: (sub: string) => void;
}

/* ── shared input style (matches GoalModal) ─────────────────────────── */
const inp = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
} as const;

/* ── sub-tab metadata ─────────────────────────────────────────────────── */
const SUBS = [
  { id: "fd", label: "Fixed Deposits", icon: Coins, stateKey: "fixedDeposits" },
  { id: "rd", label: "Recurring Deposits", icon: Repeat, stateKey: "recurringDeposits" },
  { id: "bond", label: "Bonds", icon: FileText, stateKey: "bonds" },
  { id: "ppf", label: "PPF", icon: Shield, stateKey: "ppf" },
  { id: "nps", label: "NPS", icon: Briefcase, stateKey: "nps" },
  { id: "epf", label: "EPF (EPFO)", icon: Shield, stateKey: "epf" },
  { id: "mf", label: "Mutual Funds", icon: BarChart3, stateKey: "mutualFunds" },
  { id: "income", label: "Yield Tracker", icon: Activity, stateKey: null },
];

/* ══════════════════════════════════════════════════════════════════════
   ADD INVESTMENT MODAL
══════════════════════════════════════════════════════════════════════ */
const AddInvestmentModal = ({ sub, onClose, onSave }: any) => {
  const { mfCategories } = useMasterData();
  const subMeta = SUBS.find((s) => s.id === sub);

  // ── FD State ──
  const [fd, setFd] = useState({
    bank: "",
    principal: "",
    rate: "",
    years: "",
    startDate: today(),
    maturityDate: "",
  });
  const calcFdMaturity = (startDate: string, years: string) => {
    if (!startDate || !years || isNaN(Number(years))) return "";
    const d = new Date(startDate);
    const totalMonths = Math.round(Number(years) * 12);
    d.setMonth(d.getMonth() + totalMonths);
    return d.toISOString().slice(0, 10);
  };
  const setFdField = (field: string, value: string) => {
    setFd((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" || field === "years") {
        const sDate = field === "startDate" ? value : prev.startDate;
        const yrs = field === "years" ? value : prev.years;
        next.maturityDate = calcFdMaturity(sDate, yrs);
      }
      return next;
    });
  };
  // ── RD State ──
  const [rd, setRd] = useState({
    bank: "",
    monthly: "",
    rate: "",
    tenureMonths: "",
    startDate: today(),
  });
  // ── Bond State ──
  const [bond, setBond] = useState({
    name: "",
    issuer: "",
    isin: "",
    securityNature: "",
    orderId: "",
    faceValuePerUnit: "",
    numberOfUnits: "",
    coupon: "",
    ytmRate: "",
    maturityDate: "",
    orderDate: today(),
    principalRepayment: "At Maturity",
    interestPaymentDate: "Annually",
    cleanPricePerUnit: "",
    accruedInterestPerUnit: "",
    brokerage: "0",
    stampDuty: "0",
    buyerName: "",
    sellerName: "",
  });
  // ── PPF State ──
  const [ppf, setPpf] = useState({ institution: "", balance: "", accountNumber: "" });
  // ── NPS State ──
  const [nps, setNps] = useState({
    tier: "I",
    pran: "",
    balance: "",
    schemeType: "All Citizen",
    fundManager: "",
    investmentChoice: "Auto",
    lifecycleFund: "LC-50",
    equityPct: "",
    corpBondPct: "",
    govtSecPct: "",
    altAssetPct: "",
    yearContribution: "",
    employerContribution: "",
  });
  // ── EPF State ──
  const [epf, setEpf] = useState({ uan: "", employer: "", balance: "" });
  const [mf, setMf] = useState({
    name: "",
    category: "Equity",
    mfType: "Direct Growth",
    folioNumber: "",
    mfCode: "",
    buyDate: today(),
    buyNav: "",
    units: "",
    currentNav: "",
    invested: "",
  });

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
        const totalInvestment =
          totalConsideration + Number(bond.brokerage || 0) + Number(bond.stampDuty || 0);
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
        onSave("nps", { ...nps, balance: nps.balance || "0" });
        break;
      case "epf":
        onSave("epf", epf);
        break;
      case "mf": {
        if (!mf.name) return;
        const autoInvested =
          !mf.invested && mf.units && mf.buyNav
            ? String(Number(mf.units) * Number(mf.buyNav))
            : mf.invested;
        if (!autoInvested) return;
        onSave("mutualFunds", { ...mf, invested: autoInvested });
        break;
      }
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
            <input
              style={inp}
              value={fd.bank}
              onChange={(e) => setFdField("bank", e.target.value)}
              placeholder="e.g. SBI, HDFC Bank"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Principal Amount (₹)">
              <input
                style={inp}
                type="number"
                value={fd.principal}
                onChange={(e) => setFdField("principal", e.target.value)}
                placeholder="500000"
              />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input
                style={inp}
                type="number"
                value={fd.rate}
                onChange={(e) => setFdField("rate", e.target.value)}
                placeholder="7.5"
                step="0.1"
              />
            </Field>
            <Field label="Tenure (Years)">
              <input
                style={inp}
                type="number"
                value={fd.years}
                onChange={(e) => setFdField("years", e.target.value)}
                placeholder="2"
                step="0.5"
              />
            </Field>
            <Field label="Start Date">
              <input
                style={inp}
                type="date"
                value={fd.startDate}
                onChange={(e) => setFdField("startDate", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Maturity Date">
            <input
              style={inp}
              type="date"
              value={fd.maturityDate}
              onChange={(e) => setFdField("maturityDate", e.target.value)}
            />
          </Field>
          {fd.principal && fd.rate && fd.years && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: `${THEME.gold}12`,
                border: `1px solid ${THEME.gold}40`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: THEME.muted }}>Maturity Value</span>
              <span style={{ fontWeight: 900, color: THEME.gold, fontSize: 15 }}>
                {fmtINRFull(fdMaturity(Number(fd.principal), Number(fd.rate), Number(fd.years)))}
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Recurring Deposit ── */}
      {sub === "rd" && (
        <>
          <Field label="Bank / Institution">
            <input
              style={inp}
              value={rd.bank}
              onChange={(e) => setRd({ ...rd, bank: e.target.value })}
              placeholder="e.g. Axis Bank, Post Office"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Monthly Installment (₹)">
              <input
                style={inp}
                type="number"
                value={rd.monthly}
                onChange={(e) => setRd({ ...rd, monthly: e.target.value })}
                placeholder="10000"
              />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input
                style={inp}
                type="number"
                value={rd.rate}
                onChange={(e) => setRd({ ...rd, rate: e.target.value })}
                placeholder="7.0"
                step="0.1"
              />
            </Field>
            <Field label="Tenure (Months)">
              <input
                style={inp}
                type="number"
                value={rd.tenureMonths}
                onChange={(e) => setRd({ ...rd, tenureMonths: e.target.value })}
                placeholder="24"
              />
            </Field>
            <Field label="Start Date">
              <input
                style={inp}
                type="date"
                value={rd.startDate}
                onChange={(e) => setRd({ ...rd, startDate: e.target.value })}
              />
            </Field>
          </div>
        </>
      )}

      {/* ── Bonds ── */}
      {sub === "bond" &&
        (() => {
          const units = Number(bond.numberOfUnits) || 0;
          const fvpu = Number(bond.faceValuePerUnit) || 0;
          const cppu = Number(bond.cleanPricePerUnit) || 0;
          const aipu = Number(bond.accruedInterestPerUnit) || 0;
          const brok = Number(bond.brokerage) || 0;
          const sdut = Number(bond.stampDuty) || 0;
          const totalPrincipal = units * fvpu;
          const totalAccrued = units * aipu;
          const totalConsideration = units * cppu + totalAccrued;
          const totalInvestment = totalConsideration + brok + sdut;
          const labelStyle = {
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.12em",
            color: THEME.muted,
            marginTop: 16,
            marginBottom: 4,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 12,
          };
          return (
            <>
              <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                Bond Identity
              </div>
              <Field label="Bond / Product Name *">
                <input
                  style={inp}
                  value={bond.name}
                  onChange={(e) => setBond({ ...bond, name: e.target.value })}
                  placeholder="e.g. IIFL Samasta Mar'25"
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Issuer">
                  <input
                    style={inp}
                    value={bond.issuer}
                    onChange={(e) => setBond({ ...bond, issuer: e.target.value })}
                    placeholder="e.g. IIFL, NHAI"
                  />
                </Field>
                <Field label="Security Nature">
                  <input
                    style={inp}
                    value={bond.securityNature}
                    onChange={(e) => setBond({ ...bond, securityNature: e.target.value })}
                    placeholder="Senior Secured Bond"
                  />
                </Field>
                <Field label="ISIN">
                  <input
                    style={inp}
                    value={bond.isin}
                    onChange={(e) => setBond({ ...bond, isin: e.target.value })}
                    placeholder="INE413U07335"
                  />
                </Field>
                <Field label="Order ID">
                  <input
                    style={inp}
                    value={bond.orderId}
                    onChange={(e) => setBond({ ...bond, orderId: e.target.value })}
                    placeholder="1514021"
                  />
                </Field>
              </div>

              <div style={labelStyle}>Financial Terms</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Face Value per Unit (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.faceValuePerUnit}
                    onChange={(e) => setBond({ ...bond, faceValuePerUnit: e.target.value })}
                    placeholder="1000"
                  />
                </Field>
                <Field label="Number of Units">
                  <input
                    style={inp}
                    type="number"
                    value={bond.numberOfUnits}
                    onChange={(e) => setBond({ ...bond, numberOfUnits: e.target.value })}
                    placeholder="10"
                  />
                </Field>
                <Field label="Coupon Rate (% p.a.) *">
                  <input
                    style={inp}
                    type="number"
                    value={bond.coupon}
                    onChange={(e) => setBond({ ...bond, coupon: e.target.value })}
                    placeholder="9.6"
                    step="0.01"
                  />
                </Field>
                <Field label="YTM Rate (% after brokerage)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.ytmRate}
                    onChange={(e) => setBond({ ...bond, ytmRate: e.target.value })}
                    placeholder="11.25"
                    step="0.01"
                  />
                </Field>
                <Field label="Maturity Date">
                  <input
                    style={inp}
                    type="date"
                    value={bond.maturityDate}
                    onChange={(e) => setBond({ ...bond, maturityDate: e.target.value })}
                  />
                </Field>
                <Field label="Order Date">
                  <input
                    style={inp}
                    type="date"
                    value={bond.orderDate}
                    onChange={(e) => setBond({ ...bond, orderDate: e.target.value })}
                  />
                </Field>
                <Field label="Principal Repayment">
                  <select
                    style={inp}
                    value={bond.principalRepayment}
                    onChange={(e) => setBond({ ...bond, principalRepayment: e.target.value })}
                  >
                    <option>At Maturity</option>
                    <option>Installments</option>
                  </select>
                </Field>
                <Field label="Interest Payment">
                  <select
                    style={inp}
                    value={bond.interestPaymentDate}
                    onChange={(e) => setBond({ ...bond, interestPaymentDate: e.target.value })}
                  >
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
                  <input
                    style={inp}
                    type="number"
                    value={bond.cleanPricePerUnit}
                    onChange={(e) => setBond({ ...bond, cleanPricePerUnit: e.target.value })}
                    placeholder="991.087"
                    step="0.001"
                  />
                </Field>
                <Field label="Accrued Interest per Unit (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.accruedInterestPerUnit}
                    onChange={(e) => setBond({ ...bond, accruedInterestPerUnit: e.target.value })}
                    placeholder="47.8685"
                    step="0.0001"
                  />
                </Field>
                <Field label="Brokerage incl. GST (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.brokerage}
                    onChange={(e) => setBond({ ...bond, brokerage: e.target.value })}
                    placeholder="0"
                  />
                </Field>
                <Field label="Stamp Duty (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.stampDuty}
                    onChange={(e) => setBond({ ...bond, stampDuty: e.target.value })}
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* Live computed summary */}
              {(units > 0 || cppu > 0) && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    ["Total Principal", fmtINRFull(totalPrincipal)],
                    ["Total Accrued Interest", fmtINRFull(totalAccrued)],
                    ["Total Consideration", fmtINRFull(totalConsideration)],
                    ["Total Investment", fmtINRFull(totalInvestment)],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div
                        style={{
                          fontSize: 9,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {lbl}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={labelStyle}>Parties</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Buyer Name">
                  <input
                    style={inp}
                    value={bond.buyerName}
                    onChange={(e) => setBond({ ...bond, buyerName: e.target.value })}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Seller Name">
                  <input
                    style={inp}
                    value={bond.sellerName}
                    onChange={(e) => setBond({ ...bond, sellerName: e.target.value })}
                    placeholder="e.g. Ambium Finserve"
                  />
                </Field>
              </div>
            </>
          );
        })()}

      {/* ── PPF ── */}
      {sub === "ppf" && (
        <>
          <Field label="Bank / Post Office">
            <input
              style={inp}
              value={ppf.institution}
              onChange={(e) => setPpf({ ...ppf, institution: e.target.value })}
              placeholder="e.g. SBI, Post Office"
            />
          </Field>
          <Field label="Account Number">
            <input
              style={inp}
              value={ppf.accountNumber}
              onChange={(e) => setPpf({ ...ppf, accountNumber: e.target.value })}
              placeholder="PPF account number"
            />
          </Field>
          <Field label="Current Balance (₹)">
            <input
              style={inp}
              type="number"
              value={ppf.balance}
              onChange={(e) => setPpf({ ...ppf, balance: e.target.value })}
              placeholder="250000"
            />
          </Field>
        </>
      )}

      {/* ── NPS ── */}
      {sub === "nps" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tier">
              <select style={inp} value={nps.tier} onChange={(e) => setNps({ ...nps, tier: e.target.value })}>
                <option value="I">Tier I — Pension (Tax Benefits)</option>
                <option value="II">Tier II — Savings (Flexible)</option>
              </select>
            </Field>
            <Field label="Subscriber Type">
              <select style={inp} value={nps.schemeType} onChange={(e) => setNps({ ...nps, schemeType: e.target.value })}>
                <option value="All Citizen">All Citizen Model</option>
                <option value="Corporate">Corporate NPS</option>
                <option value="Government">Government (NPS-G)</option>
                <option value="NPS Lite">NPS Lite / Swavalamban</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="PRAN Number">
              <input style={inp} value={nps.pran} onChange={(e) => setNps({ ...nps, pran: e.target.value })} placeholder="12-digit PRAN" maxLength={12} />
            </Field>
            <Field label="Pension Fund Manager (PFM)">
              <select style={inp} value={nps.fundManager} onChange={(e) => setNps({ ...nps, fundManager: e.target.value })}>
                <option value="">Select Fund Manager</option>
                <option value="SBI">SBI Pension Funds</option>
                <option value="LIC">LIC Pension Fund</option>
                <option value="UTI">UTI Retirement Solutions</option>
                <option value="HDFC">HDFC Pension Management</option>
                <option value="ICICI">ICICI Prudential Pension</option>
                <option value="Kotak">Kotak Mahindra Pension</option>
                <option value="Aditya Birla">Aditya Birla Sun Life Pension</option>
                <option value="DSP">DSP Pension Fund</option>
                <option value="Tata">Tata Pension Management</option>
                <option value="Max Life">Max Life Pension Fund</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Investment Choice">
              <select style={inp} value={nps.investmentChoice} onChange={(e) => setNps({ ...nps, investmentChoice: e.target.value })}>
                <option value="Auto">Auto Choice (Lifecycle)</option>
                <option value="Active">Active Choice (Manual)</option>
              </select>
            </Field>
            {nps.investmentChoice === "Auto" ? (
              <Field label="Lifecycle Fund">
                <select style={inp} value={nps.lifecycleFund} onChange={(e) => setNps({ ...nps, lifecycleFund: e.target.value })}>
                  <option value="LC-75">LC-75 Aggressive (High Equity)</option>
                  <option value="LC-50">LC-50 Moderate (Balanced)</option>
                  <option value="LC-25">LC-25 Conservative (Low Equity)</option>
                </select>
              </Field>
            ) : (
              <Field label="Equity (E) % — max 75%">
                <input style={inp} type="number" min={0} max={75} value={nps.equityPct} onChange={(e) => setNps({ ...nps, equityPct: e.target.value })} placeholder="e.g. 50" />
              </Field>
            )}
          </div>
          {nps.investmentChoice === "Active" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              <Field label="Corp Bond (C) %">
                <input style={inp} type="number" min={0} max={100} value={nps.corpBondPct} onChange={(e) => setNps({ ...nps, corpBondPct: e.target.value })} placeholder="e.g. 30" />
              </Field>
              <Field label="Govt Sec (G) %">
                <input style={inp} type="number" min={0} max={100} value={nps.govtSecPct} onChange={(e) => setNps({ ...nps, govtSecPct: e.target.value })} placeholder="e.g. 15" />
              </Field>
              <Field label="Alternative (A) % — max 5%">
                <input style={inp} type="number" min={0} max={5} value={nps.altAssetPct} onChange={(e) => setNps({ ...nps, altAssetPct: e.target.value })} placeholder="e.g. 5" />
              </Field>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Current Corpus (₹)">
              <input style={inp} type="number" value={nps.balance} onChange={(e) => setNps({ ...nps, balance: e.target.value })} placeholder="e.g. 500000" />
            </Field>
            <Field label="Annual Contribution (₹)">
              <input style={inp} type="number" value={nps.yearContribution} onChange={(e) => setNps({ ...nps, yearContribution: e.target.value })} placeholder="e.g. 50000" />
            </Field>
          </div>
          {nps.schemeType === "Corporate" && (
            <Field label="Employer Contribution (₹/year) — 80CCD(2)">
              <input style={inp} type="number" value={nps.employerContribution} onChange={(e) => setNps({ ...nps, employerContribution: e.target.value })} placeholder="e.g. 60000" />
            </Field>
          )}
        </>
      )}

      {/* ── EPF ── */}
      {sub === "epf" && (
        <>
          <Field label="UAN (Universal Account Number)">
            <input
              style={inp}
              value={epf.uan}
              onChange={(e) => setEpf({ ...epf, uan: e.target.value })}
              placeholder="12-digit UAN"
              maxLength={12}
            />
          </Field>
          <Field label="Employer / Company Name">
            <input
              style={inp}
              value={epf.employer}
              onChange={(e) => setEpf({ ...epf, employer: e.target.value })}
              placeholder="e.g. Infosys, TCS, Your Company Ltd."
            />
          </Field>
          <Field label="Current EPF Corpus (₹)">
            <input
              style={inp}
              type="number"
              value={epf.balance}
              onChange={(e) => setEpf({ ...epf, balance: e.target.value })}
              placeholder="500000"
            />
          </Field>
        </>
      )}

      {/* ── Mutual Funds ── */}
      {sub === "mf" && (() => {
        const autoInvested = mf.units && mf.buyNav
          ? Number(mf.units) * Number(mf.buyNav)
          : null;
        const currentValue = mf.units && mf.currentNav
          ? Number(mf.units) * Number(mf.currentNav)
          : null;
        const costBasis = mf.invested ? Number(mf.invested) : autoInvested;
        const pnl = currentValue !== null && costBasis ? currentValue - costBasis : null;
        const pnlPct = pnl !== null && costBasis ? (pnl / costBasis) * 100 : null;
        return (
          <>
            <Field label="Fund Name *">
              <input
                style={inp}
                value={mf.name}
                onChange={(e) => setMf({ ...mf, name: e.target.value })}
                placeholder="e.g. Mirae Asset Large Cap Fund"
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Category (from Master Data)">
                <select
                  style={inp}
                  value={mf.category}
                  onChange={(e) => setMf({ ...mf, category: e.target.value })}
                >
                  {mfCategories.map((c: string) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fund Type">
                <select
                  style={inp}
                  value={mf.mfType}
                  onChange={(e) => setMf({ ...mf, mfType: e.target.value })}
                >
                  <option>Direct Growth</option>
                  <option>Direct IDCW</option>
                  <option>Regular Growth</option>
                  <option>Regular IDCW</option>
                </select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Folio Number">
                <input
                  style={inp}
                  value={mf.folioNumber}
                  onChange={(e) => setMf({ ...mf, folioNumber: e.target.value })}
                  placeholder="e.g. 1234567890"
                />
              </Field>
              <Field label="AMFI Code (for live NAV)">
                <input
                  style={inp}
                  value={mf.mfCode}
                  onChange={(e) => setMf({ ...mf, mfCode: e.target.value })}
                  placeholder="e.g. 120716"
                />
              </Field>
              <Field label="Purchase Date">
                <input
                  style={inp}
                  type="date"
                  value={mf.buyDate}
                  onChange={(e) => setMf({ ...mf, buyDate: e.target.value })}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Units Held *">
                <input
                  style={inp}
                  type="number"
                  value={mf.units}
                  onChange={(e) => setMf({ ...mf, units: e.target.value })}
                  placeholder="1234.56"
                  step="0.01"
                />
              </Field>
              <Field label="Buy NAV (₹ per unit)">
                <input
                  style={inp}
                  type="number"
                  value={mf.buyNav}
                  onChange={(e) => setMf({ ...mf, buyNav: e.target.value })}
                  placeholder="80.00"
                  step="0.0001"
                />
              </Field>
              <Field label="Amount Invested (₹)">
                <input
                  style={inp}
                  type="number"
                  value={mf.invested}
                  onChange={(e) => setMf({ ...mf, invested: e.target.value })}
                  placeholder={autoInvested ? String(autoInvested.toFixed(2)) : "100000"}
                />
              </Field>
              <Field label="Current NAV (₹)">
                <input
                  style={inp}
                  type="number"
                  value={mf.currentNav}
                  onChange={(e) => setMf({ ...mf, currentNav: e.target.value })}
                  placeholder="93.22"
                  step="0.0001"
                />
              </Field>
            </div>
            {(autoInvested || currentValue) && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: `${THEME.accent}09`,
                  border: `1px solid ${THEME.accent}30`,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                {autoInvested && (
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Cost Basis</div>
                    <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                      {fmtINR(autoInvested)}
                    </div>
                  </div>
                )}
                {currentValue && (
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
                    <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                      {fmtINR(currentValue)}
                    </div>
                  </div>
                )}
                {pnl !== null && (
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>P&L</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                      {pnl >= 0 ? "+" : ""}{pnlPct !== null ? pnlPct.toFixed(2) : "0"}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={`Add ${subMeta?.label || ""}`}
      />
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
  onSubTabChange,
}) => {
  const [sub, setSub] = useState(subTab || "fd");
  const [showModal, setShowModal] = useState(false);

  // Sync internal sub when parent drives subTab via sidebar click
  useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const subs = SUBS.map((s) => ({
    ...s,
    count: s.stateKey ? (state[s.stateKey]?.length ?? 0) : undefined,
  }));

  const handleSave = (key: string, data: any) => {
    addItem(key, data);
    setShowModal(false);
  };

  const canAdd = sub !== "income";

  // ── Portfolio Calculation Helpers ──────────────────────────────────────
  // FD accrued value: use elapsed years not full tenure (shows real current worth)
  const fdCurrentValue = (x: any) => {
    const principal = Number(x.principal) || 0;
    const rate = Number(x.rate) || 0;
    const years = Number(x.years) || 0;
    if (!years || !principal) return principal;
    // If already matured, return full maturity value
    if (x.maturityDate) {
      const [y, m, d] = String(x.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) <= new Date()) return fdMaturity(principal, rate, years);
    }
    const elapsedYears = x.startDate
      ? Math.min(years, monthsBetween(x.startDate, today()) / 12)
      : years;
    return fdMaturity(principal, rate, Math.max(0, elapsedYears));
  };

  // RD: only count installments actually deposited, and accrue interest on those
  const rdElapsed = (x: any) =>
    x.startDate
      ? Math.min(Number(x.tenureMonths) || 0, Math.max(0, monthsBetween(x.startDate, today())))
      : Number(x.tenureMonths) || 0;

  const rdCurrentValue = (x: any) =>
    rdMaturity(Number(x.monthly) || 0, Number(x.rate) || 0, rdElapsed(x));

  const rdPrincipal = (x: any) => (Number(x.monthly) || 0) * rdElapsed(x);

  // Portfolio Calculations
  const totalPrincipal =
    (state.fixedDeposits?.reduce((s: number, x: any) => s + (Number(x.principal) || 0), 0) || 0) +
    (state.recurringDeposits?.reduce((s: number, x: any) => s + rdPrincipal(x), 0) || 0) +
    (state.bonds?.reduce(
      (s: number, x: any) => s + (Number(x.totalInvestmentAmount || x.faceValue) || 0),
      0
    ) || 0) +
    (state.ppf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0) || 0) +
    (state.mutualFunds?.reduce(
      (s: number, x: any) => s + (Number(x.invested || x.investedValue) || 0),
      0
    ) || 0) +
    (state.lic?.reduce((s: number, x: any) => s + (Number(x.premiumPaid) || 0), 0) || 0);

  const totalCurrent =
    (state.fixedDeposits?.reduce((s: number, x: any) => s + fdCurrentValue(x), 0) || 0) +
    (state.recurringDeposits?.reduce((s: number, x: any) => s + rdCurrentValue(x), 0) || 0) +
    (state.bonds?.reduce(
      (s: number, x: any) => s + (Number(x.totalInvestmentAmount || x.faceValue) || 0),
      0
    ) || 0) +
    (state.ppf?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0) || 0) +
    (state.mutualFunds?.reduce(
      (s: number, x: any) =>
        s +
        (Number(x.units || 0) * Number(x.currentNav || 0) ||
          Number(x.invested || x.investedValue) ||
          0),
      0
    ) || 0) +
    (state.lic?.reduce((s: number, x: any) => s + (Number(x.premiumPaid) || 0), 0) || 0);

  const netGain = totalCurrent - totalPrincipal;
  const gainPct = totalPrincipal > 0 ? (netGain / totalPrincipal) * 100 : 0;

  const renderContent = () => {
    const onAdd = () => setShowModal(true);
    switch (sub) {
      case "fd":
        return (
          <FDSection
            items={state.fixedDeposits}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "rd":
        return (
          <RDSection
            items={state.recurringDeposits}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "bond":
        return (
          <BondSection
            items={state.bonds}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "ppf":
        return (
          <PPFSection
            items={state.ppf}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "nps":
        return (
          <NPSSection
            items={state.nps}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "epf":
        return (
          <EPFSection
            items={state.epf || []}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "mf":
        return (
          <MFSection
            items={state.mutualFunds}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "income":
        return <YieldTracker state={state} />;
      default:
        return null;
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
              Add {subs.find((s) => s.id === sub)?.label || "Investment"}
            </Button>
          )
        }
      >
        Investments Portfolio
      </SectionTitle>

      {/* Portfolio summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Total Invested",
            value: fmtINR(totalPrincipal),
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Current Value",
            value: fmtINR(totalCurrent),
            color: THEME.sage,
            Icon: TrendingUp,
          },
          {
            label: "Net Returns",
            value: `${netGain >= 0 ? "+" : ""}${fmtINR(Math.abs(netGain))}`,
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: netGain >= 0 ? TrendingUp : TrendingDown,
          },
          {
            label: "Return %",
            value: `${netGain >= 0 ? "+" : ""}${gainPct.toFixed(1)}%`,
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: Activity,
          },
          {
            label: "Instruments",
            value: String(subs.filter((s) => s.id !== "income" && (s.count ?? 0) > 0).length),
            color: THEME.muted,
            Icon: BarChart3,
          },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${color}1f`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div>
        {/* Inline sub-tab navigation */}
        <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 24 }}>
          {subs.map((s) => {
            const Icon = s.icon;
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSub(s.id);
                  onSubTabChange?.(s.id);
                }}
                className={`demat-portfolio-pill ${active ? "active" : ""}`}
              >
                <Icon size={13} />
                {s.label}
                {s.count !== undefined && s.count > 0 && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 800,
                      background: `${THEME.accent}22`,
                      color: THEME.accent,
                    }}
                  >
                    {s.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {renderContent()}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <AddInvestmentModal sub={sub} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
};

/* ── Edit Bond Modal ────────────────────────────────────────────────── */
function EditBondModal({ bond: initial, onClose, onSave }: any) {
  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: THEME.muted,
    marginTop: 16,
    marginBottom: 4,
    borderTop: `1px solid ${THEME.line}`,
    paddingTop: 12,
  };
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
    accruedInterestPerUnit:
      initial.accruedInterestPerUnit != null ? String(initial.accruedInterestPerUnit) : "",
    brokerage: initial.brokerage != null ? String(initial.brokerage) : "0",
    stampDuty: initial.stampDuty != null ? String(initial.stampDuty) : "0",
    buyerName: initial.buyerName || "",
    sellerName: initial.sellerName || "",
  });

  const units = Number(bond.numberOfUnits) || 0;
  const fvpu = Number(bond.faceValuePerUnit) || 0;
  const cppu = Number(bond.cleanPricePerUnit) || 0;
  const aipu = Number(bond.accruedInterestPerUnit) || 0;
  const brok = Number(bond.brokerage) || 0;
  const sdut = Number(bond.stampDuty) || 0;
  const totalPrincipal = units * fvpu;
  const totalAccrued = units * aipu;
  const totalConsideration = units * cppu + totalAccrued;
  const totalInvestment = totalConsideration + brok + sdut;

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
      <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>
        Bond Identity
      </div>
      <Field label="Bond / Product Name *">
        <input
          style={inp}
          value={bond.name}
          onChange={(e) => setBond({ ...bond, name: e.target.value })}
          placeholder="e.g. IIFL Samasta Mar'25"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input
            style={inp}
            value={bond.issuer}
            onChange={(e) => setBond({ ...bond, issuer: e.target.value })}
            placeholder="e.g. IIFL, NHAI"
          />
        </Field>
        <Field label="Security Nature">
          <input
            style={inp}
            value={bond.securityNature}
            onChange={(e) => setBond({ ...bond, securityNature: e.target.value })}
            placeholder="Senior Secured Bond"
          />
        </Field>
        <Field label="ISIN">
          <input
            style={inp}
            value={bond.isin}
            onChange={(e) => setBond({ ...bond, isin: e.target.value })}
            placeholder="INE413U07335"
          />
        </Field>
        <Field label="Order ID">
          <input
            style={inp}
            value={bond.orderId}
            onChange={(e) => setBond({ ...bond, orderId: e.target.value })}
            placeholder="1514021"
          />
        </Field>
      </div>

      <div style={labelStyle}>Financial Terms</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Face Value per Unit (₹)">
          <input
            style={inp}
            type="number"
            value={bond.faceValuePerUnit}
            onChange={(e) => setBond({ ...bond, faceValuePerUnit: e.target.value })}
            placeholder="1000"
          />
        </Field>
        <Field label="Number of Units">
          <input
            style={inp}
            type="number"
            value={bond.numberOfUnits}
            onChange={(e) => setBond({ ...bond, numberOfUnits: e.target.value })}
            placeholder="10"
          />
        </Field>
        <Field label="Coupon Rate (% p.a.) *">
          <input
            style={inp}
            type="number"
            value={bond.coupon}
            onChange={(e) => setBond({ ...bond, coupon: e.target.value })}
            placeholder="9.6"
            step="0.01"
          />
        </Field>
        <Field label="YTM Rate (% after brokerage)">
          <input
            style={inp}
            type="number"
            value={bond.ytmRate}
            onChange={(e) => setBond({ ...bond, ytmRate: e.target.value })}
            placeholder="11.25"
            step="0.01"
          />
        </Field>
        <Field label="Maturity Date">
          <input
            style={inp}
            type="date"
            value={bond.maturityDate}
            onChange={(e) => setBond({ ...bond, maturityDate: e.target.value })}
          />
        </Field>
        <Field label="Order Date">
          <input
            style={inp}
            type="date"
            value={bond.orderDate}
            onChange={(e) => setBond({ ...bond, orderDate: e.target.value })}
          />
        </Field>
        <Field label="Principal Repayment">
          <select
            style={inp}
            value={bond.principalRepayment}
            onChange={(e) => setBond({ ...bond, principalRepayment: e.target.value })}
          >
            <option>At Maturity</option>
            <option>Installments</option>
          </select>
        </Field>
        <Field label="Interest Payment">
          <select
            style={inp}
            value={bond.interestPaymentDate}
            onChange={(e) => setBond({ ...bond, interestPaymentDate: e.target.value })}
          >
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
          <input
            style={inp}
            type="number"
            value={bond.cleanPricePerUnit}
            onChange={(e) => setBond({ ...bond, cleanPricePerUnit: e.target.value })}
            placeholder="991.087"
            step="0.001"
          />
        </Field>
        <Field label="Accrued Interest per Unit (₹)">
          <input
            style={inp}
            type="number"
            value={bond.accruedInterestPerUnit}
            onChange={(e) => setBond({ ...bond, accruedInterestPerUnit: e.target.value })}
            placeholder="47.8685"
            step="0.0001"
          />
        </Field>
        <Field label="Brokerage incl. GST (₹)">
          <input
            style={inp}
            type="number"
            value={bond.brokerage}
            onChange={(e) => setBond({ ...bond, brokerage: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty (₹)">
          <input
            style={inp}
            type="number"
            value={bond.stampDuty}
            onChange={(e) => setBond({ ...bond, stampDuty: e.target.value })}
            placeholder="0"
          />
        </Field>
      </div>

      {(units > 0 || cppu > 0) && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {[
            ["Total Principal", fmtINRFull(totalPrincipal)],
            ["Total Accrued Interest", fmtINRFull(totalAccrued)],
            ["Total Consideration", fmtINRFull(totalConsideration)],
            ["Total Investment", fmtINRFull(totalInvestment)],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {lbl}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={labelStyle}>Parties</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Buyer Name">
          <input
            style={inp}
            value={bond.buyerName}
            onChange={(e) => setBond({ ...bond, buyerName: e.target.value })}
            placeholder="Your name"
          />
        </Field>
        <Field label="Seller Name">
          <input
            style={inp}
            value={bond.sellerName}
            onChange={(e) => setBond({ ...bond, sellerName: e.target.value })}
            placeholder="e.g. Ambium Finserve"
          />
        </Field>
      </div>
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

/* ── Edit FD Modal ───────────────────────────────────────────────────── */
function EditFDModal({ fd: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    principal: initial.principal != null ? String(initial.principal) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    years: initial.years != null ? String(initial.years) : "",
    startDate: initial.startDate || today(),
    maturityDate: initial.maturityDate || "",
  });

  const calcMaturity = (sd: string, yrs: string) => {
    if (!sd || !yrs || isNaN(Number(yrs))) return "";
    const d = new Date(sd);
    d.setMonth(d.getMonth() + Math.round(Number(yrs) * 12));
    return d.toISOString().slice(0, 10);
  };
  const setField = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" || field === "years") {
        const sd = field === "startDate" ? value : prev.startDate;
        const yrs = field === "years" ? value : prev.years;
        next.maturityDate = calcMaturity(sd, yrs);
      }
      return next;
    });
  };

  const maturity = fdMaturity(Number(form.principal), Number(form.rate), Number(form.years));

  return (
    <Modal title="Edit Fixed Deposit" onClose={onClose}>
      <Field label="Bank / Institution">
        <input
          style={inp}
          value={form.bank}
          onChange={(e) => setField("bank", e.target.value)}
          placeholder="e.g. SBI, HDFC Bank"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal Amount (₹)">
          <input
            style={inp}
            type="number"
            value={form.principal}
            onChange={(e) => setField("principal", e.target.value)}
            placeholder="500000"
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input
            style={inp}
            type="number"
            value={form.rate}
            onChange={(e) => setField("rate", e.target.value)}
            placeholder="7.5"
            step="0.1"
          />
        </Field>
        <Field label="Tenure (Years)">
          <input
            style={inp}
            type="number"
            value={form.years}
            onChange={(e) => setField("years", e.target.value)}
            placeholder="2"
            step="0.5"
          />
        </Field>
        <Field label="Start Date">
          <input
            style={inp}
            type="date"
            value={form.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Maturity Date">
        <input
          style={inp}
          type="date"
          value={form.maturityDate}
          onChange={(e) => setField("maturityDate", e.target.value)}
        />
      </Field>
      {form.principal && form.rate && form.years && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: `${THEME.gold}12`,
            border: `1px solid ${THEME.gold}40`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: THEME.muted }}>Maturity Value</span>
          <span style={{ fontWeight: 900, color: THEME.gold, fontSize: 15 }}>
            {fmtINRFull(maturity)}
          </span>
        </div>
      )}
      <ModalActions
        onSave={() => form.bank && form.principal && form.rate && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── Edit RD Modal ───────────────────────────────────────────────────── */
function EditRDModal({ rd: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    monthly: initial.monthly != null ? String(initial.monthly) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    tenureMonths: initial.tenureMonths != null ? String(initial.tenureMonths) : "",
    startDate: initial.startDate || today(),
  });
  const maturity = rdMaturity(Number(form.monthly), Number(form.rate), Number(form.tenureMonths));
  return (
    <Modal title="Edit Recurring Deposit" onClose={onClose}>
      <Field label="Bank / Institution">
        <input
          style={inp}
          value={form.bank}
          onChange={(e) => setForm({ ...form, bank: e.target.value })}
          placeholder="e.g. Axis Bank"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monthly Installment (₹)">
          <input
            style={inp}
            type="number"
            value={form.monthly}
            onChange={(e) => setForm({ ...form, monthly: e.target.value })}
            placeholder="10000"
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input
            style={inp}
            type="number"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            placeholder="7.0"
            step="0.1"
          />
        </Field>
        <Field label="Tenure (Months)">
          <input
            style={inp}
            type="number"
            value={form.tenureMonths}
            onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
            placeholder="24"
          />
        </Field>
        <Field label="Start Date">
          <input
            style={inp}
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
      </div>
      {form.monthly && form.rate && form.tenureMonths && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#0ea5e90f",
            border: "1px solid #0ea5e933",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: THEME.muted }}>Projected Maturity</span>
          <span style={{ fontWeight: 900, color: "#0284c7", fontSize: 15 }}>
            {fmtINRFull(maturity)}
          </span>
        </div>
      )}
      <ModalActions
        onSave={() => form.bank && form.monthly && form.rate && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── Edit MF Modal ────────────────────────────────────────────────────── */
function EditMFModal({ mf: initial, onClose, onSave }: any) {
  const { mfCategories } = useMasterData();
  const [form, setForm] = useState({
    name: initial.name || "",
    category: initial.category || "Equity",
    mfType: initial.mfType || "Direct Growth",
    folioNumber: initial.folioNumber || "",
    mfCode: initial.mfCode || "",
    buyDate: initial.buyDate || "",
    buyNav: initial.buyNav != null ? String(initial.buyNav || "") : "",
    units: initial.units != null ? String(initial.units) : "",
    currentNav: initial.currentNav != null ? String(initial.currentNav) : "",
    invested: initial.invested != null ? String(initial.invested || initial.investedValue || "") : "",
  });

  const currentValue = Number(form.units) * Number(form.currentNav) || 0;
  const costBasis = form.invested ? Number(form.invested) : (form.units && form.buyNav ? Number(form.units) * Number(form.buyNav) : 0);
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return (
    <Modal title="Edit Mutual Fund" onClose={onClose}>
      <Field label="Fund Name *">
        <input
          style={inp}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Mirae Asset Large Cap Fund"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category (from Master Data)">
          <select
            style={inp}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {mfCategories.map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Fund Type">
          <select
            style={inp}
            value={form.mfType}
            onChange={(e) => setForm({ ...form, mfType: e.target.value })}
          >
            <option>Direct Growth</option>
            <option>Direct IDCW</option>
            <option>Regular Growth</option>
            <option>Regular IDCW</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Folio Number">
          <input
            style={inp}
            value={form.folioNumber}
            onChange={(e) => setForm({ ...form, folioNumber: e.target.value })}
            placeholder="e.g. 1234567890"
          />
        </Field>
        <Field label="AMFI Code (for live NAV)">
          <input
            style={inp}
            value={form.mfCode}
            onChange={(e) => setForm({ ...form, mfCode: e.target.value })}
            placeholder="e.g. 120716"
          />
        </Field>
        <Field label="Purchase Date">
          <input
            style={inp}
            type="date"
            value={form.buyDate}
            onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
          />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Units Held *">
          <input
            style={inp}
            type="number"
            value={form.units}
            onChange={(e) => setForm({ ...form, units: e.target.value })}
            placeholder="1234.56"
            step="0.01"
          />
        </Field>
        <Field label="Buy NAV (₹ per unit)">
          <input
            style={inp}
            type="number"
            value={form.buyNav}
            onChange={(e) => setForm({ ...form, buyNav: e.target.value })}
            placeholder="80.00"
            step="0.0001"
          />
        </Field>
        <Field label="Amount Invested (₹)">
          <input
            style={inp}
            type="number"
            value={form.invested}
            onChange={(e) => setForm({ ...form, invested: e.target.value })}
            placeholder="100000"
          />
        </Field>
        <Field label="Current NAV (₹)">
          <input
            style={inp}
            type="number"
            value={form.currentNav}
            onChange={(e) => setForm({ ...form, currentNav: e.target.value })}
            placeholder="93.22"
            step="0.0001"
          />
        </Field>
      </div>
      {(currentValue > 0 || costBasis > 0) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: `${THEME.accent}09`,
            border: `1px solid ${THEME.accent}33`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: THEME.muted }}>Cost Basis</div>
            <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
              {fmtINR(costBasis)}
            </div>
          </div>
          {currentValue > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
              <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                {fmtINR(currentValue)}
              </div>
            </div>
          )}
          {currentValue > 0 && costBasis > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted }}>P&L</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}
      <ModalActions
        onSave={() => {
          if (!form.name) return;
          const autoInvested =
            !form.invested && form.units && form.buyNav
              ? String(Number(form.units) * Number(form.buyNav))
              : form.invested;
          if (!autoInvested) return;
          onSave({ ...form, invested: autoInvested });
        }}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── Edit NPS Modal ────────────────────────────────────────────────────── */
function EditNPSModal({ nps: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    tier: initial.tier || "I",
    pran: initial.pran || "",
    balance: initial.balance != null ? String(initial.balance) : "",
    schemeType: initial.schemeType || "All Citizen",
    fundManager: initial.fundManager || "",
    investmentChoice: initial.investmentChoice || "Auto",
    lifecycleFund: initial.lifecycleFund || "LC-50",
    equityPct: initial.equityPct != null ? String(initial.equityPct) : "",
    corpBondPct: initial.corpBondPct != null ? String(initial.corpBondPct) : "",
    govtSecPct: initial.govtSecPct != null ? String(initial.govtSecPct) : "",
    altAssetPct: initial.altAssetPct != null ? String(initial.altAssetPct) : "",
    yearContribution: initial.yearContribution != null ? String(initial.yearContribution) : "",
    employerContribution: initial.employerContribution != null ? String(initial.employerContribution) : "",
  });
  return (
    <Modal title="Edit NPS Account" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tier">
          <select style={inp} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option value="I">Tier I — Pension (Tax Benefits)</option>
            <option value="II">Tier II — Savings (Flexible)</option>
          </select>
        </Field>
        <Field label="Subscriber Type">
          <select style={inp} value={form.schemeType} onChange={(e) => setForm({ ...form, schemeType: e.target.value })}>
            <option value="All Citizen">All Citizen Model</option>
            <option value="Corporate">Corporate NPS</option>
            <option value="Government">Government (NPS-G)</option>
            <option value="NPS Lite">NPS Lite / Swavalamban</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="PRAN Number">
          <input style={inp} value={form.pran} onChange={(e) => setForm({ ...form, pran: e.target.value })} placeholder="12-digit PRAN" maxLength={12} />
        </Field>
        <Field label="Pension Fund Manager (PFM)">
          <select style={inp} value={form.fundManager} onChange={(e) => setForm({ ...form, fundManager: e.target.value })}>
            <option value="">Select Fund Manager</option>
            <option value="SBI">SBI Pension Funds</option>
            <option value="LIC">LIC Pension Fund</option>
            <option value="UTI">UTI Retirement Solutions</option>
            <option value="HDFC">HDFC Pension Management</option>
            <option value="ICICI">ICICI Prudential Pension</option>
            <option value="Kotak">Kotak Mahindra Pension</option>
            <option value="Aditya Birla">Aditya Birla Sun Life Pension</option>
            <option value="DSP">DSP Pension Fund</option>
            <option value="Tata">Tata Pension Management</option>
            <option value="Max Life">Max Life Pension Fund</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Investment Choice">
          <select style={inp} value={form.investmentChoice} onChange={(e) => setForm({ ...form, investmentChoice: e.target.value })}>
            <option value="Auto">Auto Choice (Lifecycle)</option>
            <option value="Active">Active Choice (Manual)</option>
          </select>
        </Field>
        {form.investmentChoice === "Auto" ? (
          <Field label="Lifecycle Fund">
            <select style={inp} value={form.lifecycleFund} onChange={(e) => setForm({ ...form, lifecycleFund: e.target.value })}>
              <option value="LC-75">LC-75 Aggressive (High Equity)</option>
              <option value="LC-50">LC-50 Moderate (Balanced)</option>
              <option value="LC-25">LC-25 Conservative (Low Equity)</option>
            </select>
          </Field>
        ) : (
          <Field label="Equity (E) % — max 75%">
            <input style={inp} type="number" min={0} max={75} value={form.equityPct} onChange={(e) => setForm({ ...form, equityPct: e.target.value })} placeholder="e.g. 50" />
          </Field>
        )}
      </div>
      {form.investmentChoice === "Active" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <Field label="Corp Bond (C) %">
            <input style={inp} type="number" min={0} max={100} value={form.corpBondPct} onChange={(e) => setForm({ ...form, corpBondPct: e.target.value })} placeholder="e.g. 30" />
          </Field>
          <Field label="Govt Sec (G) %">
            <input style={inp} type="number" min={0} max={100} value={form.govtSecPct} onChange={(e) => setForm({ ...form, govtSecPct: e.target.value })} placeholder="e.g. 15" />
          </Field>
          <Field label="Alternative (A) % — max 5%">
            <input style={inp} type="number" min={0} max={5} value={form.altAssetPct} onChange={(e) => setForm({ ...form, altAssetPct: e.target.value })} placeholder="e.g. 5" />
          </Field>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Current Corpus (₹)">
          <input style={inp} type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="500000" />
        </Field>
        <Field label="Annual Contribution (₹)">
          <input style={inp} type="number" value={form.yearContribution} onChange={(e) => setForm({ ...form, yearContribution: e.target.value })} placeholder="50000" />
        </Field>
      </div>
      {form.schemeType === "Corporate" && (
        <Field label="Employer Contribution (₹/year) — 80CCD(2)">
          <input style={inp} type="number" value={form.employerContribution} onChange={(e) => setForm({ ...form, employerContribution: e.target.value })} placeholder="60000" />
        </Field>
      )}
      <ModalActions onSave={() => onSave(form)} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

/* ── Investment-specific empty state ────────────────────────────────── */
function InvestmentEmptyState({
  icon: Icon,
  gradient,
  dotColor,
  title,
  description,
  pills,
  buttonLabel,
  onAdd,
}: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon size={30} color="#fff" />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        {pills.map((t: string) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />{" "}
            {t}
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
function FDSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editFD, setEditFD] = useState<any>(null);

  const fdDaysLeft = (f: any) => {
    if (!f.maturityDate) return null;
    const [y, m, d] = String(f.maturityDate).split("-").map(Number);
    const matDate = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((matDate.getTime() - now.getTime()) / 86400000);
  };

  const totalInvested = items.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
  const totalMaturity = items.reduce(
    (s: number, f: any) => s + fdMaturity(Number(f.principal), Number(f.rate), Number(f.years)),
    0
  );
  const avgRate =
    items.length > 0
      ? items.reduce((s: number, f: any) => s + Number(f.rate || 0), 0) / items.length
      : 0;
  const maturedCount = items.filter((f: any) => (fdDaysLeft(f) ?? 1) < 0).length;
  const FD_AMBER = "#d97706";

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Coins}
          gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)"
          dotColor="#f59e0b"
          title="No Fixed Deposits Added Yet"
          description="Track all your FD accounts — bank, interest rate, maturity date, and projected returns in one place."
          pills={["Principal Amount", "Interest Rate", "Maturity Date", "Projected Returns"]}
          buttonLabel="Add Fixed Deposit"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Invested",
                value: fmtINR(totalInvested),
                color: FD_AMBER,
                Icon: IndianRupee,
              },
              {
                label: "Total Maturity",
                value: fmtINR(totalMaturity),
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: "Avg. Rate",
                value: `${avgRate.toFixed(2)}%`,
                color: THEME.accent,
                Icon: Activity,
              },
              {
                label: maturedCount > 0 ? `${maturedCount} Matured` : "FDs Active",
                value: String(items.length - maturedCount),
                color: maturedCount > 0 ? THEME.rust : THEME.sage,
                Icon: BarChart3,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: `${color}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((f: any) => {
              const maturity = fdMaturity(Number(f.principal), Number(f.rate), Number(f.years));
              const daysLeft = fdDaysLeft(f);
              const isMatured = daysLeft !== null && daysLeft < 0;
              const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
              const accrued = (() => {
                if (!f.startDate || !f.years) return Number(f.principal) || 0;
                const elapsed = Math.min(
                  Number(f.years),
                  Math.max(0, monthsBetween(f.startDate, today()) / 12)
                );
                return fdMaturity(Number(f.principal), Number(f.rate), elapsed);
              })();
              const gain = accrued - (Number(f.principal) || 0);
              const gainPct =
                (Number(f.principal) || 0) > 0 ? (gain / (Number(f.principal) || 1)) * 100 : 0;
              const fdProgress =
                f.years && f.startDate
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (monthsBetween(f.startDate, today()) / (Number(f.years) * 12)) * 100
                      )
                    )
                  : 0;
              const borderColor = isMatured ? THEME.muted : isDueSoon ? THEME.rust : FD_AMBER;
              const lbl = {
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 3,
              };

              return (
                <Card key={f.id} style={{ padding: 20, borderTop: `3px solid ${borderColor}` }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      <Badge variant={isMatured ? "muted" : "gold"}>{f.bank}</Badge>
                      {isMatured && <Badge variant="muted">Matured</Badge>}
                      {isDueSoon && !isMatured && (
                        <Badge variant="rust">
                          {daysLeft === 0 ? "Today!" : `${daysLeft}d left`}
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditFD(f)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("fixedDeposits", f.id)}
                      />
                    </div>
                  </div>

                  {/* Logo + Bank name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <BankLogo name={f.bank} size={36} accentColor={FD_AMBER} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{f.bank}</div>
                  </div>

                  <div style={lbl}>Principal</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: FD_AMBER,
                      letterSpacing: "-0.02em",
                      marginBottom: 14,
                    }}
                  >
                    <Prv>{fmtINR(Number(f.principal))}</Prv>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      ["Rate", `${f.rate}%`],
                      ["Tenure", `${f.years}y`],
                      [
                        "Start",
                        f.startDate
                          ? new Date(f.startDate + "T00:00:00").toLocaleDateString("en-IN", {
                              month: "short",
                              year: "2-digit",
                            })
                          : "—",
                      ],
                      [
                        "Matures",
                        f.maturityDate
                          ? new Date(f.maturityDate + "T00:00:00").toLocaleDateString("en-IN", {
                              month: "short",
                              year: "2-digit",
                            })
                          : "—",
                      ],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          padding: "7px 6px",
                          background: `${THEME.gold}0f`,
                          borderRadius: 8,
                          border: `1px solid ${THEME.gold}24`,
                          textAlign: "center" as const,
                        }}
                      >
                        <div style={{ ...lbl, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {f.years && f.startDate && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          color: THEME.muted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        <span>TENURE PROGRESS</span>
                        <span style={{ color: isMatured ? THEME.sage : FD_AMBER, fontWeight: 700 }}>
                          {fdProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${fdProgress}%`,
                            background: isMatured ? THEME.muted : FD_AMBER,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      borderTop: `1px solid ${THEME.line}`,
                      paddingTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={lbl}>Current Accrued</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                        <Prv>{fmtINR(accrued)}</Prv>
                      </div>
                      <div style={{ fontSize: 10, color: gain >= 0 ? THEME.sage : THEME.rust }}>
                        {gain >= 0 ? "+" : ""}
                        {fmtINR(gain)} · {gainPct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>{isMatured ? "Final Value" : "On Maturity"}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        <Prv>{fmtINR(maturity)}</Prv>
                      </div>
                      {!isMatured && daysLeft !== null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: daysLeft <= 30 ? THEME.rust : THEME.muted,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Clock size={9} /> {daysLeft === 0 ? "Today" : `${daysLeft}d away`}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editFD && (
        <EditFDModal
          fd={editFD}
          onClose={() => setEditFD(null)}
          onSave={(updated: any) => {
            updateItem("fixedDeposits", editFD.id, updated);
            setEditFD(null);
          }}
        />
      )}
    </div>
  );
}

/* ── RD Section ─────────────────────────────────────────────────────── */
function RDSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editRD, setEditRD] = useState<any>(null);
  const RD_BLUE = "#0284c7";

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)"
          dotColor="#0ea5e9"
          title="No Recurring Deposits Added Yet"
          description="Track your monthly RD installments, interest rate, tenure, and projected maturity value."
          pills={["Monthly Installment", "Interest Rate", "Tenure", "Maturity Value"]}
          buttonLabel="Add Recurring Deposit"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* RD summary strip */}
          {(() => {
            const rdElapsedFn = (r: any) =>
              r.startDate
                ? Math.min(
                    Number(r.tenureMonths) || 0,
                    Math.max(0, monthsBetween(r.startDate, today()))
                  )
                : Number(r.tenureMonths) || 0;
            const totalMonthly = items.reduce(
              (s: number, r: any) => s + (Number(r.monthly) || 0),
              0
            );
            const totalDeposited = items.reduce(
              (s: number, r: any) => s + (Number(r.monthly) || 0) * rdElapsedFn(r),
              0
            );
            const totalMaturity = items.reduce(
              (s: number, r: any) =>
                s + rdMaturity(Number(r.monthly), Number(r.rate), Number(r.tenureMonths) || 0),
              0
            );
            const activeCount = items.filter(
              (r: any) => rdElapsedFn(r) < (Number(r.tenureMonths) || 0)
            ).length;
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Monthly SIP Total",
                    value: fmtINR(totalMonthly),
                    color: RD_BLUE,
                    Icon: Repeat,
                  },
                  {
                    label: "Total Deposited",
                    value: fmtINR(totalDeposited),
                    color: THEME.accent,
                    Icon: IndianRupee,
                  },
                  {
                    label: "Projected Maturity",
                    value: fmtINR(totalMaturity),
                    color: THEME.sage,
                    Icon: TrendingUp,
                  },
                  {
                    label: "RDs Active",
                    value: String(activeCount),
                    color: activeCount > 0 ? THEME.sage : THEME.muted,
                    Icon: BarChart3,
                  },
                ].map(({ label, value, color, Icon }) => (
                  <div
                    key={label}
                    className="card-lift"
                    style={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderTop: `4px solid ${color}`,
                      borderRadius: 14,
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: `${color}1f`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: THEME.muted,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: THEME.ink,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((r: any) => {
              const tenureMonths = Number(r.tenureMonths) || 0;
              const elapsed = r.startDate ? Math.max(0, monthsBetween(r.startDate, today())) : 0;
              const elapsedCapped = Math.min(elapsed, tenureMonths);
              const isMatured = elapsed >= tenureMonths && tenureMonths > 0;
              const progressPct = Math.min(
                100,
                tenureMonths > 0 ? (elapsedCapped / tenureMonths) * 100 : 0
              );
              const deposited = (Number(r.monthly) || 0) * elapsedCapped;
              const currentVal = rdMaturity(Number(r.monthly), Number(r.rate), elapsedCapped);
              const fullMaturity = rdMaturity(Number(r.monthly), Number(r.rate), tenureMonths);
              const gain = currentVal - deposited;
              const lbl = {
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 3,
              };

              return (
                <Card
                  key={r.id}
                  style={{
                    padding: 20,
                    borderTop: `3px solid ${isMatured ? THEME.muted : RD_BLUE}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      <Badge variant="muted">{r.bank}</Badge>
                      {isMatured && <Badge variant="muted">Matured</Badge>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditRD(r)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("recurringDeposits", r.id)}
                      />
                    </div>
                  </div>

                  {/* Logo + Bank name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <BankLogo name={r.bank} size={36} accentColor={RD_BLUE} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{r.bank}</div>
                  </div>

                  <div style={lbl}>Monthly Installment</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: RD_BLUE,
                      marginBottom: 4,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmtINR(Number(r.monthly))}
                    <span style={{ fontSize: 14, color: THEME.muted }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                    {r.rate}% p.a. · {tenureMonths} months
                    {r.startDate &&
                      tenureMonths > 0 &&
                      (() => {
                        const d = new Date(r.startDate + "T00:00:00");
                        d.setMonth(d.getMonth() + tenureMonths);
                        const lbl = d.toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        });
                        return (
                          <span
                            style={{
                              marginLeft: 8,
                              color: isMatured ? THEME.sage : THEME.ink,
                              fontWeight: 600,
                            }}
                          >
                            · Matures {lbl}
                          </span>
                        );
                      })()}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: THEME.muted,
                      marginBottom: 5,
                    }}
                  >
                    <span>
                      {elapsedCapped} of {tenureMonths} months
                    </span>
                    <span style={{ fontWeight: 700, color: isMatured ? THEME.muted : RD_BLUE }}>
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: 14 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPct}%`,
                        background: isMatured ? THEME.muted : RD_BLUE,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${THEME.line}`,
                      paddingTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={lbl}>Deposited</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                        <Prv>{fmtINR(deposited)}</Prv>
                      </div>
                      <div style={{ fontSize: 10, color: THEME.sage }}>
                        +{fmtINR(gain)} interest
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>{isMatured ? "Final Value" : "On Maturity"}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        <Prv>{fmtINR(isMatured ? currentVal : fullMaturity)}</Prv>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editRD && (
        <EditRDModal
          rd={editRD}
          onClose={() => setEditRD(null)}
          onSave={(updated: any) => {
            updateItem("recurringDeposits", editRD.id, updated);
            setEditRD(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Bond Section ───────────────────────────────────────────────────── */
function BondSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editBond, setEditBond] = useState<any>(null);

  const totalInvested = items.reduce(
    (s: number, b: any) =>
      s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
    0
  );
  const annualIncome = items.reduce((s: number, b: any) => {
    const principal =
      Number(b.totalPrincipalAmount || 0) ||
      Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0);
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  const maturityCountdown = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const matDate = new Date(y, m - 1, d);
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);
    const days = Math.ceil((matDate.getTime() - nowDate.getTime()) / 86400000);
    if (days < 0) return { text: "Matured", color: THEME.muted, matured: true };
    if (days === 0) return { text: "Matures today!", color: THEME.rust, matured: false };
    if (days <= 30) return { text: `${days}d left`, color: THEME.rust, matured: false };
    if (days <= 365)
      return { text: `${Math.ceil(days / 30)}m left`, color: "#d97706", matured: false };
    const yrs = Math.floor(days / 365);
    const mos = Math.ceil((days % 365) / 30);
    return { text: `${yrs}y ${mos}m`, color: THEME.muted, matured: false };
  };

  const BOND_AMBER = "#d97706";
  const lbl = {
    fontSize: 9,
    color: THEME.muted,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 3,
  };

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={FileText}
          gradient="linear-gradient(135deg,#92400e 0%,#d97706 100%)"
          dotColor="#d97706"
          title="No Bonds Added Yet"
          description="Track government bonds, SGBs, and corporate bonds with full order slip details — coupon rate, YTM, maturity, and investment breakdown."
          pills={["Senior Secured", "Govt / SGB", "Coupon & YTM", "Order Details"]}
          buttonLabel="Add Bond"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Invested",
                value: fmtINR(totalInvested),
                color: BOND_AMBER,
                Icon: IndianRupee,
              },
              {
                label: "Annual Coupon",
                value: fmtINR(annualIncome),
                color: THEME.sage,
                Icon: Coins,
              },
              {
                label: "Bonds Held",
                value: String(items.length),
                color: THEME.accent,
                Icon: BarChart3,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: `${color}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Bond cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 20,
            }}
          >
            {items.map((b: any) => {
              const investmentAmt = Number(
                b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0
              );
              const ml = maturityCountdown(b.maturityDate);
              const annualCoupon =
                ((Number(b.totalPrincipalAmount || 0) ||
                  Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0)) *
                  Number(b.coupon || 0)) /
                100;
              const charges = Number(b.brokerage || 0) + Number(b.stampDuty || 0);
              const bondProgress =
                b.orderDate && b.maturityDate
                  ? (() => {
                      const start = new Date(b.orderDate + "T00:00:00").getTime();
                      const end = new Date(b.maturityDate + "T00:00:00").getTime();
                      return end > start
                        ? Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
                        : 0;
                    })()
                  : 0;
              const fmtBondDate = (d: string) =>
                d
                  ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";

              return (
                <Card key={b.id} style={{ padding: 22, borderTop: `3px solid ${BOND_AMBER}` }}>
                  {/* Header: badges + actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap" as const,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {b.securityNature && (
                        <Badge variant="gold" style={{ fontSize: 9 }}>
                          {b.securityNature}
                        </Badge>
                      )}
                      {b.issuer && (
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          {b.issuer}
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditBond(b)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("bonds", b.id)}
                      />
                    </div>
                  </div>

                  {/* Logo + Bond name + ISIN */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                    <BankLogo name={b.issuer || b.name} size={36} accentColor={BOND_AMBER} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: THEME.ink,
                          lineHeight: 1.3,
                          marginBottom: 2,
                        }}
                      >
                        {b.name}
                      </div>
                      {b.isin && (
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            fontFamily: "monospace",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {b.isin}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investment amount (primary) */}
                  <div style={lbl}>Total Investment</div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: BOND_AMBER,
                      letterSpacing: "-0.02em",
                      marginBottom: 16,
                    }}
                  >
                    <Prv>{fmtINRFull(investmentAmt)}</Prv>
                  </div>

                  {/* Key metrics — 4 amber pills */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      ["Coupon", b.coupon ? `${b.coupon}%` : "—"],
                      ["YTM", b.ytmRate ? `${b.ytmRate}%` : "—"],
                      ["Units", b.numberOfUnits || "—"],
                      ["FV/Unit", b.faceValuePerUnit ? fmtINR(b.faceValuePerUnit) : "—"],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          padding: "8px 6px",
                          background: `${THEME.gold}0f`,
                          borderRadius: 8,
                          border: `1px solid ${THEME.gold}24`,
                          textAlign: "center" as const,
                        }}
                      >
                        <div style={{ ...lbl, marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Maturity + Annual Income row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      padding: "12px 0",
                      borderTop: `1px solid ${THEME.line}`,
                      borderBottom: `1px solid ${THEME.line}`,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={lbl}>Maturity Date</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                        {fmtBondDate(b.maturityDate)}
                      </div>
                      {ml && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: ml.color,
                            marginTop: 2,
                            marginBottom: 6,
                          }}
                        >
                          {ml.text}
                        </div>
                      )}
                      {bondProgress > 0 && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 9,
                              color: THEME.muted,
                              marginBottom: 3,
                              fontWeight: 600,
                            }}
                          >
                            <span>ELAPSED</span>
                            <span style={{ color: ml?.matured ? THEME.sage : BOND_AMBER }}>
                              {bondProgress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${bondProgress}%`,
                                background: ml?.matured ? THEME.muted : BOND_AMBER,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={lbl}>Annual Income</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        {annualCoupon > 0 ? fmtINRFull(annualCoupon) : "—"}
                      </div>
                      {b.interestPaymentDate && (
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                          {b.interestPaymentDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investment breakdown — 3 col */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
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
                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: `1px solid ${THEME.line}`,
                      display: "flex",
                      flexWrap: "wrap" as const,
                      gap: "3px 14px",
                    }}
                  >
                    {b.principalRepayment && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Principal:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>
                          {b.principalRepayment}
                        </span>
                      </span>
                    )}
                    {charges > 0 && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Charges:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>
                          {fmtINRFull(charges)}
                        </span>
                      </span>
                    )}
                    {b.orderId && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Order #:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderId}</span>
                      </span>
                    )}
                    {b.orderDate && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Ordered:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderDate}</span>
                      </span>
                    )}
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
  const [form, setForm] = useState(
    initial || { date: today(), type: "deposit", amount: "", note: "" }
  );
  const valid = form.amount && Number(form.amount) > 0;
  return (
    <Modal title={initial ? "Edit Transaction" : "Add PPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={inp}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            style={inp}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="deposit">Deposit (Load Money)</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input
          style={inp}
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="50000"
          min="1"
        />
      </Field>
      <Field label="Note (optional)">
        <input
          style={inp}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="e.g. Annual contribution FY 2025-26"
        />
      </Field>
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Transaction"}
      />
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
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3)
          throw new Error(`Row ${i + 1}: need date, type, amount (got: "${line}")`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const t = type.toLowerCase();
        if (!["deposit", "withdrawal", "d", "w"].includes(t))
          throw new Error(`Row ${i + 1}: type must be deposit or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return {
          date,
          type: t.startsWith("d") ? "deposit" : "withdrawal",
          amount: amt,
          note: note || "",
          id: `ppftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content =
      "# PPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: deposit or withdrawal\n2025-04-05,deposit,150000,Annual contribution FY 2025-26\n2025-10-10,deposit,50000,Mid-year top up\n2026-01-15,withdrawal,25000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ppf_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview);
    setImportDone(true);
    setCsvPreview([]);
    setCsvText("");
    setCsvFileName("");
  };

  const btnStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        background: `${THEME.accent}09`,
        border: `1px solid ${THEME.accent}38`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            ...btnStyle,
            border: `1px solid ${THEME.accent}4d`,
            background: "transparent",
            color: THEME.accent,
          }}
        >
          Download Template
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          date, type, amount, note
        </code>
        <br />
        Deposit:{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          2025-04-05, deposit, 150000, Annual contribution
        </code>
        &nbsp;&nbsp;Withdrawal:{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          2026-01-15, withdrawal, 25000, Partial
        </code>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "20px 0",
          border: `1.5px dashed ${THEME.accent}66`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          background: `${THEME.accent}08`,
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={22} color={THEME.accent} />
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.muted,
          marginBottom: 6,
          textAlign: "center" as const,
        }}
      >
        — or paste CSV text below —
      </div>
      <textarea
        style={{
          width: "100%",
          minHeight: 80,
          padding: "10px 12px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 12,
          fontFamily: "monospace",
          resize: "vertical" as const,
          boxSizing: "border-box" as const,
        }}
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setCsvPreview([]);
          setCsvError("");
          setImportDone(false);
        }}
        placeholder={
          "2025-04-05, deposit, 150000, Annual contribution FY 2025-26\n2025-10-10, deposit, 50000, Mid-year top up"
        }
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button
          style={{
            ...btnStyle,
            border: `1px solid ${THEME.accent}66`,
            background: "transparent",
            color: THEME.accent,
          }}
          onClick={() => parseCsvText(csvText)}
        >
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button
            style={{ ...btnStyle, border: "none", background: THEME.accent, color: "#fff" }}
            onClick={doImport}
          >
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: THEME.sage,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: THEME.rust,
            fontSize: 12,
            padding: "8px 12px",
            background: `${THEME.rust}0f`,
            borderRadius: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: `${THEME.accent}12`,
              fontSize: 11,
              fontWeight: 700,
              color: THEME.accent,
            }}
          >
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Type", "Amount", "Note"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 10px",
                        textAlign: "left" as const,
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.date}</td>
                    <td style={{ padding: "6px 10px" }}>
                      <span
                        style={{
                          color: r.type === "deposit" ? THEME.sage : THEME.rust,
                          fontWeight: 600,
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {r.type}
                      </span>
                    </td>
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
  const totalDeposits = txs
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = txs
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + Number(t.amount), 0);

  const persist = (updated: any[]) => {
    setTxs(updated);
    updateItem("ppf", p.id, { transactions: updated });
  };

  const saveTx = (form: any) => {
    const updated = editTx
      ? txs.map((t) => (t.id === editTx.id ? { ...form, id: editTx.id } : t))
      : [...txs, { ...form, id: uid() }];
    persist(updated);
    setShowTxModal(false);
    setEditTx(null);
  };

  const removeTx = (id: string) => persist(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => {
    persist([...txs, ...rows]);
    setShowCsvImport(false);
  };

  const btnGhost = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    color: THEME.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
    padding: "7px 14px",
  } as const;

  return (
    <Card style={{ padding: 20, borderTop: `3px solid ${THEME.sage}` }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name={p.institution || p.bank || "PPF"} size={36} accentColor={THEME.sage} />
          <div>
            <Badge variant="accent">PPF Account</Badge>
            {(p.institution || p.bank) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                Bank/Post Office:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.institution || p.bank}</span>
              </div>
            )}
            {p.accountNumber && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
                A/C: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.accountNumber}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={12} />}
          style={{ color: THEME.rust }}
          onClick={() => removeItem("ppf", p.id)}
        />
      </div>

      {/* Balance */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Current Balance</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage, letterSpacing: "-0.02em" }}>
        <Prv>{fmtINR(p.balance)}</Prv>
      </div>

      {/* Stats row */}
      {txs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            { label: "Total Deposits", value: totalDeposits, color: THEME.sage, Icon: TrendingUp },
            {
              label: "Total Withdrawals",
              value: totalWithdrawals,
              color: THEME.rust,
              Icon: TrendingDown,
            },
          ].map(({ label, value, color, Icon }) => (
            <div
              key={label}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon size={10} color={color} /> {label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color }}>{fmtINR(value)}</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                {
                  txs.filter((t) =>
                    label === "Total Deposits" ? t.type === "deposit" : t.type === "withdrawal"
                  ).length
                }{" "}
                entries
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button
          style={btnGhost}
          onClick={() => {
            setShowTxModal(true);
            setEditTx(null);
            setShowCsvImport(false);
          }}
        >
          <Plus size={13} /> Add Transaction
        </button>
        <button
          style={{ ...btnGhost, color: THEME.accent, borderColor: `${THEME.accent}66` }}
          onClick={() => {
            setShowCsvImport((v) => !v);
            setShowLedger(true);
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger((v) => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <PPFCsvPanel
            onImport={(rows: any[]) => {
              importRows(rows);
              setShowCsvImport(false);
            }}
          />
        </div>
      )}

      {/* Transaction Ledger */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: THEME.muted,
              marginBottom: 10,
              textTransform: "uppercase" as const,
              letterSpacing: "0.07em",
            }}
          >
            Transaction Ledger
          </div>
          <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: `${THEME.accent}08` }}>
                  {["Date", "Type", "Amount", "Note", ""].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "8px 10px",
                        textAlign: i >= 3 ? ("right" as const) : ("left" as const),
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 700,
                          fontSize: 11,
                          color: t.type === "deposit" ? THEME.sage : THEME.rust,
                        }}
                      >
                        {t.type === "deposit" ? (
                          <TrendingUp size={11} />
                        ) : (
                          <TrendingDown size={11} />
                        )}
                        {t.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontWeight: 800,
                        color: t.type === "deposit" ? THEME.sage : THEME.rust,
                      }}
                    >
                      {t.type === "withdrawal" ? "-" : "+"}
                      {fmtINR(t.amount)}
                    </td>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.note || "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" as const }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            setEditTx(t);
                            setShowTxModal(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: 2,
                            display: "flex",
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeTx(t.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: 2,
                            display: "flex",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {txs.length === 0 && (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center" as const,
                color: THEME.muted,
                fontSize: 12,
              }}
            >
              No transactions yet — add manually or import CSV above
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showTxModal && (
        <PPFTransactionModal
          initial={
            editTx
              ? {
                  date: editTx.date,
                  type: editTx.type,
                  amount: String(editTx.amount),
                  note: editTx.note || "",
                }
              : undefined
          }
          onClose={() => {
            setShowTxModal(false);
            setEditTx(null);
          }}
          onSave={saveTx}
        />
      )}
    </Card>
  );
}

/* ── PPF Section ────────────────────────────────────────────────────── */
const PPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0 ? (
      <InvestmentEmptyState
        icon={Shield}
        gradient="linear-gradient(135deg,#15803d 0%,#22c55e 100%)"
        dotColor="#16a34a"
        title="No PPF Account Added Yet"
        description="Track your Public Provident Fund — deposits, withdrawals, and full transaction ledger with CSV import."
        pills={["Annual Deposits", "Partial Withdrawals", "Transaction Ledger", "CSV Import"]}
        buttonLabel="Add PPF Account"
        onAdd={onAdd}
      />
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((p: any) => (
          <PPFAccountCard key={p.id} p={p} removeItem={removeItem} updateItem={updateItem} />
        ))}
      </div>
    )}
  </div>
);

/* ── NPS helpers ─────────────────────────────────────────────────────── */
const NPS_ORANGE = "#c2410c";

const NPS_PFM_COLOR: Record<string, string> = {
  SBI: "#0067b2", LIC: "#00a651", UTI: "#e31b23", HDFC: "#004c8f",
  ICICI: "#F58220", Kotak: "#e31e25", "Aditya Birla": "#d2232a",
  DSP: "#003087", Tata: "#00529b", "Max Life": "#c2185b",
};

const NPS_LC_LABEL: Record<string, string> = {
  "LC-75": "LC-75 Aggressive",
  "LC-50": "LC-50 Moderate",
  "LC-25": "LC-25 Conservative",
};

function NpsAllocationBar({ equityPct, corpBondPct, govtSecPct, altAssetPct }: any) {
  const e = Number(equityPct) || 0;
  const c = Number(corpBondPct) || 0;
  const g = Number(govtSecPct) || 0;
  const a = Number(altAssetPct) || 0;
  const total = e + c + g + a;
  if (!total) return null;
  const bars = [
    { label: "E", pct: e, color: "#f59e0b" },
    { label: "C", pct: c, color: "#3b82f6" },
    { label: "G", pct: g, color: "#22c55e" },
    { label: "A", pct: a, color: "#a855f7" },
  ].filter((b) => b.pct > 0);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 8 }}>
        {bars.map((b) => (
          <div key={b.label} style={{ width: `${(b.pct / total) * 100}%`, background: b.color }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" as const }}>
        {bars.map((b) => (
          <span key={b.label} style={{ fontSize: 10, color: THEME.muted, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color, display: "inline-block" }} />
            {b.label} {b.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── NPS Transaction Modal ──────────────────────────────────────────── */
function NPSTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(() => {
    if (!initial)
      return {
        date: today(),
        particulars: "",
        uploadedBy: "",
        employeeAmount: "",
        employerAmount: "",
      };
    return {
      date: initial.date || today(),
      particulars: initial.particulars || "",
      uploadedBy: initial.uploadedBy || "",
      employeeAmount: initial.employeeAmount != null ? String(initial.employeeAmount) : "",
      employerAmount: initial.employerAmount != null ? String(initial.employerAmount) : "",
    };
  });

  const empAmt = Number(form.employeeAmount || 0);
  const erAmt = Number(form.employerAmount || 0);
  const valid = !!form.date && (empAmt > 0 || erAmt > 0);

  return (
    <Modal title={initial ? "Edit NPS Transaction" : "Add NPS Transaction"} onClose={onClose}>
      <Field label="Date *">
        <input style={inp} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <Field label="Particulars">
        <input style={inp} value={form.particulars} onChange={(e) => setForm({ ...form, particulars: e.target.value })}
          placeholder="e.g. By Arrear - Regular Contribution for April" />
      </Field>
      <Field label="Uploaded By / Source">
        <input style={inp} value={form.uploadedBy} onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })}
          placeholder="e.g. Kotak Mahindra Bank Limited (5000041) or eNPS - Online" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Employee Contribution (₹)">
          <input style={inp} type="number" min={0} value={form.employeeAmount}
            onChange={(e) => setForm({ ...form, employeeAmount: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Employer Contribution (₹)">
          <input style={inp} type="number" min={0} value={form.employerAmount}
            onChange={(e) => setForm({ ...form, employerAmount: e.target.value })} placeholder="0" />
        </Field>
      </div>
      {(empAmt > 0 || erAmt > 0) && (
        <div style={{ padding: "8px 12px", background: `${NPS_ORANGE}0d`, borderRadius: 8, fontSize: 12, color: NPS_ORANGE, fontWeight: 700 }}>
          Total: {fmtINR(empAmt + erAmt)}
          {empAmt > 0 && erAmt > 0 && (
            <span style={{ color: THEME.muted, fontWeight: 500 }}> (Employee: {fmtINR(empAmt)} + Employer: {fmtINR(erAmt)})</span>
          )}
        </div>
      )}
      <ModalActions onSave={() => valid && onSave({
        date: form.date,
        particulars: form.particulars,
        uploadedBy: form.uploadedBy,
        employeeAmount: empAmt,
        employerAmount: erAmt,
      })} onClose={onClose} saveLabel={initial ? "Save Changes" : "Add Transaction"} />
    </Modal>
  );
}

/* ── NPS CSV Import Panel ───────────────────────────────────────────── */
function NPSCsvPanel({ onImport }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text.trim().split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) { setCsvError("No data rows found."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 4) throw new Error(`Row ${i + 1}: need date, particulars, uploaded_by, employee_amount[, employer_amount]`);
        const [date, particulars, uploadedBy, empRaw, erRaw] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const empAmt = Number(empRaw) || 0;
        const erAmt = Number(erRaw || 0) || 0;
        if (empAmt < 0 || erAmt < 0) throw new Error(`Row ${i + 1}: amounts cannot be negative`);
        if (empAmt === 0 && erAmt === 0) throw new Error(`Row ${i + 1}: at least one of employee or employer amount must be > 0`);
        return {
          id: `npstx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          date, particulars, uploadedBy, employeeAmount: empAmt, employerAmount: erAmt,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) { setCsvError(e.message); }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content =
      "# NPS Transaction Import Template\n# Columns: date, particulars, uploaded_by, employee_amount, employer_amount\n# Amounts: 0 means no contribution from that side\n2025-04-14,By Arrear - Regular Contribution for April,Kotak Mahindra Bank Limited (5000041),0,4664.6\n2025-08-17,By Voluntary Contributions,eNPS - Online (5000682),20000,0\n2026-01-13,For January 2026,Kotak Mahindra Bank Limited (5000041),0,4664.6";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nps_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview);
    setImportDone(true); setCsvPreview([]); setCsvText(""); setCsvFileName("");
  };

  const btnStyle = { padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" } as const;

  return (
    <div style={{ padding: 18, borderRadius: 12, marginBottom: 16, background: `${NPS_ORANGE}09`, border: `1px solid ${NPS_ORANGE}38` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NPS_ORANGE, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button onClick={downloadTemplate} style={{ ...btnStyle, border: `1px solid ${NPS_ORANGE}4d`, background: "transparent", color: NPS_ORANGE }}>
          Download Template
        </button>
      </div>
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12, padding: "8px 12px", background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8, lineHeight: 1.6 }}>
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>date, particulars, uploaded_by, employee_amount, employer_amount</code>
        <br />Use <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>0</code> for the side that did not contribute. Date format: <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>YYYY-MM-DD</code>
      </div>
      <label
        style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", border: `1.5px dashed ${NPS_ORANGE}66`, borderRadius: 10, cursor: "pointer", marginBottom: 12, background: `${NPS_ORANGE}08` }}
        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
      >
        <Upload size={22} color={NPS_ORANGE} />
        <div style={{ fontSize: 13, fontWeight: 600, color: NPS_ORANGE }}>{csvFileName || "Drop CSV file here or click to browse"}</div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 6, textAlign: "center" as const }}>— or paste CSV text below —</div>
      <textarea
        style={{ width: "100%", minHeight: 80, padding: "10px 12px", background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 12, fontFamily: "monospace", resize: "vertical" as const, boxSizing: "border-box" as const }}
        value={csvText}
        onChange={(e) => { setCsvText(e.target.value); setCsvPreview([]); setCsvError(""); setImportDone(false); }}
        placeholder={"2025-04-14, By Arrear - Regular Contribution for April, Kotak Mahindra Bank (5000041), 0, 4664.60\n2025-08-17, By Voluntary Contributions, eNPS - Online (5000682), 20000, 0"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button style={{ ...btnStyle, border: `1px solid ${NPS_ORANGE}66`, background: "transparent", color: NPS_ORANGE }} onClick={() => parseCsvText(csvText)}>
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button style={{ ...btnStyle, border: "none", background: NPS_ORANGE, color: "#fff" }} onClick={doImport}>
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.sage, fontSize: 12, fontWeight: 700 }}>
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", color: THEME.rust, fontSize: 12, padding: "8px 12px", background: `${THEME.rust}0f`, borderRadius: 8 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: `${NPS_ORANGE}12`, fontSize: 11, fontWeight: 700, color: NPS_ORANGE }}>
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Particulars", "Uploaded By", "Employee (₹)", "Employer (₹)"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10, color: THEME.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.date}</td>
                    <td style={{ padding: "6px 10px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.particulars || "—"}</td>
                    <td style={{ padding: "6px 10px", color: THEME.muted, fontSize: 11 }}>{r.uploadedBy || "—"}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: THEME.accent }}>{r.employeeAmount > 0 ? fmtINR(r.employeeAmount) : "—"}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0ea5e9" }}>{r.employerAmount > 0 ? fmtINR(r.employerAmount) : "—"}</td>
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

/* ── NPS Account Card ────────────────────────────────────────────────── */
function NPSAccountCard({ n, removeItem, updateItem }: any) {
  const pfmColor = NPS_PFM_COLOR[n.fundManager] || NPS_ORANGE;
  const isActive = n.investmentChoice === "Active";

  const [txs, setTxs] = useState<any[]>(n.transactions || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);

  useEffect(() => { setTxs(n.transactions || []); }, [n.id]);

  const persistTxs = (updated: any[]) => {
    setTxs(updated);
    updateItem("nps", n.id, { transactions: updated });
  };

  const saveTx = (form: any) => {
    const entry = { ...form, id: editTx ? editTx.id : uid() };
    const updated = editTx
      ? txs.map((t) => (t.id === editTx.id ? entry : t))
      : [...txs, entry];
    persistTxs(updated);
    setShowTxModal(false);
    setEditTx(null);
  };

  const removeTx = (id: string) => persistTxs(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => { persistTxs([...txs, ...rows]); setShowCsvImport(false); };

  const sortedTxs = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const totalEmployee = txs.reduce((s, t) => s + (Number(t.employeeAmount) || 0), 0);
  const totalEmployer = txs.reduce((s, t) => s + (Number(t.employerAmount) || 0), 0);
  const totalContributed = totalEmployee + totalEmployer;
  const annualTotal = (Number(n.yearContribution) || 0) + (Number(n.employerContribution) || 0);

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const exportCsv = () => {
    const header = "Date,Particulars,Uploaded By,Employee Contribution (Rs),Employer Contribution (Rs)";
    const rows = sortedTxs.map((t) =>
      [t.date, `"${(t.particulars || "").replace(/"/g, '""')}"`, `"${(t.uploadedBy || "").replace(/"/g, '""')}"`, t.employeeAmount || 0, t.employerAmount || 0].join(",")
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nps_transactions_${(n.pran || n.id || "account").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnGhost = {
    background: "transparent", border: `1px solid ${THEME.line}`, borderRadius: 8,
    color: THEME.ink, cursor: "pointer", display: "flex", alignItems: "center",
    gap: 6, fontWeight: 600, fontSize: 12, padding: "7px 14px",
  } as const;

  return (
    <Card style={{ padding: 20, borderTop: `3px solid ${pfmColor}` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name={n.fundManager || "NPS"} size={36} accentColor={pfmColor} />
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              <Badge variant="gold">NPS Tier {n.tier || "I"}</Badge>
              {n.schemeType && n.schemeType !== "All Citizen" && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${pfmColor}18`, color: pfmColor, fontWeight: 700, border: `1px solid ${pfmColor}40` }}>{n.schemeType}</span>
              )}
            </div>
            {n.fundManager && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                PFM: <span style={{ color: pfmColor, fontWeight: 700 }}>{n.fundManager} Pension</span>
              </div>
            )}
            {n.pran && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                PRAN: <span style={{ color: THEME.ink, fontWeight: 600 }}><Prv>{n.pran}</Prv></span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" icon={<Pencil size={12} />} onClick={() => setShowEditAccount(true)} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("nps", n.id)} />
        </div>
      </div>

      {/* Corpus */}
      {(() => {
        const manualBalance = Number(n.balance) || 0;
        const corpusFromTxs = manualBalance === 0 && totalContributed > 0;
        const displayCorpus = manualBalance > 0 ? manualBalance : totalContributed;
        return (
          <>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
              Current Corpus
              {corpusFromTxs && (
                <span style={{ fontSize: 10, color: "#0ea5e9", marginLeft: 6, fontWeight: 600 }}>
                  based on contributions — update corpus for market value
                </span>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: NPS_ORANGE, letterSpacing: "-0.03em", marginBottom: 12 }}>
              <Prv>{fmtINR(displayCorpus)}</Prv>
            </div>
          </>
        );
      })()}

      {/* Contribution breakdown (from ledger) */}
      {totalContributed > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Employee Total", value: totalEmployee, color: THEME.accent, bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.22)" },
            { label: "Employer Total", value: totalEmployer, color: "#0ea5e9",    bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.22)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${border}`, background: bg }}>
              <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}><Prv>{fmtINR(value)}</Prv></div>
            </div>
          ))}
        </div>
      )}

      {/* Investment approach */}
      <div style={{ fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: THEME.muted }}>Investment: </span>
        <span style={{ fontWeight: 700, color: THEME.ink }}>
          {isActive ? "Active Choice (Manual)" : `Auto Choice — ${NPS_LC_LABEL[n.lifecycleFund] || n.lifecycleFund || "LC-50"}`}
        </span>
      </div>
      {!isActive && (
        <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>
          {n.lifecycleFund === "LC-75" ? "Starts 75% equity at ≤35 yrs, tapers to 15% at 55"
            : n.lifecycleFund === "LC-25" ? "Starts 25% equity, low risk — tapers to 5% at 55"
            : "Starts 50% equity, balanced — tapers to 10% at 55"}
        </div>
      )}

      {/* Asset allocation bar (Active only) */}
      {isActive && <NpsAllocationBar equityPct={n.equityPct} corpBondPct={n.corpBondPct} govtSecPct={n.govtSecPct} altAssetPct={n.altAssetPct} />}

      {/* Annual contribution from account fields */}
      {annualTotal > 0 && totalContributed === 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#0ea5e9", fontWeight: 600 }}>
          Annual estimate: {fmtINR(annualTotal)}/yr{Number(n.employerContribution) > 0 ? " (incl. employer — 80CCD(2))" : ""}
        </div>
      )}

      {/* Tier note */}
      <div style={{ fontSize: 10, color: THEME.muted, marginTop: 12, padding: "6px 10px", background: "var(--surface-1)", borderRadius: 8, lineHeight: 1.5 }}>
        {n.tier === "II"
          ? "Tier II — No lock-in. Fully withdrawable anytime. No additional tax benefit."
          : "Tier I — Locked till age 60. At exit: 60% lump sum (tax-free) + 40% compulsory annuity."}
      </div>

      {/* Ledger toolbar */}
      <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" }}>
        <button style={{ ...btnGhost, color: NPS_ORANGE, borderColor: `${NPS_ORANGE}4d` }} onClick={() => { setShowLedger((v) => !v); setShowCsvImport(false); }}>
          <List size={13} /> {showLedger ? "Hide Ledger" : `Ledger${txs.length > 0 ? ` (${txs.length})` : ""}`}
        </button>
        <button style={{ ...btnGhost }} onClick={() => { setShowTxModal(true); setEditTx(null); }}>
          <Plus size={13} /> Add Transaction
        </button>
        <button style={{ ...btnGhost }} onClick={() => { setShowCsvImport((v) => !v); setShowLedger(false); }}>
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={{ ...btnGhost }} onClick={exportCsv}>
            <FileText size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* CSV import panel */}
      {showCsvImport && (
        <div style={{ marginTop: 14 }}>
          <NPSCsvPanel onImport={importRows} />
        </div>
      )}

      {/* Ledger table */}
      {showLedger && (
        <div style={{ marginTop: 14 }}>
          {txs.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" as const, color: THEME.muted, fontSize: 13 }}>
              No transactions yet — add manually or import CSV above
            </div>
          ) : (
            <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {["Date", "Particulars", "Uploaded By", "Employee (₹)", "Employer (₹)", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Employee (₹)" || h === "Employer (₹)" ? "right" as const : "left" as const, fontWeight: 700, fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTxs.map((t) => (
                      <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" as const, color: THEME.muted, fontSize: 11 }}>{fmtDate(t.date)}</td>
                        <td style={{ padding: "8px 12px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.particulars || "—"}</td>
                        <td style={{ padding: "8px 12px", color: THEME.muted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.uploadedBy || "—"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: t.employeeAmount > 0 ? THEME.accent : THEME.muted }}>
                          {t.employeeAmount > 0 ? fmtINR(t.employeeAmount) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: t.employerAmount > 0 ? "#0ea5e9" : THEME.muted }}>
                          {t.employerAmount > 0 ? fmtINR(t.employerAmount) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" as const }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <Button variant="ghost" size="sm" icon={<Pencil size={11} />} onClick={() => { setEditTx(t); setShowTxModal(true); }} />
                            <Button variant="ghost" size="sm" icon={<Trash2 size={11} />} style={{ color: THEME.rust }} onClick={() => removeTx(t.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${THEME.line}`, background: "var(--surface-1)" }}>
                      <td colSpan={3} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11 }}>Total ({txs.length} entries)</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 800, color: THEME.accent }}>{fmtINR(totalEmployee)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 800, color: "#0ea5e9" }}>{fmtINR(totalEmployer)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTxModal && (
        <NPSTransactionModal
          initial={editTx}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
          onSave={saveTx}
        />
      )}
      {showEditAccount && (
        <EditNPSModal
          nps={n}
          onClose={() => setShowEditAccount(false)}
          onSave={(updated: any) => { updateItem("nps", n.id, updated); setShowEditAccount(false); }}
        />
      )}
    </Card>
  );
}

/* ── NPS Section ────────────────────────────────────────────────────── */
function NPSSection({ items, removeItem, updateItem, onAdd }: any) {
  const totalCorpus = items.reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    const txTotal = (n.transactions || []).reduce((ss: number, t: any) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0), 0);
    return s + (bal > 0 ? bal : txTotal);
  }, 0);
  const totalEmployee = items.reduce((s: number, n: any) => s + (n.transactions || []).reduce((ss: number, t: any) => ss + (Number(t.employeeAmount) || 0), 0), 0);
  const totalEmployer = items.reduce((s: number, n: any) => s + (n.transactions || []).reduce((ss: number, t: any) => ss + (Number(t.employerAmount) || 0), 0), 0);
  const totalTx = items.reduce((s: number, n: any) => s + (n.transactions || []).length, 0);

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Briefcase}
          gradient="linear-gradient(135deg,#c2410c 0%,#fb923c 100%)"
          dotColor="#ea580c"
          title="No NPS Account Added Yet"
          description="Track your NPS — Tier I & II, fund manager, scheme type, asset allocation (E/C/G/A), and corpus."
          pills={["Tier I / Tier II", "PRAN Number", "Fund Manager", "Asset Allocation"]}
          buttonLabel="Add NPS Account"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total NPS Corpus", value: fmtINR(totalCorpus), color: NPS_ORANGE, Icon: PiggyBank },
              ...(totalEmployee + totalEmployer > 0
                ? [{ label: "Employee Contributions", value: fmtINR(totalEmployee), color: THEME.accent, Icon: TrendingUp },
                   { label: "Employer Contributions", value: fmtINR(totalEmployer), color: "#0ea5e9", Icon: Briefcase }]
                : [{ label: "Accounts", value: String(items.length), color: THEME.accent, Icon: BarChart3 }]),
              ...(totalTx > 0 ? [{ label: "Transactions", value: String(totalTx), color: THEME.gold, Icon: List }] : []),
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="card-lift" style={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderTop: `4px solid ${color}`, borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}1f`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* NPS account cards */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
            {items.map((n: any) => (
              <NPSAccountCard key={n.id} n={n} removeItem={removeItem} updateItem={updateItem} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── EPF Account Card ────────────────────────────────────────────────── */
const EPF_TX_TYPES = [
  { value: "monthly_contribution", label: "Monthly Contribution (Passbook)", color: "#8b5cf6" },
  { value: "employee_contribution", label: "Employee Contribution", color: THEME.accent },
  { value: "employer_contribution", label: "Employer Contribution", color: "#0ea5e9" },
  { value: "interest_credit", label: "Interest Credit (EPFO)", color: "#22c55e" },
  { value: "transfer_in", label: "Transfer In (from Previous Employer)", color: "#10b981" },
  { value: "withdrawal", label: "Withdrawal", color: "#ef4444" },
];

function EPFTransactionModal({ onClose, onSave, initial, establishments = [] }: any) {
  const [form, setForm] = useState(() => {
    if (!initial)
      return {
        date: today(),
        type: "monthly_contribution",
        amount: "",
        note: "",
        wageMonth: "",
        particulars: "",
        epfWages: "",
        epsWages: "",
        employeeShare: "",
        employerShare: "",
        pensionShare: "",
        estId: "",
        fromEmployer: "",
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
      estId: initial.estId || "",
      fromEmployer: initial.fromEmployer || "",
    };
  });

  const isMonthly = form.type === "monthly_contribution";
  const isInterest = form.type === "interest_credit";
  const isTransfer = form.type === "transfer_in";
  const monthlyHasAmount =
    Number(form.employeeShare || 0) > 0 ||
    Number(form.employerShare || 0) > 0 ||
    Number(form.pensionShare || 0) > 0;
  const interestHasAmount =
    Number(form.employeeShare || 0) > 0 || Number(form.employerShare || 0) > 0;
  const valid = isMonthly
    ? !!form.wageMonth && monthlyHasAmount
    : isInterest
      ? interestHasAmount
      : !!form.amount && Number(form.amount) > 0;

  return (
    <Modal title={initial ? "Edit Transaction" : "Add EPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Transaction Date">
          <input
            style={inp}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            style={inp}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {EPF_TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Establishment tag — shown for monthly/interest when establishments exist */}
      {!isTransfer && establishments.length > 0 && (
        <Field label="Link to Establishment (optional)">
          <select
            style={inp}
            value={form.estId}
            onChange={(e) => setForm({ ...form, estId: e.target.value })}
          >
            <option value="">— Not tagged —</option>
            {[...establishments]
              .sort((a, b) => (b.joiningDate || "").localeCompare(a.joiningDate || ""))
              .map((est: any) => (
                <option key={est.id} value={est.id}>
                  {est.employerName}
                  {est.exitDate ? ` (exited)` : " (current)"}
                </option>
              ))}
          </select>
        </Field>
      )}

      {isMonthly ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `${THEME.accent}09`,
              border: `1px solid ${THEME.accent}26`,
              fontSize: 11,
              color: THEME.accent,
              marginBottom: 4,
            }}
          >
            Enter one row from your EPFO passbook — each wage month is one entry.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Wage Month *">
              <input
                style={inp}
                value={form.wageMonth}
                onChange={(e) => setForm({ ...form, wageMonth: e.target.value })}
                placeholder="e.g. Apr-2021"
              />
            </Field>
            <Field label="Particulars">
              <input
                style={inp}
                value={form.particulars}
                onChange={(e) => setForm({ ...form, particulars: e.target.value })}
                placeholder="Cont. For Due-Month 052021"
              />
            </Field>
            <Field label="EPF Wages (₹)">
              <input
                style={inp}
                type="number"
                value={form.epfWages}
                onChange={(e) => setForm({ ...form, epfWages: e.target.value })}
                placeholder="15000"
              />
            </Field>
            <Field label="EPS Wages (₹)">
              <input
                style={inp}
                type="number"
                value={form.epsWages}
                onChange={(e) => setForm({ ...form, epsWages: e.target.value })}
                placeholder="15000"
              />
            </Field>
            <Field label="Employee Share 12% (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="1800"
              />
            </Field>
            <Field label="Employer Share 3.67% (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="550"
              />
            </Field>
            <Field label="Pension Share 8.33% (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="1250"
              />
            </Field>
          </div>
        </>
      ) : isInterest ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `${THEME.sage}09`,
              border: `1px solid ${THEME.sage}33`,
              fontSize: 11,
              color: THEME.sage,
              marginBottom: 4,
            }}
          >
            EPFO credits interest separately to Employee PF and Employer PF — enter both splits
            exactly as shown in your passbook.
          </div>
          <Field label="Period / Label (optional)">
            <input
              style={inp}
              value={form.particulars}
              onChange={(e) => setForm({ ...form, particulars: e.target.value })}
              placeholder="e.g. Int. Updated upto 31/03/2026"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Employee PF Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="668"
              />
            </Field>
            <Field label="Employer PF Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="204"
              />
            </Field>
            <Field label="Pension Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. EPFO Interest FY 2025-26 @ 8.25%"
            />
          </Field>
        </>
      ) : isTransfer ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `${THEME.sage}09`,
              border: `1px solid ${THEME.sage}40`,
              fontSize: 11,
              color: THEME.sage,
              marginBottom: 4,
            }}
          >
            Record EPF balance transferred from your previous employer (Form 13). The amount will be
            credited to your current PF account.
          </div>
          <Field label="From Employer (Previous Company Name)">
            <input
              style={inp}
              value={form.fromEmployer}
              onChange={(e) => setForm({ ...form, fromEmployer: e.target.value })}
              placeholder="e.g. Infosys Ltd."
            />
          </Field>
          {establishments.length > 0 && (
            <Field label="Credit To Establishment (optional)">
              <select
                style={inp}
                value={form.estId}
                onChange={(e) => setForm({ ...form, estId: e.target.value })}
              >
                <option value="">— Not tagged —</option>
                {[...establishments]
                  .filter((e: any) => !e.exitDate)
                  .map((est: any) => (
                    <option key={est.id} value={est.id}>
                      {est.employerName} (current)
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Total Transfer Amount (₹) *">
            <input
              style={inp}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 42500"
              min="1"
            />
          </Field>
          <div style={{ marginBottom: 4, fontSize: 11, color: THEME.muted }}>
            Optional: enter the split as shown in your EPFO passbook Transfer-In entry
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Employee PF (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="20468"
              />
            </Field>
            <Field label="Employer PF (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="6254"
              />
            </Field>
            <Field label="Pension (EPS) (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="13750"
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Form 13 transfer — approved 15 Sep 2022"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Amount (₹)">
            <input
              style={inp}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 5000"
              min="1"
            />
          </Field>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. April 2025 contribution"
            />
          </Field>
        </>
      )}
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Transaction"}
      />
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
    employee: "employee_contribution",
    emp: "employee_contribution",
    e: "employee_contribution",
    employee_contribution: "employee_contribution",
    employer: "employer_contribution",
    er: "employer_contribution",
    employer_contribution: "employer_contribution",
    interest: "interest_credit",
    i: "interest_credit",
    interest_credit: "interest_credit",
    withdrawal: "withdrawal",
    w: "withdrawal",
  };

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need date, type, amount`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const mappedType = TYPE_MAP[type.toLowerCase().replace(/\s+/g, "_")];
        if (!mappedType)
          throw new Error(`Row ${i + 1}: type must be employee, employer, interest, or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return {
          date,
          type: mappedType,
          amount: amt,
          note: note || "",
          id: `epftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content =
      "# EPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: employee | employer | interest | withdrawal\n2025-04-30,employee,5000,April 2025 employee share\n2025-04-30,employer,5000,April 2025 employer share\n2026-03-31,interest,41250,EPFO interest FY 2025-26 @ 8.25%\n2026-02-15,withdrawal,50000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "epf_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview);
    setImportDone(true);
    setCsvPreview([]);
    setCsvText("");
    setCsvFileName("");
  };

  const btnStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
  const typeInfo = (t: string) =>
    EPF_TX_TYPES.find((x) => x.value === t) || { label: t, color: THEME.muted };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        background: `${THEME.accent}09`,
        border: `1px solid ${THEME.accent}38`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            ...btnStyle,
            border: `1px solid ${THEME.accent}4d`,
            background: "transparent",
            color: THEME.accent,
          }}
        >
          Download Template
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          date, type, amount, note
        </code>
        <br />
        Type values:{" "}
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          employee
        </code>{" "}
        &nbsp;
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          employer
        </code>{" "}
        &nbsp;
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          interest
        </code>{" "}
        &nbsp;
        <code style={{ background: `${THEME.line}40`, padding: "1px 5px", borderRadius: 4 }}>
          withdrawal
        </code>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "20px 0",
          border: `1.5px dashed ${THEME.accent}66`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          background: `${THEME.accent}08`,
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={22} color={THEME.accent} />
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.muted,
          marginBottom: 6,
          textAlign: "center" as const,
        }}
      >
        — or paste CSV text below —
      </div>
      <textarea
        style={{
          width: "100%",
          minHeight: 80,
          padding: "10px 12px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 12,
          fontFamily: "monospace",
          resize: "vertical" as const,
          boxSizing: "border-box" as const,
        }}
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setCsvPreview([]);
          setCsvError("");
          setImportDone(false);
        }}
        placeholder={
          "2025-04-30, employee, 5000, April 2025\n2025-04-30, employer, 5000, April 2025\n2026-03-31, interest, 41250, EPFO FY 2025-26"
        }
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button
          style={{
            ...btnStyle,
            border: `1px solid ${THEME.accent}66`,
            background: "transparent",
            color: THEME.accent,
          }}
          onClick={() => parseCsvText(csvText)}
        >
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button
            style={{ ...btnStyle, border: "none", background: THEME.accent, color: "#fff" }}
            onClick={doImport}
          >
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: THEME.sage,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: THEME.rust,
            fontSize: 12,
            padding: "8px 12px",
            background: `${THEME.rust}0f`,
            borderRadius: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: `${THEME.accent}12`,
              fontSize: 11,
              fontWeight: 700,
              color: THEME.accent,
            }}
          >
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Type", "Amount", "Note"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 10px",
                        textAlign: "left" as const,
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => {
                  const ti = typeInfo(r.type);
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "6px 10px" }}>{r.date}</td>
                      <td style={{ padding: "6px 10px" }}>
                        <span style={{ color: ti.color, fontWeight: 600, fontSize: 11 }}>
                          {ti.label}
                        </span>
                      </td>
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
  const [form, setForm] = useState(
    initial || {
      employerName: "",
      estId: "",
      memberId: "",
      joiningDate: "",
      exitDate: "",
      ncpDays: "0",
    }
  );
  const calcService = () => {
    if (!form.joiningDate) return "";
    const from = new Date(form.joiningDate);
    const to = form.exitDate ? new Date(form.exitDate) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth() - from.getMonth();
    let dys = to.getDate() - from.getDate();
    if (dys < 0) {
      mos--;
      dys += 30;
    }
    if (mos < 0) {
      yrs--;
      mos += 12;
    }
    return `${yrs} Years ${mos} Months ${dys} Days`;
  };
  const svc = calcService();
  return (
    <Modal
      title={initial ? "Edit Establishment" : "Add Establishment (Service History)"}
      onClose={onClose}
    >
      <Field label="Employer / Organisation Name *">
        <input
          style={inp}
          value={form.employerName}
          onChange={(e) => setForm({ ...form, employerName: e.target.value })}
          placeholder="e.g. SAROJ LANDMARK REALTY LLP"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Establishment ID (Est Id)">
          <input
            style={inp}
            value={form.estId}
            onChange={(e) => setForm({ ...form, estId: e.target.value })}
            placeholder="e.g. KDMAL1612627000"
          />
        </Field>
        <Field label="Member ID">
          <input
            style={inp}
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            placeholder="e.g. KDMAL16126270000010147"
          />
        </Field>
        <Field label="Joining Date">
          <input
            style={inp}
            type="date"
            value={form.joiningDate}
            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
          />
        </Field>
        <Field label="Exit Date (blank = currently working)">
          <input
            style={inp}
            type="date"
            value={form.exitDate}
            onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
          />
        </Field>
        <Field label="NCP Days">
          <input
            style={inp}
            type="number"
            value={form.ncpDays}
            onChange={(e) => setForm({ ...form, ncpDays: e.target.value })}
            placeholder="0"
            min="0"
          />
        </Field>
        {svc && (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              justifyContent: "flex-end",
              paddingBottom: 2,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              Total Service
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{svc}</div>
          </div>
        )}
      </div>
      <ModalActions
        onSave={() => form.employerName.trim() && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Establishment"}
      />
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
        <input
          style={inp}
          value={form.uan}
          onChange={(e) => setForm({ ...form, uan: e.target.value })}
          placeholder="12-digit UAN"
          maxLength={12}
        />
      </Field>
      <Field label="Employer / Company Name">
        <input
          style={inp}
          value={form.employer}
          onChange={(e) => setForm({ ...form, employer: e.target.value })}
          placeholder="e.g. Infosys, TCS, Your Company Ltd."
        />
      </Field>
      <Field label="Current EPF Corpus (₹)">
        <input
          style={inp}
          type="number"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          placeholder="500000"
          min="0"
        />
      </Field>
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

function EPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs] = useState<any[]>(p.transactions || []);
  const [ests, setEsts] = useState<any[]>(p.establishments || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showEstModal, setShowEstModal] = useState(false);
  const [editEst, setEditEst] = useState<any>(null);
  const [transferPrefill, setTransferPrefill] = useState<any>(null);

  // Sync local state when the selected EPF record changes (p.id change = different record).
  // Intentionally omit p.transactions and p.establishments: adding them would re-run on every
  // save, which resets in-progress edits before the user can save them.
  useEffect(() => {
    setTxs(p.transactions || []);
    setEsts(p.establishments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  /* ── helpers ── */
  const typeInfo = (t: string) =>
    EPF_TX_TYPES.find((x) => x.value === t) || { label: t, color: THEME.muted };
  const btnGhost = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    color: THEME.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
    padding: "7px 14px",
  } as const;

  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const fmtMY = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
  const calcService = (join: string, exit: string) => {
    if (!join) return "—";
    const from = new Date(join);
    const to = exit ? new Date(exit) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth() - from.getMonth();
    let dys = to.getDate() - from.getDate();
    if (dys < 0) {
      mos--;
      dys += 30;
    }
    if (mos < 0) {
      yrs--;
      mos += 12;
    }
    return `${yrs}Y ${mos}M ${dys}D`;
  };

  /* ── stats ── */
  // Establishments whose balance has been transferred out via Form 13 (transfer_in recorded).
  // Their individual transactions must NOT be summed — the transfer_in amount already captures them.
  const transferredOutEstIds = new Set<string>(
    txs
      .filter((x) => x.type === "transfer_in" && x.fromEmployer)
      .map((x) => {
        const e = ests.find((e: any) => e.employerName === x.fromEmployer);
        return e ? e.id : null;
      })
      .filter(Boolean)
  );

  // activeTxs = everything except transactions explicitly tagged to transferred-out establishments
  const activeTxs = txs.filter((t) => !t.estId || !transferredOutEstIds.has(t.estId));

  const byType = (type: string) =>
    activeTxs.filter((x) => x.type === type).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthlyRows = activeTxs.filter((x) => x.type === "monthly_contribution");
  const interestRows = activeTxs.filter((x) => x.type === "interest_credit");
  const transferRows = txs.filter((x) => x.type === "transfer_in"); // all txs — all transfer_ins count

  const totalEmployee =
    byType("employee_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0);
  const totalEmployer =
    byType("employer_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const totalPension = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const totalInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined || x.employerShare !== undefined)
      return (
        s +
        Number(x.employeeShare || 0) +
        Number(x.employerShare || 0) +
        Number(x.pensionShare || 0)
      );
    return s + Number(x.amount || 0);
  }, 0);
  const totalTransferIn = transferRows.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalWithdrawal = byType("withdrawal");

  // Compute closing balances per EPFO passbook column
  const empInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
    return s + Number(x.amount || 0); // backward compat: old single-amount interest → employee
  }, 0);
  const erInterest = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const penInterest = interestRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  // employee gets remainder: total - er - pen (handles partial splits and no-splits correctly)
  const transferInEr = transferRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const transferInPen = transferRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const transferInEmp = totalTransferIn - transferInEr - transferInPen;

  const closingEmployee = totalEmployee + empInterest + transferInEmp;
  const closingEmployer = totalEmployer + erInterest + transferInEr;
  const closingPension = totalPension + transferInPen + penInterest;
  const closingTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;
  const hasPassbook = txs.some(
    (t) =>
      t.type === "monthly_contribution" || t.type === "interest_credit" || t.type === "transfer_in"
  );
  const displayCorpus = hasPassbook ? closingTotal : Number(p.balance || 0);

  const stats = [
    ...(totalInterest > 0
      ? [{ label: "Interest (EPFO)", value: totalInterest, color: THEME.sage }]
      : []),
    ...(totalTransferIn > 0
      ? [{ label: "Transfer In", value: totalTransferIn, color: THEME.sage }]
      : []),
    ...(totalWithdrawal > 0
      ? [{ label: "Withdrawn", value: totalWithdrawal, color: THEME.rust }]
      : []),
  ].filter((s) => s.value > 0);

  /* ── refs to avoid stale closures when both arrays are updated close together ── */
  const txsRef = React.useRef(txs);
  const estsRef = React.useRef(ests);
  txsRef.current = txs;
  estsRef.current = ests;

  /* ── persist ── */
  const persistTxs = (updated: any[]) => {
    setTxs(updated);
    updateItem("epf", p.id, { transactions: updated, establishments: estsRef.current });
  };
  const persistEsts = (updated: any[]) => {
    setEsts(updated);
    updateItem("epf", p.id, { transactions: txsRef.current, establishments: updated });
  };

  const saveTx = (form: any) => {
    let entry: any;
    if (form.type === "monthly_contribution") {
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        wageMonth: form.wageMonth,
        particulars: form.particulars || "",
        epfWages: Number(form.epfWages || 0),
        epsWages: Number(form.epsWages || 0),
        employeeShare: Number(form.employeeShare || 0),
        employerShare: Number(form.employerShare || 0),
        pensionShare: Number(form.pensionShare || 0),
        amount: Number(form.employeeShare || 0),
        note: form.note || "",
      };
    } else if (form.type === "interest_credit") {
      const empInt = Number(form.employeeShare || 0);
      const erInt = Number(form.employerShare || 0);
      const penInt = Number(form.pensionShare || 0);
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        particulars: form.particulars || "",
        employeeShare: empInt,
        employerShare: erInt,
        pensionShare: penInt,
        amount: empInt + erInt + penInt,
        note: form.note || "",
      };
    } else if (form.type === "transfer_in") {
      const empT = Number(form.employeeShare || 0);
      const erT = Number(form.employerShare || 0);
      const penT = Number(form.pensionShare || 0);
      const total = Number(form.amount || 0) || empT + erT + penT;
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        fromEmployer: form.fromEmployer || "",
        employeeShare: empT,
        employerShare: erT,
        pensionShare: penT,
        amount: total,
        note: form.note || "",
      };
    } else {
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        amount: Number(form.amount || 0),
        note: form.note || "",
      };
    }
    const updated = editTx
      ? txs.map((t) => (t.id === editTx.id ? { ...entry, id: editTx.id } : t))
      : [...txs, { ...entry, id: uid() }];
    persistTxs(updated);
    setShowTxModal(false);
    setEditTx(null);
  };
  const removeTx = (id: string) => persistTxs(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => {
    persistTxs([...txs, ...rows]);
    setShowCsvImport(false);
  };

  const saveEst = (form: any) => {
    const clean = { ...form, ncpDays: Number(form.ncpDays || 0) };
    const updated = editEst
      ? ests.map((e) => (e.id === editEst.id ? { ...clean, id: editEst.id } : e))
      : [...ests, { ...clean, id: uid() }];
    persistEsts(updated);
    setShowEstModal(false);
    setEditEst(null);
  };
  const removeEst = (id: string) => persistEsts(ests.filter((e) => e.id !== id));

  /* ── sorted ledger split ── */
  const sortedTxs = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const passbookRows = sortedTxs.filter(
    (t) =>
      t.type === "monthly_contribution" || t.type === "interest_credit" || t.type === "transfer_in"
  );
  const regularRows = sortedTxs.filter(
    (t) =>
      t.type !== "monthly_contribution" && t.type !== "interest_credit" && t.type !== "transfer_in"
  );
  const sortedEsts = [...ests].sort((a, b) =>
    (b.joiningDate || "").localeCompare(a.joiningDate || "")
  );

  return (
    <Card style={{ padding: 20, borderTop: `4px solid ${THEME.accent}` }}>
      {/* ── Account Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name="EPFO" size={36} accentColor={THEME.accent} />
          <div>
            <Badge variant="accent">EPF Account</Badge>
            {(p.employer || p.bank) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                Employer:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.employer || p.bank}</span>
              </div>
            )}
            {(p.uan || p.accountNumber) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
                UAN:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.uan || p.accountNumber}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={12} />}
            onClick={() => setShowEditAccount(true)}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            style={{ color: THEME.rust }}
            onClick={() => removeItem("epf", p.id)}
          />
        </div>
      </div>

      {/* ── Corpus ── */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
        Total Corpus
        {hasPassbook && (
          <span style={{ fontSize: 10, color: THEME.sage, marginLeft: 6, fontWeight: 600 }}>
            auto-calculated from passbook
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: THEME.accent,
          letterSpacing: "-0.02em",
          marginBottom: hasPassbook ? 10 : 20,
        }}
      >
        <Prv>{fmtINR(displayCorpus)}</Prv>
      </div>
      {hasPassbook && (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 20 }}
        >
          {[
            { label: "Employee PF", value: closingEmployee, color: THEME.accent, bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.22)" },
            { label: "Employer PF", value: closingEmployer, color: "#0ea5e9", bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.22)" },
            { label: "EPS (Pension)", value: closingPension, color: THEME.gold, bg: `rgba(234,179,8,0.07)`, border: `rgba(234,179,8,0.22)` },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${border}`, background: bg }}>
              <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>
                <Prv>{fmtINR(value)}</Prv>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Service History ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
            }}
          >
            Service History
          </div>
          <button
            style={{
              ...btnGhost,
              fontSize: 11,
              padding: "5px 10px",
              color: THEME.accent,
              borderColor: `${THEME.accent}4d`,
            }}
            onClick={() => {
              setEditEst(null);
              setShowEstModal(true);
            }}
          >
            <Plus size={11} /> Add Employer
          </button>
        </div>

        {ests.length === 0 ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: `${THEME.accent}09`,
              border: `1px dashed ${THEME.accent}33`,
              fontSize: 11,
              color: THEME.muted,
              textAlign: "center" as const,
            }}
          >
            Add your EPFO service history — Est ID, Member ID, Joining &amp; Exit dates
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 32 }}>
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 12,
                bottom: 12,
                width: 2,
                background: `${THEME.accent}33`,
                borderRadius: 2,
              }}
            />
            {sortedEsts.map((est, idx) => {
              const isCurrent = !est.exitDate;
              const dateLabel = isCurrent
                ? `${fmtMY(est.joiningDate)} — Present`
                : `${fmtMY(est.joiningDate)} — ${fmtMY(est.exitDate)}`;

              /* per-establishment closing balance */
              const estTxs = txs.filter((t) => t.estId === est.id);
              const estEmpC = estTxs
                .filter(
                  (x) => x.type === "monthly_contribution" || x.type === "employee_contribution"
                )
                .reduce((s, x) => s + Number(x.employeeShare || x.amount || 0), 0);
              const estErC = estTxs
                .filter(
                  (x) => x.type === "monthly_contribution" || x.type === "employer_contribution"
                )
                .reduce((s, x) => s + Number(x.employerShare || 0), 0);
              const estPenC = estTxs
                .filter((x) => x.type === "monthly_contribution")
                .reduce((s, x) => s + Number(x.pensionShare || 0), 0);
              const estIntEmp = estTxs
                .filter((x) => x.type === "interest_credit")
                .reduce(
                  (s, x) =>
                    s + Number(x.employeeShare !== undefined ? x.employeeShare : x.amount || 0),
                  0
                );
              const estIntEr = estTxs
                .filter((x) => x.type === "interest_credit")
                .reduce((s, x) => s + Number(x.employerShare || 0), 0);
              const estTransIn = estTxs
                .filter((x) => x.type === "transfer_in")
                .reduce((s, x) => s + Number(x.amount || 0), 0);
              const estClosing = estEmpC + estErC + estPenC + estIntEmp + estIntEr + estTransIn;
              const estHasTxs = estTxs.length > 0;

              /* transfer-in already recorded for this establishment */
              const alreadyTransferred = txs.some(
                (t) => t.type === "transfer_in" && t.fromEmployer === est.employerName
              );

              return (
                <div
                  key={est.id}
                  style={{
                    position: "relative",
                    marginBottom: idx < sortedEsts.length - 1 ? 14 : 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -32,
                      top: 10,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCurrent ? THEME.accent : `${THEME.accent}26`,
                      border: `2px solid ${isCurrent ? THEME.accent : `${THEME.accent}59`}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: isCurrent ? "#fff" : THEME.accent,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 6,
                          background: isCurrent ? THEME.accent : `${THEME.line}40`,
                          color: isCurrent ? "#fff" : THEME.muted,
                        }}
                      >
                        {dateLabel}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          onClick={() => {
                            setEditEst(est);
                            setShowEstModal(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: 4,
                            display: "flex",
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => removeEst(est.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: 4,
                            display: "flex",
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: THEME.ink,
                        marginBottom: 8,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {est.employerName}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto 1fr",
                        gap: "4px 10px",
                        fontSize: 10,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Est Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>
                        {est.estId || "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>Joining</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {fmtDate(est.joiningDate)}
                      </span>
                      <span style={{ color: THEME.muted }}>Member Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>
                        {est.memberId || "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>Exit</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {est.exitDate ? fmtDate(est.exitDate) : "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>NCP Days</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {est.ncpDays || "0"} Days
                      </span>
                      <span style={{ color: THEME.muted }}>Total Service</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {calcService(est.joiningDate, est.exitDate)}
                      </span>
                    </div>

                    {/* per-establishment closing balance (only if transactions tagged to this est) */}
                    {estHasTxs && (
                      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                        {[
                          { label: "Emp PF",  value: estEmpC + estIntEmp, color: THEME.accent, bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.2)" },
                          { label: "Er PF",   value: estErC + estIntEr,   color: "#0ea5e9",    bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.2)" },
                          { label: "Pension", value: estPenC,             color: THEME.gold,   bg: "rgba(234,179,8,0.07)",   border: "rgba(234,179,8,0.2)" },
                        ].map(({ label, value, color, bg, border }) => (
                          <div key={label} style={{ padding: "7px 10px", borderRadius: 8, background: bg, border: `1px solid ${border}`, textAlign: "center" as const }}>
                            <div style={{ fontSize: 8, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color }}><Prv>{fmtINR(value)}</Prv></div>
                          </div>
                        ))}
                      </div>
                    )}
                    {estHasTxs && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          Closing Balance:{" "}
                          <span
                            style={{ fontWeight: 800, color: isCurrent ? THEME.accent : THEME.ink }}
                          >
                            <Prv>{fmtINR(estClosing)}</Prv>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Transfer Balance button — shown for exited establishments */}
                    {!isCurrent && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: `1px dashed ${THEME.line}`,
                        }}
                      >
                        {alreadyTransferred ? (
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.sage,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <CheckCircle2 size={12} /> Transfer In recorded
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setTransferPrefill({
                                type: "transfer_in",
                                date: est.exitDate || today(),
                                fromEmployer: est.employerName,
                                amount: String(estClosing || ""),
                                employeeShare: String(estEmpC + estIntEmp || ""),
                                employerShare: String(estErC + estIntEr || ""),
                                pensionShare: String(estPenC || ""),
                                note: `Form 13 transfer from ${est.employerName}`,
                                estId: "",
                              });
                              setShowTxModal(true);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: `1px solid ${THEME.sage}66`,
                              background: `${THEME.sage}0f`,
                              color: THEME.sage,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Repeat size={11} /> Record Transfer to New Employer
                          </button>
                        )}
                      </div>
                    )}
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
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${s.color}33`, background: `${s.color}0d` }}>
              <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{fmtINR(s.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        <button
          style={btnGhost}
          onClick={() => {
            setShowTxModal(true);
            setEditTx(null);
            setTransferPrefill(null);
            setShowCsvImport(false);
          }}
        >
          <Plus size={13} /> Add Transaction
        </button>
        <button
          style={{ ...btnGhost, color: THEME.accent, borderColor: `${THEME.accent}66` }}
          onClick={() => {
            setShowCsvImport((v) => !v);
            setShowLedger(true);
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger((v) => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* ── CSV Panel ── */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <EPFCsvPanel
            onImport={(rows: any[]) => {
              importRows(rows);
              setShowCsvImport(false);
            }}
          />
        </div>
      )}

      {/* ── Ledger ── */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Passbook (monthly_contribution) table */}
          {passbookRows.length > 0 &&
            (() => {
              /* show Establishment column only when service history exists */
              const showEstCol = ests.length > 0;
              const estMap: Record<string, any> = {};
              ests.forEach((e: any) => {
                estMap[e.id] = e;
              });
              /* assign a distinct color per establishment (cycle through palette) */
              const EST_COLORS = [
                THEME.accent,
                "#0ea5e9",
                "#f59e0b",
                "#ec4899",
                "#8b5cf6",
                "#10b981",
              ];
              const estColorMap: Record<string, string> = {};
              sortedEsts.forEach((e: any, i: number) => {
                estColorMap[e.id] = EST_COLORS[i % EST_COLORS.length];
              });

              const totalSpan = showEstCol ? 4 : 3;
              return (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.accent,
                      marginBottom: 8,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.07em",
                    }}
                  >
                    EPFO Passbook ({passbookRows.length} entries)
                  </div>
                  <div
                    style={{
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ overflowX: "auto" as const }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse" as const,
                          fontSize: 11,
                          minWidth: showEstCol ? 760 : 640,
                        }}
                      >
                        <thead>
                          <tr style={{ background: `${THEME.accent}0f` }}>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Wage Month / Description
                            </th>
                            {showEstCol && (
                              <th
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "left" as const,
                                  fontWeight: 700,
                                  fontSize: 9,
                                  color: THEME.accent,
                                  textTransform: "uppercase" as const,
                                  letterSpacing: "0.06em",
                                }}
                              >
                                Establishment
                              </th>
                            )}
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Trans. Date
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Particulars / Note
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              EPF Wages
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              EPS Wages
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Emp. Share\n12%"}
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Empr. Share\n3.67%"}
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Pension\n8.33%"}
                            </th>
                            <th style={{ padding: "7px 10px" }} />
                          </tr>
                        </thead>
                        <tbody>
                          {passbookRows.map((t) => {
                            const isIntRow = t.type === "interest_credit";
                            const isTransferRow = t.type === "transfer_in";
                            const linkedEst = t.estId ? estMap[t.estId] : null;
                            const estColor = t.estId
                              ? estColorMap[t.estId] || THEME.accent
                              : THEME.muted;
                            const descLabel = isTransferRow
                              ? `⇒ Transfer In — ${t.fromEmployer || "Previous Employer"}`
                              : isIntRow
                                ? t.particulars ||
                                  `Int. Updated upto ${new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                                : t.wageMonth || "—";
                            const empVal = isIntRow
                              ? t.employeeShare !== undefined
                                ? t.employeeShare
                                : t.amount
                              : isTransferRow
                                ? Number(t.employeeShare || 0) > 0
                                  ? t.employeeShare
                                  : t.amount
                                : t.employeeShare || 0;
                            const erVal = t.employerShare || 0;
                            const penVal = t.pensionShare || 0;
                            const rowBg = isTransferRow
                              ? `${THEME.sage}0f`
                              : isIntRow
                                ? `${THEME.sage}09`
                                : undefined;
                            const txColor = isTransferRow
                              ? THEME.sage
                              : isIntRow
                                ? THEME.sage
                                : THEME.ink;
                            const numColor = (base: string) =>
                              isTransferRow ? THEME.sage : isIntRow ? THEME.sage : base;
                            return (
                              <tr
                                key={t.id}
                                style={{
                                  borderTop: isTransferRow
                                    ? `2px dashed ${THEME.sage}66`
                                    : `1px solid ${THEME.line}`,
                                  background: rowBg,
                                }}
                              >
                                <td
                                  style={{ padding: "6px 10px", fontWeight: 700, color: txColor }}
                                >
                                  {descLabel}
                                </td>
                                {showEstCol && (
                                  <td style={{ padding: "6px 10px" }}>
                                    {linkedEst ? (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "2px 7px",
                                          borderRadius: 5,
                                          background: `${estColor}18`,
                                          border: `1px solid ${estColor}40`,
                                          maxWidth: 130,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: estColor,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: estColor,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap" as const,
                                          }}
                                          title={linkedEst.employerName}
                                        >
                                          {linkedEst.employerName.length > 14
                                            ? linkedEst.employerName.slice(0, 13) + "…"
                                            : linkedEst.employerName}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 9, color: THEME.muted }}>—</span>
                                    )}
                                  </td>
                                )}
                                <td
                                  style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}
                                >
                                  {t.date || "—"}
                                </td>
                                <td
                                  style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}
                                >
                                  {isTransferRow
                                    ? t.note || "Form 13 Transfer"
                                    : isIntRow
                                      ? t.note || "—"
                                      : t.particulars || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 600,
                                  }}
                                >
                                  {!isIntRow && !isTransferRow && t.epfWages
                                    ? fmtINR(t.epfWages)
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 600,
                                  }}
                                >
                                  {!isIntRow && !isTransferRow && t.epsWages
                                    ? fmtINR(t.epsWages)
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: numColor(THEME.accent),
                                  }}
                                >
                                  {fmtINR(empVal)}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: numColor("#0ea5e9"),
                                  }}
                                >
                                  {fmtINR(erVal)}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: isIntRow || isTransferRow ? THEME.muted : "#f59e0b",
                                  }}
                                >
                                  {fmtINR(penVal)}
                                </td>
                                <td style={{ padding: "6px 10px" }}>
                                  <div
                                    style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}
                                  >
                                    <button
                                      onClick={() => {
                                        setEditTx(t);
                                        setTransferPrefill(null);
                                        setShowTxModal(true);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.muted,
                                        padding: 2,
                                        display: "flex",
                                      }}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      onClick={() => removeTx(t.id)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.rust,
                                        padding: 2,
                                        display: "flex",
                                      }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              borderTop: `2px solid ${THEME.line}`,
                              background: `${THEME.accent}09`,
                            }}
                          >
                            <td
                              colSpan={totalSpan}
                              style={{
                                padding: "7px 10px",
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.muted,
                                textTransform: "uppercase" as const,
                              }}
                            >
                              Total
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 800,
                              }}
                            >
                              {fmtINR(
                                passbookRows
                                  .filter((t) => t.type === "monthly_contribution")
                                  .reduce((s, t) => s + Number(t.epfWages || 0), 0)
                              )}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 800,
                              }}
                            >
                              {fmtINR(
                                passbookRows
                                  .filter((t) => t.type === "monthly_contribution")
                                  .reduce((s, t) => s + Number(t.epsWages || 0), 0)
                              )}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: THEME.accent,
                              }}
                            >
                              {fmtINR(
                                passbookRows.reduce((s, t) => {
                                  if (t.type === "interest_credit")
                                    return (
                                      s +
                                      Number(
                                        t.employeeShare !== undefined
                                          ? t.employeeShare
                                          : t.amount || 0
                                      )
                                    );
                                  if (t.type === "transfer_in") {
                                    const erT = Number(t.employerShare || 0);
                                    const penT = Number(t.pensionShare || 0);
                                    return s + (Number(t.amount || 0) - erT - penT);
                                  }
                                  return s + Number(t.employeeShare || 0);
                                }, 0)
                              )}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: "#0ea5e9",
                              }}
                            >
                              {fmtINR(
                                passbookRows.reduce((s, t) => s + Number(t.employerShare || 0), 0)
                              )}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: THEME.gold,
                              }}
                            >
                              {fmtINR(
                                passbookRows
                                  .filter((t) => t.type === "monthly_contribution")
                                  .reduce((s, t) => s + Number(t.pensionShare || 0), 0)
                              )}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Regular transactions */}
          {regularRows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  marginBottom: 8,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                }}
              >
                Other Transactions ({regularRows.length})
              </div>
              <div
                style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: `${THEME.accent}08` }}>
                      {["Date", "Type", "Amount", "Note", ""].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "8px 10px",
                            textAlign: i >= 2 ? ("right" as const) : ("left" as const),
                            fontWeight: 600,
                            fontSize: 10,
                            color: THEME.muted,
                            textTransform: "uppercase" as const,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regularRows.map((t) => {
                      const ti = typeInfo(t.type);
                      const isOut = t.type === "withdrawal";
                      return (
                        <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                          <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: ti.color }}>
                              {ti.label}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right" as const,
                              fontWeight: 800,
                              color: isOut ? THEME.rust : ti.color,
                            }}
                          >
                            {isOut ? "-" : "+"}
                            {fmtINR(t.amount)}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right" as const,
                              color: THEME.muted,
                            }}
                          >
                            {t.note || "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button
                                onClick={() => {
                                  setEditTx(t);
                                  setShowTxModal(true);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.muted,
                                  padding: 2,
                                  display: "flex",
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => removeTx(t.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.rust,
                                  padding: 2,
                                  display: "flex",
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
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
          initial={transferPrefill || editTx}
          establishments={ests}
          onClose={() => {
            setShowTxModal(false);
            setEditTx(null);
            setTransferPrefill(null);
          }}
          onSave={saveTx}
        />
      )}
      {showEstModal && (
        <AddEstablishmentModal
          initial={editEst}
          onClose={() => {
            setShowEstModal(false);
            setEditEst(null);
          }}
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
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: `linear-gradient(135deg,${THEME.accent} 0%,${THEME.accent}cc 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Shield size={30} color="#fff" />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        No EPF Account Added Yet
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          marginBottom: 8,
          maxWidth: 360,
          margin: "0 auto 8px",
          lineHeight: 1.6,
        }}
      >
        Track your Employee Provident Fund — employee &amp; employer contributions, EPFO interest
        credits, and withdrawals.
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap" as const,
        }}
      >
        {["Employee Contribution", "Employer Contribution", "EPFO Interest", "Withdrawals"].map(
          (t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: THEME.accent,
                  display: "inline-block",
                }}
              />{" "}
              {t}
            </span>
          )
        )}
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
    {items.length === 0 ? (
      <EPFEmptyState onAdd={onAdd} />
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((e: any) => (
          <EPFAccountCard key={e.id} p={e} removeItem={removeItem} updateItem={updateItem} />
        ))}
      </div>
    )}
  </div>
);

/* ── Bank / Institution Logo ─────────────────────────────────────────── */
const BANK_LOGO_DOMAINS: Record<string, string> = {
  // Public sector banks
  "state bank": "sbi.co.in", "sbi": "sbi.co.in",
  // Private banks
  "hdfc": "hdfcbank.com", "icici": "icicibank.com", "axis": "axisbank.com",
  "kotak": "kotakmahindrabank.com", "yes bank": "yesbank.in", "yes ": "yesbank.in",
  "indusind": "indusind.com", "rbl": "rblbank.com", "federal": "federalbank.co.in",
  "idfc": "idfcfirstbank.com", "bandhan": "bandhanbank.com",
  "au bank": "aubank.in", "au small": "aubank.in",
  "south indian": "southindianbank.com", "karnataka bank": "karnatakabank.com",
  "saraswat": "saraswatbank.com", "jammu": "jkbank.com",
  // Public sector banks (more)
  "bank of baroda": "bankofbaroda.in", "bob": "bankofbaroda.in",
  "canara": "canarabank.in", "punjab national": "pnbindia.in", "pnb": "pnbindia.in",
  "bank of india": "bankofindia.co.in", "union bank": "unionbankofindia.co.in",
  "idbi": "idbi.co.in", "central bank": "centralbankofindia.co.in",
  "indian bank": "indianbank.in", "uco bank": "ucobank.in",
  // Post office / Govt savings
  "post office": "indiapost.gov.in", "india post": "indiapost.gov.in",
  // Insurance
  "lic": "licindia.in",
  // Government / RBI (bonds)
  "rbi": "rbi.org.in", "reserve bank": "rbi.org.in",
  "government of india": "india.gov.in", "govt of india": "india.gov.in",
  "nabard": "nabard.org", "nhai": "nhai.gov.in",
  // NPS PFMs (use AMC domains)
  "uti": "utimf.com", "aditya birla": "adityabirlasunlifeamc.com",
  "dsp": "dspim.com", "tata": "tatamutualfund.com", "max life": "maxlifeinsurance.com",
  // EPFO
  "epfo": "epfindia.gov.in", "employees provident": "epfindia.gov.in",
  // NBFCs / Bond issuers
  "iifl": "iifl.com",
  "arman financial": "armanindia.com", "arman india": "armanindia.com",
  "muthoottu mini": "muthoottumini.com", "muthoottu": "muthoottumini.com",
  "muthoot finance": "muthootfin.com", "muthoot fin": "muthootfin.com",
};

function getBankDomain(name: string): string {
  const n = (name || "").toLowerCase().trim();
  for (const [k, d] of Object.entries(BANK_LOGO_DOMAINS)) {
    if (n.includes(k)) return d;
  }
  return "";
}

const BankLogo = ({
  name,
  size = 36,
  accentColor,
}: {
  name: string;
  size?: number;
  accentColor?: string;
}) => {
  const domain = getBankDomain(name);
  const color = accentColor || THEME.accent;
  const [imgSrc, setImgSrc] = React.useState<string | null>(
    domain ? `https://logos.hunter.io/${domain}` : null
  );
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(domain ? 0 : 2);

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials =
    (name || "?")
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") || (name || "?")[0]?.toUpperCase() || "?";

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size, height: size,
          borderRadius: Math.round(size * 0.25),
          background: "#fff",
          border: `1px solid ${THEME.line}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <img src={imgSrc} alt={name} onError={handleError}
          style={{ width: "80%", height: "80%", objectFit: "contain" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.25),
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: Math.round(size / 2.8), fontWeight: 800, color }}>
        {initials}
      </span>
    </div>
  );
};

/* ── MF Logo ──────────────────────────────────────────────────────────── */
const MF_LOGO_DOMAINS: Record<string, string> = {
  // SBI
  "sbi": "sbimf.com",
  // HDFC
  "hdfc": "hdfcfund.com",
  // ICICI
  "icici": "icicipruamc.com",
  // Nippon / Reliance
  "nippon": "nipponindiaim.com",
  "reliance": "nipponindiaim.com",
  // Axis
  "axis": "axismf.com",
  // Mirae
  "mirae": "miraeasset.co.in",
  // Kotak
  "kotak": "kotakmf.com",
  // DSP
  "dsp": "dspim.com",
  // Aditya Birla / ABSL
  "aditya birla": "adityabirlasunlifeamc.com",
  "absl": "adityabirlasunlifeamc.com",
  "birla": "adityabirlasunlifeamc.com",
  // Parag Parikh / PPFAS
  "parag parikh": "ppfas.com",
  "ppfas": "ppfas.com",
  // UTI
  "uti": "utimf.com",
  // Tata
  "tata": "tatamutualfund.com",
  // Motilal Oswal
  "motilal": "motilaloswalmf.com",
  // Quant
  "quant": "quantmutual.com",
  // Sundaram
  "sundaram": "sundarammf.com",
  // Franklin / Templeton
  "franklin": "franklintempletonindia.com",
  "templeton": "franklintempletonindia.com",
  // PGIM
  "pgim": "pgimindiamf.com",
  // Edelweiss
  "edelweiss": "edelweissmf.com",
  // Canara Robeco
  "canara robeco": "canararobeco.com",
  "canara": "canararobeco.com",
  // Invesco
  "invesco": "invescomutualfund.com",
  // LIC
  "lic": "licmf.com",
  // Navi
  "navi": "navifunds.com",
  // IDFC / Bandhan
  "idfc": "bandhanmf.com",
  "bandhan": "bandhanmf.com",
  // WhiteOak
  "whiteoak": "whiteoakam.com",
  "white oak": "whiteoakam.com",
  // Mahindra
  "mahindra": "mahindramanulife.com",
  // Samco
  "samco": "samcomf.com",
  // ITI
  "iti": "itimf.com",
  // JM
  "jm financial": "jmfinancialservices.in",
  // HSBC
  "hsbc": "assetmanagement.hsbc.co.in",
  // L&T (now HSBC)
  "l&t": "assetmanagement.hsbc.co.in",
  // Groww
  "groww": "groww.in",
  // Zerodha / Coin
  "zerodha": "zerodha.com",
  "coin": "coin.zerodha.com",
  // Trust
  "trust": "trustmf.com",
};

function getMFDomain(fundName: string): string {
  const name = (fundName || "").toLowerCase();
  for (const [k, d] of Object.entries(MF_LOGO_DOMAINS)) {
    if (name.includes(k)) return d;
  }
  return "";
}

const MFLogo = ({ fundName, size = 40 }: { fundName: string; size?: number }) => {
  const domain = getMFDomain(fundName);
  const [imgSrc, setImgSrc] = React.useState<string | null>(
    domain ? `https://logos.hunter.io/${domain}` : null
  );
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(domain ? 0 : 2);

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials = (fundName || "MF")
    .split(" ")
    .filter((w: string) => w.length > 2)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          background: "#fff",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
        }}
      >
        <img
          src={imgSrc}
          alt={fundName}
          onError={handleError}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: `${THEME.accent}18`,
        border: `1px solid ${THEME.accent}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: Math.round(size / 2.8), fontWeight: 800, color: THEME.accent }}>
        {initials || "MF"}
      </span>
    </div>
  );
};

/* ── MF Section ─────────────────────────────────────────────────────── */
function MFSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editMF, setEditMF] = useState<any>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [navError, setNavError] = useState<Record<string, string>>({});

  const refreshNav = async (m: any) => {
    if (!m.mfCode) return;
    setRefreshingId(m.id);
    setNavError((prev) => ({ ...prev, [m.id]: "" }));
    try {
      const res = await fetch(`/api/mf-nav?code=${encodeURIComponent(m.mfCode)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.nav) throw new Error("No NAV in response");
      await updateItem("mutualFunds", m.id, { currentNav: String(data.nav) });
    } catch (e: any) {
      setNavError((prev) => ({ ...prev, [m.id]: e.message || "Refresh failed" }));
    } finally {
      setRefreshingId(null);
    }
  };

  const refreshAllNavs = async () => {
    const withCode = items.filter((m: any) => m.mfCode);
    if (!withCode.length) return;
    setRefreshingAll(true);
    for (const m of withCode) {
      await refreshNav(m);
    }
    setRefreshingAll(false);
  };

  const totalInvested = items.reduce(
    (s: number, m: any) => s + (Number(m.invested || m.investedValue) || 0),
    0
  );
  const totalCurrent = items.reduce(
    (s: number, m: any) =>
      s +
      (Number(m.units || 0) * Number(m.currentNav || 0) ||
        Number(m.invested || m.investedValue) ||
        0),
    0
  );
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={BarChart3}
          gradient="linear-gradient(135deg,#5b21b6 0%,#8b5cf6 100%)"
          dotColor="#7c3aed"
          title="No Mutual Funds Added Yet"
          description="Track all your MF investments — fund name, category, NAV, units, invested value, and P&L returns."
          pills={["Invested Value", "Current Value", "P&L Returns", "NAV Tracking"]}
          buttonLabel="Add Mutual Fund"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Invested",
                value: fmtINR(totalInvested),
                color: THEME.accent,
                Icon: IndianRupee,
              },
              {
                label: "Current Value",
                value: fmtINR(totalCurrent),
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: "Overall P&L",
                value: `${totalPnl >= 0 ? "+" : ""}${fmtINR(Math.abs(totalPnl))}`,
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
              },
              {
                label: "Return %",
                value: `${totalPnl >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`,
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: Activity,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: `${color}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Refresh All NAVs button */}
          {items.some((m: any) => m.mfCode) && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={13} className={refreshingAll ? "animate-spin" : ""} />}
                onClick={refreshAllNavs}
                style={{ opacity: refreshingAll ? 0.6 : 1 }}
              >
                {refreshingAll ? "Refreshing NAVs…" : "Refresh All NAVs"}
              </Button>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((m: any) => {
              const current = Number(m.units || 0) * Number(m.currentNav || 0) || 0;
              const costBasis = Number(m.invested || m.investedValue) || (m.buyNav ? Number(m.units || 0) * Number(m.buyNav) : 0);
              const pnl = current > 0 ? current - costBasis : 0;
              const pnlPct = costBasis > 0 && current > 0 ? (pnl / costBasis) * 100 : 0;
              const isRefreshing = refreshingId === m.id;
              const lbl = {
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 3,
              };
              return (
                <Card key={m.id} style={{ padding: 20, borderTop: `3px solid ${THEME.accent}` }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {m.category && <Badge variant="accent">{m.category}</Badge>}
                      {m.mfType && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: `${THEME.sage}18`, border: `1px solid ${THEME.sage}44`, color: THEME.sage }}>
                          {m.mfType}
                        </span>
                      )}
                      {m.folioNumber && (
                        <span style={{ fontSize: 10, color: THEME.muted, padding: "2px 7px", borderRadius: 6, background: "rgba(128,128,128,0.08)", border: `1px solid ${THEME.line}` }}>
                          Folio: {m.folioNumber}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {m.mfCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Activity size={12} />}
                          onClick={() => refreshNav(m)}
                          style={{ opacity: isRefreshing ? 0.5 : 1, color: THEME.accent }}
                          title="Refresh live NAV"
                        />
                      )}
                      <Button variant="ghost" size="sm" icon={<Pencil size={12} />} onClick={() => setEditMF(m)} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("mutualFunds", m.id)} />
                    </div>
                  </div>

                  {/* Logo + Fund name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <MFLogo fundName={m.name} size={40} />
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, flex: 1 }}>
                      {m.name}
                    </div>
                  </div>

                  {/* Core metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={lbl}>Invested</div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>
                        <Prv>{fmtINR(costBasis)}</Prv>
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>Current</div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: THEME.accent }}>
                        <Prv>{fmtINR(current || costBasis)}</Prv>
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>Units</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: THEME.muted }}>
                        {m.units ? Number(m.units).toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* NAV row */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" as const }}>
                    {m.buyNav && (
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        Buy NAV:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 700 }}>
                          ₹{Number(m.buyNav).toFixed(4)}
                        </span>
                      </div>
                    )}
                    {m.currentNav && (
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        Current NAV:{" "}
                        <span style={{ color: isRefreshing ? THEME.muted : THEME.ink, fontWeight: 700 }}>
                          {isRefreshing ? "…" : `₹${Number(m.currentNav).toFixed(4)}`}
                        </span>
                      </div>
                    )}
                    {m.buyDate && (
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        Bought:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 700 }}>
                          {new Date(m.buyDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* NAV refresh error */}
                  {navError[m.id] && (
                    <div style={{ fontSize: 10, color: THEME.rust, marginBottom: 8 }}>
                      NAV refresh failed: {navError[m.id]}
                    </div>
                  )}

                  {/* No AMFI code hint */}
                  {!m.mfCode && (
                    <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <Activity size={9} />
                      Edit fund and add AMFI code to enable live NAV
                    </div>
                  )}

                  {/* P&L footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 11, color: THEME.muted }}>P&L</div>
                    {current > 0 ? (
                      <div style={{ textAlign: "right" as const }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                          {pnl >= 0 ? "+" : ""}{fmtINR(pnl)}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: THEME.muted }}>—</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editMF && (
        <EditMFModal
          mf={editMF}
          onClose={() => setEditMF(null)}
          onSave={(updated: any) => {
            updateItem("mutualFunds", editMF.id, updated);
            setEditMF(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Yield Tracker ──────────────────────────────────────────────────── */
const YieldTracker = ({ state }: any) => {
  const PPF_RATE = 7.1;
  const EPF_RATE = 8.25;
  const RD_NOTE = "based on current interest rate";

  // FD: only count active (non-matured) FDs
  const fdInterest = (state.fixedDeposits || []).reduce((s: number, f: any) => {
    if (f.maturityDate) {
      const [y, m, d] = String(f.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) < new Date()) return s; // skip matured
    }
    return s + (Number(f.principal) * Number(f.rate || 0)) / 100;
  }, 0);

  // Bond coupon
  const bondInterest = (state.bonds || []).reduce((s: number, b: any) => {
    const principal =
      Number(b.totalPrincipalAmount || 0) ||
      Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
      Number(b.faceValue || 0);
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  // RD: interest = maturityValue - deposited (annualised)
  const rdInterest = (state.recurringDeposits || []).reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    if (!tenureMonths) return s;
    const fullMaturity = rdMaturity(Number(r.monthly), Number(r.rate), tenureMonths);
    const fullDeposited = (Number(r.monthly) || 0) * tenureMonths;
    const annualisedInterest = (fullMaturity - fullDeposited) / (tenureMonths / 12);
    return s + Math.max(0, annualisedInterest);
  }, 0);

  // PPF: balance × 7.1%
  const ppfInterest = (state.ppf || []).reduce(
    (s: number, p: any) => s + (Number(p.balance) * PPF_RATE) / 100,
    0
  );

  // EPF: balance × 8.25%
  const epfInterest = (state.epf || []).reduce((s: number, e: any) => {
    return s + (calculateEpfBalance(e) * EPF_RATE) / 100;
  }, 0);

  // NPS: rough 10% annual growth (mixed equity/debt)
  const npsGrowth = (state.nps || []).reduce(
    (s: number, n: any) => s + (Number(n.balance) * 10) / 100,
    0
  );

  const streams = [
    {
      label: "Fixed Deposits",
      value: fdInterest,
      color: "#d97706",
      icon: Coins,
      note: "annual interest on active FDs",
    },
    {
      label: "Bonds",
      value: bondInterest,
      color: "#92400e",
      icon: FileText,
      note: "annual coupon on face value",
    },
    {
      label: "Recurring Deposits",
      value: rdInterest,
      color: "#0284c7",
      icon: Repeat,
      note: RD_NOTE,
    },
    {
      label: "PPF",
      value: ppfInterest,
      color: "#15803d",
      icon: Shield,
      note: `@ ${PPF_RATE}% current rate`,
    },
    {
      label: "EPF / EPFO",
      value: epfInterest,
      color: THEME.accent,
      icon: Shield,
      note: `@ ${EPF_RATE}% announced rate`,
    },
    {
      label: "NPS (est.)",
      value: npsGrowth,
      color: "#c2410c",
      icon: Briefcase,
      note: "@ ~10% blended CAGR estimate",
    },
  ].filter((s) => s.value > 0);

  const totalAnnual = streams.reduce((s, x) => s + x.value, 0);
  const totalMonthly = totalAnnual / 12;

  const maxVal = Math.max(...streams.map((s) => s.value), 1);

  return (
    <div className="animate-fade-in-up">
      {/* Top stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Annual Yield",
            value: fmtINR(totalAnnual),
            sub: "All income streams combined",
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Monthly Income",
            value: fmtINR(totalMonthly),
            sub: "Average cash flow / month",
            color: THEME.sage,
            Icon: Receipt,
          },
          {
            label: "Daily Passive",
            value: fmtINR(totalAnnual / 365),
            sub: "₹ earned every day",
            color: THEME.gold,
            Icon: Zap,
          },
          {
            label: "Income Streams",
            value: String(streams.length),
            sub: "Active yielding instruments",
            color: THEME.accent,
            Icon: Target,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${color}1f`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
          </div>
        ))}
      </div>

      {streams.length === 0 ? (
        <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
          <PiggyBank size={48} color={THEME.muted} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Yield Data Yet
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360, margin: "0 auto" }}>
            Add Fixed Deposits, Bonds, PPF, EPF, RD or NPS to see your income breakdown here.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              marginBottom: 20,
            }}
          >
            Yield Breakdown by Instrument
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {streams.map(({ label, value, color, icon: Icon, note }) => {
              const barPct = (value / maxVal) * 100;
              const sharePct = totalAnnual > 0 ? (value / totalAnnual) * 100 : 0;
              return (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `${color}18`,
                          border: `1px solid ${color}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={13} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>{note}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color }}>
                        {fmtINR(value)}
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        {sharePct.toFixed(1)}% share
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: `${color}18`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barPct}%`,
                        background: color,
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `2px solid ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Total Annual Yield
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.accent }}>
                {fmtINR(totalAnnual)}
              </div>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Monthly Avg.
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage }}>
                {fmtINR(totalMonthly)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: `${THEME.accent}09`,
              border: `1px solid ${THEME.accent}26`,
              fontSize: 11,
              color: THEME.muted,
              lineHeight: 1.6,
            }}
          >
            <b style={{ color: THEME.ink }}>Note:</b> FD uses simple interest × principal. Bond uses
            coupon on face value. RD uses annualised interest over full tenure. PPF @ {PPF_RATE}%,
            EPF @ {EPF_RATE}%. NPS is a rough estimate at 10% blended return — actual performance
            varies. All figures are pre-tax.
          </div>
        </Card>
      )}
    </div>
  );
};
