import React, { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  User,
  Info,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";
import { usePrivacy } from "../../context/PrivacyContext";
import {
  EXTERNAL_OWNER_ID,
  fmtDate,
  RealEstateProperty,
  RealEstateDemand,
} from "./RealEstateTypes";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--t-line)",
  color: "var(--t-ink)",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  background: "var(--surface-1)",
};

// ─── Owner Split Row Sub-component ───
function OwnerSplitRow({
  owner,
  idx,
  familyProfiles,
  usedIds,
  onChange,
  canDelete,
  onDelete,
}: {
  owner: any;
  idx: number;
  familyProfiles: any[];
  usedIds: string[];
  onChange: (updated: any) => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const accentColors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet];
  const accentColor = accentColors[idx % accentColors.length];
  const usedSet = new Set(usedIds);
  const isExternal = owner.id === EXTERNAL_OWNER_ID;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        border: `1.5px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
        background: `color-mix(in srgb, ${accentColor} 4%, var(--t-paper))`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={13} color="#fff" />
        </div>

        <select
          style={{ ...inputStyle, flex: 2 }}
          value={owner.id}
          aria-label={`Owner ${idx + 1}`}
          onChange={(e) =>
            onChange(
              e.target.value === EXTERNAL_OWNER_ID
                ? { id: EXTERNAL_OWNER_ID, name: owner.name || "", sharePct: owner.sharePct }
                : { id: e.target.value, sharePct: owner.sharePct }
            )
          }
        >
          {familyProfiles
            .filter((p) => p.id === owner.id || !usedSet.has(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          <option value={EXTERNAL_OWNER_ID}>+ External Co-Owner (Not in Family Profiles)</option>
        </select>

        <input
          style={{ ...inputStyle, flex: 1, textAlign: "right" }}
          type="number"
          min={0}
          max={100}
          value={owner.sharePct}
          onChange={(e) => onChange({ ...owner, sharePct: e.target.value })}
          aria-label={`Owner ${idx + 1} share percentage`}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, width: 14 }}>%</span>

        {canDelete && (
          <button
            onClick={onDelete}
            aria-label={`Remove owner ${idx + 1}`}
            className="icon-btn danger"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: THEME.rust,
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {isExternal && (
        <input
          style={{ ...inputStyle, marginLeft: 34 }}
          value={owner.name || ""}
          onChange={(e) => onChange({ ...owner, name: e.target.value })}
          placeholder="Name, e.g. Suresh Mohta (Father / Co-buyer)"
          aria-label={`Owner ${idx + 1} name`}
        />
      )}
    </div>
  );
}

// ─── Property Modal ───
export function PropertyModal({
  existing,
  onClose,
  onSave,
  saving = false,
}: {
  existing?: RealEstateProperty | null;
  onClose: () => void;
  onSave: (p: any) => void;
  saving?: boolean;
}) {
  const { familyProfiles } = useMasterData();
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
      agreementValuePaid: "",
      stampDuty: "",
      stampDutyPaid: "",
      tdsAmount: "",
      tdsValue: "",
      marketValue: "",
      saleDate: "",
      salePrice: "",
      saleStampDuty: "",
      saleTds: "",
      notes: "",
      owner: "self",
    }
  );

  const [owners, setOwners] = useState<any[]>(() => {
    if (existing?.owners && existing.owners.length > 0) return existing.owners;
    return [{ id: existing?.owner || "self", sharePct: 100 }];
  });

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const totalPct = owners.reduce((s, o) => s + Number(o.sharePct || 0), 0);
  const isMulti = owners.length > 1;
  const pctValid = totalPct === 100;

  const updateOwner = (idx: number, updated: any) =>
    setOwners((prev) => prev.map((o, i) => (i === idx ? updated : o)));

  const addOwner = () => {
    const used = new Set(owners.map((o) => o.id));
    const availableProfile = familyProfiles.find((p) => !used.has(p.id));
    const newOwner = availableProfile
      ? { id: availableProfile.id, sharePct: 0 }
      : { id: EXTERNAL_OWNER_ID, name: "", sharePct: 0 };
    const count = owners.length + 1;
    const base = Math.floor(100 / count);
    const rem = 100 - base * count;
    setOwners([...owners.map((o) => ({ ...o, sharePct: base })), { ...newOwner, sharePct: base + rem }]);
  };

  const removeOwner = (idx: number) => {
    const removed = owners[idx];
    const next = owners.filter((_, i) => i !== idx);
    if (next.length === 0) return;
    const perOther = Math.floor(Number(removed.sharePct || 0) / next.length);
    const rem = Number(removed.sharePct || 0) - perOther * next.length;
    setOwners(
      next.map((o, i) => ({
        ...o,
        sharePct: Number(o.sharePct || 0) + perOther + (i === 0 ? rem : 0),
      }))
    );
  };

  const equaliseOwners = () => {
    const base = Math.floor(100 / owners.length);
    const rem = 100 - base * owners.length;
    setOwners((prev) => prev.map((o, i) => ({ ...o, sharePct: i === 0 ? base + rem : base })));
  };

  const externalNamesValid = owners.every(
    (o) => o.id !== EXTERNAL_OWNER_ID || String(o.name || "").trim()
  );

  // Auto-calculate Sec 194-IA 1% TDS helper
  const agreeValNum = Number(f.agreementValue || 0);
  const calc1PctTds = () => {
    if (agreeValNum >= 5000000) {
      set("tdsAmount", Math.round(agreeValNum * 0.01));
    }
  };

  const computedTotalCost =
    agreeValNum + Number(f.stampDuty || 0) + Number(f.tdsAmount || 0);

  const handleSave = () => {
    if (!f.name) return;
    if (!pctValid || !externalNamesValid) return;
    const trackedOwners = owners.filter((o) => o.id !== EXTERNAL_OWNER_ID);
    const pool = trackedOwners.length > 0 ? trackedOwners : owners;
    const primary = pool.reduce(
      (max, o) => (Number(o.sharePct || 0) > Number(max.sharePct || 0) ? o : max),
      pool[0]
    );
    onSave({ ...f, owners, owner: primary.id === EXTERNAL_OWNER_ID ? "self" : primary.id });
  };

  return (
    <Modal title={isEdit ? "Edit Property" : "Add Real Estate Property"} onClose={onClose} maxWidth={680}>
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Property Name *" style={{ gridColumn: "1 / -1" }}>
          <input
            style={inputStyle}
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. 4BHK Sky Villa, Lodha World Towers"
          />
        </Field>
        <Field label="Type">
          <select style={inputStyle} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="plot">Plot</option>
            <option value="villa">Villa</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="owned">Owned</option>
            <option value="under-construction">Under Construction</option>
            <option value="sold">Sold</option>
          </select>
        </Field>
        <Field label="Location (City / Area)" style={{ gridColumn: "1 / -1" }}>
          <input
            style={inputStyle}
            value={f.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Worli, Mumbai"
          />
        </Field>
        <Field label="Developer / Builder Name">
          <input
            style={inputStyle}
            value={f.developerName}
            onChange={(e) => set("developerName", e.target.value)}
            placeholder="e.g. Lodha / DLF / Godrej"
          />
        </Field>
        <Field label="Seller Name">
          <input
            style={inputStyle}
            value={f.sellerName}
            onChange={(e) => set("sellerName", e.target.value)}
          />
        </Field>
        <Field label="RERA Number">
          <input
            style={inputStyle}
            value={f.reraNumber}
            onChange={(e) => set("reraNumber", e.target.value)}
            placeholder="e.g. P51900001234"
          />
        </Field>
        <Field label="Super Built-up / Carpet Area (sq ft)">
          <input
            style={inputStyle}
            type="number"
            value={f.areaSqft}
            onChange={(e) => set("areaSqft", e.target.value)}
            placeholder="e.g. 1850"
          />
        </Field>
      </div>

      {/* ── Co-ownership Section ── */}
      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        Co-Ownership Details (Buyer Side)
      </div>

      {isMulti && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 10,
            background: pctValid
              ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
              : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${pctValid ? THEME.sage : THEME.rust} 20%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {pctValid ? <CheckCircle size={14} color={THEME.sage} /> : <AlertCircle size={14} color={THEME.rust} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: pctValid ? THEME.sage : THEME.rust }}>
              {pctValid
                ? `Ownership balanced (100%)`
                : `Ownership must total 100% (currently ${totalPct}%)`}
            </span>
          </div>
          <button
            onClick={equaliseOwners}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: `1px solid ${THEME.accent}`,
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              color: THEME.accent,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Auto-equalise
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {owners.map((o, idx) => (
          <OwnerSplitRow
            key={idx}
            owner={o}
            idx={idx}
            familyProfiles={familyProfiles}
            usedIds={owners.filter((_, i) => i !== idx).map((x) => x.id)}
            onChange={(updated: any) => updateOwner(idx, updated)}
            canDelete={owners.length > 1}
            onDelete={() => removeOwner(idx)}
          />
        ))}
      </div>

      {owners.length < 8 && (
        <button
          onClick={addOwner}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px",
            border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
            color: THEME.accent,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={13} /> Add Co-Owner
        </button>
      )}

      {/* ── Key Dates Section ── */}
      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        Key Dates
      </div>
      <div className="form-grid-3" style={{ gap: 12 }}>
        <Field label="Purchase Date">
          <input
            style={inputStyle}
            type="date"
            value={f.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
        </Field>
        <Field label="Registration Date">
          <input
            style={inputStyle}
            type="date"
            value={f.registrationDate}
            onChange={(e) => set("registrationDate", e.target.value)}
          />
        </Field>
        <Field label="Possession Date">
          <input
            style={inputStyle}
            type="date"
            value={f.possessionDate}
            onChange={(e) => set("possessionDate", e.target.value)}
          />
        </Field>
      </div>

      {/* ── Financials Section ── */}
      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
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
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Purchase Financials
        </div>
        {computedTotalCost > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent }}>
            Total Acquisition Basis: ₹{computedTotalCost.toLocaleString("en-IN")}
          </div>
        )}
      </div>

      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Agreement Value (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.agreementValue}
            onChange={(e) => set("agreementValue", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Agreement Value Paid (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.agreementValuePaid}
            onChange={(e) => set("agreementValuePaid", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty & Registration (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.stampDuty}
            onChange={(e) => set("stampDuty", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty Paid (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.stampDutyPaid}
            onChange={(e) => set("stampDutyPaid", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field
          label="TDS Liability (₹)"
          tooltip={agreeValNum >= 5000000 ? "Sec 194-IA mandates 1% TDS on properties ≥ ₹50L" : undefined}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              type="number"
              value={f.tdsAmount}
              onChange={(e) => set("tdsAmount", e.target.value)}
              placeholder="0"
            />
            {agreeValNum >= 5000000 && (
              <button
                type="button"
                onClick={calc1PctTds}
                title="Auto-fill 1% TDS under Sec 194-IA"
                style={{
                  padding: "0 10px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${THEME.accent}`,
                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                  color: THEME.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                1% TDS
              </button>
            )}
          </div>
        </Field>
        <Field label="TDS Paid / Deposited (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.tdsValue}
            onChange={(e) => set("tdsValue", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Current Market Valuation (₹)" style={{ gridColumn: "1 / -1" }}>
          <input
            style={{ ...inputStyle, fontWeight: 700, color: THEME.ink }}
            type="number"
            value={f.marketValue}
            onChange={(e) => set("marketValue", e.target.value)}
            placeholder="Estimated current value"
          />
        </Field>
      </div>

      {/* ── Sale Details (if Sold) ── */}
      {f.status === "sold" && (
        <>
          <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: THEME.rust,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Sale & Disposal Details
          </div>
          <div className="form-grid-2" style={{ gap: 12 }}>
            <Field label="Sale Date">
              <input
                style={inputStyle}
                type="date"
                value={f.saleDate}
                onChange={(e) => set("saleDate", e.target.value)}
              />
            </Field>
            <Field label="Gross Sale Price (₹)">
              <input
                style={inputStyle}
                type="number"
                value={f.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Sale Stamp Duty (₹)">
              <input
                style={inputStyle}
                type="number"
                value={f.saleStampDuty}
                onChange={(e) => set("saleStampDuty", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Sale TDS Deducted (₹)">
              <input
                style={inputStyle}
                type="number"
                value={f.saleTds}
                onChange={(e) => set("saleTds", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Notes" style={{ marginTop: 14 }}>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Additional details, mortgage loan details, registry notes..."
        />
      </Field>

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add Property"}
        disabled={!f.name || !pctValid || !externalNamesValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

// ─── Demand Modal ───
export function DemandModal({
  existing,
  propertyName,
  onClose,
  onSave,
  saving = false,
}: {
  existing?: RealEstateDemand | null;
  propertyName: string;
  onClose: () => void;
  onSave: (d: any) => void;
  saving?: boolean;
}) {
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
    <Modal
      title={isEdit ? "Edit Demand Letter" : `Add Demand Letter — ${propertyName}`}
      onClose={onClose}
      maxWidth={520}
    >
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Demand Date">
          <input
            style={inputStyle}
            type="date"
            value={f.demandDate}
            onChange={(e) => set("demandDate", e.target.value)}
          />
        </Field>
        <Field label="Due Date">
          <input
            style={inputStyle}
            type="date"
            value={f.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </Field>
        <Field label="Milestone / Work Stage" style={{ gridColumn: "1 / -1" }}>
          <input
            style={inputStyle}
            value={f.milestone}
            onChange={(e) => set("milestone", e.target.value)}
            placeholder="e.g. Completion of Plinth / 10th Slab Cast"
          />
        </Field>
        <Field label="Basic Demand Amount (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="GST Amount (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.gstAmount}
            onChange={(e) => set("gstAmount", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Total Demand Amount (₹)">
          <input
            style={{
              ...inputStyle,
              background: "var(--surface-0)",
              color: THEME.accent,
              fontWeight: 700,
            }}
            type="number"
            value={f.totalAmount || computedTotal || ""}
            onChange={(e) => set("totalAmount", e.target.value)}
            placeholder={computedTotal ? String(computedTotal) : "Auto-calculated"}
          />
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </Field>
        <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Demand letter reference number, builder bank details..."
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => onSave({ ...f, totalAmount: f.totalAmount || computedTotal || f.amount })}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add Demand Letter"}
        disabled={saving || !f.amount}
        loading={saving}
      />
    </Modal>
  );
}

// ─── Payment Modal ───
export function PaymentModal({
  existing,
  propertyName,
  demands,
  initialDemandId,
  bankAccounts = [],
  creditCards = [],
  onClose,
  onSave,
  saving = false,
}: {
  existing?: any;
  propertyName: string;
  demands: RealEstateDemand[];
  initialDemandId?: string;
  bankAccounts?: any[];
  creditCards?: any[];
  onClose: () => void;
  onSave: (p: any) => void;
  saving?: boolean;
}) {
  const { privacyMode } = usePrivacy();
  const isEdit = !!existing;

  const defaultSource =
    existing?.paymentSource !== undefined
      ? existing.paymentSource
      : bankAccounts.length > 0
      ? `bank:${bankAccounts[0].id}`
      : "";

  const [f, setF] = useState(
    existing || {
      paymentDate: today(),
      amount: "",
      paymentMode: "NEFT",
      referenceNumber: "",
      demandId: initialDemandId || "",
      paymentSource: defaultSource,
      postToAccount: true,
      category: "Real Estate",
      autoUpdateAgreementPaid: true,
      note: "",
    }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const handleSourceChange = (src: string) => {
    set("paymentSource", src);
    if (src.startsWith("cc:")) {
      set("paymentMode", "Credit Card");
    } else if (src.startsWith("bank:")) {
      if (f.paymentMode === "Credit Card" || f.paymentMode === "Cash") {
        set("paymentMode", "NEFT");
      }
    }
  };

  const selectedBank = f.paymentSource?.startsWith("bank:")
    ? bankAccounts.find((b: any) => b.id === f.paymentSource.slice(5))
    : null;

  const selectedCard = f.paymentSource?.startsWith("cc:")
    ? creditCards.find((c: any) => c.id === f.paymentSource.slice(3))
    : null;

  return (
    <Modal
      title={isEdit ? "Edit Payment Record" : `Record Payment — ${propertyName}`}
      onClose={onClose}
      maxWidth={540}
    >
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Payment Date">
          <input
            style={inputStyle}
            type="date"
            value={f.paymentDate}
            onChange={(e) => set("paymentDate", e.target.value)}
          />
        </Field>
        <Field label="Amount Paid (₹) *">
          <input
            style={{ ...inputStyle, fontWeight: 700, color: THEME.sage, fontSize: 16 }}
            type="number"
            value={f.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
            autoFocus={!isEdit}
          />
        </Field>

        {/* Payment Account / Source Selector */}
        <Field label="Paid From (Bank / Card) *" style={{ gridColumn: "1 / -1" }}>
          <select
            style={{ ...inputStyle, fontWeight: 600 }}
            value={f.paymentSource || ""}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            <option value="">— Manual / Outside App (Cash, Loan Direct Disbursement) —</option>
            {bankAccounts.length > 0 && (
              <optgroup label="Bank Accounts (Auto-Debits balance)">
                {bankAccounts.map((b: any) => (
                  <option key={`bank:${b.id}`} value={`bank:${b.id}`}>
                    🏦 {b.bankName || b.name} {b.accountNumber ? `(••${b.accountNumber.slice(-4)})` : ""} — Balance: {privacyMode ? "••••" : fmtINRFull(Number(b.balance || 0))}
                  </option>
                ))}
              </optgroup>
            )}
            {creditCards.length > 0 && (
              <optgroup label="Credit Cards (Auto-Adds transaction & updates outstanding)">
                {creditCards.map((c: any) => (
                  <option key={`cc:${c.id}`} value={`cc:${c.id}`}>
                    💳 {c.cardName || c.bank} {c.cardNumber ? `(••${c.cardNumber.slice(-4)})` : ""} — Outstanding: {privacyMode ? "••••" : fmtINRFull(Number(c.outstanding || 0))}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>

        {/* Auto-sync notice banner */}
        {f.paymentSource && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "10px 14px",
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={15} color={THEME.accent} />
              <div>
                <span style={{ fontWeight: 700, color: THEME.ink }}>
                  Auto-Sync to {selectedBank ? selectedBank.bankName : selectedCard ? (selectedCard.cardName || selectedCard.bank) : "Account"}
                </span>
                <div style={{ color: THEME.muted, fontSize: 11 }}>
                  Automatically enters debit transaction in your account ledger. No duplicate entry needed!
                </div>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 11, color: THEME.accent, cursor: "pointer", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={f.postToAccount !== false}
                onChange={(e) => set("postToAccount", e.target.checked)}
              />
              Auto-Sync
            </label>
          </div>
        )}

        <Field label="Payment Mode">
          <select
            style={inputStyle}
            value={f.paymentMode}
            onChange={(e) => set("paymentMode", e.target.value)}
          >
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Cheque">Cheque</option>
            <option value="DD">Demand Draft</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field label="Reference / UTR Number">
          <input
            style={inputStyle}
            value={f.referenceNumber}
            onChange={(e) => set("referenceNumber", e.target.value)}
            placeholder="Bank UTR / Cheque / Txn ID"
          />
        </Field>

        {demands.length > 0 && (
          <Field label="Link to Demand Letter (Optional)" style={{ gridColumn: "1 / -1" }}>
            <select
              style={inputStyle}
              value={f.demandId}
              onChange={(e) => set("demandId", e.target.value)}
            >
              <option value="">— Not linked to specific demand —</option>
              {demands.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.milestone || "Demand"} ({fmtDate(d.demandDate)}) —{" "}
                  {privacyMode ? "••••" : fmtINRFull(d.totalAmount || d.amount || 0)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Category">
          <select
            style={inputStyle}
            value={f.category || "Real Estate"}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="Real Estate">Real Estate</option>
            <option value="Housing">Housing</option>
            <option value="Home Improvement">Home Improvement</option>
            <option value="Property Tax">Property Tax</option>
            <option value="Investment">Investment</option>
          </select>
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: THEME.ink, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={f.autoUpdateAgreementPaid !== false}
              onChange={(e) => set("autoUpdateAgreementPaid", e.target.checked)}
            />
            Update Property Paid Balance
          </label>
        </div>

        <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
          <textarea
            style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Payment notes, receipt confirmation, builder account details..."
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => f.amount && onSave(f)}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Record Payment & Auto-Sync"}
        disabled={saving || !f.amount}
        loading={saving}
      />
    </Modal>
  );
}
