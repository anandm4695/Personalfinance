// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  FileText,
  IndianRupee,
} from "lucide-react";
import { THEME } from "../../utils/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: Record<string, string> = {
  "two-wheeler": "Two-Wheeler",
  "four-wheeler": "Four-Wheeler",
  commercial: "Commercial",
};

const FUEL_TYPES: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  electric: "Electric",
  cng: "CNG",
  hybrid: "Hybrid",
};

const SERVICE_TYPES: Record<string, { label: string; color: string }> = {
  regular_service: { label: "Regular Service", color: "#3b82f6" },
  tyre_change: { label: "Tyre Change", color: "#f59e0b" },
  battery_change: { label: "Battery Change", color: "#8b5cf6" },
  repair: { label: "Repair", color: "#ef4444" },
  insurance: { label: "Insurance", color: "#10b981" },
  puc: { label: "PUC", color: "#06b6d4" },
  other: { label: "Other", color: "#6b7280" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const insuranceStatus = (expiry: string) => {
  if (!expiry) return null;
  const today = new Date();
  const exp = new Date(expiry + "T00:00:00");
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Expired", color: "#ef4444", icon: "alert" };
  if (daysLeft <= 30) return { label: `Expiring in ${daysLeft}d`, color: "#f59e0b", icon: "warn" };
  return { label: "Valid", color: "#10b981", icon: "ok" };
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared input style
// ─────────────────────────────────────────────────────────────────────────────

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--input-bg, var(--surface))",
  color: "var(--text)",
  fontSize: 14,
  boxSizing: "border-box" as const,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: 4,
};

const row2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// VehicleModal — Add / Edit vehicle
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_VEHICLE = {
  vehicleType: "two-wheeler",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  fuelType: "petrol",
  registrationNumber: "",
  chassisNumber: "",
  engineNumber: "",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  insuranceExpiry: "",
  pucExpiry: "",
  notes: "",
  owner: "self",
};

function VehicleModal({ existing, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? {
          ...EMPTY_VEHICLE,
          ...existing,
          purchasePrice: existing.purchasePrice ?? "",
          currentValue: existing.currentValue ?? "",
          year: existing.year ?? new Date().getFullYear(),
        }
      : { ...EMPTY_VEHICLE }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.make.trim() || !f.model.trim()) return;
    onSave({
      ...f,
      purchasePrice: Number(f.purchasePrice) || 0,
      currentValue: Number(f.currentValue) || 0,
      year: Number(f.year) || new Date().getFullYear(),
      serviceHistory: existing?.serviceHistory || [],
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Vehicle type + owner */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Vehicle Type *</span>
            <select style={input} value={f.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
              {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>Owner</span>
            <input style={input} value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="self" />
          </div>
        </div>

        {/* Make + Model */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Make *</span>
            <input style={input} value={f.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Honda" />
          </div>
          <div>
            <span style={label}>Model *</span>
            <input style={input} value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Activa 6G" />
          </div>
        </div>

        {/* Year + Color + Fuel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={label}>Year</span>
            <input style={input} type="number" value={f.year} onChange={(e) => set("year", e.target.value)} min={1980} max={2030} />
          </div>
          <div>
            <span style={label}>Color</span>
            <input style={input} value={f.color} onChange={(e) => set("color", e.target.value)} placeholder="e.g. Pearl White" />
          </div>
          <div>
            <span style={label}>Fuel Type</span>
            <select style={input} value={f.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
              {Object.entries(FUEL_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Registration */}
        <div style={{ marginBottom: 12 }}>
          <span style={label}>Registration Number</span>
          <input
            style={input}
            value={f.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value.toUpperCase())}
            placeholder="e.g. MH04 AB 1234"
          />
        </div>

        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Chassis Number</span>
            <input style={input} value={f.chassisNumber} onChange={(e) => set("chassisNumber", e.target.value)} />
          </div>
          <div>
            <span style={label}>Engine Number</span>
            <input style={input} value={f.engineNumber} onChange={(e) => set("engineNumber", e.target.value)} />
          </div>
        </div>

        {/* Purchase details */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Purchase Date</span>
            <input style={input} type="date" value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
          </div>
          <div>
            <span style={label}>Purchase Price (₹)</span>
            <input style={input} type="number" value={f.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} placeholder="0" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={label}>Current Market Value (₹)</span>
          <input style={input} type="number" value={f.currentValue} onChange={(e) => set("currentValue", e.target.value)} placeholder="Current resale value estimate" />
        </div>

        {/* Compliance */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Insurance Expiry</span>
            <input style={input} type="date" value={f.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} />
          </div>
          <div>
            <span style={label}>PUC Expiry</span>
            <input style={input} type="date" value={f.pucExpiry} onChange={(e) => set("pucExpiry", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <span style={label}>Notes</span>
          <textarea
            style={{ ...input, height: 60, resize: "vertical" }}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional notes…"
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!f.make.trim() || !f.model.trim()}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: THEME.accent,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              opacity: !f.make.trim() || !f.model.trim() ? 0.5 : 1,
            }}
          >
            {isEdit ? "Update" : "Add Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceModal — Add / Edit service record
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_SERVICE = {
  date: new Date().toISOString().slice(0, 10),
  type: "regular_service",
  description: "",
  cost: "",
  odometer: "",
  serviceCenter: "",
  notes: "",
};

function ServiceModal({ existing, vehicleName, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? { ...EMPTY_SERVICE, ...existing, cost: existing.cost ?? "", odometer: existing.odometer ?? "" }
      : { ...EMPTY_SERVICE }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.date || !f.type) return;
    onSave({
      ...f,
      id: existing?.id || uid(),
      cost: Number(f.cost) || 0,
      odometer: Number(f.odometer) || 0,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? "Edit Record" : "Add Service Record"}</h3>
            {vehicleName && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{vehicleName}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Date *</span>
            <input style={input} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <span style={label}>Service Type *</span>
            <select style={input} value={f.type} onChange={(e) => set("type", e.target.value)}>
              {Object.entries(SERVICE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={label}>Description</span>
          <input style={input} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief description of work done" />
        </div>

        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <span style={label}>Cost (₹)</span>
            <input style={input} type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" />
          </div>
          <div>
            <span style={label}>Odometer (km)</span>
            <input style={input} type="number" value={f.odometer} onChange={(e) => set("odometer", e.target.value)} placeholder="0" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={label}>Service Center / Vendor</span>
          <input style={input} value={f.serviceCenter} onChange={(e) => set("serviceCenter", e.target.value)} placeholder="e.g. Honda Authorized Service" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <span style={label}>Notes</span>
          <textarea
            style={{ ...input, height: 56, resize: "vertical" }}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Parts replaced, warranty info, etc."
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!f.date || !f.type}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: THEME.accent,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {isEdit ? "Update" : "Add Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ expiry, label: badgeLabel }: { expiry: string; label: string }) {
  const status = insuranceStatus(expiry);
  if (!status) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        background: status.color + "20",
        color: status.color,
        whiteSpace: "nowrap",
      }}
    >
      {status.icon === "ok" ? <CheckCircle size={10} /> : status.icon === "warn" ? <Clock size={10} /> : <AlertTriangle size={10} />}
      {badgeLabel}: {status.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleCard
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddService,
  onEditService,
  onDeleteService,
}: any) {
  const sh: any[] = vehicle.serviceHistory || [];
  const totalServiceCost = sh.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
  const lastService = sh.length
    ? sh.slice().sort((a: any, b: any) => b.date.localeCompare(a.date))[0]
    : null;
  const emoji = vehicle.vehicleType === "two-wheeler" ? "🛵" : vehicle.vehicleType === "four-wheeler" ? "🚗" : "🚛";

  const depreciation =
    vehicle.purchasePrice && vehicle.currentValue
      ? Math.round(((vehicle.purchasePrice - vehicle.currentValue) / vehicle.purchasePrice) * 100)
      : null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 14,
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Card header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: THEME.accent + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {emoji}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {vehicle.make} {vehicle.model}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 20,
                background: "var(--border)",
                color: "var(--text-muted)",
              }}
            >
              {vehicle.year}
            </span>
            {vehicle.color && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>• {vehicle.color}</span>
            )}
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            {vehicle.registrationNumber && (
              <span style={{ fontFamily: "monospace", fontWeight: 600, marginRight: 10 }}>
                {vehicle.registrationNumber}
              </span>
            )}
            <span>{VEHICLE_TYPES[vehicle.vehicleType]} • {FUEL_TYPES[vehicle.fuelType] || vehicle.fuelType}</span>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {vehicle.insuranceExpiry && <StatusBadge expiry={vehicle.insuranceExpiry} label="Insurance" />}
            {vehicle.pucExpiry && <StatusBadge expiry={vehicle.pucExpiry} label="PUC" />}
          </div>
        </div>

        {/* Value + chevron */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: THEME.accent }}>
            {fmtINR(Number(vehicle.currentValue || vehicle.purchasePrice || 0))}
          </div>
          {depreciation !== null && depreciation > 0 && (
            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>↓ {depreciation}% depreciated</div>
          )}
          <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={onEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--text)",
              }}
            >
              <Edit2 size={13} /> Edit Vehicle
            </button>
            <button
              onClick={onAddService}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: THEME.accent,
                cursor: "pointer",
                fontSize: 13,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              <Plus size={13} /> Add Service Record
            </button>
            <button
              onClick={onDelete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid #ef444430",
                background: "#ef444408",
                cursor: "pointer",
                fontSize: 13,
                color: "#ef4444",
                marginLeft: "auto",
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>

          {/* Vehicle details grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
              background: "var(--bg)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
            }}
          >
            {[
              ["Owner", vehicle.owner || "self"],
              ["Purchase Date", fmtDate(vehicle.purchaseDate)],
              ["Purchase Price", vehicle.purchasePrice ? fmtINR(vehicle.purchasePrice) : "—"],
              ["Current Value", vehicle.currentValue ? fmtINR(vehicle.currentValue) : "—"],
              ["Insurance Expiry", fmtDate(vehicle.insuranceExpiry)],
              ["PUC Expiry", fmtDate(vehicle.pucExpiry)],
              ["Chassis No.", vehicle.chassisNumber || "—"],
              ["Engine No.", vehicle.engineNumber || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {vehicle.notes && (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                background: "var(--bg)",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <FileText size={12} style={{ marginRight: 6 }} />
              {vehicle.notes}
            </div>
          )}

          {/* Service History */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              <Wrench size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Service History
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
                ({sh.length} record{sh.length !== 1 ? "s" : ""} • Total: {fmtINR(totalServiceCost)})
              </span>
            </h4>
          </div>

          {sh.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "var(--text-muted)",
                fontSize: 13,
                background: "var(--bg)",
                borderRadius: 10,
              }}
            >
              No service records yet. Click "Add Service Record" to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sh
                .slice()
                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                .map((rec: any, idx: number) => {
                  const st = SERVICE_TYPES[rec.type] || SERVICE_TYPES.other;
                  return (
                    <div
                      key={rec.id || idx}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        background: "var(--bg)",
                        borderRadius: 10,
                        padding: "12px 14px",
                      }}
                    >
                      {/* Color dot */}
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: st.color,
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: st.color,
                                padding: "1px 7px",
                                borderRadius: 20,
                                background: st.color + "18",
                              }}
                            >
                              {st.label}
                            </span>
                            {rec.description && (
                              <span style={{ fontSize: 13, marginLeft: 8 }}>{rec.description}</span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => onEditService(rec)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                padding: 4,
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteService(rec.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                padding: 4,
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(rec.date)}</span>
                          {rec.cost > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
                              <IndianRupee size={10} style={{ verticalAlign: "middle" }} />
                              {rec.cost.toLocaleString("en-IN")}
                            </span>
                          )}
                          {rec.odometer > 0 && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.odometer.toLocaleString("en-IN")} km</span>
                          )}
                          {rec.serviceCenter && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.serviceCenter}</span>
                          )}
                        </div>

                        {rec.notes && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, fontStyle: "italic" }}>
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Service cost summary by type */}
          {sh.length > 0 && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                COST BREAKDOWN
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(SERVICE_TYPES)
                  .map(([type, st]) => {
                    const cost = sh.filter((r: any) => r.type === type).reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
                    if (!cost) return null;
                    return (
                      <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{st.label}:</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtINR(cost)}</span>
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehiclesTab — Main export
// ─────────────────────────────────────────────────────────────────────────────

export function VehiclesTab({ state, addItem, removeItem, updateItem }: any) {
  const vehicles: any[] = state.vehicles || [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [serviceModal, setServiceModal] = useState<{ open: boolean; vehicleId?: string; existing?: any }>({
    open: false,
  });

  // Summary metrics
  const totalCurrentValue = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.currentValue || v.purchasePrice || 0), 0),
    [vehicles]
  );
  const totalPurchasePrice = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.purchasePrice || 0), 0),
    [vehicles]
  );
  const totalServiceSpend = useMemo(
    () =>
      vehicles.reduce(
        (s, v) => s + (v.serviceHistory || []).reduce((ss: number, r: any) => ss + Number(r.cost || 0), 0),
        0
      ),
    [vehicles]
  );

  // ── Handlers ──

  const handleSaveVehicle = (data: any) => {
    if (vehicleModal.existing) {
      updateItem("vehicles", vehicleModal.existing.id, data);
    } else {
      addItem("vehicles", data);
    }
    setVehicleModal({ open: false });
  };

  const handleDeleteVehicle = (id: string) => {
    if (!window.confirm("Delete this vehicle and all its service records?")) return;
    removeItem("vehicles", id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleSaveService = (rec: any) => {
    const vehicle = vehicles.find((v) => v.id === serviceModal.vehicleId);
    if (!vehicle) return;
    const oldHistory: any[] = vehicle.serviceHistory || [];
    const newHistory = serviceModal.existing
      ? oldHistory.map((r) => (r.id === rec.id ? rec : r))
      : [...oldHistory, rec];
    updateItem("vehicles", vehicle.id, { ...vehicle, serviceHistory: newHistory });
    setServiceModal({ open: false });
  };

  const handleDeleteService = (vehicleId: string, serviceId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const newHistory = (vehicle.serviceHistory || []).filter((r: any) => r.id !== serviceId);
    updateItem("vehicles", vehicle.id, { ...vehicle, serviceHistory: newHistory });
  };

  // ── Alerts (insurance / PUC expiring soon) ──
  const alerts = useMemo(() => {
    const list: string[] = [];
    vehicles.forEach((v) => {
      const ins = insuranceStatus(v.insuranceExpiry);
      if (ins && ins.icon !== "ok") list.push(`${v.make} ${v.model}: Insurance ${ins.label}`);
      const puc = insuranceStatus(v.pucExpiry);
      if (puc && puc.icon !== "ok") list.push(`${v.make} ${v.model}: PUC ${puc.label}`);
    });
    return list;
  }, [vehicles]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Car size={22} /> Vehicles
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Track ownership, compliance, and service history
          </p>
        </div>
        <button
          onClick={() => setVehicleModal({ open: true })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            background: THEME.accent,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "#f59e0b18",
            border: "1px solid #f59e0b40",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#b45309" }}>
              <AlertTriangle size={14} />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {vehicles.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Vehicles Owned", value: vehicles.length.toString(), sub: "total" },
            {
              label: "Total Current Value",
              value: fmtINR(totalCurrentValue),
              sub: totalPurchasePrice ? `Bought for ${fmtINR(totalPurchasePrice)}` : "no purchase data",
            },
            { label: "Total Service Spend", value: fmtINR(totalServiceSpend), sub: "across all vehicles" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {vehicles.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "var(--surface)",
            borderRadius: 16,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 700 }}>No vehicles yet</h3>
          <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: 14 }}>
            Add your two-wheeler, four-wheeler, or any vehicle you own. Track service history, insurance, and current market value.
          </p>
          <button
            onClick={() => setVehicleModal({ open: true })}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: THEME.accent,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Add Your First Vehicle
          </button>
        </div>
      )}

      {/* Vehicle list */}
      {vehicles.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          expanded={expandedId === v.id}
          onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
          onEdit={() => setVehicleModal({ open: true, existing: v })}
          onDelete={() => handleDeleteVehicle(v.id)}
          onAddService={() => setServiceModal({ open: true, vehicleId: v.id })}
          onEditService={(rec: any) => setServiceModal({ open: true, vehicleId: v.id, existing: rec })}
          onDeleteService={(serviceId: string) => handleDeleteService(v.id, serviceId)}
        />
      ))}

      {/* Modals */}
      {vehicleModal.open && (
        <VehicleModal
          existing={vehicleModal.existing}
          onClose={() => setVehicleModal({ open: false })}
          onSave={handleSaveVehicle}
        />
      )}

      {serviceModal.open && (
        <ServiceModal
          existing={serviceModal.existing}
          vehicleName={(() => {
            const v = vehicles.find((v) => v.id === serviceModal.vehicleId);
            return v ? `${v.make} ${v.model}` : "";
          })()}
          onClose={() => setServiceModal({ open: false })}
          onSave={handleSaveService}
        />
      )}
    </div>
  );
}
