// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Home,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  IndianRupee,
  Building2,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINR, today } from "../../utils/finance";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--t-line)",
  background: "var(--surface-0)",
  color: "var(--t-ink)",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box" as const,
};

// Use literal hex strings so appending 2-digit hex alpha (e.g. "18") produces
// valid 8-character hex colors. Never append alpha to CSS var() strings.
const STATUS_HEX: Record<string, string> = {
  owned: "#22c55e",
  sold: "#ef4444",
  "under-construction": "#f59e0b",
};

const DEMAND_HEX: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#22c55e",
  partial: "#6366f1",
  overdue: "#ef4444",
};

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
  plot: "Plot",
  villa: "Villa",
  other: "Other",
};

// ─── Shared card shell ────────────────────────────────────────────────────────
// Inline card style avoids the Card/spotlight-wrapper component so we get a clean
// border without any hover-lift or ::before overlay artifacts.
const cardShell: React.CSSProperties = {
  background: "var(--surface-0)",
  border: "1px solid var(--t-line)",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  overflow: "hidden",
  marginBottom: 16,
};

// ─── Property Modal ──────────────────────────────────────────────────────────

function PropertyModal({ existing, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      name: "",
      type: "residential",
      status: "owned",
      location: "",
      developerName: "",
      sellerName: "",
      reraNumber: "",
      areaSqft: "",
      purchaseDate: today(),
      registrationDate: "",
      possessionDate: "",
      agreementValue: "",
      stampDuty: "",
      tdsValue: "",
      marketValue: "",
      saleDate: "",
      salePrice: "",
      saleStampDuty: "",
      saleTds: "",
      notes: "",
    }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  return (
    <Modal title={isEdit ? "Edit Property" : "Add Property"} onClose={onClose} maxWidth={640}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Property Name *" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flat 4B, Lodha Palava" />
        </Field>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="plot">Plot</option>
            <option value="villa">Villa</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="owned">Owned</option>
            <option value="under-construction">Under Construction</option>
            <option value="sold">Sold</option>
          </select>
        </Field>
        <Field label="Location" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="City / area" />
        </Field>
        <Field label="Developer / Builder Name">
          <input style={input} value={f.developerName} onChange={(e) => set("developerName", e.target.value)} />
        </Field>
        <Field label="Seller Name">
          <input style={input} value={f.sellerName} onChange={(e) => set("sellerName", e.target.value)} />
        </Field>
        <Field label="RERA Number">
          <input style={input} value={f.reraNumber} onChange={(e) => set("reraNumber", e.target.value)} />
        </Field>
        <Field label="Area (sq ft)">
          <input style={input} type="number" value={f.areaSqft} onChange={(e) => set("areaSqft", e.target.value)} />
        </Field>
      </div>

      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Key Dates</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Purchase Date">
          <input style={input} type="date" value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
        </Field>
        <Field label="Registration Date">
          <input style={input} type="date" value={f.registrationDate} onChange={(e) => set("registrationDate", e.target.value)} />
        </Field>
        <Field label="Possession Date">
          <input style={input} type="date" value={f.possessionDate} onChange={(e) => set("possessionDate", e.target.value)} />
        </Field>
      </div>

      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Financials (Purchase)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Agreement Value (₹)">
          <input style={input} type="number" value={f.agreementValue} onChange={(e) => set("agreementValue", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Stamp Duty (₹)">
          <input style={input} type="number" value={f.stampDuty} onChange={(e) => set("stampDuty", e.target.value)} placeholder="0" />
        </Field>
        <Field label="TDS (₹)">
          <input style={input} type="number" value={f.tdsValue} onChange={(e) => set("tdsValue", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Current Market Value (₹)">
          <input style={input} type="number" value={f.marketValue} onChange={(e) => set("marketValue", e.target.value)} placeholder="0" />
        </Field>
      </div>

      {f.status === "sold" && (
        <>
          <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Sale Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sale Date">
              <input style={input} type="date" value={f.saleDate} onChange={(e) => set("saleDate", e.target.value)} />
            </Field>
            <Field label="Sale Price (₹)">
              <input style={input} type="number" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Sale Stamp Duty (₹)">
              <input style={input} type="number" value={f.saleStampDuty} onChange={(e) => set("saleStampDuty", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Sale TDS (₹)">
              <input style={input} type="number" value={f.saleTds} onChange={(e) => set("saleTds", e.target.value)} placeholder="0" />
            </Field>
          </div>
        </>
      )}

      <Field label="Notes" style={{ marginTop: 12 }}>
        <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      <ModalActions onSave={() => f.name && onSave(f)} onClose={onClose} saveLabel={isEdit ? "Save Changes" : "Add Property"} />
    </Modal>
  );
}

// ─── Demand Modal ─────────────────────────────────────────────────────────────

function DemandModal({ existing, propertyName, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      demandDate: today(),
      dueDate: "",
      milestone: "",
      amount: "",
      gstAmount: "",
      totalAmount: "",
      status: "pending",
      notes: "",
    }
  );
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const computedTotal = (Number(f.amount) || 0) + (Number(f.gstAmount) || 0);

  return (
    <Modal title={isEdit ? "Edit Demand Letter" : `Add Demand — ${propertyName}`} onClose={onClose} maxWidth={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Demand Date">
          <input style={input} type="date" value={f.demandDate} onChange={(e) => set("demandDate", e.target.value)} />
        </Field>
        <Field label="Due Date">
          <input style={input} type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>
        <Field label="Milestone / Description" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.milestone} onChange={(e) => set("milestone", e.target.value)} placeholder="e.g. Plinth Work Completion" />
        </Field>
        <Field label="Demand Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
        </Field>
        <Field label="GST Amount (₹)">
          <input style={input} type="number" value={f.gstAmount} onChange={(e) => set("gstAmount", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Total Amount (₹)">
          <input
            style={{ ...input, background: "var(--surface-1)", color: THEME.accent, fontWeight: 700 }}
            type="number"
            value={f.totalAmount || computedTotal || ""}
            onChange={(e) => set("totalAmount", e.target.value)}
            placeholder={computedTotal ? String(computedTotal) : "Auto-calculated"}
          />
        </Field>
        <Field label="Status">
          <select style={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </Field>
        <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
          <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
      <ModalActions
        onSave={() => onSave({ ...f, totalAmount: f.totalAmount || computedTotal || f.amount })}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add Demand"}
      />
    </Modal>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ existing, propertyName, demands, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      paymentDate: today(),
      amount: "",
      paymentMode: "NEFT",
      referenceNumber: "",
      demandId: "",
      note: "",
    }
  );
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  return (
    <Modal title={isEdit ? "Edit Payment" : `Record Payment — ${propertyName}`} onClose={onClose} maxWidth={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Payment Date">
          <input style={input} type="date" value={f.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} />
        </Field>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Payment Mode">
          <select style={input} value={f.paymentMode} onChange={(e) => set("paymentMode", e.target.value)}>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="DD">Demand Draft</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Reference / UTR Number">
          <input style={input} value={f.referenceNumber} onChange={(e) => set("referenceNumber", e.target.value)} placeholder="UTR / Cheque no." />
        </Field>
        {demands.length > 0 && (
          <Field label="Link to Demand Letter (optional)" style={{ gridColumn: "1 / -1" }}>
            <select style={input} value={f.demandId} onChange={(e) => set("demandId", e.target.value)}>
              <option value="">— Not linked —</option>
              {demands.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.milestone || "Demand"} — {fmtDate(d.demandDate)} — ₹{Number(d.totalAmount || d.amount || 0).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Note" style={{ gridColumn: "1 / -1" }}>
          <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={f.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.amount && onSave(f)}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Record Payment"}
      />
    </Modal>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  demands,
  payments,
  onEditProperty,
  onDeleteProperty,
  onAddDemand,
  onEditDemand,
  onDeleteDemand,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}: any) {
  const [expanded, setExpanded] = useState(false);

  const totalDemanded = demands.reduce((s: number, d: any) => s + Number(d.totalAmount || d.amount || 0), 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const outstanding = Math.max(0, totalDemanded - totalPaid);
  const paidPct = totalDemanded > 0 ? Math.min(100, (totalPaid / totalDemanded) * 100) : 0;
  const totalCost =
    Number(property.agreementValue || 0) +
    Number(property.stampDuty || 0) +
    Number(property.tdsValue || 0);
  const statusHex = STATUS_HEX[property.status] || "#6366f1";
  const gain = Number(property.marketValue || 0) - totalCost;

  // All table cell borders use CSS variable directly (valid CSS, not "var(...)44" which is invalid)
  const divider = "1px solid var(--t-line)";
  const th: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: THEME.muted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    textAlign: "left" as const,
    borderBottom: divider,
    whiteSpace: "nowrap" as const,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 500,
    color: THEME.ink,
    borderBottom: divider,
    verticalAlign: "middle" as const,
  };

  return (
    <div style={cardShell}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: divider, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>{property.name}</span>
            {/* Status badge — uses hex so appending "28" gives valid 8-digit hex color */}
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: statusHex,
              background: statusHex + "22",
              padding: "2px 8px", borderRadius: 20, textTransform: "uppercase",
            }}>
              {property.status === "under-construction" ? "Under Const." : property.status}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: THEME.muted,
              background: "var(--surface-1)",
              padding: "2px 8px", borderRadius: 20,
            }}>
              {TYPE_LABELS[property.type] || property.type}
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {property.location && (
              <span style={{ fontSize: 12, color: THEME.muted, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={11} /> {property.location}
              </span>
            )}
            {property.developerName && (
              <span style={{ fontSize: 12, color: THEME.muted, display: "flex", alignItems: "center", gap: 4 }}>
                <Building2 size={11} /> {property.developerName}
              </span>
            )}
            {property.purchaseDate && (
              <span style={{ fontSize: 12, color: THEME.muted, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} /> {fmtDate(property.purchaseDate)}
              </span>
            )}
            {property.areaSqft && (
              <span style={{ fontSize: 12, color: THEME.muted }}>{Number(property.areaSqft).toLocaleString("en-IN")} sq ft</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEditProperty(property)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 6, borderRadius: 6 }}>
            <Pencil size={14} />
          </button>
          <button onClick={() => onDeleteProperty(property.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 6, borderRadius: 6 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Financials grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: divider }}>
        {[
          { label: "Agreement Value", value: property.agreementValue, color: THEME.accent },
          { label: "Stamp Duty", value: property.stampDuty, color: "#f59e0b" },
          { label: "TDS Paid", value: property.tdsValue, color: "#8b5cf6" },
          { label: "Market Value", value: property.marketValue, color: "#22c55e" },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{
            padding: "12px 16px",
            borderRight: i < 3 ? divider : "none",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: value ? color : THEME.muted }}>
              <Prv>{value ? fmtINR(Number(value)) : "—"}</Prv>
            </div>
          </div>
        ))}
      </div>

      {/* Gain/Loss */}
      {property.marketValue && totalCost > 0 && (
        <div style={{
          padding: "8px 20px",
          borderBottom: divider,
          // Valid CSS: literal rgba values, no CSS variable alpha appending
          background: gain >= 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: gain >= 0 ? "#22c55e" : "#ef4444" }}>
            {gain >= 0 ? "▲" : "▼"} Unrealised {gain >= 0 ? "Gain" : "Loss"}: <Prv>{fmtINRFull(Math.abs(gain))}</Prv>
          </span>
          <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 8 }}>
            (Total cost: <Prv>{fmtINRFull(totalCost)}</Prv>)
          </span>
        </div>
      )}

      {/* Payment progress — only shown when demands exist */}
      {totalDemanded > 0 && (
        <div style={{ padding: "12px 20px", borderBottom: divider }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
              Payment Progress — {demands.length} demand{demands.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>
              <Prv>{fmtINR(totalPaid)}</Prv> paid of <Prv>{fmtINR(totalDemanded)}</Prv>
            </span>
          </div>
          <div style={{ height: 6, background: "var(--surface-1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${paidPct}%`,
              background: paidPct >= 100 ? "#22c55e" : THEME.accent,
              borderRadius: 3,
              transition: "width 0.4s",
            }} />
          </div>
          {outstanding > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
              Outstanding: <Prv>{fmtINRFull(outstanding)}</Prv>
            </div>
          )}
        </div>
      )}

      {/* Expand / Collapse toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 20px",
          background: "none",
          border: "none",
          borderBottom: expanded ? divider : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 700,
          color: THEME.accent,
        }}
      >
        <span>
          {demands.length} demand letter{demands.length !== 1 ? "s" : ""} · {payments.length} payment{payments.length !== 1 ? "s" : ""}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div>
          {/* Demand Letters */}
          <div style={{ padding: "14px 20px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={13} color={THEME.accent} />
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Demand Letters</span>
              </div>
              <Button variant="accent" icon={<Plus size={12} />} onClick={() => onAddDemand(property)}>
                Add Demand
              </Button>
            </div>
            {demands.length === 0 ? (
              <div style={{ fontSize: 12, color: THEME.muted, padding: "8px 0", fontStyle: "italic" }}>No demand letters recorded yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {["Date", "Due Date", "Milestone", "Amount", "GST", "Total", "Status", ""].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demands
                      .slice()
                      .sort((a: any, b: any) => (a.demandDate > b.demandDate ? -1 : 1))
                      .map((d: any) => {
                        const dHex = DEMAND_HEX[d.status] || "#94a3b8";
                        return (
                          <tr key={d.id} style={{ background: "var(--surface-0)" }}>
                            <td style={td}>{fmtDate(d.demandDate)}</td>
                            <td style={td}>{fmtDate(d.dueDate)}</td>
                            <td style={{ ...td, fontWeight: 600 }}>{d.milestone || "—"}</td>
                            <td style={{ ...td, textAlign: "right" }}>
                              <Prv>{d.amount ? fmtINR(Number(d.amount)) : "—"}</Prv>
                            </td>
                            <td style={{ ...td, textAlign: "right" }}>
                              <Prv>{d.gstAmount ? fmtINR(Number(d.gstAmount)) : "—"}</Prv>
                            </td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.accent }}>
                              <Prv>{d.totalAmount ? fmtINR(Number(d.totalAmount)) : "—"}</Prv>
                            </td>
                            <td style={td}>
                              {/* Use literal hex so + "22" gives a valid 8-digit hex color */}
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: dHex,
                                background: dHex + "22",
                                padding: "2px 8px", borderRadius: 20, textTransform: "capitalize",
                              }}>
                                {d.status}
                              </span>
                            </td>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button onClick={() => onEditDemand(d)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 2 }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => onDeleteDemand(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2 }}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments */}
          <div style={{ padding: "14px 20px 16px", borderTop: divider }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={13} color="#22c55e" />
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Payments</span>
              </div>
              <Button variant="ghost" icon={<Plus size={12} />} onClick={() => onAddPayment(property)}>
                Record Payment
              </Button>
            </div>
            {payments.length === 0 ? (
              <div style={{ fontSize: 12, color: THEME.muted, padding: "8px 0", fontStyle: "italic" }}>No payments recorded yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {["Date", "Amount", "Mode", "Reference", "Linked Demand", "Note", ""].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .slice()
                      .sort((a: any, b: any) => (a.paymentDate > b.paymentDate ? -1 : 1))
                      .map((p: any) => {
                        const linked = demands.find((d: any) => d.id === p.demandId);
                        return (
                          <tr key={p.id} style={{ background: "var(--surface-0)" }}>
                            <td style={td}>{fmtDate(p.paymentDate)}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "#22c55e" }}>
                              <Prv>+{fmtINR(Number(p.amount))}</Prv>
                            </td>
                            <td style={td}>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: THEME.accent,
                                background: "rgba(99,102,241,0.1)",
                                padding: "2px 8px", borderRadius: 20,
                              }}>
                                {p.paymentMode}
                              </span>
                            </td>
                            <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{p.referenceNumber || "—"}</td>
                            <td style={{ ...td, fontSize: 11, color: THEME.muted }}>{linked ? (linked.milestone || fmtDate(linked.demandDate)) : "—"}</td>
                            <td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button onClick={() => onEditPayment(p)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 2 }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => onDeletePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2 }}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(34,197,94,0.06)" }}>
                      <td style={{ ...td, fontWeight: 800, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Total</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 900, color: "#22c55e" }}>
                        <Prv>{fmtINRFull(totalPaid)}</Prv>
                      </td>
                      <td colSpan={5} style={{ borderBottom: divider }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface RealEstateTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
}

export function RealEstateTab({ state, addItem, removeItem, updateItem }: RealEstateTabProps) {
  const properties: any[] = state.realEstateProperties || [];
  const demands: any[] = state.realEstateDemands || [];
  const payments: any[] = state.realEstatePayments || [];

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editProperty, setEditProperty] = useState<any>(null);
  const [demandForProperty, setDemandForProperty] = useState<any>(null);
  const [editDemand, setEditDemand] = useState<any>(null);
  const [paymentForProperty, setPaymentForProperty] = useState<any>(null);
  const [editPayment, setEditPayment] = useState<any>(null);

  const stats = useMemo(() => {
    const portfolioValue = properties.reduce((s, p) => s + Number(p.marketValue || p.agreementValue || 0), 0);
    const totalInvested = properties.reduce(
      (s, p) => s + Number(p.agreementValue || 0) + Number(p.stampDuty || 0) + Number(p.tdsValue || 0),
      0
    );
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalDemanded = demands.reduce((s, d) => s + Number(d.totalAmount || d.amount || 0), 0);
    const outstanding = Math.max(0, totalDemanded - totalPaid);
    return { portfolioValue, totalInvested, totalPaid, outstanding };
  }, [properties, demands, payments]);

  const handleSaveProperty = (data: any) => {
    if (editProperty) {
      updateItem("realEstateProperties", editProperty.id, data);
      setEditProperty(null);
    } else {
      addItem("realEstateProperties", data);
      setShowPropertyModal(false);
    }
  };

  const handleSaveDemand = (data: any) => {
    if (editDemand) {
      updateItem("realEstateDemands", editDemand.id, data);
      setEditDemand(null);
    } else {
      addItem("realEstateDemands", { ...data, propertyId: demandForProperty.id });
      setDemandForProperty(null);
    }
  };

  const handleSavePayment = (data: any) => {
    if (editPayment) {
      updateItem("realEstatePayments", editPayment.id, data);
      setEditPayment(null);
    } else {
      addItem("realEstatePayments", { ...data, propertyId: paymentForProperty.id });
      setPaymentForProperty(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.03em" }}>Real Estate</div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            {properties.length} propert{properties.length !== 1 ? "ies" : "y"} · Track purchases, demand letters &amp; payments
          </div>
        </div>
        <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowPropertyModal(true)}>
          Add Property
        </Button>
      </div>

      {/* Stats */}
      {properties.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <StatCard label="Portfolio Value" value={fmtINR(stats.portfolioValue)} icon={<TrendingUp />} color="#22c55e" />
          <StatCard label="Total Invested" value={fmtINR(stats.totalInvested)} sub="Agreement + Stamp + TDS" icon={<IndianRupee />} color={THEME.accent} />
          <StatCard label="Total Paid" value={fmtINR(stats.totalPaid)} sub="All payments" icon={<CheckCircle />} color="#6366f1" />
          <StatCard label="Outstanding" value={fmtINR(stats.outstanding)} sub="Demands pending" icon={<Clock />} color={stats.outstanding > 0 ? "#ef4444" : THEME.muted} />
        </div>
      )}

      {/* Properties */}
      {properties.length === 0 ? (
        <EmptyState
          icon={Home}
          gradient="linear-gradient(135deg, #6366f1, #22c55e)"
          dotColor="#6366f1"
          title="No Properties Yet"
          description="Track all your real estate investments — purchases, demand letters, and payments in one place."
          pills={["Agreement Value", "Stamp Duty & TDS", "Demand Letters", "Payment History", "Market Value"]}
          buttonLabel="Add First Property"
          onAdd={() => setShowPropertyModal(true)}
        />
      ) : (
        properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            demands={demands.filter((d) => d.propertyId === property.id)}
            payments={payments.filter((p) => p.propertyId === property.id)}
            onEditProperty={(p: any) => setEditProperty(p)}
            onDeleteProperty={(id: string) => removeItem("realEstateProperties", id)}
            onAddDemand={(p: any) => setDemandForProperty(p)}
            onEditDemand={(d: any) => setEditDemand(d)}
            onDeleteDemand={(id: string) => removeItem("realEstateDemands", id)}
            onAddPayment={(p: any) => setPaymentForProperty(p)}
            onEditPayment={(p: any) => setEditPayment(p)}
            onDeletePayment={(id: string) => removeItem("realEstatePayments", id)}
          />
        ))
      )}

      {/* Modals */}
      {(showPropertyModal || editProperty) && (
        <PropertyModal
          existing={editProperty}
          onClose={() => { setShowPropertyModal(false); setEditProperty(null); }}
          onSave={handleSaveProperty}
        />
      )}
      {(demandForProperty || editDemand) && (
        <DemandModal
          existing={editDemand}
          propertyName={
            editDemand
              ? properties.find((p) => p.id === editDemand.propertyId)?.name || "Property"
              : demandForProperty?.name || "Property"
          }
          onClose={() => { setDemandForProperty(null); setEditDemand(null); }}
          onSave={handleSaveDemand}
        />
      )}
      {(paymentForProperty || editPayment) && (
        <PaymentModal
          existing={editPayment}
          propertyName={
            editPayment
              ? properties.find((p) => p.id === editPayment.propertyId)?.name || "Property"
              : paymentForProperty?.name || "Property"
          }
          demands={
            editPayment
              ? demands.filter((d) => d.propertyId === editPayment.propertyId)
              : demands.filter((d) => d.propertyId === paymentForProperty?.id)
          }
          onClose={() => { setPaymentForProperty(null); setEditPayment(null); }}
          onSave={handleSavePayment}
        />
      )}
    </div>
  );
}
