// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Users, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
  boxSizing: "border-box",
};

/* ── Shared small helpers ──────────────────────────────────────── */
function fmtINR(n: number) {
  if (!n || isNaN(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/* ══════════════════════════════════════════════════════════════════
   TenantSplitCard  — per-tenant row inside the modal
══════════════════════════════════════════════════════════════════ */
function TenantSplitCard({
  t, idx, onChange, canDelete, onDelete,
}: {
  t: any; idx: number;
  onChange: (updated: any) => void;
  canDelete: boolean; onDelete: () => void;
}) {
  const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"][idx % 5];

  return (
    <div style={{
      border: `1.5px solid ${accentColor}33`,
      borderRadius: 14,
      padding: "16px 16px 12px",
      background: `color-mix(in srgb, ${accentColor} 4%, var(--t-paper))`,
      position: "relative",
      transition: "all 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <User size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
            Tenant {idx + 1}
          </span>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4, borderRadius: 6, display: "flex" }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tenant Name" style={{ marginBottom: 0 }}>
          <input
            style={input}
            value={t.name}
            onChange={(e) => onChange({ ...t, name: e.target.value })}
            placeholder={`e.g. Ramesh Kumar`}
          />
        </Field>
        <Field label="Phone" style={{ marginBottom: 0 }}>
          <input
            style={input}
            value={t.phone}
            onChange={(e) => onChange({ ...t, phone: e.target.value })}
            placeholder="9876543210"
          />
        </Field>
        <Field label="Monthly Rent (₹)" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
          <input
            style={input}
            type="number"
            value={t.monthlyRent}
            onChange={(e) => onChange({ ...t, monthlyRent: e.target.value })}
            placeholder="15000"
          />
        </Field>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RentalPropertyModal  (Rented Out)
══════════════════════════════════════════════════════════════════ */
export function RentalPropertyModal({ initial, onClose, onSave }: any) {
  // Initialise tenants from saved data or default single tenant
  const initTenants = (): any[] => {
    if (initial?.tenants?.length > 0) return initial.tenants;
    if (initial?.tenantName) {
      return [{
        name: initial.tenantName,
        phone: initial.tenantPhone || "",
        monthlyRent: initial.monthlyRent || "",
      }];
    }
    return [{ name: "", phone: "", monthlyRent: "" }];
  };

  const [f, setF] = useState({
    owner: initial?.owner || "self",
    propertyName: initial?.propertyName || "",
    propertyType: initial?.propertyType || "shop",
    securityDeposit: initial?.securityDeposit || "",
    depositReceivedDate: initial?.depositReceivedDate || "",
    agreementStart: initial?.agreementStart || initial?.leaseStart || "",
    agreementEnd: initial?.agreementEnd || initial?.leaseEnd || "",
    isActive: initial?.isActive !== false,
    municipalTax: initial?.municipalTax || "",
  });

  const [tenants, setTenants] = useState<any[]>(initTenants);
  const [tenantCount, setTenantCount] = useState(initTenants().length);

  const isMulti = tenantCount > 1;

  // Sync tenant count changes
  useEffect(() => {
    setTenants((prev) => {
      const next = Array.from({ length: tenantCount }, (_, i) => ({
        name: prev[i]?.name || "",
        phone: prev[i]?.phone || "",
        monthlyRent: prev[i]?.monthlyRent || "",
      }));
      return next;
    });
  }, [tenantCount]);

  const updateTenant = (idx: number, updated: any) => {
    setTenants((prev) => prev.map((t, i) => (i === idx ? updated : t)));
  };

  const deleteTenant = (idx: number) => {
    const next = tenants.filter((_, i) => i !== idx);
    setTenants(next);
    setTenantCount(next.length);
  };

  // Calculate total monthly rent as sum of all tenants
  const totalMonthlyRent = tenants.reduce((s, t) => s + (Number(t.monthlyRent) || 0), 0);

  const handleSave = () => {
    if (!f.propertyName) return;

    // Legacy fields for single tenant compatibility
    const primaryTenant = tenants[0] || {};
    onSave({
      ...f,
      tenants,
      monthlyRent: totalMonthlyRent,
      tenantName: isMulti
        ? tenants.map((t) => t.name || "Unknown").join(", ")
        : primaryTenant.name || "",
      tenantPhone: isMulti ? "" : primaryTenant.phone || "",
    });
  };

  return (
    <Modal title={initial ? "Edit Property" : "Add Rental Property"} onClose={onClose} maxWidth={620}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
            {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Property Name (e.g. Shop at MG Road)" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.propertyName} onChange={(e) => setF({ ...f, propertyName: e.target.value })} placeholder="Shop at ABC Market" />
        </Field>
        <Field label="Property Type">
          <select style={input} value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value })}>
            <option value="shop">Shop / Commercial</option>
            <option value="flat">Flat / Residential</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={input} value={f.isActive ? "active" : "ended"} onChange={(e) => setF({ ...f, isActive: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
        </Field>
        <Field label="Security Deposit Received (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Deposit Received Date">
          <input style={input} type="date" value={f.depositReceivedDate} onChange={(e) => setF({ ...f, depositReceivedDate: e.target.value })} />
        </Field>
        <Field label="Annual Municipal Tax paid by you (₹)" style={{ gridColumn: "1 / -1" }}>
          <input style={input} type="number" value={f.municipalTax} onChange={(e) => setF({ ...f, municipalTax: e.target.value })} placeholder="0 (deducted before 30% std deduction)" />
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: THEME.line, margin: "20px 0" }} />

      {/* ── Tenants Section ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={15} color={THEME.accent} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>Tenant Details</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                How many tenants share this property?
              </div>
            </div>
          </div>

          {/* Count buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setTenantCount(n)}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "none",
                  background: tenantCount === n ? THEME.accent : `color-mix(in srgb, ${THEME.muted} 10%, transparent)`,
                  color: tenantCount === n ? "#fff" : THEME.muted,
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  transition: "all 0.18s",
                  boxShadow: tenantCount === n ? `0 4px 12px color-mix(in srgb, ${THEME.accent} 35%, transparent)` : "none",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Visual total rent banner */}
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 14,
          background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
          border: `1px solid ${THEME.accent}33`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} color={THEME.accent} />
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
              Total Monthly Rent: {fmtINR(totalMonthlyRent)}/mo
            </span>
          </div>
        </div>

        {/* Tenant cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tenants.map((t, i) => (
            <TenantSplitCard
              key={i}
              t={t}
              idx={i}
              onChange={(updated) => updateTenant(i, updated)}
              canDelete={tenants.length > 1}
              onDelete={() => deleteTenant(i)}
            />
          ))}
        </div>

        {/* Add tenant button (up to 5) */}
        {tenants.length < 5 && (
          <button
            onClick={() => setTenantCount((c) => c + 1)}
            style={{
              marginTop: 10, width: "100%", padding: "10px", border: `1.5px dashed ${THEME.accent}55`,
              borderRadius: 10, background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              color: THEME.accent, fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Plus size={14} /> Add Another Tenant
          </button>
        )}
      </div>

      <ModalActions onSave={handleSave} onClose={onClose} saveLabel={initial ? "Update" : "Add Property"} />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RentalReceiptModal
══════════════════════════════════════════════════════════════════ */
export function RentalReceiptModal({ onClose, onSave }: any) {
  const now = new Date();
  const defaultMonth = now.toISOString().slice(0, 7);
  const [f, setF] = useState({ month: defaultMonth, amount: "", date: today(), note: "" });
  return (
    <Modal title="Log Rent Receipt" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Month (YYYY-MM)">
          <input style={input} type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} />
        </Field>
        <Field label="Amount Received (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Date Received">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Note (optional)">
          <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. cash / UPI" />
        </Field>
      </div>
      <ModalActions onSave={() => f.month && Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Log Receipt" />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RentalDeductionModal
══════════════════════════════════════════════════════════════════ */
export function RentalDeductionModal({ onClose, onSave }: any) {
  const [f, setF] = useState({ reason: "", amount: "", date: today() });
  return (
    <Modal title="Add Deposit Deduction" onClose={onClose}>
      <Field label="Reason">
        <input style={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Painting, Repair, Cleaning" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="5000" />
        </Field>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.reason && Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Add Deduction" />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HELPER — build a blank landlord entry
══════════════════════════════════════════════════════════════════ */
function blankLandlord(idx: number) {
  return { name: "", phone: "", pan: "", splitPct: 0, label: `Landlord ${idx + 1}` };
}

function buildEqualSplits(count: number) {
  const base = Math.floor(100 / count);
  const rem  = 100 - base * count;
  return Array.from({ length: count }, (_, i) => ({
    ...blankLandlord(i),
    splitPct: i === 0 ? base + rem : base,
  }));
}

/* ══════════════════════════════════════════════════════════════════
   LandlordSplitCard  — per-landlord row inside the modal
══════════════════════════════════════════════════════════════════ */
function LandlordSplitCard({
  ll, idx, monthlyRent, onChange, canDelete, onDelete,
}: {
  ll: any; idx: number; monthlyRent: number;
  onChange: (updated: any) => void;
  canDelete: boolean; onDelete: () => void;
}) {
  const share = (Number(ll.splitPct) / 100) * monthlyRent;
  const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"][idx % 5];

  return (
    <div style={{
      border: `1.5px solid ${accentColor}33`,
      borderRadius: 14,
      padding: "16px 16px 12px",
      background: `color-mix(in srgb, ${accentColor} 4%, var(--t-paper))`,
      position: "relative",
      transition: "all 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <User size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
            Landlord {idx + 1}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Monthly share badge */}
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: accentColor + "18", color: accentColor,
          }}>
            {fmtINR(share)}/mo
          </span>
          {canDelete && (
            <button
              onClick={onDelete}
              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4, borderRadius: 6, display: "flex" }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Landlord Name" style={{ marginBottom: 0 }}>
          <input
            style={input}
            value={ll.name}
            onChange={(e) => onChange({ ...ll, name: e.target.value })}
            placeholder={`e.g. Suresh Mehta`}
          />
        </Field>
        <Field label="Phone" style={{ marginBottom: 0 }}>
          <input
            style={input}
            value={ll.phone}
            onChange={(e) => onChange({ ...ll, phone: e.target.value })}
            placeholder="9876543210"
          />
        </Field>
        <Field label="PAN (for HRA)" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
          <input
            style={{ ...input, textTransform: "uppercase", letterSpacing: "0.05em" }}
            value={ll.pan}
            onChange={(e) => onChange({ ...ll, pan: e.target.value.toUpperCase() })}
            placeholder="ABCDE1234F (required if rent > ₹1L/yr)"
            maxLength={10}
          />
        </Field>
      </div>

      {/* Split % slider */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rent Split
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: accentColor }}>
            {ll.splitPct}%
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={99}
          value={ll.splitPct}
          onChange={(e) => onChange({ ...ll, splitPct: Number(e.target.value) })}
          style={{
            width: "100%",
            accentColor,
            cursor: "pointer",
            height: 4,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 3 }}>
          <span>1%</span>
          <span>50%</span>
          <span>99%</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RentedInPropertyModal  — MAIN (with multi-landlord support)
══════════════════════════════════════════════════════════════════ */
export function RentedInPropertyModal({ initial, onClose, onSave }: any) {

  // Initialise landlords from saved data or default single landlord
  const initLandlords = (): any[] => {
    if (initial?.landlords?.length > 0) return initial.landlords;
    if (initial?.landlordName) {
      return [{
        name: initial.landlordName,
        phone: initial.landlordPhone || "",
        pan: initial.landlordPan || "",
        splitPct: 100,
      }];
    }
    return [{ name: "", phone: "", pan: "", splitPct: 100 }];
  };

  const [f, setF] = useState({
    owner: initial?.owner || "self",
    propertyName: initial?.propertyName || "",
    monthlyRent: initial?.monthlyRent || "",
    securityDeposit: initial?.securityDeposit || "",
    depositPaidDate: initial?.depositPaidDate || "",
    agreementStart: initial?.agreementStart || "",
    agreementEnd: initial?.agreementEnd || "",
    isActive: initial?.isActive !== false,
  });

  const [landlords, setLandlords] = useState<any[]>(initLandlords);
  const [landlordCount, setLandlordCount] = useState(initLandlords().length);

  const monthlyRent = Number(f.monthlyRent) || 0;
  const totalPct = landlords.reduce((s, l) => s + Number(l.splitPct || 0), 0);
  const pctValid = totalPct === 100;
  const isMulti = landlordCount > 1;

  // When landlord count changes, rebuild the array with equal splits
  useEffect(() => {
    setLandlords((prev) => {
      const next = buildEqualSplits(landlordCount);
      // Preserve existing data for indices that already existed
      return next.map((n, i) => ({
        ...n,
        name: prev[i]?.name || "",
        phone: prev[i]?.phone || "",
        pan: prev[i]?.pan || "",
      }));
    });
  }, [landlordCount]);

  const updateLandlord = (idx: number, updated: any) => {
    setLandlords((prev) => prev.map((l, i) => (i === idx ? updated : l)));
  };

  const deleteLandlord = (idx: number) => {
    const next = landlords.filter((_, i) => i !== idx);
    // Redistribute removed share equally
    const removed = landlords[idx].splitPct;
    const perOther = Math.floor(removed / next.length);
    const rem = removed - perOther * next.length;
    const rebalanced = next.map((l, i) => ({ ...l, splitPct: l.splitPct + perOther + (i === 0 ? rem : 0) }));
    setLandlords(rebalanced);
    setLandlordCount(rebalanced.length);
  };

  const equalise = () => {
    const base = Math.floor(100 / landlords.length);
    const rem  = 100 - base * landlords.length;
    setLandlords((prev) => prev.map((l, i) => ({ ...l, splitPct: i === 0 ? base + rem : base })));
  };

  const handleSave = () => {
    if (!f.propertyName) return;
    if (isMulti && !pctValid) return;

    // Backwards-compat: keep single landlord flat fields too
    const primaryLandlord = landlords[0] || {};
    onSave({
      ...f,
      landlords,
      // Legacy flat fields (single-landlord compatible)
      landlordName: isMulti
        ? landlords.map((l) => l.name || "Unknown").join(", ")
        : primaryLandlord.name || "",
      landlordPhone: isMulti ? "" : primaryLandlord.phone || "",
      landlordPan: isMulti ? "" : primaryLandlord.pan || "",
    });
  };

  return (
    <Modal
      title={initial ? "Edit Rented Property" : "Add Rented Property"}
      onClose={onClose}
      maxWidth={620}
    >
      {/* ── Basic property fields ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
            {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Property / Address" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.propertyName} onChange={(e) => setF({ ...f, propertyName: e.target.value })} placeholder="e.g. Flat 4B, Green Park" />
        </Field>
        <Field label="Total Monthly Rent (₹)">
          <input style={input} type="number" value={f.monthlyRent} onChange={(e) => setF({ ...f, monthlyRent: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Security Deposit Paid (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Deposit Paid Date">
          <input style={input} type="date" value={f.depositPaidDate} onChange={(e) => setF({ ...f, depositPaidDate: e.target.value })} />
        </Field>
        <Field label="Status">
          <select style={input} value={f.isActive ? "active" : "ended"} onChange={(e) => setF({ ...f, isActive: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="ended">Ended / Vacated</option>
          </select>
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: THEME.line, margin: "20px 0" }} />

      {/* ── Landlord count selector ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={15} color={THEME.accent} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>Landlord Details</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                How many landlords share this property?
              </div>
            </div>
          </div>

          {/* Count buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setLandlordCount(n)}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "none",
                  background: landlordCount === n ? THEME.accent : `color-mix(in srgb, ${THEME.muted} 10%, transparent)`,
                  color: landlordCount === n ? "#fff" : THEME.muted,
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  transition: "all 0.18s",
                  boxShadow: landlordCount === n ? `0 4px 12px color-mix(in srgb, ${THEME.accent} 35%, transparent)` : "none",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Split validation bar (only shown for multi-landlord) */}
        {isMulti && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
            background: pctValid
              ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
              : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `1px solid ${pctValid ? THEME.sage : THEME.rust}33`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {pctValid
                ? <CheckCircle2 size={15} color={THEME.sage} />
                : <AlertCircle size={15} color={THEME.rust} />}
              <span style={{ fontSize: 12, fontWeight: 700, color: pctValid ? THEME.sage : THEME.rust }}>
                {pctValid
                  ? `Split balanced — total ${totalPct}%`
                  : `Splits must total 100% (currently ${totalPct}%)`}
              </span>
            </div>
            <button
              onClick={equalise}
              style={{
                padding: "4px 10px", borderRadius: 6, border: `1px solid ${THEME.accent}44`,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                color: THEME.accent, fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}
            >
              Auto-equalise
            </button>
          </div>
        )}

        {/* Visual split bar */}
        {isMulti && monthlyRent > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 2 }}>
              {landlords.map((ll, i) => {
                const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"][i % 5];
                return (
                  <div
                    key={i}
                    style={{
                      flex: Number(ll.splitPct) || 0,
                      background: accentColor,
                      transition: "flex 0.3s ease",
                      borderRadius: i === 0 ? "99px 0 0 99px" : i === landlords.length - 1 ? "0 99px 99px 0" : 0,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
              {landlords.map((ll, i) => {
                const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, "#A78BFA"][i % 5];
                return (
                  <span key={i} style={{ fontSize: 11, fontWeight: 700, color: accentColor, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, display: "inline-block" }} />
                    {ll.name || `Landlord ${i + 1}`}: {fmtINR((Number(ll.splitPct) / 100) * monthlyRent)}/mo
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Landlord cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {landlords.map((ll, i) => (
            <LandlordSplitCard
              key={i}
              ll={ll}
              idx={i}
              monthlyRent={monthlyRent}
              onChange={(updated) => updateLandlord(i, updated)}
              canDelete={landlords.length > 1}
              onDelete={() => deleteLandlord(i)}
            />
          ))}
        </div>

        {/* Add landlord button (up to 5) */}
        {landlords.length < 5 && (
          <button
            onClick={() => setLandlordCount((c) => c + 1)}
            style={{
              marginTop: 10, width: "100%", padding: "10px", border: `1.5px dashed ${THEME.accent}55`,
              borderRadius: 10, background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              color: THEME.accent, fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Plus size={14} /> Add Another Landlord
          </button>
        )}
      </div>

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={initial ? "Update" : "Add Property"}
        disabled={isMulti && !pctValid}
      />
    </Modal>
  );
}
