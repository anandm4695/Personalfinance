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
import { EmptyState } from "../ui/EmptyState";
import { RentalPropertyModal, RentedInPropertyModal, RentalReceiptModal, RentalDeductionModal } from "../modals/RentalModals";

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

  // Ledger state
  const [expandedLedger, setExpandedLedger] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState<{ type: "payment" | "receipt" | "deduction"; property: any } | null>(null);

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

  // Payment, Receipt, and Deduction Handlers
  const handleAddPayment = (p: any, paymentData: any) => {
    const updatedPayments = [...(p.payments || []), { ...paymentData, id: Math.random().toString(36).substr(2, 9) }];
    updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
    setShowLogModal(null);
  };

  const handleRemovePayment = (p: any, paymentId: string) => {
    const updatedPayments = (p.payments || []).filter((pay: any) => pay.id !== paymentId);
    updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
  };

  const handleAddReceipt = (p: any, receiptData: any) => {
    const updatedReceipts = [...(p.receipts || []), { ...receiptData, id: Math.random().toString(36).substr(2, 9) }];
    updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
    setShowLogModal(null);
  };

  const handleRemoveReceipt = (p: any, receiptId: string) => {
    const updatedReceipts = (p.receipts || []).filter((rec: any) => rec.id !== receiptId);
    updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
  };

  const handleAddDeduction = (p: any, deductionData: any) => {
    const updatedDeductions = [...(p.depositDeductions || []), { ...deductionData, id: Math.random().toString(36).substr(2, 9) }];
    updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
    setShowLogModal(null);
  };

  const handleRemoveDeduction = (p: any, deductionId: string) => {
    const updatedDeductions = (p.depositDeductions || []).filter((dec: any) => dec.id !== deductionId);
    updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
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
            <EmptyState
              icon={Building2}
              gradient="linear-gradient(135deg,#059669 0%,#34d399 100%)"
              dotColor="#059669"
              title="No Properties Rented Out"
              description="Add your shop, flat, or commercial space to track monthly rent receipts, security deposits, and taxable income under IHP."
              pills={["Rent Receipt Ledger", "Security Deposit", "Taxable IHP Income", "Tenant Tracking"]}
              buttonLabel="Add Property"
              onAdd={() => setModalOut({ open: true, editing: null })}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              {propertiesOut.map((p: any) => (
                <Card key={p.id} style={{ padding: "18px 20px", borderLeft: `3px solid ${THEME.accent}`, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Icon Box */}
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center" 
                    }}>
                      <Building2 size={22} color={THEME.accent} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{p.propertyName}</div>
                          <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                            {/* Show tenant name(s) */}
                            {p.tenants && p.tenants.length > 1
                              ? <span>{p.tenants.length} Tenants</span>
                              : <span>{p.tenantName || p.tenants?.[0]?.name || "Vacant"}</span>
                            }
                            {" · "}
                            <span style={{ color: THEME.accent }}>{fmtINRFull(p.monthlyRent)}/mo</span>
                          </div>
                          {/* Multi-tenant split pills */}
                          {p.tenants && p.tenants.length > 1 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                              {p.tenants.map((t: any, ti: number) => {
                                const splitColors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"];
                                const col = splitColors[ti % 5];
                                return (
                                  <span key={ti} style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    padding: "3px 8px", borderRadius: 99,
                                    background: col + "14", color: col,
                                    fontSize: 11, fontWeight: 700,
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                                    {t.name || `T${ti + 1}`}: {fmtINRFull(t.monthlyRent)}/mo
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button variant="ghost" size="sm" onClick={() => setModalOut({ open: true, editing: p })} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("rentalProperties", p.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>FY Received</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.sage }}>
                            {fmtINRFull((p.receipts || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Deposit Held</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.gold }}>
                            {fmtINRFull(Math.max(0, Number(p.securityDeposit || 0) - (p.depositReturned || 0)))}
                          </div>
                        </div>
                      </div>

                      {/* Expansion trigger */}
                      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          onClick={() => setExpandedLedger(expandedLedger === p.id ? null : p.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 800, color: THEME.accent,
                            display: "inline-flex", alignItems: "center", gap: 6, padding: 0
                          }}
                        >
                          <Receipt size={14} />
                          {expandedLedger === p.id ? "Hide Receipt Ledger" : "View Receipt Ledger"}
                        </button>
                      </div>

                      {/* Expanded Ledger Section */}
                      {expandedLedger === p.id && (
                        <div style={{ 
                          marginTop: 16, borderTop: `1px solid ${THEME.line}`, paddingTop: 14,
                          animation: "fade-in 0.25s ease"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>Logged Receipts</span>
                            <Button 
                              variant="accent" 
                              size="sm" 
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              onClick={() => setShowLogModal({ type: "receipt", property: p })}
                            >
                              <Plus size={10} style={{ marginRight: 4 }} /> Log Rent
                            </Button>
                          </div>

                          {(p.receipts || []).length === 0 ? (
                            <div style={{ textAlign: "center", padding: "16px 0", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                              No rent receipts logged yet.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.receipts || []).map((r: any) => (
                                <div key={r.id} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "8px 12px", borderRadius: 8, background: "rgba(128,128,128,0.03)",
                                  border: `1px solid ${THEME.line}`
                                }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                                      {r.month} {r.note && <span style={{ color: THEME.muted, fontWeight: 600 }}>({r.note})</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Received: {r.date}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>+{fmtINRFull(r.amount)}</span>
                                    <button
                                      onClick={() => handleRemoveReceipt(p, r.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── Divider between Receipts & Deductions ── */}
                          <div style={{ height: 1, background: THEME.line, margin: "16px 0" }} />

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>Deposit Deductions</span>
                            <Button 
                              variant="accent" 
                              size="sm" 
                              style={{ padding: "4px 10px", fontSize: 11, background: THEME.gold }}
                              onClick={() => setShowLogModal({ type: "deduction", property: p })}
                            >
                              <Plus size={10} style={{ marginRight: 4 }} /> Add Deduction
                            </Button>
                          </div>

                          {(p.depositDeductions || []).length === 0 ? (
                            <div style={{ textAlign: "center", padding: "16px 0", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                              No deposit deductions logged.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.depositDeductions || []).map((r: any) => (
                                <div key={r.id} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "8px 12px", borderRadius: 8, background: "rgba(128,128,128,0.03)",
                                  border: `1px solid ${THEME.line}`
                                }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>{r.reason}</div>
                                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Date: {r.date}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>-{fmtINRFull(r.amount)}</span>
                                    <button
                                      onClick={() => handleRemoveDeduction(p, r.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
            <EmptyState
              icon={Building2}
              gradient="linear-gradient(135deg,#db2777 0%,#f472b6 100%)"
              dotColor="#db2777"
              title="No Rented Properties Added"
              description="Add the home or office you rent to track your monthly payments, security deposit recovery, and annual rent paid for HRA claims."
              pills={["Rent Payment Log", "HRA Claim Support", "Security Deposit", "Landlord Details"]}
              buttonLabel="Add Rented Property"
              onAdd={() => setModalIn({ open: true, editing: null })}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              {propertiesIn.map((p: any) => (
                <Card key={p.id} style={{ padding: "18px 20px", borderLeft: `3px solid ${THEME.rust}`, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Icon Box */}
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center" 
                    }}>
                      <Building2 size={22} color={THEME.rust} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{p.propertyName}</div>
                          <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                            {/* Show landlord name(s) */}
                            {p.landlords && p.landlords.length > 1
                              ? <span>{p.landlords.length} Landlords</span>
                              : <span>{p.landlordName || p.landlords?.[0]?.name || "Unknown Landlord"}</span>
                            }
                            {" · "}
                            <span style={{ color: THEME.rust }}>{fmtINRFull(p.monthlyRent)}/mo</span>
                          </div>
                          {/* Multi-landlord split pills */}
                          {p.landlords && p.landlords.length > 1 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                              {p.landlords.map((ll: any, li: number) => {
                                const splitColors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"];
                                const col = splitColors[li % 5];
                                const share = Math.round((Number(ll.splitPct) / 100) * Number(p.monthlyRent));
                                return (
                                  <span key={li} style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    padding: "3px 8px", borderRadius: 99,
                                    background: col + "14", color: col,
                                    fontSize: 11, fontWeight: 700,
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                                    {ll.name || `L${li + 1}`}: ₹{share.toLocaleString("en-IN")}/mo ({ll.splitPct}%)
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button variant="ghost" size="sm" onClick={() => setModalIn({ open: true, editing: p })} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("rentedProperties", p.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>FY Paid</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.rust }}>
                            {fmtINRFull((p.payments || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Deposit Paid</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.sage }}>
                            {fmtINRFull(Math.max(0, Number(p.securityDeposit || 0) - (p.depositReturned || 0)))}
                          </div>
                        </div>
                      </div>

                      {/* Expansion trigger */}
                      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          onClick={() => setExpandedLedger(expandedLedger === p.id ? null : p.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 800, color: THEME.rust,
                            display: "inline-flex", alignItems: "center", gap: 6, padding: 0
                          }}
                        >
                          <Receipt size={14} />
                          {expandedLedger === p.id ? "Hide Payment Ledger" : "View Payment Ledger"}
                        </button>
                      </div>

                      {/* Expanded Ledger Section */}
                      {expandedLedger === p.id && (
                        <div style={{ 
                          marginTop: 16, borderTop: `1px solid ${THEME.line}`, paddingTop: 14,
                          animation: "fade-in 0.25s ease"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>Logged Payments</span>
                            <Button 
                              variant="accent" 
                              size="sm" 
                              style={{ padding: "4px 10px", fontSize: 11, background: THEME.rust }}
                              onClick={() => setShowLogModal({ type: "payment", property: p })}
                            >
                              <Plus size={10} style={{ marginRight: 4 }} /> Log Rent
                            </Button>
                          </div>

                          {(p.payments || []).length === 0 ? (
                            <div style={{ textAlign: "center", padding: "16px 0", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                              No rent payments logged yet.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.payments || []).map((r: any) => (
                                <div key={r.id} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "8px 12px", borderRadius: 8, background: "rgba(128,128,128,0.03)",
                                  border: `1px solid ${THEME.line}`
                                }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                                      {r.month} {r.note && <span style={{ color: THEME.muted, fontWeight: 600 }}>({r.note})</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Paid: {r.date}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>-{fmtINRFull(r.amount)}</span>
                                    <button
                                      onClick={() => handleRemovePayment(p, r.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2, display: "flex" }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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

      {/* Log Payment Modal (Rented In) */}
      {showLogModal && showLogModal.type === "payment" && (
        <RentalReceiptModal
          title="Log Rent Payment"
          amountLabel="Amount Paid (₹)"
          saveLabel="Log Payment"
          onClose={() => setShowLogModal(null)}
          onSave={(data) => handleAddPayment(showLogModal.property, data)}
        />
      )}

      {/* Log Receipt Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "receipt" && (
        <RentalReceiptModal
          title="Log Rent Receipt"
          amountLabel="Amount Received (₹)"
          saveLabel="Log Receipt"
          onClose={() => setShowLogModal(null)}
          onSave={(data) => handleAddReceipt(showLogModal.property, data)}
        />
      )}

      {/* Log Deduction Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "deduction" && (
        <RentalDeductionModal
          onClose={() => setShowLogModal(null)}
          onSave={(data) => handleAddDeduction(showLogModal.property, data)}
        />
      )}
    </div>
  );
};
