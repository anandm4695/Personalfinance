// @ts-nocheck
import React, { useState, useMemo } from "react";
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
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown,
  PieChart as PieIcon,
  Activity,
  Calculator,
  IndianRupee,
  Receipt,
  Percent
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fdMaturity, rdMaturity } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface InvestmentsTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  subTab?: string;
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({ 
  state, 
  addItem, 
  removeItem, 
  updateItem, 
  subTab 
}) => {
  const [sub, setSub] = useState(subTab || "fd");

  const subs = [
    { id: "fd", label: "Fixed Deposits", icon: Coins, count: state.fixedDeposits.length },
    { id: "rd", label: "Recurring Deposits", icon: Repeat, count: state.recurringDeposits.length },
    { id: "bond", label: "Bonds", icon: FileText, count: state.bonds.length },
    { id: "ppf", label: "PPF", icon: Shield, count: state.ppf.length },
    { id: "nps", label: "NPS", icon: Briefcase, count: state.nps.length },
    { id: "mf", label: "Mutual Funds", icon: BarChart3, count: state.mutualFunds.length },
    { id: "lic", label: "LIC", icon: Shield, count: state.lic.length },
    { id: "income", label: "Yield Tracker", icon: Activity },
  ];

  const renderContent = () => {
    switch (sub) {
      case "fd":
        return <FDSection items={state.fixedDeposits} removeItem={removeItem} />;
      case "rd":
        return <RDSection items={state.recurringDeposits} removeItem={removeItem} />;
      case "income":
        return <YieldTracker state={state} />;
      default:
        return (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: THEME.muted }}>
              Section "{sub}" content coming soon in the refactor...
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="tab-content-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Investments Portfolio</h2>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Growth, preservation, and yield instruments</div>
        </div>
        <Button variant="accent" icon={<Plus size={14} />}>
          Add Investment
        </Button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 20 }} className="no-scrollbar">
        {subs.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: active ? THEME.accent : "rgba(128,128,128,0.06)",
                color: active ? "#fff" : THEME.muted,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={16} />
              <span style={{ fontSize: 13 }}>{s.label}</span>
              {s.count !== undefined && (
                <span style={{ 
                  fontSize: 10, 
                  background: active ? "rgba(255,255,255,0.2)" : "rgba(128,128,128,0.1)", 
                  padding: "2px 6px", 
                  borderRadius: 6 
                }}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {renderContent()}
    </div>
  );
};

const FDSection = ({ items, removeItem }: any) => (
  <div className="animate-fade-in-up">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      {items.map((f: any) => {
        const maturity = fdMaturity(Number(f.principal), Number(f.rate), Number(f.years));
        return (
          <Card key={f.id} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Badge variant="muted">{f.bank}</Badge>
              <div style={{ display: "flex", gap: 4 }}>
                <Button variant="ghost" size="sm" icon={<Pencil size={12} />} />
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("fixedDeposits", f.id)} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>{fmtINRFull(f.principal)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Rate: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.rate}%</span>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Tenure: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.years} yrs</span>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Matures: <span style={{ color: THEME.ink, fontWeight: 700 }}>{f.maturityDate}</span>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Total: <span style={{ color: THEME.sage, fontWeight: 700 }}>{fmtINR(maturity)}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

const RDSection = ({ items, removeItem }: any) => (
  <div className="animate-fade-in-up">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      {items.map((r: any) => {
        const maturity = rdMaturity(Number(r.monthly), Number(r.rate), Number(r.tenureMonths));
        return (
          <Card key={r.id} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Badge variant="muted">{r.bank}</Badge>
              <div style={{ display: "flex", gap: 4 }}>
                <Button variant="ghost" size="sm" icon={<Pencil size={12} />} />
                <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} style={{ color: THEME.rust }} onClick={() => removeItem("recurringDeposits", r.id)} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{fmtINRFull(r.monthly)}<span style={{ fontSize: 14, color: THEME.muted }}>/mo</span></div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>Tenure: {r.tenureMonths} months</div>
            <div className="progress-track" style={{ marginBottom: 12 }}><div className="progress-fill" style={{ width: "40%", background: THEME.accent }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
               <span style={{ color: THEME.muted }}>Projected Maturity</span>
               <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(maturity)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

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
