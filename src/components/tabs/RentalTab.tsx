// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Building2, TrendingUp, TrendingDown, Landmark, Receipt, Shield, Percent, Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { RentalPropertyModal, RentedInPropertyModal } from "../modals/RentalModals";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Rental Details</h2>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Track agreements, receipts & deposits for {fyLabel}</div>
        </div>
        <Button
          variant="accent"
          icon={<Plus size={14} />}
          onClick={() => sub === "out" ? setModalOut({ open: true, editing: null }) : setModalIn({ open: true, editing: null })}
        >
          {sub === "out" ? "Add Property" : "Add Rented Property"}
        </Button>
      </div>

      <div style={{ display: "inline-flex", background: THEME.line, borderRadius: 12, padding: 4, marginBottom: 24 }}>
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
              fontWeight: 700, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {s.label}
            {s.count > 0 && <Badge variant={s.id === "out" ? "accent" : "muted"} style={{ marginLeft: 2 }}>{s.count}</Badge>}
          </button>
        ))}
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
            <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#059669 0%,#34d399 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={28} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Properties Rented Out</div>
                <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Add your shop, flat, or commercial space to track monthly rent receipts, security deposits, and taxable income under IHP.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Rent Receipt Ledger", "Security Deposit", "Taxable IHP Income", "Tenant Tracking"].map(f => (
                  <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(5,150,105,0.08)", color: "#059669", fontWeight: 600, border: "1px solid rgba(5,150,105,0.15)" }}>● {f}</span>
                ))}
              </div>
              <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setModalOut({ open: true, editing: null })}>
                <Plus size={16} /> Add Property
              </button>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {propertiesOut.map((p: any) => (
                <Card key={p.id} style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building2 size={22} color={THEME.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{p.propertyName}</div>
                      <div style={{ fontSize: 13, color: THEME.muted }}>{p.tenantName || "No tenant"} · {fmtINRFull(p.monthlyRent)}/mo</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: THEME.sage }}>
                        {fmtINRFull((p.receipts || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Total Received</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />}
                        onClick={() => setModalOut({ open: true, editing: p })} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("rentalProperties", p.id)} />
                    </div>
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
            <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={28} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Rented Properties Added</div>
                <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Add the home or office you rent to track your monthly payments, security deposit recovery, and annual rent paid for HRA claims.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Rent Payment Log", "HRA Claim Support", "Security Deposit", "Landlord Details"].map(f => (
                  <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(219,39,119,0.08)", color: "#db2777", fontWeight: 600, border: "1px solid rgba(219,39,119,0.15)" }}>● {f}</span>
                ))}
              </div>
              <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setModalIn({ open: true, editing: null })}>
                <Plus size={16} /> Add Rented Property
              </button>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {propertiesIn.map((p: any) => (
                <Card key={p.id} style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building2 size={22} color={THEME.rust} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{p.propertyName}</div>
                      <div style={{ fontSize: 13, color: THEME.muted }}>{p.landlordName || "No landlord"} · {fmtINRFull(p.monthlyRent)}/mo</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: THEME.rust }}>
                        {fmtINRFull((p.payments || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Total Paid</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />}
                        onClick={() => setModalIn({ open: true, editing: p })} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("rentedProperties", p.id)} />
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
