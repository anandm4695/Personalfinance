// @ts-nocheck
import React, { useState } from "react";
import { Building2, TrendingUp, TrendingDown, Landmark, Receipt, Shield, Percent, Plus, Trash2, Pencil } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { RentalPropertyModal, RentedInPropertyModal } from "../modals/RentalModals";

interface RentalTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({ state, addItem, removeItem, updateItem }) => {
  const [sub, setSub] = useState("out");
  const [modalOut, setModalOut] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [modalIn, setModalIn] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

  const propertiesOut = state.rentalProperties || [];
  const propertiesIn = state.rentedProperties || [];

  const fyLabel = state.profile.fy;
  const fyStart = fyLabel.split("-")[0] + "-04-01";
  const fyEnd = (parseInt(fyLabel.split("-")[0]) + 1) + "-03-31";

  const outMonthlyRent = propertiesOut.filter((p: any) => p.isActive !== false).reduce((s: number, p: any) => s + Number(p.monthlyRent || 0), 0);
  const outThisFY = propertiesOut.reduce((s: number, p: any) => s + (p.receipts || []).filter((r: any) => r.date >= fyStart && r.date <= fyEnd).reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0), 0);
  const outDepositHeld = propertiesOut.reduce((s: number, p: any) => s + Math.max(0, Number(p.securityDeposit || 0) - (p.depositDeductions || []).reduce((ss: number, dd: any) => ss + Number(dd.amount || 0), 0) - Number(p.depositReturned || 0)), 0);

  const inMonthlyRent = propertiesIn.filter((p: any) => p.isActive !== false).reduce((s: number, p: any) => s + Number(p.monthlyRent || 0), 0);
  const inThisFY = propertiesIn.reduce((s: number, p: any) => s + (p.payments || []).filter((r: any) => r.date >= fyStart && r.date <= fyEnd).reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0), 0);
  const inDepositPaid = propertiesIn.reduce((s: number, p: any) => s + Math.max(0, Number(p.securityDeposit || 0) - Number(p.depositReturned || 0)), 0);

  const handleAddOut = (data: any) => {
    addItem("rentalProperties", { ...data, receipts: [], depositDeductions: [], depositReturned: 0 });
    setModalOut({ open: false, editing: null });
  };
  const handleEditOut = (data: any) => {
    if (modalOut.editing) updateItem("rentalProperties", modalOut.editing.id, data);
    setModalOut({ open: false, editing: null });
  };
  const handleAddIn = (data: any) => {
    addItem("rentedProperties", { ...data, payments: [], depositReturned: 0 });
    setModalIn({ open: false, editing: null });
  };
  const handleEditIn = (data: any) => {
    if (modalIn.editing) updateItem("rentedProperties", modalIn.editing.id, data);
    setModalIn({ open: false, editing: null });
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle 
        sub={`Track agreements, receipts & deposits for ${fyLabel}`}
        rightElement={
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() => sub === "out" ? setModalOut({ open: true, editing: null }) : setModalIn({ open: true, editing: null })}
          >
            {sub === "out" ? "Add Property" : "Add Rented Property"}
          </Button>
        }
      >
        Rental Details
      </SectionTitle>

      <div style={{ display: "inline-flex", background: "rgba(128,128,128,0.08)", borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${THEME.line}` }}>
        {[
          { id: "out", label: "Rented Out", count: propertiesOut.length },
          { id: "in",  label: "Rented In",  count: propertiesIn.length },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: sub === s.id ? THEME.darkInk : "transparent",
              color: sub === s.id ? THEME.accent : THEME.muted,
              fontWeight: 800, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8, fontSize: 13
            }}
          >
            {s.label}
            {s.count > 0 && (
              <Badge 
                variant={sub === s.id ? "accent" : "muted"} 
                style={{ fontSize: 10, padding: "2px 6px" }}
              >
                {s.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {sub === "out" ? (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 32 }}>
            <StatCard
              icon={<Building2 />}
              label="Monthly Rent"
              value={fmtINRFull(outMonthlyRent)}
              color={THEME.accent}
              sub="Active agreements"
            />
            <StatCard
              icon={<TrendingUp />}
              label="Received (FY)"
              value={fmtINRFull(outThisFY)}
              color={THEME.sage}
              sub={`of ${fmtINRFull(outMonthlyRent * 12)} expected`}
            />
            <StatCard
              icon={<Landmark />}
              label="Deposit Held"
              value={fmtINRFull(outDepositHeld)}
              color={THEME.gold}
              sub="Total liability"
            />
            <StatCard
              icon={<Receipt />}
              label="Taxable IHP"
              value={fmtINRFull(outThisFY * 0.7)}
              color={THEME.accent}
              sub="Post 30% deduction"
            />
          </div>

          {propertiesOut.length === 0 ? (
            <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#059669 0%,#34d399 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(5, 150, 105, 0.2)" }}>
                <Building2 size={28} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>No Properties Rented Out</div>
                <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 380, lineHeight: 1.6 }}>Add your shop, flat, or commercial space to track monthly rent receipts, security deposits, and taxable income under IHP.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Rent Receipt Ledger", "Security Deposit", "Taxable IHP Income", "Tenant Tracking"].map(f => (
                  <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(5,150,105,0.08)", color: "#059669", fontWeight: 700, border: "1px solid rgba(5,150,105,0.15)" }}>● {f}</span>
                ))}
              </div>
              <Button variant="accent" size="lg" icon={<Plus size={18} />} onClick={() => setModalOut({ open: true, editing: null })}>
                Add Property
              </Button>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
              {propertiesOut.map((p: any) => (
                <Card key={p.id} style={{ padding: 24, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(128,128,128,0.04)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${THEME.line}` }}>
                      <Building2 size={24} color={THEME.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", color: THEME.ink }}>{p.propertyName}</div>
                          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                            {p.tenantName || "Vacant"} · <span style={{ color: THEME.accent }}>{fmtINRFull(p.monthlyRent)}/mo</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => setModalOut({ open: true, editing: p })} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("rentalProperties", p.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>FY Received</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.sage }}>
                            {fmtINRFull((p.receipts || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                          </div>
                        </div>
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Deposit Held</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.gold }}>
                            {fmtINRFull(Math.max(0, Number(p.securityDeposit || 0) - (p.depositReturned || 0)))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 32 }}>
            <StatCard
              icon={<Building2 />}
              label="Monthly Rent"
              value={fmtINRFull(inMonthlyRent)}
              color={THEME.rust}
              sub="Active agreements"
            />
            <StatCard
              icon={<TrendingDown />}
              label="Paid (FY)"
              value={fmtINRFull(inThisFY)}
              color={THEME.rust}
              sub={`of ${fmtINRFull(inMonthlyRent * 12)} expected`}
            />
            <StatCard
              icon={<Shield />}
              label="Deposit Paid"
              value={fmtINRFull(inDepositPaid)}
              color={THEME.sage}
              sub="Recoverable asset"
            />
            <StatCard
              icon={<Percent />}
              label="HRA Eligible"
              value={fmtINRFull(inThisFY)}
              color={THEME.accent}
              sub="Annual rent paid"
            />
          </div>

          {propertiesIn.length === 0 ? (
            <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(219, 39, 119, 0.2)" }}>
                <Building2 size={28} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>No Rented Properties Added</div>
                <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 380, lineHeight: 1.6 }}>Add the home or office you rent to track your monthly payments, security deposit recovery, and annual rent paid for HRA claims.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Rent Payment Log", "HRA Claim Support", "Security Deposit", "Landlord Details"].map(f => (
                  <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(219,39,119,0.08)", color: "#db2777", fontWeight: 700, border: "1px solid rgba(219,39,119,0.15)" }}>● {f}</span>
                ))}
              </div>
              <Button variant="accent" size="lg" icon={<Plus size={18} />} onClick={() => setModalIn({ open: true, editing: null })}>
                Add Rented Property
              </Button>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
              {propertiesIn.map((p: any) => (
                <Card key={p.id} style={{ padding: 24, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(128,128,128,0.04)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${THEME.line}` }}>
                      <Building2 size={24} color={THEME.rust} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", color: THEME.ink }}>{p.propertyName}</div>
                          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                            {p.landlordName || "Unknown Landlord"} · <span style={{ color: THEME.rust }}>{fmtINRFull(p.monthlyRent)}/mo</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => setModalIn({ open: true, editing: p })} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("rentedProperties", p.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>FY Paid</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.rust }}>
                            {fmtINRFull((p.payments || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                          </div>
                        </div>
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Deposit Paid</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.sage }}>
                            {fmtINRFull(Math.max(0, Number(p.securityDeposit || 0) - (p.depositReturned || 0)))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOut.open && (
        <RentalPropertyModal
          initial={modalOut.editing}
          onClose={() => setModalOut({ open: false, editing: null })}
          onSave={modalOut.editing ? handleEditOut : handleAddOut}
        />
      )}
      {modalIn.open && (
        <RentedInPropertyModal
          initial={modalIn.editing}
          onClose={() => setModalIn({ open: false, editing: null })}
          onSave={modalIn.editing ? handleEditIn : handleAddIn}
        />
      )}
    </div>
  );
};
