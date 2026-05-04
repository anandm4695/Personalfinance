// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Building2, TrendingUp, Landmark, Receipt, Plus, Trash2, Pencil, ChevronDown, ChevronUp, Shield, TrendingDown, Percent } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input } from "../ui/Form";

interface RentalTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({ state, addItem, removeItem, updateItem }) => {
  const [sub, setSub] = useState("out");
  const [expandedOut, setExpandedOut] = useState<Record<string, boolean>>({});
  const [expandedIn, setExpandedIn] = useState<Record<string, boolean>>({});

  const propertiesOut = state.rentalProperties || [];
  const propertiesIn = state.rentedProperties || [];

  const fyLabel = state.profile.fy;
  const fyStart = fyLabel.split("-")[0] + "-04-01";
  const fyEnd = (parseInt(fyLabel.split("-")[0]) + 1) + "-03-31";

  const outMonthlyRent = propertiesOut.filter((p: any) => p.isActive !== false).reduce((s: number, p: any) => s + Number(p.monthlyRent || 0), 0);
  const outThisFY = propertiesOut.reduce((s: number, p: any) => s + (p.receipts || []).filter((r: any) => r.date >= fyStart && r.date <= fyEnd).reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0), 0);
  const outDepositHeld = propertiesOut.reduce((s: number, p: any) => s + (Math.max(0, Number(p.securityDeposit || 0) - (p.depositDeductions || []).reduce((ss: number, dd: any) => ss + Number(dd.amount || 0), 0) - Number(p.depositReturned || 0))), 0);
  
  const inMonthlyRent = propertiesIn.filter((p: any) => p.isActive !== false).reduce((s: number, p: any) => s + Number(p.monthlyRent || 0), 0);
  const inThisFY = propertiesIn.reduce((s: number, p: any) => s + (p.payments || []).filter((r: any) => r.date >= fyStart && r.date <= fyEnd).reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0), 0);
  const inDepositPaid = propertiesIn.reduce((s: number, p: any) => s + (Math.max(0, Number(p.securityDeposit || 0) - Number(p.depositReturned || 0))), 0);

  return (
    <div className="tab-content-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Rental Details</h2>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Track agreements, receipts & deposits for {fyLabel}</div>
        </div>
        <Button variant="accent" icon={<Plus size={14} />}>
          Add Property
        </Button>
      </div>

      <div style={{ display: "inline-flex", background: THEME.line, borderRadius: 12, padding: 4, marginBottom: 24 }}>
        <button
          onClick={() => setSub("out")}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            border: "none",
            background: sub === "out" ? THEME.darkInk : "transparent",
            color: sub === "out" ? THEME.accent : THEME.muted,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Rented Out {propertiesOut.length > 0 && <Badge variant="accent" style={{ marginLeft: 6 }}>{propertiesOut.length}</Badge>}
        </button>
        <button
          onClick={() => setSub("in")}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            border: "none",
            background: sub === "in" ? THEME.darkInk : "transparent",
            color: sub === "in" ? THEME.accent : THEME.muted,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Rented In {propertiesIn.length > 0 && <Badge variant="muted" style={{ marginLeft: 6 }}>{propertiesIn.length}</Badge>}
        </button>
      </div>

      {sub === "out" ? (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
            <Card variant="tile">
              <div className="tile-icon"><Building2 size={18} /></div>
              <div className="tile-label">Monthly Rent</div>
              <div className="tile-value">{fmtINRFull(outMonthlyRent)}</div>
              <div className="tile-sub">Active agreements</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><TrendingUp size={18} /></div>
              <div className="tile-label">Received (FY)</div>
              <div className="tile-value">{fmtINRFull(outThisFY)}</div>
              <div className="tile-sub">of {fmtINRFull(outMonthlyRent * 12)} expected</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><Landmark size={18} /></div>
              <div className="tile-label">Deposit Held</div>
              <div className="tile-value">{fmtINRFull(outDepositHeld)}</div>
              <div className="tile-sub">Total liability</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><Receipt size={18} /></div>
              <div className="tile-label">Taxable IHP</div>
              <div className="tile-value">{fmtINRFull(outThisFY * 0.7)}</div>
              <div className="tile-sub">Post 30% deduction</div>
            </Card>
          </div>

          {propertiesOut.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ marginBottom: 16, opacity: 0.2 }}><Building2 size={48} style={{ margin: "0 auto" }} /></div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Properties Rented Out</div>
              <div style={{ color: THEME.muted, fontSize: 14, maxWidth: 300, margin: "0 auto 24px" }}>
                Add your shop or flat to track rent receipts and security deposits effectively.
              </div>
              <Button variant="secondary" icon={<Plus size={14} />}>Add First Property</Button>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {propertiesOut.map((p: any) => (
                <Card key={p.id} style={{ padding: 20 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={22} color={THEME.accent} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{p.propertyName}</div>
                        <div style={{ fontSize: 13, color: THEME.muted }}>{p.tenantName} · {fmtINRFull(p.monthlyRent)}/mo</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: THEME.sage }}>{fmtINRFull(p.receipts?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0)}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>Total Received</div>
                      </div>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} style={{ color: THEME.rust }} />
                   </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in-up">
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
            <Card variant="tile">
              <div className="tile-icon"><Building2 size={18} /></div>
              <div className="tile-label">Monthly Rent</div>
              <div className="tile-value">{fmtINRFull(inMonthlyRent)}</div>
              <div className="tile-sub">Active agreements</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><TrendingDown size={18} /></div>
              <div className="tile-label">Paid (FY)</div>
              <div className="tile-value">{fmtINRFull(inThisFY)}</div>
              <div className="tile-sub">of {fmtINRFull(inMonthlyRent * 12)} expected</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><Shield size={18} /></div>
              <div className="tile-label">Deposit Paid</div>
              <div className="tile-value">{fmtINRFull(inDepositPaid)}</div>
              <div className="tile-sub">Recoverable asset</div>
            </Card>
            <Card variant="tile">
              <div className="tile-icon"><Percent size={18} /></div>
              <div className="tile-label">HRA Eligible</div>
              <div className="tile-value">{fmtINRFull(inThisFY)}</div>
              <div className="tile-sub">Annual rent paid</div>
            </Card>
          </div>

          {propertiesIn.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ marginBottom: 16, opacity: 0.2 }}><Building2 size={48} style={{ margin: "0 auto" }} /></div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Properties Rented In</div>
              <div style={{ color: THEME.muted, fontSize: 14, maxWidth: 300, margin: "0 auto 24px" }}>
                Add the property you rent to track payments and security deposits for HRA claims.
              </div>
              <Button variant="secondary" icon={<Plus size={14} />}>Add Rented Property</Button>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {propertiesIn.map((p: any) => (
                <Card key={p.id} style={{ padding: 20 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={22} color={THEME.rust} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{p.propertyName}</div>
                        <div style={{ fontSize: 13, color: THEME.muted }}>{p.landlordName} · {fmtINRFull(p.monthlyRent)}/mo</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: THEME.rust }}>{fmtINRFull(p.payments?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0)}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>Total Paid</div>
                      </div>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} style={{ color: THEME.rust }} />
                   </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
