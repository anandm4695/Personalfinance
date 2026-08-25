// @ts-nocheck
import React, { useState } from "react";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import {
  Building2,
  TrendingUp,
  Landmark,
  Receipt,
  Shield,
  Percent,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Upload,
  AlertCircle,
  Download,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  getEffectiveRent,
  getCurrentTierIndex,
  getMonthsToNextEscalation,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { getCurrentFY } from "../../utils/appConstants";
import {
  RentalPropertyModal,
  RentedInPropertyModal,
  RentalReceiptModal,
  RentalDeductionModal,
  RentalDepositTxModal,
} from "../modals/RentalModals";

interface RentalTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  showToast?: (msg: string, type?: string) => void;
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const RentalTab: React.FC<RentalTabProps> = ({
  state,
  addItem,
  removeItem,
  updateItem,
  showToast,
}) => {
  const [sub, setSub] = useState("out");
  const [modalOut, setModalOut] = useState<{ open: boolean; editing: any }>({
    open: false,
    editing: null,
  });
  const [modalIn, setModalIn] = useState<{ open: boolean; editing: any }>({
    open: false,
    editing: null,
  });

  // Ledger state
  const [expandedLedger, setExpandedLedger] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState<{
    type:
      | "payment"
      | "receipt"
      | "deduction"
      | "deposit_in"
      | "deposit_out"
      | "deposit_return_out"
      | "deposit_return_in";
    property: any;
    editing?: any;
  } | null>(null);
  const [savingLog, setSavingLog] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );

  // CSV Import state
  const [showCsvImport, setShowCsvImport] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  const getOrdinal = (n: number | string) => {
    const num = parseInt(n as string, 10);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getActualSecurityDeposit = (p: any) => {
    if (p.depositTransactions && p.depositTransactions.length > 0) {
      return p.depositTransactions.reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0
      );
    }
    return Number(p.securityDeposit || 0);
  };

  // Sum the escalation-aware effective rent across every month of the given
  // FY (Apr–Mar) instead of multiplying today's effective rent by 12 — the
  // latter silently mis-states the year's expected total whenever an
  // escalation tier boundary falls inside the FY (e.g. rent steps up in
  // August: months before the step were at the old, lower rate).
  const getExpectedFYRent = (p: any, fyStartStr: string) => {
    const [fyStartYear, fyStartMonth] = fyStartStr.slice(0, 7).split("-").map(Number);
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const y = fyStartYear + Math.floor((fyStartMonth - 1 + i) / 12);
      const m = ((fyStartMonth - 1 + i) % 12) + 1;
      total += getEffectiveRent(p, `${y}-${String(m).padStart(2, "0")}`);
    }
    return total;
  };

  // Quote-aware CSV field split — a naive `line.split(",")` breaks the moment
  // a note field contains a comma (e.g. "Paid, part cash part UPI"), even
  // though downloadPropertyCsv below fully quotes such fields on export. This
  // walks the line char-by-char so a comma inside a "..." field doesn't end
  // the field, and an escaped "" inside quotes becomes a literal quote.
  const splitCsvRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const parseCsvText = (text: string, _type: "payment" | "receipt") => {
    setCsvError("");
    setCsvPreview([]);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) return;
      const rows = lines.map((line, i) => {
        const parts = splitCsvRow(line);
        if (parts.length < 2) throw new Error(`Row ${i + 1}: need at least month, amount`);
        const [month, amount, date, note] = parts;
        if (!month.match(/^\d{4}-\d{2}$/))
          throw new Error(`Row ${i + 1}: month must be YYYY-MM (got "${month}")`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        const dt = date || `${month}-05`; // default to 5th of the month if date is omitted
        if (!dt.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${dt}")`);
        if (date && dt.slice(0, 7) !== month)
          throw new Error(`Row ${i + 1}: date ${dt} doesn't match month ${month}`);
        return {
          month,
          amount: amt,
          date: dt,
          note: note || "",
          id: `tx-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const propertiesOut = state.rentalProperties || [];
  const propertiesIn = state.rentedProperties || [];

  const fyLabel = state.profile?.fy || getCurrentFY();
  const fyStart = fyLabel.split("-")[0] + "-04-01";
  const fyEnd = parseInt(fyLabel.split("-")[0]) + 1 + "-03-31";

  const outMonthlyRent = propertiesOut
    .filter((p: any) => p.isActive !== false)
    .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);
  // Escalation-aware annual target — summing each active property's per-month
  // effective rent across the FY, not today's rent × 12 (see getExpectedFYRent
  // comment above: a mid-year escalation step otherwise silently understates
  // or overstates the annual figure shown as the "target"/"commitment").
  const outExpectedFY = propertiesOut
    .filter((p: any) => p.isActive !== false)
    .reduce((s: number, p: any) => s + getExpectedFYRent(p, fyStart), 0);
  const outThisFY = propertiesOut.reduce(
    (s: number, p: any) =>
      s +
      (p.receipts || [])
        .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
        .reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0),
    0
  );
  const outDepositHeld = propertiesOut.reduce(
    (s: number, p: any) =>
      s +
      Math.max(
        0,
        getActualSecurityDeposit(p) -
          (p.depositDeductions || []).reduce(
            (ss: number, dd: any) => ss + Number(dd.amount || 0),
            0
          ) -
          Number(p.depositReturned || 0)
      ),
    0
  );

  const inMonthlyRent = propertiesIn
    .filter((p: any) => p.isActive !== false)
    .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);
  const inExpectedFY = propertiesIn
    .filter((p: any) => p.isActive !== false)
    .reduce((s: number, p: any) => s + getExpectedFYRent(p, fyStart), 0);
  const inThisFY = propertiesIn.reduce(
    (s: number, p: any) =>
      s +
      (p.payments || [])
        .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
        .reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0),
    0
  );
  const inDepositPaid = propertiesIn.reduce(
    (s: number, p: any) =>
      s + Math.max(0, getActualSecurityDeposit(p) - Number(p.depositReturned || 0)),
    0
  );
  const municipalTaxPaid = propertiesOut.reduce(
    (s: number, p: any) => s + Number(p.municipalTax || 0),
    0
  );
  const outPropertyValuation = propertiesOut.reduce(
    (s: number, p: any) => s + Number(p.propertyValue || 0),
    0
  );
  const outTaxableIHP = Math.max(0, outThisFY - municipalTaxPaid) * 0.7;

  // Count-up animation for the two hero (non-StatCard) numbers below. StatCards
  // below animate internally via numericValue/formatValue — pre-animating those
  // too would double-animate (lag chasing lag), so only the raw hero divs use this.
  const animOutMonthlyRent = useAnimatedNumber(outMonthlyRent);
  const animInMonthlyRent = useAnimatedNumber(inMonthlyRent);

  const downloadPropertyCsv = (p: any, type: "receipts" | "payments") => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const items = type === "receipts" ? p.receipts || [] : p.payments || [];
    const rows = [
      "Month,Date,Amount,Note",
      ...items.map((r: any) => [q(r.month), q(r.date), q(r.amount), q(r.note || "")].join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.propertyName}_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddOut = async (data: any) => {
    setSavingProperty(true);
    try {
      await addItem("rentalProperties", {
        ...data,
        receipts: [],
        depositDeductions: [],
        depositReturned: 0,
        depositTransactions: [],
      });
      setModalOut({ open: false, editing: null });
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };
  const handleEditOut = async (data: any) => {
    if (!modalOut.editing) {
      setModalOut({ open: false, editing: null });
      return;
    }
    setSavingProperty(true);
    try {
      await updateItem("rentalProperties", modalOut.editing.id, {
        ...data,
        receipts: modalOut.editing.receipts || [],
        depositDeductions: modalOut.editing.depositDeductions || [],
        depositTransactions: modalOut.editing.depositTransactions || [],
        depositReturned: modalOut.editing.depositReturned || 0,
      });
      setModalOut({ open: false, editing: null });
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };
  const handleAddIn = async (data: any) => {
    setSavingProperty(true);
    try {
      await addItem("rentedProperties", {
        ...data,
        payments: [],
        depositReturned: 0,
        depositTransactions: [],
      });
      setModalIn({ open: false, editing: null });
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };
  const handleEditIn = async (data: any) => {
    if (!modalIn.editing) {
      setModalIn({ open: false, editing: null });
      return;
    }
    setSavingProperty(true);
    try {
      await updateItem("rentedProperties", modalIn.editing.id, {
        ...data,
        payments: modalIn.editing.payments || [],
        depositTransactions: modalIn.editing.depositTransactions || [],
        depositReturned: modalIn.editing.depositReturned || 0,
      });
      setModalIn({ open: false, editing: null });
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };

  // Payment, Receipt, and Deduction Handlers
  const handleAddPayment = async (p: any, paymentData: any) => {
    const updatedPayments = [
      ...(p.payments || []),
      { ...paymentData, id: Math.random().toString(36).substr(2, 9) },
    ];
    setSavingLog(true);
    try {
      await updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemovePayment = (p: any, paymentId: string) => {
    setConfirmRemove({
      message: `Delete this rent payment for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: () => {
        const updatedPayments = (p.payments || []).filter((pay: any) => pay.id !== paymentId);
        updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
      },
    });
  };

  const handleEditPayment = async (p: any, editingId: string, paymentData: any) => {
    const updatedPayments = (p.payments || []).map((pay: any) =>
      pay.id === editingId ? { ...paymentData, id: editingId } : pay
    );
    setSavingLog(true);
    try {
      await updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleAddReceipt = async (p: any, receiptData: any) => {
    const updatedReceipts = [
      ...(p.receipts || []),
      { ...receiptData, id: Math.random().toString(36).substr(2, 9) },
    ];
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save receipt: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveReceipt = (p: any, receiptId: string) => {
    setConfirmRemove({
      message: `Delete this rent receipt for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: () => {
        const updatedReceipts = (p.receipts || []).filter((rec: any) => rec.id !== receiptId);
        updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
      },
    });
  };

  const handleEditReceipt = async (p: any, editingId: string, receiptData: any) => {
    const updatedReceipts = (p.receipts || []).map((rec: any) =>
      rec.id === editingId ? { ...receiptData, id: editingId } : rec
    );
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save receipt: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleEditDeduction = async (p: any, editingId: string, deductionData: any) => {
    const updated = (p.depositDeductions || []).map((d: any) =>
      d.id === editingId ? { ...deductionData, id: editingId } : d
    );
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, { ...p, depositDeductions: updated });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deduction: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleAddDeduction = async (p: any, deductionData: any) => {
    const updatedDeductions = [
      ...(p.depositDeductions || []),
      { ...deductionData, id: Math.random().toString(36).substr(2, 9) },
    ];
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deduction: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveDeduction = (p: any, deductionId: string) => {
    setConfirmRemove({
      message: `Delete this deposit deduction for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: () => {
        const updatedDeductions = (p.depositDeductions || []).filter(
          (dec: any) => dec.id !== deductionId
        );
        updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
      },
    });
  };

  const handleAddDepositIn = async (p: any, depositData: any) => {
    const updated = [
      ...(p.depositTransactions || []),
      { ...depositData, id: Math.random().toString(36).substr(2, 9) },
    ];
    setSavingLog(true);
    try {
      await updateItem("rentedProperties", p.id, { ...p, depositTransactions: updated });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deposit entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveDepositIn = (p: any, depositId: string) => {
    setConfirmRemove({
      message: `Delete this deposit-in entry for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: () => {
        const updated = (p.depositTransactions || []).filter((tx: any) => tx.id !== depositId);
        updateItem("rentedProperties", p.id, { ...p, depositTransactions: updated });
      },
    });
  };

  const handleEditDepositIn = async (p: any, editingId: string, depositData: any) => {
    const updated = (p.depositTransactions || []).map((tx: any) =>
      tx.id === editingId ? { ...depositData, id: editingId } : tx
    );
    setSavingLog(true);
    try {
      await updateItem("rentedProperties", p.id, { ...p, depositTransactions: updated });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deposit entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleAddDepositOut = async (p: any, depositData: any) => {
    const updated = [
      ...(p.depositTransactions || []),
      { ...depositData, id: Math.random().toString(36).substr(2, 9) },
    ];
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, { ...p, depositTransactions: updated });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deposit entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveDepositOut = (p: any, depositId: string) => {
    setConfirmRemove({
      message: `Delete this deposit-out entry for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: () => {
        const updated = (p.depositTransactions || []).filter((tx: any) => tx.id !== depositId);
        updateItem("rentalProperties", p.id, { ...p, depositTransactions: updated });
      },
    });
  };

  // Deposit RETURN handlers — closes the deposit lifecycle (Received →
  // Deductions → Returned). `depositReturned` is a running cumulative total
  // (not a ledger array, matching how every net-worth calc already reads it),
  // so each logged return is additive on top of whatever was returned before.
  // This lets a partial/staggered refund be logged over multiple visits, same
  // as partial deposit receipts.
  const handleReturnDepositOut = async (p: any, data: any) => {
    setSavingLog(true);
    try {
      await updateItem("rentalProperties", p.id, {
        ...p,
        depositReturned: Number(p.depositReturned || 0) + Number(data.amount || 0),
      });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deposit return: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };
  const handleReturnDepositIn = async (p: any, data: any) => {
    setSavingLog(true);
    try {
      await updateItem("rentedProperties", p.id, {
        ...p,
        depositReturned: Number(p.depositReturned || 0) + Number(data.amount || 0),
      });
      setShowLogModal(null);
    } catch (e: any) {
      showToast?.(`Failed to save deposit return: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub={`Track agreements, receipts & deposits for ${fyLabel}`}
        rightElement={
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() =>
              sub === "out"
                ? setModalOut({ open: true, editing: null })
                : setModalIn({ open: true, editing: null })
            }
          >
            {sub === "out" ? "Add Property" : "Add Rented Property"}
          </Button>
        }
      >
        Rental Details
      </SectionTitle>

      <div
        style={{
          display: "inline-flex",
          background: "var(--surface-0)",
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
          border: `1px solid ${THEME.line}`,
        }}
      >
        {[
          { id: "out", label: "Rented Out", count: propertiesOut.length },
          { id: "in", label: "Rented In", count: propertiesIn.length },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSub(s.id);
              setExpandedLedger(null);
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: sub === s.id
                ? "color-mix(in srgb, var(--t-accent) 12%, transparent)"
                : "transparent",
              color: sub === s.id ? "var(--t-accent)" : THEME.muted,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
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
          {propertiesOut.length > 0 && (
            <>
              {/* Monthly Rent is the number a landlord opens this tab to check —
                  gets the hero-card slot (matches FIRE Number / Goals Progress). */}
              <Card
                variant="hero"
                style={{
                  marginBottom: 20,
                  padding: "clamp(24px, 4vw, 36px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <Landmark size={13} /> Monthly Rent Income
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(32px, 5vw, 52px)",
                    fontWeight: 600,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={animOutMonthlyRent} variant="full" />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                  <Money value={outThisFY} variant="full" /> received so far this FY, of{" "}
                  <Money value={outExpectedFY} variant="full" /> expected across {propertiesOut.length}{" "}
                  propert{propertiesOut.length !== 1 ? "ies" : "y"}
                </div>
              </Card>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginBottom: 32,
                }}
              >
                <StatCard
                  label="Property Portfolio"
                  value={fmtINRFull(outPropertyValuation)}
                  numericValue={outPropertyValuation}
                  formatValue={fmtINRFull}
                  sub="Total asset valuation"
                  icon={<Building2 />}
                  color={THEME.violet}
                />
                <StatCard
                  label="Received (FY)"
                  value={fmtINRFull(outThisFY)}
                  numericValue={outThisFY}
                  formatValue={fmtINRFull}
                  sub={
                    <>
                      of <Money value={outExpectedFY} variant="full" /> annual target
                    </>
                  }
                  icon={<TrendingUp />}
                  color={THEME.sage}
                />
                <StatCard
                  label="Deposit Held"
                  value={fmtINRFull(outDepositHeld)}
                  numericValue={outDepositHeld}
                  formatValue={fmtINRFull}
                  sub="Total liability"
                  icon={<Shield />}
                  color={THEME.gold}
                />
                <StatCard
                  label="Taxable IHP"
                  value={fmtINRFull(outTaxableIHP)}
                  numericValue={outTaxableIHP}
                  formatValue={fmtINRFull}
                  sub={
                    municipalTaxPaid > 0
                      ? "After muni tax + 30% deduction"
                      : "Post 30% std deduction"
                  }
                  icon={<Percent />}
                  color={THEME.accent}
                />
              </div>
            </>
          )}

          {propertiesOut.length === 0 ? (
            <EmptyState
              icon={Building2}
              gradient={`linear-gradient(135deg, ${THEME.sage} 0%, color-mix(in srgb, ${THEME.sage} 55%, white) 100%)`}
              dotColor={THEME.sage}
              title="No Properties Rented Out"
              description="Add your shop, flat, or commercial space to track monthly rent receipts, security deposits, and taxable income under IHP."
              pills={[
                "Rent Receipt Ledger",
                "Security Deposit",
                "Taxable IHP Income",
                "Tenant Tracking",
              ]}
              buttonLabel="Add Property"
              onAdd={() => setModalOut({ open: true, editing: null })}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {propertiesOut.map((p: any) => (
                <Card
                  key={p.id}
                  style={{
                    padding: "18px 20px",
                    borderTop: `3px solid ${THEME.accent}`,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Icon Box */}
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <Building2 size={24} color={THEME.accent} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Property name + expiry badge */}
                          {(() => {
                            const todayMs = new Date(today() + "T00:00:00").getTime();
                            const endDate = p.agreementEnd
                              ? new Date(p.agreementEnd + "T00:00:00")
                              : null;
                            const daysToExpiry = endDate
                              ? Math.ceil((endDate.getTime() - todayMs) / 86400000)
                              : null;
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 16,
                                    color: THEME.ink,
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  {p.propertyName}
                                </span>
                                {daysToExpiry !== null && daysToExpiry < 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: THEME.rust,
                                      background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                                      padding: "2px 7px",
                                      borderRadius: 99,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <AlertTriangle size={9} /> Expired
                                  </span>
                                )}
                                {daysToExpiry !== null &&
                                  daysToExpiry >= 0 &&
                                  daysToExpiry <= 30 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: THEME.gold,
                                        background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                                        padding: "2px 7px",
                                        borderRadius: 99,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 3,
                                      }}
                                    >
                                      <Calendar size={9} /> Expiring in {daysToExpiry}d
                                    </span>
                                  )}
                                {p.isActive === false && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: THEME.muted,
                                      background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                      padding: "2px 7px",
                                      borderRadius: 99,
                                    }}
                                  >
                                    Ended
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <div
                            style={{
                              fontSize: 12,
                              color: THEME.muted,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            {/* Show tenant name(s) */}
                            {p.tenants && p.tenants.length > 1 ? (
                              <span>{p.tenants.length} Tenants</span>
                            ) : (
                              <span>{p.tenantName || p.tenants?.[0]?.name || "Vacant"}</span>
                            )}
                            {" · "}
                            <span style={{ color: THEME.accent }}>
                              <Money value={getEffectiveRent(p)} variant="exact" />/mo
                            </span>
                            {p.escalationTiers?.length > 1 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: THEME.accent,
                                  background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  marginLeft: 6,
                                }}
                              >
                                Y{Math.max(1, getCurrentTierIndex(p) + 1)} of{" "}
                                {p.escalationTiers.length}
                              </span>
                            )}
                            {" · "}
                            <span style={{ color: THEME.gold }}>
                              Due: {getOrdinal(p.dueDay ?? 5)} of month
                            </span>
                          </div>
                          {/* Escalation schedule pills */}
                          {p.escalationTiers?.length > 1 && (
                            <div
                              style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}
                            >
                              {p.escalationTiers.map((tier: any, ti: number) => {
                                const tierColors = [
                                  THEME.accent,
                                  THEME.sage,
                                  THEME.gold,
                                  THEME.rust,
                                  THEME.violet,
                                ];
                                const col = tierColors[ti % 5];
                                const isCurrent = getCurrentTierIndex(p) === ti;
                                const mNext =
                                  ti === getCurrentTierIndex(p)
                                    ? getMonthsToNextEscalation(p)
                                    : null;
                                return (
                                  <span
                                    key={ti}
                                    style={{
                                      fontSize: 9,
                                      padding: "2px 7px",
                                      borderRadius: 5,
                                      fontWeight: 700,
                                      background: isCurrent
                                        ? `color-mix(in srgb, ${col} 13%, transparent)`
                                        : `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                      color: isCurrent ? col : THEME.muted,
                                      border: isCurrent
                                        ? `1px solid color-mix(in srgb, ${col} 27%, transparent)`
                                        : "none",
                                    }}
                                  >
                                    Y{ti + 1}: <Money value={tier.amount} variant="exact" />
                                    {isCurrent && mNext !== null && mNext <= 3 && (
                                      <span style={{ marginLeft: 4, color: THEME.gold }}>
                                        · escalates in {mNext}mo
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {/* Multi-tenant split pills */}
                          {p.tenants && p.tenants.length > 1 && (
                            <div
                              style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}
                            >
                              {p.tenants.map((t: any, ti: number) => {
                                const splitColors = [
                                  THEME.accent,
                                  THEME.sage,
                                  THEME.gold,
                                  THEME.rust,
                                  THEME.violet,
                                ];
                                const col = splitColors[ti % 5];
                                return (
                                  <span
                                    key={ti}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      padding: "3px 8px",
                                      borderRadius: 99,
                                      background: `color-mix(in srgb, ${col} 8%, transparent)`,
                                      color: col,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: col,
                                        flexShrink: 0,
                                      }}
                                    />
                                    {t.name || `T${ti + 1}`}: <Money value={t.monthlyRent} variant="exact" />/mo
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalOut({ open: true, editing: p })}
                            style={{ padding: 6 }}
                            title="Edit"
                            aria-label="Edit property"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmRemove({
                                message:
                                  "Delete this property? Its entire receipt and deposit ledger will be deleted too. This cannot be undone.",
                                onConfirm: () => removeItem("rentalProperties", p.id),
                              })
                            }
                            style={{ padding: 6, color: THEME.rust }}
                            title="Delete"
                            aria-label="Delete property"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: `color-mix(in srgb, ${THEME.violet} 7%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${THEME.violet} 22%, transparent)`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                              minHeight: 22,
                              marginBottom: 3,
                            }}
                          >
                            Property Value
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.violet }}>
                            {p.propertyValue ? <Money value={p.propertyValue} variant="full" /> : "—"}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: "color-mix(in srgb, var(--t-sage) 7%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-sage) 22%, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                              minHeight: 22,
                              marginBottom: 3,
                            }}
                          >
                            FY Received
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.sage }}>
                            <Money
                              value={(p.receipts || [])
                                .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
                                .reduce((s: number, r: any) => s + Number(r.amount || 0), 0)}
                              variant="full"
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: "color-mix(in srgb, var(--t-gold) 7%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-gold) 22%, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                              minHeight: 22,
                              marginBottom: 3,
                            }}
                          >
                            Deposit Held
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.gold }}>
                            <Money
                              value={Math.max(
                                0,
                                getActualSecurityDeposit(p) -
                                  (p.depositDeductions || []).reduce(
                                    (ss: number, dd: any) => ss + Number(dd.amount || 0),
                                    0
                                  ) -
                                  Number(p.depositReturned || 0)
                              )}
                              variant="full"
                            />
                          </div>
                          {p.depositTransactions && p.depositTransactions.length > 0 ? (
                            <div
                              style={{
                                fontSize: 9,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              Agreed:{" "}
                              <span style={{ color: THEME.gold }}>
                                <Money value={p.securityDeposit || 0} variant="exact" />
                              </span>
                            </div>
                          ) : p.depositReceivedDate ? (
                            <div
                              style={{
                                fontSize: 9,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              Recd:{" "}
                              <span style={{ color: THEME.gold }}>
                                {fmtDate(p.depositReceivedDate)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* FY collection progress bar */}
                      {(() => {
                        const expected = getExpectedFYRent(p, fyStart);
                        const received = (p.receipts || [])
                          .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
                          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                        const pct = expected > 0 ? Math.min(100, (received / expected) * 100) : 0;
                        if (expected === 0) return null;
                        const barColor =
                          pct >= 100 ? THEME.sage : pct >= 50 ? THEME.accent : THEME.rust;
                        return (
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 10,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginBottom: 4,
                              }}
                            >
                              <span>FY Collection</span>
                              <span style={{ color: barColor }}>
                                {pct.toFixed(0)}% of <Money value={expected} variant="full" /> expected
                              </span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expansion trigger */}
                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <button
                          onClick={() => setExpandedLedger(expandedLedger === p.id ? null : p.id)}
                          aria-expanded={expandedLedger === p.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                            color: THEME.accent,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: 0,
                          }}
                        >
                          <Receipt size={14} />
                          {expandedLedger === p.id ? "Hide Receipt Ledger" : "View Receipt Ledger"}
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLogModal({ type: "deposit_out", property: p });
                            }}
                            style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: `1px solid color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
                              background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                              color: THEME.gold,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Log Partial Deposit Receipt"
                          >
                            <Plus size={11} /> Deposit
                          </button>
                          {(() => {
                            const currMonth = today().slice(0, 7);
                            const alreadyLogged = (p.receipts || []).some(
                              (r: any) => r.month === currMonth
                            );
                            if (alreadyLogged) return null;
                            return (
                              <button
                                onClick={() => setShowLogModal({ type: "receipt", property: p })}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: `1px solid color-mix(in srgb, ${THEME.accent} 27%, transparent)`,
                                  background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                                  color: THEME.accent,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                title={`Quick log rent for ${currMonth}`}
                              >
                                <Plus size={11} /> {currMonth}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Expanded Ledger Section */}
                      {expandedLedger === p.id && (
                        <div
                          style={{
                            marginTop: 16,
                            borderTop: `1px solid ${THEME.line}`,
                            paddingTop: 14,
                            animation: "fade-in 0.25s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                              Logged Receipts
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {(p.receipts || []).length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 11,
                                    color: THEME.muted,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                  onClick={() => downloadPropertyCsv(p, "receipts")}
                                >
                                  <Download size={10} style={{ marginRight: 4 }} /> Export
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  color: THEME.accent,
                                  border: `1px solid color-mix(in srgb, ${THEME.accent} 27%, transparent)`,
                                }}
                                onClick={() => {
                                  if (showCsvImport === p.id) {
                                    setShowCsvImport(null);
                                  } else {
                                    setShowCsvImport(p.id);
                                    setCsvText("");
                                    setCsvPreview([]);
                                    setCsvError("");
                                    setCsvFileName("");
                                  }
                                }}
                              >
                                Bulk Import
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                style={{ padding: "4px 10px", fontSize: 11 }}
                                onClick={() => setShowLogModal({ type: "receipt", property: p })}
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Log Rent
                              </Button>
                            </div>
                          </div>

                          {showCsvImport === p.id && (
                            <div
                              style={{
                                padding: 18,
                                borderRadius: 12,
                                marginBottom: 16,
                                background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 14,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: THEME.accent,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <FileText size={15} /> Bulk Import Receipts
                                </div>
                                <button
                                  onClick={() => {
                                    const template =
                                      "# month, amount, date, note\n# month = YYYY-MM | date = YYYY-MM-DD\n2025-04,25000,2025-04-05,Paid via UPI\n2025-05,25000,2025-05-04,Bank Transfer";
                                    const blob = new Blob([template], { type: "text/csv" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "rent_receipts_template.csv";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    border: `1px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
                                    background: "transparent",
                                    color: THEME.accent,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  Download Template
                                </button>
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  marginBottom: 12,
                                  padding: "8px 12px",
                                  background: "var(--surface-0)",
                                  border: `1px solid ${THEME.line}`,
                                  borderRadius: 8,
                                  lineHeight: 1.6,
                                }}
                              >
                                <b style={{ color: THEME.ink }}>Format:</b>{" "}
                                <code
                                  style={{
                                    background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  month, amount, date, note
                                </code>
                                <br />
                                Example:{" "}
                                <code
                                  style={{
                                    background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  2025-04, 25000, 2025-04-05, Paid via UPI
                                </code>
                              </div>

                              <label
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  padding: "20px 0",
                                  border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  marginBottom: 12,
                                  background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files?.[0];
                                  if (!file) return;
                                  setCsvFileName(file.name);
                                  const r = new FileReader();
                                  r.onload = (ev) => {
                                    const text = ev.target?.result as string;
                                    setCsvText(text);
                                    parseCsvText(text, "receipt");
                                  };
                                  r.readAsText(file);
                                }}
                              >
                                <Upload size={22} color={THEME.accent} />
                                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
                                  {csvFileName || "Drop CSV file here or click to browse"}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted }}>
                                  Supports .csv and .txt files
                                </div>
                                <input
                                  type="file"
                                  accept=".csv,.txt"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setCsvFileName(file.name);
                                    const r = new FileReader();
                                    r.onload = (ev) => {
                                      const text = ev.target?.result as string;
                                      setCsvText(text);
                                      parseCsvText(text, "receipt");
                                    };
                                    r.readAsText(file);
                                  }}
                                />
                              </label>

                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: THEME.muted,
                                  marginBottom: 6,
                                  textAlign: "center",
                                }}
                              >
                                — or paste CSV text below —
                              </div>
                              <textarea
                                aria-label="Pasted CSV text"
                                style={{
                                  width: "100%",
                                  minHeight: 80,
                                  padding: "10px 12px",
                                  background: "var(--surface-0)",
                                  border: `1.5px solid ${THEME.line}`,
                                  borderRadius: 10,
                                  color: THEME.ink,
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                  resize: "vertical",
                                  boxSizing: "border-box",
                                }}
                                value={csvText}
                                onChange={(e) => {
                                  setCsvText(e.target.value);
                                  setCsvPreview([]);
                                  setCsvError("");
                                }}
                                placeholder="2025-04, 25000, 2025-04-05, Paid via UPI&#10;2025-05, 25000, 2025-05-04, Bank Transfer"
                              />

                              <div
                                style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
                              >
                                <button
                                  style={{
                                    padding: "8px 18px",
                                    borderRadius: 8,
                                    border: `1px solid color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
                                    background: "transparent",
                                    color: THEME.accent,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => parseCsvText(csvText, "receipt")}
                                >
                                  Preview Data
                                </button>
                                {csvPreview.length > 0 && (
                                  <button
                                    style={{
                                      padding: "8px 18px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: THEME.accent,
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: "pointer",
                                    }}
                                    disabled={csvImporting}
                                    onClick={async () => {
                                      const nextReceipts = [...(p.receipts || []), ...csvPreview];
                                      setCsvImporting(true);
                                      try {
                                        await updateItem("rentalProperties", p.id, {
                                          ...p,
                                          receipts: nextReceipts,
                                        });
                                        setCsvPreview([]);
                                        setCsvText("");
                                        setCsvFileName("");
                                        setShowCsvImport(null);
                                      } catch (e: any) {
                                        showToast?.(
                                          `Failed to import receipts: ${e?.message || "Unknown error"}`,
                                          "error"
                                        );
                                      } finally {
                                        setCsvImporting(false);
                                      }
                                    }}
                                  >
                                    {csvImporting
                                      ? "Importing…"
                                      : `Import ${csvPreview.length} Row${csvPreview.length !== 1 ? "s" : ""}`}
                                  </button>
                                )}
                              </div>

                              {csvError && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    color: THEME.rust,
                                    fontSize: 12,
                                    padding: "8px 12px",
                                    background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                                    borderRadius: 8,
                                  }}
                                >
                                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
                                  {csvError}
                                </div>
                              )}

                              {csvPreview.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    border: `1px solid ${THEME.line}`,
                                    borderRadius: 10,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: THEME.accent,
                                    }}
                                  >
                                    {csvPreview.length} rows ready — preview:
                                  </div>
                                  <div style={{ maxHeight: 160, overflowY: "auto" }}>
                                    <table
                                      style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        fontSize: 12,
                                      }}
                                    >
                                      <thead>
                                        <tr style={{ background: "var(--surface-0)" }}>
                                          {["Month", "Date", "Amount", "Note"].map((h) => (
                                            <th
                                              key={h}
                                              style={{
                                                padding: "6px 10px",
                                                textAlign: "left",
                                                fontWeight: 600,
                                                fontSize: 10,
                                                color: THEME.muted,
                                              }}
                                            >
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {csvPreview.map((r, i) => (
                                          <tr
                                            key={i}
                                            style={{ borderTop: `1px solid ${THEME.line}` }}
                                          >
                                            <td style={{ padding: "6px 10px" }}>{r.month}</td>
                                            <td style={{ padding: "6px 10px", color: THEME.muted }}>
                                              {r.date}
                                            </td>
                                            <td
                                              style={{
                                                padding: "6px 10px",
                                                fontWeight: 700,
                                                color: THEME.sage,
                              }}
                                            >
                                              +<Money value={r.amount} variant="exact" />
                                            </td>
                                            <td style={{ padding: "6px 10px", color: THEME.muted }}>
                                              {r.note || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {(p.receipts || []).length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "16px 0",
                                color: THEME.muted,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No rent receipts logged yet.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {[...(p.receipts || [])]
                                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                                .map((r: any) => (
                                  <div
                                    key={r.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                      border: `1px solid ${THEME.line}`,
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}
                                      >
                                        {r.month}{" "}
                                        {r.note && (
                                          <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                            ({r.note})
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: THEME.muted,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Received: {fmtDate(r.date)}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span
                                        style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}
                                      >
                                        +<Money value={r.amount} variant="exact" />
                                      </span>
                                      <button
                                        onClick={() =>
                                          setShowLogModal({
                                            type: "receipt",
                                            property: p,
                                            editing: r,
                                          })
                                        }
                                        title="Edit"
                                        aria-label="Edit receipt"
                                        className="icon-btn"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: THEME.muted,
                                          padding: 6,
                                          display: "flex",
                                        }}
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveReceipt(p, r.id)}
                                        title="Delete"
                                        aria-label="Delete receipt"
                                        className="icon-btn danger"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: THEME.rust,
                                          padding: 6,
                                          display: "flex",
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Missing months indicator for "out" */}
                          {(() => {
                            const fyMonths: string[] = [];
                            let d = new Date(fyStart);
                            const fyEndDate = new Date(fyEnd);
                            while (d <= fyEndDate) {
                              fyMonths.push(
                                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                              );
                              d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                            }
                            const loggedMonths = new Set(
                              (p.receipts || []).map((r: any) => r.month)
                            );
                            const missingMonths = fyMonths.filter(
                              (m) => !loggedMonths.has(m) && m <= today().slice(0, 7)
                            );
                            if (missingMonths.length === 0) return null;
                            return (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                                  border: `1px dashed color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: THEME.gold,
                                    marginBottom: 6,
                                  }}
                                >
                                  {missingMonths.length} month
                                  {missingMonths.length !== 1 ? "s" : ""} without receipt:
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {missingMonths.map((m: string) => (
                                    <span
                                      key={m}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        background: `color-mix(in srgb, ${THEME.gold} 9%, transparent)`,
                                        color: THEME.gold,
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── Divider between Receipts & Deposit Ledger ── */}
                          <div style={{ height: 1, background: THEME.line, margin: "16px 0" }} />

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                              Deposit Receipts Ledger
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  color: THEME.rust,
                                  border: `1px solid color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
                                }}
                                onClick={() =>
                                  setShowLogModal({ type: "deposit_return_out", property: p })
                                }
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Return Deposit
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                style={{ padding: "4px 10px", fontSize: 11, background: THEME.gold }}
                                onClick={() => setShowLogModal({ type: "deposit_out", property: p })}
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Log Deposit
                              </Button>
                            </div>
                          </div>

                          {Number(p.depositReturned || 0) > 0 && (
                            <div
                              style={{
                                marginBottom: 10,
                                padding: "8px 12px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                color: THEME.rust,
                                background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                              }}
                            >
                              Returned to tenant so far:{" "}
                              <Money value={p.depositReturned} variant="exact" />
                            </div>
                          )}

                          {(p.depositTransactions || []).length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "16px 0",
                                color: THEME.muted,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No partial deposit receipts logged yet (falling back to agreed lump
                              sum).
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.depositTransactions || []).map((r: any) => (
                                <div
                                  key={r.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}
                                    >
                                      Deposit Received{" "}
                                      {r.note && (
                                        <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                          ({r.note})
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}
                                    >
                                      Date: {fmtDate(r.date)}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span
                                      style={{ fontSize: 13, fontWeight: 800, color: THEME.gold }}
                                    >
                                      +<Money value={r.amount} variant="exact" />
                                    </span>
                                    <button
                                      onClick={() => handleRemoveDepositOut(p, r.id)}
                                      title="Delete"
                                      aria-label="Delete deposit receipt"
                                      className="icon-btn danger"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.rust,
                                        padding: 6,
                                        display: "flex",
                                      }}
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

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                              Deposit Deductions
                            </span>
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
                            <div
                              style={{
                                textAlign: "center",
                                padding: "16px 0",
                                color: THEME.muted,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No deposit deductions logged.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.depositDeductions || []).map((r: any) => (
                                <div
                                  key={r.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}
                                    >
                                      {r.reason}
                                    </div>
                                    <div
                                      style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}
                                    >
                                      Date: {fmtDate(r.date)}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span
                                      style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}
                                    >
                                      -<Money value={r.amount} variant="exact" />
                                    </span>
                                    <button
                                      onClick={() =>
                                        setShowLogModal({
                                          type: "deduction",
                                          property: p,
                                          editing: r,
                                        })
                                      }
                                      title="Edit"
                                      aria-label="Edit deduction"
                                      className="icon-btn"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.muted,
                                        padding: 6,
                                        display: "flex",
                                      }}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveDeduction(p, r.id)}
                                      title="Delete"
                                      aria-label="Delete deduction"
                                      className="icon-btn danger"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.rust,
                                        padding: 6,
                                        display: "flex",
                                      }}
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
          {propertiesIn.length > 0 && (
            <>
              {/* Monthly Rent Paid is the number a tenant opens this tab to check —
                  gets the hero-card slot (matches FIRE Number / Goals Progress). */}
              <Card
                variant="hero"
                style={{
                  marginBottom: 20,
                  padding: "clamp(24px, 4vw, 36px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <Landmark size={13} /> Monthly Rent Paid
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(32px, 5vw, 52px)",
                    fontWeight: 600,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={animInMonthlyRent} variant="full" />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                  <Money value={inThisFY} variant="full" /> paid so far this FY, of{" "}
                  <Money value={inExpectedFY} variant="full" /> expected commitment
                </div>
              </Card>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginBottom: 32,
                }}
              >
                <StatCard
                  label="Paid (FY)"
                  value={fmtINRFull(inThisFY)}
                  numericValue={inThisFY}
                  formatValue={fmtINRFull}
                  sub={
                    <>
                      of <Money value={inExpectedFY} variant="full" /> annual commitment
                    </>
                  }
                  icon={<Receipt />}
                  color={THEME.rust}
                />
                <StatCard
                  label="Deposit Paid"
                  value={fmtINRFull(inDepositPaid)}
                  numericValue={inDepositPaid}
                  formatValue={fmtINRFull}
                  sub="Recoverable asset"
                  icon={<Shield />}
                  color={THEME.sage}
                />
                <StatCard
                  label="HRA Eligible"
                  value={fmtINRFull(inThisFY)}
                  numericValue={inThisFY}
                  formatValue={fmtINRFull}
                  sub="Annual rent paid"
                  icon={<Building2 />}
                  color={THEME.accent}
                />
              </div>
            </>
          )}

          {propertiesIn.length === 0 ? (
            <EmptyState
              icon={Building2}
              gradient={`linear-gradient(135deg, ${THEME.pink} 0%, color-mix(in srgb, ${THEME.pink} 55%, white) 100%)`}
              dotColor={THEME.pink}
              title="No Rented Properties Added"
              description="Add the home or office you rent to track your monthly payments, security deposit recovery, and annual rent paid for HRA claims."
              pills={[
                "Rent Payment Log",
                "HRA Claim Support",
                "Security Deposit",
                "Landlord Details",
              ]}
              buttonLabel="Add Rented Property"
              onAdd={() => setModalIn({ open: true, editing: null })}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {propertiesIn.map((p: any) => (
                <Card
                  key={p.id}
                  style={{
                    padding: "18px 20px",
                    borderTop: `3px solid ${THEME.rust}`,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Icon Box */}
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <Building2 size={24} color={THEME.rust} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Property name + expiry badge */}
                          {(() => {
                            const todayMs = new Date(today() + "T00:00:00").getTime();
                            const endDate = p.agreementEnd
                              ? new Date(p.agreementEnd + "T00:00:00")
                              : null;
                            const daysToExpiry = endDate
                              ? Math.ceil((endDate.getTime() - todayMs) / 86400000)
                              : null;
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 16,
                                    color: THEME.ink,
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  {p.propertyName}
                                </span>
                                {daysToExpiry !== null && daysToExpiry < 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: THEME.rust,
                                      background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                                      padding: "2px 7px",
                                      borderRadius: 99,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <AlertTriangle size={9} /> Expired
                                  </span>
                                )}
                                {daysToExpiry !== null &&
                                  daysToExpiry >= 0 &&
                                  daysToExpiry <= 30 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: THEME.gold,
                                        background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                                        padding: "2px 7px",
                                        borderRadius: 99,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 3,
                                      }}
                                    >
                                      <Calendar size={9} /> Expiring in {daysToExpiry}d
                                    </span>
                                  )}
                                {p.isActive === false && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: THEME.muted,
                                      background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                      padding: "2px 7px",
                                      borderRadius: 99,
                                    }}
                                  >
                                    Ended
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <div
                            style={{
                              fontSize: 12,
                              color: THEME.muted,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            {/* Show landlord name(s) */}
                            {p.landlords && p.landlords.length > 1 ? (
                              <span>{p.landlords.length} Landlords</span>
                            ) : (
                              <span>
                                {p.landlordName || p.landlords?.[0]?.name || "Unknown Landlord"}
                              </span>
                            )}
                            {" · "}
                            <span style={{ color: THEME.rust }}>
                              <Money value={getEffectiveRent(p)} variant="exact" />/mo
                            </span>
                            {p.escalationTiers?.length > 1 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: THEME.rust,
                                  background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  marginLeft: 6,
                                }}
                              >
                                Y{Math.max(1, getCurrentTierIndex(p) + 1)} of{" "}
                                {p.escalationTiers.length}
                              </span>
                            )}
                            {" · "}
                            <span style={{ color: THEME.gold }}>
                              Due: {getOrdinal(p.dueDay ?? 5)} of month
                            </span>
                          </div>
                          {/* Escalation schedule pills */}
                          {p.escalationTiers?.length > 1 && (
                            <div
                              style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}
                            >
                              {p.escalationTiers.map((tier: any, ti: number) => {
                                const tierColors = [
                                  THEME.rust,
                                  THEME.gold,
                                  THEME.accent,
                                  THEME.sage,
                                  THEME.violet,
                                ];
                                const col = tierColors[ti % 5];
                                const isCurrent = getCurrentTierIndex(p) === ti;
                                const mNext =
                                  ti === getCurrentTierIndex(p)
                                    ? getMonthsToNextEscalation(p)
                                    : null;
                                return (
                                  <span
                                    key={ti}
                                    style={{
                                      fontSize: 9,
                                      padding: "2px 7px",
                                      borderRadius: 5,
                                      fontWeight: 700,
                                      background: isCurrent
                                        ? `color-mix(in srgb, ${col} 13%, transparent)`
                                        : `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                      color: isCurrent ? col : THEME.muted,
                                      border: isCurrent
                                        ? `1px solid color-mix(in srgb, ${col} 27%, transparent)`
                                        : "none",
                                    }}
                                  >
                                    Y{ti + 1}: <Money value={tier.amount} variant="exact" />
                                    {isCurrent && mNext !== null && mNext <= 3 && (
                                      <span style={{ marginLeft: 4, color: THEME.gold }}>
                                        · escalates in {mNext}mo
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {/* Multi-landlord split pills */}
                          {p.landlords && p.landlords.length > 1 && (
                            <div
                              style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}
                            >
                              {p.landlords.map((ll: any, li: number) => {
                                const splitColors = [
                                  THEME.accent,
                                  THEME.sage,
                                  THEME.gold,
                                  THEME.rust,
                                  THEME.violet,
                                ];
                                const col = splitColors[li % 5];
                                const share = Math.round(
                                  (Number(ll.splitPct) / 100) * getEffectiveRent(p)
                                );
                                return (
                                  <span
                                    key={li}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      padding: "3px 8px",
                                      borderRadius: 99,
                                      background: `color-mix(in srgb, ${col} 8%, transparent)`,
                                      color: col,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: col,
                                        flexShrink: 0,
                                      }}
                                    />
                                    {ll.name || `L${li + 1}`}: <Money value={share} variant="full" />/mo (
                                    {ll.splitPct}%)
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalIn({ open: true, editing: p })}
                            style={{ padding: 6 }}
                            title="Edit"
                            aria-label="Edit property"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmRemove({
                                message:
                                  "Delete this property? Its entire payment/deduction ledger will be deleted too. This cannot be undone.",
                                onConfirm: () => removeItem("rentedProperties", p.id),
                              })
                            }
                            style={{ padding: 6, color: THEME.rust }}
                            title="Delete"
                            aria-label="Delete property"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: "color-mix(in srgb, var(--t-rust) 7%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-rust) 22%, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                              minHeight: 22,
                              marginBottom: 3,
                            }}
                          >
                            FY Paid
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.rust }}>
                            <Money
                              value={(p.payments || [])
                                .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
                                .reduce((s: number, r: any) => s + Number(r.amount || 0), 0)}
                              variant="full"
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: "color-mix(in srgb, var(--t-sage) 7%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-sage) 22%, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                              minHeight: 22,
                              marginBottom: 3,
                            }}
                          >
                            Deposit Paid
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.sage }}>
                            <Money
                              value={Math.max(0, getActualSecurityDeposit(p) - (p.depositReturned || 0))}
                              variant="full"
                            />
                          </div>
                          {p.depositTransactions && p.depositTransactions.length > 0 ? (
                            <div
                              style={{
                                fontSize: 9,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              Agreed:{" "}
                              <span style={{ color: THEME.sage }}>
                                <Money value={p.securityDeposit || 0} variant="exact" />
                              </span>
                            </div>
                          ) : p.depositPaidDate ? (
                            <div
                              style={{
                                fontSize: 9,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              Paid:{" "}
                              <span style={{ color: THEME.sage }}>
                                {fmtDate(p.depositPaidDate)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* FY payment progress bar */}
                      {(() => {
                        const expected = getExpectedFYRent(p, fyStart);
                        const paid = (p.payments || [])
                          .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
                          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                        const pct = expected > 0 ? Math.min(100, (paid / expected) * 100) : 0;
                        if (expected === 0) return null;
                        const barColor =
                          pct >= 100 ? THEME.sage : pct >= 50 ? THEME.accent : THEME.rust;
                        return (
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 10,
                                color: THEME.muted,
                                fontWeight: 700,
                                marginBottom: 4,
                              }}
                            >
                              <span>FY Payments</span>
                              <span style={{ color: barColor }}>
                                {pct.toFixed(0)}% of <Money value={expected} variant="full" /> expected
                              </span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expansion trigger */}
                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <button
                          onClick={() => setExpandedLedger(expandedLedger === p.id ? null : p.id)}
                          aria-expanded={expandedLedger === p.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                            color: THEME.rust,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: 0,
                          }}
                        >
                          <Receipt size={14} />
                          {expandedLedger === p.id ? "Hide Payment Ledger" : "View Payment Ledger"}
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLogModal({ type: "deposit_in", property: p });
                            }}
                            style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: `1px solid color-mix(in srgb, ${THEME.sage} 27%, transparent)`,
                              background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                              color: THEME.sage,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Log Partial Deposit Payment"
                          >
                            <Plus size={11} /> Deposit
                          </button>
                          {(() => {
                            const currMonth = today().slice(0, 7);
                            const alreadyLogged = (p.payments || []).some(
                              (r: any) => r.month === currMonth
                            );
                            if (alreadyLogged) return null;
                            return (
                              <button
                                onClick={() => setShowLogModal({ type: "payment", property: p })}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: `1px solid color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
                                  background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                                  color: THEME.rust,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                title={`Quick log rent for ${currMonth}`}
                              >
                                <Plus size={11} /> {currMonth}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Expanded Ledger Section */}
                      {expandedLedger === p.id && (
                        <div
                          style={{
                            marginTop: 16,
                            borderTop: `1px solid ${THEME.line}`,
                            paddingTop: 14,
                            animation: "fade-in 0.25s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                              Logged Payments
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {(p.payments || []).length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 11,
                                    color: THEME.muted,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                  onClick={() => downloadPropertyCsv(p, "payments")}
                                >
                                  <Download size={10} style={{ marginRight: 4 }} /> Export
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  color: THEME.rust,
                                  border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                                }}
                                onClick={() => {
                                  if (showCsvImport === p.id) {
                                    setShowCsvImport(null);
                                  } else {
                                    setShowCsvImport(p.id);
                                    setCsvText("");
                                    setCsvPreview([]);
                                    setCsvError("");
                                    setCsvFileName("");
                                  }
                                }}
                              >
                                Bulk Import
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  background: THEME.rust,
                                }}
                                onClick={() => setShowLogModal({ type: "payment", property: p })}
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Log Rent
                              </Button>
                            </div>
                          </div>

                          {showCsvImport === p.id && (
                            <div
                              style={{
                                padding: 18,
                                borderRadius: 12,
                                marginBottom: 16,
                                background: `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${THEME.rust} 22%, transparent)`,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 14,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: THEME.rust,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <FileText size={15} /> Bulk Import Payments
                                </div>
                                <button
                                  onClick={() => {
                                    const template =
                                      "# month, amount, date, note\n# month = YYYY-MM | date = YYYY-MM-DD\n2025-04,25000,2025-04-05,Paid via UPI\n2025-05,25000,2025-05-04,Bank Transfer";
                                    const blob = new Blob([template], { type: "text/csv" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "rent_payments_template.csv";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                                    background: "transparent",
                                    color: THEME.rust,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  Download Template
                                </button>
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  marginBottom: 12,
                                  padding: "8px 12px",
                                  background: "var(--surface-0)",
                                  border: `1px solid ${THEME.line}`,
                                  borderRadius: 8,
                                  lineHeight: 1.6,
                                }}
                              >
                                <b style={{ color: THEME.ink }}>Format:</b>{" "}
                                <code
                                  style={{
                                    background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  month, amount, date, note
                                </code>
                                <br />
                                Example:{" "}
                                <code
                                  style={{
                                    background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  2025-04, 25000, 2025-04-05, Paid via UPI
                                </code>
                              </div>

                              <label
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  padding: "20px 0",
                                  border: `1.5px dashed color-mix(in srgb, ${THEME.rust} 40%, transparent)`,
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  marginBottom: 12,
                                  background: `color-mix(in srgb, ${THEME.rust} 3%, transparent)`,
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files?.[0];
                                  if (!file) return;
                                  setCsvFileName(file.name);
                                  const r = new FileReader();
                                  r.onload = (ev) => {
                                    const text = ev.target?.result as string;
                                    setCsvText(text);
                                    parseCsvText(text, "payment");
                                  };
                                  r.readAsText(file);
                                }}
                              >
                                <Upload size={22} color={THEME.rust} />
                                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.rust }}>
                                  {csvFileName || "Drop CSV file here or click to browse"}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted }}>
                                  Supports .csv and .txt files
                                </div>
                                <input
                                  type="file"
                                  accept=".csv,.txt"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setCsvFileName(file.name);
                                    const r = new FileReader();
                                    r.onload = (ev) => {
                                      const text = ev.target?.result as string;
                                      setCsvText(text);
                                      parseCsvText(text, "payment");
                                    };
                                    r.readAsText(file);
                                  }}
                                />
                              </label>

                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: THEME.muted,
                                  marginBottom: 6,
                                  textAlign: "center",
                                }}
                              >
                                — or paste CSV text below —
                              </div>
                              <textarea
                                aria-label="Pasted CSV text"
                                style={{
                                  width: "100%",
                                  minHeight: 80,
                                  padding: "10px 12px",
                                  background: "var(--surface-0)",
                                  border: `1.5px solid ${THEME.line}`,
                                  borderRadius: 10,
                                  color: THEME.ink,
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                  resize: "vertical",
                                  boxSizing: "border-box",
                                }}
                                value={csvText}
                                onChange={(e) => {
                                  setCsvText(e.target.value);
                                  setCsvPreview([]);
                                  setCsvError("");
                                }}
                                placeholder="2025-04, 25000, 2025-04-05, Paid via UPI&#10;2025-05, 25000, 2025-05-04, Bank Transfer"
                              />

                              <div
                                style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
                              >
                                <button
                                  style={{
                                    padding: "8px 18px",
                                    borderRadius: 8,
                                    border: `1px solid color-mix(in srgb, ${THEME.rust} 40%, transparent)`,
                                    background: "transparent",
                                    color: THEME.rust,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => parseCsvText(csvText, "payment")}
                                >
                                  Preview Data
                                </button>
                                {csvPreview.length > 0 && (
                                  <button
                                    style={{
                                      padding: "8px 18px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: THEME.rust,
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: "pointer",
                                    }}
                                    disabled={csvImporting}
                                    onClick={async () => {
                                      const nextPayments = [...(p.payments || []), ...csvPreview];
                                      setCsvImporting(true);
                                      try {
                                        await updateItem("rentedProperties", p.id, {
                                          ...p,
                                          payments: nextPayments,
                                        });
                                        setCsvPreview([]);
                                        setCsvText("");
                                        setCsvFileName("");
                                        setShowCsvImport(null);
                                      } catch (e: any) {
                                        showToast?.(
                                          `Failed to import payments: ${e?.message || "Unknown error"}`,
                                          "error"
                                        );
                                      } finally {
                                        setCsvImporting(false);
                                      }
                                    }}
                                  >
                                    {csvImporting
                                      ? "Importing…"
                                      : `Import ${csvPreview.length} Row${csvPreview.length !== 1 ? "s" : ""}`}
                                  </button>
                                )}
                              </div>

                              {csvError && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    color: THEME.rust,
                                    fontSize: 12,
                                    padding: "8px 12px",
                                    background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                                    borderRadius: 8,
                                  }}
                                >
                                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
                                  {csvError}
                                </div>
                              )}

                              {csvPreview.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    border: `1px solid ${THEME.line}`,
                                    borderRadius: 10,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      background: `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: THEME.rust,
                                    }}
                                  >
                                    {csvPreview.length} rows ready — preview:
                                  </div>
                                  <div style={{ maxHeight: 160, overflowY: "auto" }}>
                                    <table
                                      style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        fontSize: 12,
                                      }}
                                    >
                                      <thead>
                                        <tr style={{ background: "var(--surface-0)" }}>
                                          {["Month", "Date", "Amount", "Note"].map((h) => (
                                            <th
                                              key={h}
                                              style={{
                                                padding: "6px 10px",
                                                textAlign: "left",
                                                fontWeight: 600,
                                                fontSize: 10,
                                                color: THEME.muted,
                                              }}
                                            >
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {csvPreview.map((r, i) => (
                                          <tr
                                            key={i}
                                            style={{ borderTop: `1px solid ${THEME.line}` }}
                                          >
                                            <td style={{ padding: "6px 10px" }}>{r.month}</td>
                                            <td style={{ padding: "6px 10px", color: THEME.muted }}>
                                              {r.date}
                                            </td>
                                            <td
                                              style={{
                                                padding: "6px 10px",
                                                fontWeight: 700,
                                                color: THEME.rust,
                                              }}
                                            >
                                              -<Money value={r.amount} variant="exact" />
                                            </td>
                                            <td style={{ padding: "6px 10px", color: THEME.muted }}>
                                              {r.note || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {(p.payments || []).length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "16px 0",
                                color: THEME.muted,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No rent payments logged yet.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {[...(p.payments || [])]
                                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                                .map((r: any) => (
                                  <div
                                    key={r.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                      border: `1px solid ${THEME.line}`,
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}
                                      >
                                        {r.month}{" "}
                                        {r.note && (
                                          <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                            ({r.note})
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: THEME.muted,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Paid: {fmtDate(r.date)}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span
                                        style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}
                                      >
                                        -<Money value={r.amount} variant="exact" />
                                      </span>
                                      <button
                                        onClick={() =>
                                          setShowLogModal({
                                            type: "payment",
                                            property: p,
                                            editing: r,
                                          })
                                        }
                                        title="Edit"
                                        aria-label="Edit payment"
                                        className="icon-btn"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: THEME.muted,
                                          padding: 6,
                                          display: "flex",
                                        }}
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleRemovePayment(p, r.id)}
                                        title="Delete"
                                        aria-label="Delete payment"
                                        className="icon-btn danger"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: THEME.rust,
                                          padding: 6,
                                          display: "flex",
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Missing months indicator for "in" */}
                          {(() => {
                            const fyMonths: string[] = [];
                            let d = new Date(fyStart);
                            const fyEndDate = new Date(fyEnd);
                            while (d <= fyEndDate) {
                              fyMonths.push(
                                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                              );
                              d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                            }
                            const loggedMonths = new Set(
                              (p.payments || []).map((r: any) => r.month)
                            );
                            const missingMonths = fyMonths.filter(
                              (m) => !loggedMonths.has(m) && m <= today().slice(0, 7)
                            );
                            if (missingMonths.length === 0) return null;
                            return (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                                  border: `1px dashed color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: THEME.rust,
                                    marginBottom: 6,
                                  }}
                                >
                                  {missingMonths.length} month
                                  {missingMonths.length !== 1 ? "s" : ""} without payment:
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {missingMonths.map((m: string) => (
                                    <span
                                      key={m}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        background: `color-mix(in srgb, ${THEME.rust} 9%, transparent)`,
                                        color: THEME.rust,
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── Divider between Rent Payments & Deposit Ledger ── */}
                          <div style={{ height: 1, background: THEME.line, margin: "16px 0" }} />

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                              Deposit Payments Ledger
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  color: THEME.sage,
                                  border: `1px solid color-mix(in srgb, ${THEME.sage} 27%, transparent)`,
                                }}
                                onClick={() =>
                                  setShowLogModal({ type: "deposit_return_in", property: p })
                                }
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Log Refund Received
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                style={{ padding: "4px 10px", fontSize: 11, background: THEME.sage }}
                                onClick={() => setShowLogModal({ type: "deposit_in", property: p })}
                              >
                                <Plus size={10} style={{ marginRight: 4 }} /> Log Deposit
                              </Button>
                            </div>
                          </div>

                          {Number(p.depositReturned || 0) > 0 && (
                            <div
                              style={{
                                marginBottom: 10,
                                padding: "8px 12px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                color: THEME.sage,
                                background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                              }}
                            >
                              Refunded to you so far: <Money value={p.depositReturned} variant="exact" />
                            </div>
                          )}

                          {(p.depositTransactions || []).length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "16px 0",
                                color: THEME.muted,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No partial deposit payments logged yet (falling back to agreed lump
                              sum).
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(p.depositTransactions || []).map((r: any) => (
                                <div
                                  key={r.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}
                                    >
                                      Deposit Paid{" "}
                                      {r.note && (
                                        <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                          ({r.note})
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}
                                    >
                                      Date: {fmtDate(r.date)}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span
                                      style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}
                                    >
                                      -<Money value={r.amount} variant="exact" />
                                    </span>
                                    <button
                                      onClick={() =>
                                        setShowLogModal({
                                          type: "deposit_in",
                                          property: p,
                                          editing: r,
                                        })
                                      }
                                      title="Edit"
                                      aria-label="Edit deposit payment"
                                      className="icon-btn"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.muted,
                                        padding: 6,
                                        display: "flex",
                                      }}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveDepositIn(p, r.id)}
                                      title="Delete"
                                      aria-label="Delete deposit payment"
                                      className="icon-btn danger"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.rust,
                                        padding: 6,
                                        display: "flex",
                                      }}
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

      {/* Net Rental P&L */}
      {(propertiesOut.length > 0 || propertiesIn.length > 0) && (
        <div
          style={{
            marginTop: 36,
            padding: "20px 24px",
            borderRadius: 16,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={15} color={THEME.accent} /> Rental P&L · FY {fyLabel}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: "Income Received", value: outThisFY, color: THEME.sage, sign: "+" },
              { label: "Rent Paid Out", value: inThisFY, color: THEME.rust, sign: "-" },
              {
                label: "Net Cashflow",
                value: outThisFY - inThisFY,
                color: outThisFY >= inThisFY ? THEME.sage : THEME.rust,
                sign: outThisFY >= inThisFY ? "+" : "-",
              },
            ].map(({ label, value, color, sign }) => (
              <div
                key={label}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${color} 4%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 13%, transparent)`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    lineHeight: 1.3,
                    minHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>
                  {value !== 0
                    ? label === "Net Cashflow"
                      ? outThisFY >= inThisFY
                        ? "+"
                        : "-"
                      : sign
                    : ""}
                  <Money value={Math.abs(value)} variant="full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOut.open && (
        <RentalPropertyModal
          initial={modalOut.editing}
          onClose={() => setModalOut({ open: false, editing: null })}
          onSave={modalOut.editing ? handleEditOut : handleAddOut}
          saving={savingProperty}
        />
      )}
      {modalIn.open && (
        <RentedInPropertyModal
          initial={modalIn.editing}
          onClose={() => setModalIn({ open: false, editing: null })}
          onSave={modalIn.editing ? handleEditIn : handleAddIn}
          saving={savingProperty}
        />
      )}

      {/* Log / Edit Payment Modal (Rented In) */}
      {showLogModal && showLogModal.type === "payment" && (
        <RentalReceiptModal
          title={showLogModal.editing ? "Edit Rent Payment" : "Log Rent Payment"}
          amountLabel="Amount Paid (₹)"
          saveLabel={showLogModal.editing ? "Update Payment" : "Log Payment"}
          initial={showLogModal.editing}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            showLogModal.editing
              ? handleEditPayment(showLogModal.property, showLogModal.editing.id, data)
              : handleAddPayment(showLogModal.property, data)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Receipt Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "receipt" && (
        <RentalReceiptModal
          title={showLogModal.editing ? "Edit Rent Receipt" : "Log Rent Receipt"}
          amountLabel="Amount Received (₹)"
          saveLabel={showLogModal.editing ? "Update Receipt" : "Log Receipt"}
          initial={showLogModal.editing}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            showLogModal.editing
              ? handleEditReceipt(showLogModal.property, showLogModal.editing.id, data)
              : handleAddReceipt(showLogModal.property, data)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Deduction Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "deduction" && (
        <RentalDeductionModal
          initial={showLogModal.editing}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            showLogModal.editing
              ? handleEditDeduction(showLogModal.property, showLogModal.editing.id, data)
              : handleAddDeduction(showLogModal.property, data)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Deposit Payment Modal (Rented In) */}
      {showLogModal && showLogModal.type === "deposit_in" && (
        <RentalDepositTxModal
          title={showLogModal.editing ? "Edit Deposit Payment" : "Log Deposit Payment (Rent In)"}
          amountLabel="Deposit Amount Paid (₹)"
          saveLabel={showLogModal.editing ? "Update Deposit" : "Log Deposit Payment"}
          initial={showLogModal.editing}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            showLogModal.editing
              ? handleEditDepositIn(showLogModal.property, showLogModal.editing.id, data)
              : handleAddDepositIn(showLogModal.property, data)
          }
          saving={savingLog}
        />
      )}

      {/* Log Deposit Receipt Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "deposit_out" && (
        <RentalDepositTxModal
          title="Log Deposit Receipt (Rent Out)"
          amountLabel="Deposit Amount Received (₹)"
          saveLabel="Log Deposit Receipt"
          onClose={() => setShowLogModal(null)}
          onSave={(data) => handleAddDepositOut(showLogModal.property, data)}
          saving={savingLog}
        />
      )}

      {/* Log Deposit Return Modal (Rented Out — landlord refunding tenant) */}
      {showLogModal && showLogModal.type === "deposit_return_out" && (
        <RentalDepositTxModal
          title="Log Deposit Return to Tenant"
          amountLabel="Amount Returned (₹)"
          saveLabel="Log Return"
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) => handleReturnDepositOut(showLogModal.property, data)}
          saving={savingLog}
        />
      )}

      {/* Log Deposit Return Modal (Rented In — landlord refunding you) */}
      {showLogModal && showLogModal.type === "deposit_return_in" && (
        <RentalDepositTxModal
          title="Log Deposit Refund Received"
          amountLabel="Amount Refunded to You (₹)"
          saveLabel="Log Refund"
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) => handleReturnDepositIn(showLogModal.property, data)}
          saving={savingLog}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          message={confirmRemove.message}
          onConfirm={() => {
            confirmRemove.onConfirm();
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
};
