// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  Calendar,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  Home,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  today,
  calcTaxNew,
  calcTaxOld,
  getEffectiveRent,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/Form";
import { Prv } from "../../context/PrivacyContext";

// Escapes user-controlled free-text before it's interpolated into an HTML
// string handed to document.write() (used by printReceipts below) — without
// this, a field containing e.g. <script> or <img onerror=...> would execute
// in the popup window.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buildFYList = (state: any): string[] => {
  const fySet = new Set<number>();
  const addDate = (d: string) => {
    if (!d) return;
    const dt = new Date(d + "T00:00:00");
    fySet.add(dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1);
  };
  (state.income || []).forEach((i: any) => addDate(i.date));
  (state.transactions || []).forEach((t: any) => addDate(t.date));
  (state.taxPayments || []).forEach((t: any) => {
    if (t.fy) {
      const y = Number(t.fy.split("-")[0]);
      if (y) fySet.add(y);
    }
  });
  const now = new Date();
  fySet.add(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  return Array.from(fySet)
    .sort((a, b) => b - a)
    .map((y) => `${y}-${String(y + 1).slice(-2)}`);
};

const FYSelector = ({
  fy,
  setFy,
  fyList,
}: {
  fy: string;
  setFy: (v: string) => void;
  fyList: string[];
}) => (
  <select
    className="form-input"
    value={fy}
    onChange={(e) => setFy(e.target.value)}
    style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130, marginBottom: 16 }}
  >
    {fyList.map((f) => (
      <option key={f} value={f}>
        FY {f}
      </option>
    ))}
  </select>
);

// ── Advance Tax Calculator (B3) ─────────────────────────────────────────────

const ADVANCE_TAX_DEADLINES = [
  { label: "Q1 — 15 Jun", date: "06-15", cumPct: 15 },
  { label: "Q2 — 15 Sep", date: "09-15", cumPct: 45 },
  { label: "Q3 — 15 Dec", date: "12-15", cumPct: 75 },
  { label: "Q4 — 15 Mar", date: "03-15", cumPct: 100 },
];

const AdvanceTaxSection = ({ state, metrics }) => {
  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || "2025-26");
  const regime = state.profile?.regime || "new";
  const fyStart = parseInt(fy.split("-")[0]);

  const projectedIncome = useMemo(() => {
    const annualIncome = metrics.annualIncome || 0;
    if (annualIncome > 0) return annualIncome;
    return (metrics.monthIncome || 0) * 12;
  }, [metrics]);

  const [manualIncome, setManualIncome] = useState("");
  const income = manualIncome ? Number(manualIncome) : projectedIncome;

  const taxLiability = useMemo(() => {
    if (!income) return 0;
    if (regime === "new") return calcTaxNew ? calcTaxNew(income).total : 0;
    // Old regime always gets at least the standard deduction (₹50k from FY 2020-21, ₹40k before)
    const stdDedOld = fyStart >= 2020 ? 50000 : 40000;
    return calcTaxOld ? calcTaxOld(income, stdDedOld).total : 0;
  }, [income, regime, fyStart]);

  const tdsPaid = useMemo(() => {
    return (state.taxPayments || [])
      .filter((t) => t.fy === fy && (t.taxType === "TDS" || t.type === "TDS"))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [state.taxPayments, fy]);

  const advanceTaxPaid = useMemo(() => {
    return (state.taxPayments || [])
      .filter((t) => t.fy === fy && (t.taxType === "Advance Tax" || t.type === "Advance Tax"))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [state.taxPayments, fy]);

  const netTaxDue = Math.max(0, taxLiability - tdsPaid);
  const totalPaid = advanceTaxPaid;
  const remaining = Math.max(0, netTaxDue - totalPaid);

  const todayStr = today();
  const currentQ = (() => {
    const m = new Date(todayStr).getMonth();
    if (m >= 3 && m <= 5) return 0;
    if (m >= 6 && m <= 8) return 1;
    if (m >= 9 && m <= 11) return 2;
    return 3;
  })();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Calculator size={18} style={{ color: THEME.accent }} /> Advance Tax Calculator
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
        FY {fy} • {regime === "new" ? "New" : "Old"} Regime
      </div>

      {/* Income Override */}
      <Card>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}>
                Auto-Detected Annual Income
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: THEME.ink }}>
                <Prv>{fmtINRFull(projectedIncome)}</Prv>
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Override Income (optional)
              </label>
              <input
                type="number"
                placeholder="Enter total taxable income"
                value={manualIncome}
                onChange={(e) => setManualIncome(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${THEME.line}`,
                  background: "transparent",
                  color: THEME.ink,
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tax Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginTop: 16,
        }}
      >
        {[
          { label: "Estimated Tax", value: fmtINRFull(taxLiability), color: THEME.accent },
          { label: "TDS Already Paid", value: fmtINRFull(tdsPaid), color: "#10B981" },
          { label: "Net Tax Due", value: fmtINRFull(netTaxDue), color: "#F97316" },
          { label: "Advance Tax Paid", value: fmtINRFull(totalPaid), color: THEME.accent },
          {
            label: "Remaining to Pay",
            value: fmtINRFull(remaining),
            color: remaining > 0 ? "#EF4444" : "#10B981",
          },
        ].map((s, i) => (
          <Card key={i}>
            <div style={{ padding: 14, textAlign: "center" }}>
              <div
                style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}
              >
                <Prv>{s.value}</Prv>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quarterly Schedule */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink }}>
            Quarterly Payment Schedule
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ADVANCE_TAX_DEADLINES.map((q, idx) => {
              const qAmount = (netTaxDue * q.cumPct) / 100;
              const prevCum =
                idx > 0 ? (netTaxDue * ADVANCE_TAX_DEADLINES[idx - 1].cumPct) / 100 : 0;
              const installment = qAmount - prevCum;
              const isPast = idx < currentQ;
              const isCurrent = idx === currentQ;

              const deadlineYear = q.date.startsWith("03") ? fyStart + 1 : fyStart;
              const deadlineFull = `${deadlineYear}-${q.date}`;
              const daysLeft = Math.ceil(
                (new Date(deadlineFull).getTime() - new Date(todayStr).getTime()) / 86400000
              );

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: isCurrent
                      ? "rgba(99,102,241,0.08)"
                      : isPast
                        ? "rgba(16,185,129,0.05)"
                        : "transparent",
                    border: `1.5px solid ${isCurrent ? THEME.accent : THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isPast
                        ? "#10B98120"
                        : isCurrent
                          ? `${THEME.accent}20`
                          : `${THEME.line}50`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isPast ? (
                      <CheckCircle2 size={16} style={{ color: "#10B981" }} />
                    ) : (
                      <Calendar
                        size={16}
                        style={{ color: isCurrent ? THEME.accent : THEME.muted }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{q.label}</div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>{q.cumPct}% cumulative</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                      <Prv>{fmtINRFull(installment)}</Prv>
                    </div>
                    {isCurrent && daysLeft > 0 && (
                      <div style={{ fontSize: 11, color: "#F97316", fontWeight: 600 }}>
                        {daysLeft} days left
                      </div>
                    )}
                    {isCurrent && daysLeft <= 0 && (
                      <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>
                        Overdue!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {remaining > 10000 && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(234,179,8,0.08)",
                border: "1.5px solid rgba(234,179,8,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle size={16} style={{ color: "#EAB308", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: THEME.ink }}>
                <strong>Interest Alert:</strong> Under Sec 234B/234C, interest @ 1%/month is charged
                on shortfall in advance tax payment. Pay on time to avoid penalties.
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ── HRA Rent Receipt Generator (B4) ─────────────────────────────────────────

const HraReceiptSection = ({ state }) => {
  const [selectedProperty, setSelectedProperty] = useState("");
  const [months, setMonths] = useState([]);
  const [landlordName, setLandlordName] = useState("");
  const [landlordPan, setLandlordPan] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");
  const [tenantName, setTenantName] = useState(state.profile?.name || "");
  const [showPreview, setShowPreview] = useState(false);

  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || "2025-26");
  const fyStart = parseInt(fy.split("-")[0]);

  const rentedProps = state.rentedProperties || [];

  const fyMonths = useMemo(() => {
    const result = [];
    for (let m = 3; m < 15; m++) {
      const year = m < 12 ? fyStart : fyStart + 1;
      const month = m % 12;
      result.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: `${MONTH_NAMES[month]} ${year}`,
      });
    }
    return result;
  }, [fyStart]);

  const selectedProp = rentedProps.find((p) => p.id === selectedProperty);

  const toggleMonth = (key) => {
    setMonths((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key].sort()
    );
  };

  const selectAllMonths = () => {
    if (months.length === fyMonths.length) setMonths([]);
    else setMonths(fyMonths.map((m) => m.key));
  };

  const getReceiptData = () => {
    return months.sort().map((m, idx) => {
      const rent = selectedProp ? getEffectiveRent(selectedProp, m) : 0;
      const [y, mo] = m.split("-");
      const monthName = MONTH_NAMES[parseInt(mo) - 1];
      return {
        receiptNo: idx + 1,
        month: `${monthName} ${y}`,
        monthKey: m,
        amount: rent,
        date: `${new Date(parseInt(y), parseInt(mo), 0).getDate()} ${monthName} ${y}`,
      };
    });
  };

  const printReceipts = () => {
    const receipts = getReceiptData();
    const totalRent = receipts.reduce((s, r) => s + r.amount, 0);
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Rent Receipts — FY ${fy}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
        .receipt { border: 2px solid #333; padding: 24px; margin-bottom: 20px; page-break-inside: avoid; border-radius: 4px; }
        .receipt-header { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .receipt-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .receipt-row label { font-weight: 600; color: #555; }
        .amount { font-size: 20px; font-weight: 700; text-align: center; margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 4px; }
        .signature { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature div { text-align: center; }
        .signature .line { border-top: 1px solid #333; width: 180px; margin-top: 40px; padding-top: 4px; font-size: 12px; }
        .summary { margin-top: 24px; padding: 16px; background: #f0f0f0; border-radius: 4px; }
        @media print { .no-print { display: none; } .receipt { page-break-after: always; } }
      </style></head>
      <body>
        <div class="no-print" style="text-align:center;margin-bottom:20px;">
          <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;background:var(--t-accent);color:#fff;border:none;border-radius:8px;">Print / Save PDF</button>
        </div>
        ${receipts
          .map(
            (r) => `
          <div class="receipt">
            <div class="receipt-header">RENT RECEIPT</div>
            <div class="receipt-row"><label>Receipt No:</label><span>${r.receiptNo}</span></div>
            <div class="receipt-row"><label>Date:</label><span>${r.date}</span></div>
            <div class="receipt-row"><label>For the month of:</label><span>${r.month}</span></div>
            <div class="receipt-row"><label>Received from:</label><span>${escapeHtml(tenantName)}</span></div>
            <div class="amount">Amount: ₹${Number(r.amount).toLocaleString("en-IN")}</div>
            <div class="receipt-row"><label>Property Address:</label><span>${escapeHtml(selectedProp?.address || selectedProp?.name || "—")}</span></div>
            <div class="receipt-row"><label>Landlord Name:</label><span>${escapeHtml(landlordName)}</span></div>
            ${landlordPan ? `<div class="receipt-row"><label>Landlord PAN:</label><span>${escapeHtml(landlordPan)}</span></div>` : ""}
            ${landlordAddress ? `<div class="receipt-row"><label>Landlord Address:</label><span>${escapeHtml(landlordAddress)}</span></div>` : ""}
            <div class="signature">
              <div><div class="line">Tenant Signature</div></div>
              <div>Revenue<br>Stamp</div>
              <div><div class="line">Landlord Signature</div></div>
            </div>
          </div>
        `
          )
          .join("")}
        <div class="summary receipt">
          <div class="receipt-header">RENT SUMMARY — FY ${fy}</div>
          <div class="receipt-row"><label>Total Months:</label><span>${receipts.length}</span></div>
          <div class="receipt-row"><label>Total Rent Paid:</label><span>₹${totalRent.toLocaleString("en-IN")}</span></div>
          <div class="receipt-row"><label>Tenant:</label><span>${escapeHtml(tenantName)}</span></div>
          <div class="receipt-row"><label>Landlord:</label><span>${escapeHtml(landlordName)}</span></div>
          ${landlordPan ? `<div class="receipt-row"><label>Landlord PAN:</label><span>${escapeHtml(landlordPan)}</span></div>` : ""}
        </div>
      </body></html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Home size={18} style={{ color: THEME.accent }} /> HRA Rent Receipt Generator
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
        Generate printable rent receipts for HRA tax exemption — FY {fy}
      </div>

      {rentedProps.length === 0 ? (
        <Card>
          <div style={{ padding: 20, textAlign: "center" }}>
            <Info size={20} style={{ color: THEME.muted, marginBottom: 8 }} />
            <div style={{ fontSize: 14, color: THEME.muted }}>
              No rented properties found. Add a rented property in the Rental Details tab first.
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Select Property
                  </label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 14,
                    }}
                  >
                    <option value="">— Select —</option>
                    {rentedProps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.address || "Property"} — {fmtINRFull(p.monthlyRent)}/mo
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Tenant Name
                  </label>
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Your full name"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Landlord Name
                  </label>
                  <input
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="Full name"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Landlord PAN
                  </label>
                  <input
                    value={landlordPan}
                    onChange={(e) => setLandlordPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 14,
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Landlord Address
                  </label>
                  <input
                    value={landlordAddress}
                    onChange={(e) => setLandlordAddress(e.target.value)}
                    placeholder="Address"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Month Selection */}
          <Card style={{ marginTop: 16 }}>
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>Select Months</div>
                <button
                  onClick={selectAllMonths}
                  style={{
                    fontSize: 12,
                    color: THEME.accent,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {months.length === fyMonths.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {fyMonths.map((m) => {
                  const isSelected = months.includes(m.key);
                  const rent = selectedProp ? getEffectiveRent(selectedProp, m.key) : 0;
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMonth(m.key)}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? THEME.accent : THEME.line}`,
                        background: isSelected ? `${THEME.accent}15` : "transparent",
                        color: isSelected ? THEME.accent : THEME.ink,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                      {rent > 0 && (
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          {fmtINRFull(rent)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {months.length > 0 && selectedProperty && (
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: 14, color: THEME.ink }}>
                    <strong>{months.length}</strong> months selected • Total:{" "}
                    <strong>
                      <Prv>{fmtINRFull(getReceiptData().reduce((s, r) => s + r.amount, 0))}</Prv>
                    </strong>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      onClick={() => setShowPreview(!showPreview)}
                      variant="secondary"
                      size="sm"
                    >
                      {showPreview ? "Hide" : "Preview"}
                    </Button>
                    <Button onClick={printReceipts} size="sm">
                      <Printer size={14} style={{ marginRight: 4 }} /> Generate & Print
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Preview */}
          {showPreview && months.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: THEME.ink }}>
                  Receipt Preview
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {getReceiptData().map((r) => (
                    <div
                      key={r.monthKey}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: `1.5px solid ${THEME.line}`,
                        background: "rgba(99,102,241,0.03)",
                      }}
                    >
                      <div
                        style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: THEME.ink }}
                      >
                        Receipt #{r.receiptNo} — {r.month}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: THEME.muted,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Tenant: {tenantName}</span>
                        <span style={{ fontWeight: 700, color: THEME.ink }}>
                          <Prv>{fmtINRFull(r.amount)}</Prv>
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                        Landlord: {landlordName}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PAN requirement warning */}
                {getReceiptData().reduce((s, r) => s + r.amount, 0) > 100000 && !landlordPan && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(234,179,8,0.08)",
                      border: "1px solid rgba(234,179,8,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: "#EAB308" }} />
                    <span style={{ fontSize: 12, color: THEME.ink }}>
                      Total rent exceeds ₹1L — Landlord PAN is mandatory for HRA exemption claim.
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ── Form 26AS Reconciliation (B2) ───────────────────────────────────────────

// Form 26AS entries aren't part of the central Supabase-synced state shape
// (that would need a new DB table + migration). Persist them to a dedicated
// localStorage key instead, so they survive a tab switch/reload — matching
// the pattern used for credit scores in CreditTab.tsx.
const FORM26AS_STORAGE_KEY = "finance_form26as";

function loadForm26ASEntries() {
  try {
    const raw = localStorage.getItem(FORM26AS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveForm26ASEntries(entries) {
  try {
    localStorage.setItem(FORM26AS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota/serialization errors — best-effort persistence
  }
}

const Form26ASSection = ({ state }) => {
  const [entries, setEntries] = useState(() => loadForm26ASEntries());
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    deductor: "",
    tan: "",
    amount: "",
    dateOfPayment: "",
    section: "192",
  });
  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || "2025-26");

  const taxPayments = useMemo(() => {
    return (state.taxPayments || []).filter((t) => t.fy === fy);
  }, [state.taxPayments, fy]);

  const addEntry = () => {
    if (!newEntry.deductor || !newEntry.amount) return;
    const updated = [
      ...entries,
      { ...newEntry, id: Date.now().toString(), amount: Number(newEntry.amount) },
    ];
    setEntries(updated);
    saveForm26ASEntries(updated);
    setNewEntry({ deductor: "", tan: "", amount: "", dateOfPayment: "", section: "192" });
    setShowAdd(false);
  };

  const deleteEntry = (id) => {
    const updated = entries.filter((x) => x.id !== id);
    setEntries(updated);
    saveForm26ASEntries(updated);
  };

  const total26AS = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalApp = taxPayments
    .filter((t) => t.taxType === "TDS" || t.type === "TDS")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const mismatch = Math.abs(total26AS - totalApp);
  const isMatch = mismatch < 100;

  const SECTIONS = [
    "192",
    "194A",
    "194B",
    "194C",
    "194D",
    "194H",
    "194I",
    "194J",
    "194N",
    "206C",
    "Other",
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={18} style={{ color: THEME.accent }} /> Form 26AS / AIS Reconciliation
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
        Compare your recorded TDS entries against Form 26AS / AIS data — FY {fy}
      </div>

      {/* Summary */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}
      >
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              26AS / AIS Total
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent }}>
              <Prv>{fmtINRFull(total26AS)}</Prv>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>App Records</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent }}>
              <Prv>{fmtINRFull(totalApp)}</Prv>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Mismatch</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isMatch ? "#10B981" : "#EF4444" }}>
              {isMatch ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={18} /> Match
                </span>
              ) : (
                <Prv>{fmtINRFull(mismatch)}</Prv>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 26AS Entries */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
              26AS / AIS Entries
            </div>
            <Button onClick={() => setShowAdd(!showAdd)} size="sm">
              {showAdd ? "Cancel" : "+ Add Entry"}
            </Button>
          </div>

          {showAdd && (
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: "rgba(99,102,241,0.04)",
                marginBottom: 14,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    Deductor Name
                  </label>
                  <input
                    value={newEntry.deductor}
                    onChange={(e) => setNewEntry({ ...newEntry, deductor: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    TAN
                  </label>
                  <input
                    value={newEntry.tan}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, tan: e.target.value.toUpperCase() })
                    }
                    maxLength={10}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    Section
                  </label>
                  <select
                    value={newEntry.section}
                    onChange={(e) => setNewEntry({ ...newEntry, section: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                    }}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={addEntry} size="sm">
                  Add
                </Button>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: THEME.muted, fontSize: 13 }}>
              No 26AS entries added yet. Add entries manually from your Form 26AS / AIS statement.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                    {["Deductor", "TAN", "Section", "Amount", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          color: THEME.muted,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "8px 10px", color: THEME.ink, fontWeight: 500 }}>
                        {e.deductor}
                      </td>
                      <td
                        style={{ padding: "8px 10px", color: THEME.muted, fontFamily: "monospace" }}
                      >
                        {e.tan || "—"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge variant="muted">{e.section}</Badge>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: THEME.ink }}>
                        <Prv>{fmtINRFull(e.amount)}</Prv>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          onClick={() => deleteEntry(e.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* App TDS Records */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink }}>
            Your Tax Payment Records
          </div>
          {taxPayments.length === 0 ? (
            <div style={{ textAlign: "center", padding: 16, color: THEME.muted, fontSize: 13 }}>
              No tax payments recorded for FY {fy}. Add them in the Tax Vault tab.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                    {["Type", "Date", "Amount", "Challan/Ref"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          color: THEME.muted,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taxPayments.map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge>{t.taxType || t.type || "Tax"}</Badge>
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date || "—"}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: THEME.ink }}>
                        <Prv>{fmtINRFull(t.amount)}</Prv>
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          color: THEME.muted,
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {t.challan || t.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ── Main Tab ─────────────────────────────────────────────────────────────────

export const TaxToolsTab = ({ state, metrics }) => {
  const [activeSection, setActiveSection] = useState("advance");

  const sections = [
    { key: "advance", label: "Advance Tax", icon: Calculator },
    { key: "26as", label: "26AS Reconciliation", icon: FileText },
    { key: "hra", label: "HRA Receipts", icon: Home },
  ];

  return (
    <div>
      <SectionTitle sub="Advance tax calculator, 26AS reconciliation & HRA rent receipts">
        Tax Tools
      </SectionTitle>

      {/* Sub-tab navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 10,
                border: `1.5px solid ${active ? THEME.accent : THEME.line}`,
                background: active ? THEME.accent : "transparent",
                color: active ? "#fff" : THEME.ink,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Icon size={15} /> {s.label}
            </button>
          );
        })}
      </div>

      {activeSection === "advance" && <AdvanceTaxSection state={state} metrics={metrics} />}
      {activeSection === "26as" && <Form26ASSection state={state} />}
      {activeSection === "hra" && <HraReceiptSection state={state} />}
    </div>
  );
};
