import React, { useState } from "react";
import {
  Modal,
  ModalActions,
} from "../ui/Modal";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
} from "../../utils/finance";
import {
  Receipt,
  Shield,
  Upload,
  Download,
  FileText,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  Copy,
  Check,
  Building2,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";

interface RentalLedgerModalProps {
  property: any;
  type: "out" | "in";
  initialTab?: "rent" | "deposit" | "csv" | "hra";
  bankAccounts?: any[];
  fyStart: string;
  fyEnd: string;
  onClose: () => void;
  onLogRent: (property: any, editingItem?: any) => void;
  onRemoveRent: (property: any, id: string) => void;
  onLogDeposit: (property: any, editingItem?: any) => void;
  onRemoveDeposit: (property: any, id: string) => void;
  onLogDeduction: (property: any, editingItem?: any) => void;
  onRemoveDeduction: (property: any, id: string) => void;
  onReturnDeposit: (property: any) => void;
  onBulkImport: (property: any, rows: any[]) => Promise<void>;
  onExportCsv: (property: any, type: "receipts" | "payments") => void;
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

export const RentalLedgerModal: React.FC<RentalLedgerModalProps> = ({
  property: p,
  type,
  initialTab = "rent",
  bankAccounts = [],
  fyStart,
  fyEnd,
  onClose,
  onLogRent,
  onRemoveRent,
  onLogDeposit,
  onRemoveDeposit,
  onLogDeduction,
  onRemoveDeduction,
  onReturnDeposit,
  onBulkImport,
  onExportCsv,
}) => {
  const isOut = type === "out";
  const primaryColor = isOut ? THEME.accent : THEME.rust;
  const [tab, setTab] = useState<"rent" | "deposit" | "csv" | "hra">(initialTab);

  // CSV Import State
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [copiedHra, setCopiedHra] = useState(false);

  const rentItems = (isOut ? p.receipts : p.payments) || [];
  const sortedRentItems = [...rentItems].sort((a, b) =>
    (b.date || b.month || "").localeCompare(a.date || a.month || "")
  );

  // Missing months detection
  const fyMonths: string[] = [];
  let d = new Date(fyStart);
  const fyEndDate = new Date(fyEnd);
  while (d <= fyEndDate) {
    fyMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  const loggedMonths = new Set(rentItems.map((r: any) => r.month));
  const missingMonths = fyMonths.filter(
    (m) => !loggedMonths.has(m) && m <= today().slice(0, 7)
  );

  // Deposit calculations
  const actualDeposit =
    p.depositTransactions && p.depositTransactions.length > 0
      ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
      : Number(p.securityDeposit || 0);
  const totalDeductions = (p.depositDeductions || []).reduce(
    (s: number, dec: any) => s + Number(dec.amount || 0),
    0
  );
  const depositReturned = Number(p.depositReturned || 0);
  const netDepositHeld = Math.max(0, actualDeposit - totalDeductions - depositReturned);

  // CSV Parsing
  const handleParseCsv = (text: string) => {
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
        const dt = date || `${month}-05`;
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

  const handleExecuteImport = async () => {
    if (!csvPreview.length) return;
    setCsvImporting(true);
    try {
      await onBulkImport(p, csvPreview);
      setCsvPreview([]);
      setCsvText("");
      setCsvFileName("");
      setTab("rent");
    } finally {
      setCsvImporting(false);
    }
  };

  // HRA Copy handler
  const handleCopyHraSummary = () => {
    const landlordName = p.landlordName || p.landlords?.[0]?.name || "N/A";
    const landlordPan = p.landlordPan || p.landlords?.[0]?.pan || "N/A";
    const totalPaid = sortedRentItems.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const summary = `=== HRA RENT DECLARATION ===\nProperty: ${p.propertyName}\nLandlord: ${landlordName}\nLandlord PAN: ${landlordPan}\nTotal Rent Paid (FY): ₹${totalPaid.toLocaleString("en-IN")}\n\nBreakdown:\n${sortedRentItems
      .map((r: any) => `${r.month}: ₹${Number(r.amount).toLocaleString("en-IN")} (Paid on ${r.date})`)
      .join("\n")}`;
    navigator.clipboard.writeText(summary);
    setCopiedHra(true);
    setTimeout(() => setCopiedHra(false), 2500);
  };

  return (
    <Modal
      title={`${p.propertyName} — Ledger & Audit Details`}
      onClose={onClose}
      maxWidth={780}
    >
      {/* ── Modal Tabs ── */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${THEME.line}`,
          marginBottom: 18,
          gap: 4,
          overflowX: "auto",
        }}
      >
        {[
          { id: "rent", label: isOut ? "Rent Receipts" : "Rent Payments", icon: Receipt, count: rentItems.length },
          { id: "deposit", label: "Security Deposit", icon: Shield, count: (p.depositTransactions || []).length + (p.depositDeductions || []).length },
          { id: "csv", label: "Bulk CSV Import", icon: Upload },
          ...(!isOut ? [{ id: "hra", label: "HRA Tax Proof", icon: FileText }] : []),
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                borderBottom: active ? `2.5px solid ${primaryColor}` : `2.5px solid transparent`,
                color: active ? primaryColor : THEME.muted,
                fontWeight: active ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <Badge
                  variant={active ? "accent" : "muted"}
                  style={{
                    fontSize: 10,
                    padding: "1px 5px",
                    background: active ? primaryColor : undefined,
                    color: active ? "#fff" : undefined,
                  }}
                >
                  {t.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: RENT LEDGER (RECEIPTS / PAYMENTS) ── */}
      {tab === "rent" && (
        <div>
          {/* Missing months banner with 1-click quick-log */}
          {missingMonths.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 800,
                  color: THEME.gold,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={15} /> {missingMonths.length} missing month
                  {missingMonths.length !== 1 ? "s" : ""} without logged {isOut ? "receipt" : "payment"}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {missingMonths.map((m) => (
                  <button
                    key={m}
                    onClick={() => onLogRent(p, { month: m, amount: p.monthlyRent || "", date: `${m}-05` })}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
                      color: THEME.gold,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title={`Log rent for ${m}`}
                  >
                    <Plus size={11} /> Log {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
              Logged {isOut ? "Rent Receipts" : "Rent Payments"} ({rentItems.length})
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {rentItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportCsv(p, isOut ? "receipts" : "payments")}
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  <Download size={13} style={{ marginRight: 4 }} /> Export CSV
                </Button>
              )}
              <Button
                variant="accent"
                size="sm"
                onClick={() => onLogRent(p)}
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  background: isOut ? THEME.accent : THEME.rust,
                }}
              >
                <Plus size={13} style={{ marginRight: 4 }} /> Log {isOut ? "Receipt" : "Payment"}
              </Button>
            </div>
          </div>

          {/* Table / List */}
          {sortedRentItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 0",
                color: THEME.muted,
                background: "var(--surface-1)",
                borderRadius: 12,
                border: `1px dashed ${THEME.line}`,
              }}
            >
              <Receipt size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>No entries recorded yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Click &quot;Log {isOut ? "Receipt" : "Payment"}&quot; or use Bulk Import to add records.
              </div>
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                overflow: "hidden",
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}` }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: THEME.muted, fontWeight: 700, fontSize: 11 }}>Month</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: THEME.muted, fontWeight: 700, fontSize: 11 }}>Date Paid</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: THEME.muted, fontWeight: 700, fontSize: 11 }}>Amount</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: THEME.muted, fontWeight: 700, fontSize: 11 }}>Note</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", color: THEME.muted, fontWeight: 700, fontSize: 11 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRentItems.map((r: any) => {
                    const bank = bankAccounts.find((b: any) => b.id === r.bankAccountId);
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: THEME.ink }}>{r.month}</td>
                        <td style={{ padding: "10px 14px", color: THEME.muted }}>{fmtDate(r.date)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 800, color: isOut ? THEME.sage : THEME.rust }}>
                          {isOut ? "+" : "-"}
                          <Money value={r.amount} variant="exact" />
                        </td>
                        <td style={{ padding: "10px 14px", color: THEME.muted }}>
                          <span>{r.note || "—"}</span>
                          {bank && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                color: primaryColor,
                                background: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                                padding: "2px 6px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title={`Synced with ${bank.bankName}`}
                            >
                              <Building2 size={11} /> {bank.bankName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 4 }}>
                            <button
                              onClick={() => onLogRent(p, r)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => onRemoveRent(p, r.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SECURITY DEPOSIT LIFECYCLE ── */}
      {tab === "deposit" && (
        <div>
          {/* Deposit Lifecycle Flow Summary Card */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.gold} 6%, var(--surface-1))`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: THEME.gold, marginBottom: 12 }}>
              Security Deposit Audit Lifecycle
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  {isOut ? "Agreed Deposit" : "Agreed Advance"}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: THEME.ink, marginTop: 2 }}>
                  <Money value={p.securityDeposit || 0} variant="full" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  {isOut ? "Received to Date" : "Paid to Date"}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: THEME.gold, marginTop: 2 }}>
                  <Money value={actualDeposit} variant="full" />
                </div>
              </div>
              {isOut && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Deductions / Damage
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: THEME.rust, marginTop: 2 }}>
                    -<Money value={totalDeductions} variant="full" />
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  {isOut ? "Refunded to Tenant" : "Refunded to You"}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: THEME.ink, marginTop: 2 }}>
                  <Money value={depositReturned} variant="full" />
                </div>
              </div>
              <div style={{ borderLeft: `1.5px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`, paddingLeft: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: THEME.gold, textTransform: "uppercase" }}>
                  {isOut ? "Net Held in Trust" : "Net Paid (Pending Recovery)"}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: THEME.gold, marginTop: 2 }}>
                  <Money value={netDepositHeld} variant="full" />
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Installments / Tranches Log */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                {isOut ? "Deposit Receipts / Tranches" : "Deposit Payment Receipts"}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReturnDeposit(p)}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  <ArrowDownRight size={11} style={{ marginRight: 3 }} /> {isOut ? "Refund Tenant" : "Log Refund Received"}
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onLogDeposit(p)}
                  style={{ fontSize: 11, padding: "4px 10px", background: THEME.gold }}
                >
                  <Plus size={11} style={{ marginRight: 3 }} /> Log Installment
                </Button>
              </div>
            </div>

            {(p.depositTransactions || []).length === 0 ? (
              <div style={{ padding: "14px 16px", background: "var(--surface-1)", borderRadius: 8, fontSize: 12, color: THEME.muted }}>
                No multi-tranche deposit payments logged. Using agreed lump sum of <Money value={p.securityDeposit || 0} variant="exact" />.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(p.depositTransactions || []).map((t: any) => {
                  const bank = bankAccounts.find((b: any) => b.id === t.bankAccountId);
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                          {t.note || "Security Deposit Installment"}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span>Date: {fmtDate(t.date)}</span>
                          {bank && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: THEME.gold,
                                background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                                padding: "1px 5px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title={`Synced with ${bank.bankName}`}
                            >
                              <Building2 size={11} /> {bank.bankName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.gold }}>
                          +<Money value={t.amount} variant="exact" />
                        </span>
                        <button
                          onClick={() => onRemoveDeposit(p, t.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deductions Section (Rented Out only) */}
          {isOut && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Deposit Deductions (Repairs / Painting / Penalties)
                </span>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onLogDeduction(p)}
                  style={{ fontSize: 11, padding: "4px 10px", background: THEME.rust }}
                >
                  <Plus size={11} style={{ marginRight: 3 }} /> Add Deduction
                </Button>
              </div>

              {(p.depositDeductions || []).length === 0 ? (
                <div style={{ padding: "14px 16px", background: "var(--surface-1)", borderRadius: 8, fontSize: 12, color: THEME.muted }}>
                  No deposit deductions recorded.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(p.depositDeductions || []).map((dec: any) => (
                    <div
                      key={dec.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${THEME.rust} 4%, var(--surface-1))`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{dec.reason}</div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>Date: {fmtDate(dec.date)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                          -<Money value={dec.amount} variant="exact" />
                        </span>
                        <button
                          onClick={() => onLogDeduction(p, dec)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onRemoveDeduction(p, dec.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BULK CSV IMPORTER ── */}
      {tab === "csv" && (
        <div>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${primaryColor} 6%, var(--surface-1))`,
              border: `1px solid color-mix(in srgb, ${primaryColor} 18%, transparent)`,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Bulk Import Records from CSV</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Upload multiple months in a single step
              </div>
            </div>
            <button
              onClick={() => {
                const template = `# month, amount, date, note\n# month = YYYY-MM | date = YYYY-MM-DD\n2025-04,25000,2025-04-05,Paid via UPI\n2025-05,25000,2025-05-04,Bank Transfer`;
                const blob = new Blob([template], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `rent_${isOut ? "receipts" : "payments"}_template.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid color-mix(in srgb, ${primaryColor} 30%, transparent)`,
                background: "transparent",
                color: primaryColor,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Download size={12} /> Download Template
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "24px 0",
              border: `1.5px dashed color-mix(in srgb, ${primaryColor} 40%, transparent)`,
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 12,
              background: `color-mix(in srgb, ${primaryColor} 3%, transparent)`,
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
                handleParseCsv(text);
              };
              r.readAsText(file);
            }}
          >
            <Upload size={24} color={primaryColor} />
            <div style={{ fontSize: 13, fontWeight: 700, color: primaryColor }}>
              {csvFileName || "Drop CSV file here or click to browse"}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Format: month, amount, date, note</div>
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
                  handleParseCsv(text);
                };
                r.readAsText(file);
              }}
            />
          </label>

          <textarea
            style={{
              width: "100%",
              minHeight: 70,
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
              borderRadius: 8,
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

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => handleParseCsv(csvText)}>
              Preview Rows
            </Button>
            {csvPreview.length > 0 && (
              <Button
                variant="accent"
                size="sm"
                disabled={csvImporting}
                onClick={handleExecuteImport}
                style={{ background: primaryColor }}
              >
                {csvImporting ? "Importing…" : `Import ${csvPreview.length} Entries`}
              </Button>
            )}
          </div>

          {csvError && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                borderRadius: 8,
                color: THEME.rust,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={14} /> {csvError}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div style={{ marginTop: 14, border: `1px solid ${THEME.line}`, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", background: "var(--surface-1)", fontSize: 11, fontWeight: 800, color: primaryColor }}>
                Preview Ready ({csvPreview.length} records):
              </div>
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "6px 10px" }}>{row.month}</td>
                        <td style={{ padding: "6px 10px" }}>{row.date}</td>
                        <td style={{ padding: "6px 10px", fontWeight: 700, color: isOut ? THEME.sage : THEME.rust }}>
                          <Money value={row.amount} variant="exact" />
                        </td>
                        <td style={{ padding: "6px 10px", color: THEME.muted }}>{row.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: HRA TAX SUMMARY (FOR RENTED IN) ── */}
      {tab === "hra" && !isOut && (
        <div>
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-1))`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                HRA Rent Exemption Proof (Sec 10(13A))
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Annual rent statement for employee tax filing & payroll submissions
              </div>
            </div>
            <button
              onClick={handleCopyHraSummary}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: THEME.accent,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {copiedHra ? <Check size={14} /> : <Copy size={14} />}
              {copiedHra ? "Copied!" : "Copy Summary"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: "12px 14px", background: "var(--surface-1)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>Landlord Name</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                {p.landlordName || p.landlords?.[0]?.name || "Not Specified"}
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "var(--surface-1)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>Landlord PAN (Mandatory if &gt; ₹1L/yr)</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginTop: 2, fontFamily: "monospace" }}>
                {p.landlordPan || p.landlords?.[0]?.pan || "Not Provided"}
              </div>
            </div>
          </div>

          <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-1)", fontSize: 12, fontWeight: 800, color: THEME.ink, display: "flex", justifyContent: "space-between" }}>
              <span>Monthly Payment Records ({sortedRentItems.length})</span>
              <span>
                Total Rent Paid:{" "}
                <b style={{ color: THEME.rust }}>
                  <Money value={sortedRentItems.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)} variant="full" />
                </b>
              </span>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <tbody>
                  {sortedRentItems.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.month}</td>
                      <td style={{ padding: "8px 12px", color: THEME.muted }}>Paid on {fmtDate(r.date)}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 800, color: THEME.rust }}>
                        <Money value={r.amount} variant="exact" />
                      </td>
                      <td style={{ padding: "8px 12px", color: THEME.muted }}>{r.note || "Verified Receipt"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ModalActions onClose={onClose} />
    </Modal>
  );
};
