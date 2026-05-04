// @ts-nocheck
import React, { useState } from "react";
import { THEME, PROFILES } from "../../utils/constants";
import { today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

export function RentalPropertyModal({ initial, onClose, onSave }: any) {
  const [f, setF] = useState(initial ? {
    owner: initial.owner || "self",
    propertyName: initial.propertyName || "",
    propertyType: initial.propertyType || "shop",
    tenantName: initial.tenantName || "",
    tenantPhone: initial.tenantPhone || "",
    monthlyRent: initial.monthlyRent || "",
    securityDeposit: initial.securityDeposit || "",
    agreementStart: initial.agreementStart || "",
    agreementEnd: initial.agreementEnd || "",
    isActive: initial.isActive !== false,
    municipalTax: initial.municipalTax || "",
  } : {
    owner: "self", propertyName: "", propertyType: "shop",
    tenantName: "", tenantPhone: "", monthlyRent: "",
    securityDeposit: "", agreementStart: "", agreementEnd: "",
    isActive: true, municipalTax: "",
  });
  return (
    <Modal title={initial ? "Edit Property" : "Add Rental Property"} onClose={onClose}>
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
        <Field label="Tenant Name">
          <input style={input} value={f.tenantName} onChange={(e) => setF({ ...f, tenantName: e.target.value })} placeholder="e.g. Ramesh Traders" />
        </Field>
        <Field label="Tenant Phone">
          <input style={input} value={f.tenantPhone} onChange={(e) => setF({ ...f, tenantPhone: e.target.value })} placeholder="9876543210" />
        </Field>
        <Field label="Monthly Rent (₹)">
          <input style={input} type="number" value={f.monthlyRent} onChange={(e) => setF({ ...f, monthlyRent: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Security Deposit Received (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
        <Field label="Annual Municipal Tax paid by you (₹)" style={{ gridColumn: "1 / -1" }}>
          <input style={input} type="number" value={f.municipalTax} onChange={(e) => setF({ ...f, municipalTax: e.target.value })} placeholder="0 (deducted before 30% std deduction)" />
        </Field>
      </div>
      <ModalActions onSave={() => f.propertyName && onSave(f)} onClose={onClose} saveLabel={initial ? "Update" : "Add Property"} />
    </Modal>
  );
}

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

export function RentedInPropertyModal({ initial, onClose, onSave }: any) {
  const [f, setF] = useState(initial ? {
    owner: initial.owner || "self",
    propertyName: initial.propertyName || "",
    landlordName: initial.landlordName || "",
    landlordPhone: initial.landlordPhone || "",
    monthlyRent: initial.monthlyRent || "",
    securityDeposit: initial.securityDeposit || "",
    agreementStart: initial.agreementStart || "",
    agreementEnd: initial.agreementEnd || "",
    isActive: initial.isActive !== false,
  } : { owner: "self", propertyName: "", landlordName: "", landlordPhone: "", monthlyRent: "", securityDeposit: "", agreementStart: "", agreementEnd: "", isActive: true });
  return (
    <Modal title={initial ? "Edit Rented Property" : "Add Rented Property"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
            {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Property / Address" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.propertyName} onChange={(e) => setF({ ...f, propertyName: e.target.value })} placeholder="e.g. Flat 4B, Green Park" />
        </Field>
        <Field label="Landlord Name">
          <input style={input} value={f.landlordName} onChange={(e) => setF({ ...f, landlordName: e.target.value })} placeholder="e.g. Suresh Mehta" />
        </Field>
        <Field label="Landlord Phone">
          <input style={input} value={f.landlordPhone} onChange={(e) => setF({ ...f, landlordPhone: e.target.value })} placeholder="9876543210" />
        </Field>
        <Field label="Monthly Rent (₹)">
          <input style={input} type="number" value={f.monthlyRent} onChange={(e) => setF({ ...f, monthlyRent: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Security Deposit Paid (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
        <Field label="Status" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.isActive ? "active" : "ended"} onChange={(e) => setF({ ...f, isActive: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="ended">Ended / Vacated</option>
          </select>
        </Field>
      </div>
      <ModalActions onSave={() => f.propertyName && onSave(f)} onClose={onClose} saveLabel={initial ? "Update" : "Add Property"} />
    </Modal>
  );
}
