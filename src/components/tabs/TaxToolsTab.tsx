// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Home,
  Printer,
  Download,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import {
  fmtINRFull,
  today,
  calcTaxNewByFY,
  calcTaxOldByFY,
  getAutoDetectedDeductions,
  getEffectiveRent,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

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
    aria-label="Select financial year"
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
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());
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
    // Bug fix: this previously called the legacy calcTaxNew()/calcTaxOld()
    // helpers, which are hardcoded to FY 2025-26 slab rates and (for the old
    // regime) only ever subtract the standard deduction — ignoring 80C, 80D,
    // HRA, home loan interest etc. that the rest of the app auto-detects.
    // That made the FY selector above a no-op for the actual tax figure, and
    // silently overstated old-regime liability. Use the same FY-aware,
    // deduction-aware calculation as the dashboard (getTaxDueForDashboard)
    // instead, but honoring this section's own `fy` selection.
    if (regime === "new") {
      return calcTaxNewByFY(income, fy).total;
    }
    const auto = getAutoDetectedDeductions(state, fy);
    const overrides = state.masterData?.taxDeductions?.[fy] || {};
    const d80C = overrides.d80C !== undefined ? overrides.d80C : auto.d80C;
    const d80D = overrides.d80D !== undefined ? overrides.d80D : 0;
    const hra = overrides.hra !== undefined ? overrides.hra : auto.hra;
    const homeLoan = overrides.homeLoan !== undefined ? overrides.homeLoan : auto.homeLoan;
    const nps = overrides.nps !== undefined ? overrides.nps : 0;
    const d80CCD2 = overrides.d80CCD2 !== undefined ? overrides.d80CCD2 : 0;
    const d80G = overrides.d80G !== undefined ? overrides.d80G : 0;
    const d80E = overrides.d80E !== undefined ? overrides.d80E : 0;
    const d80TTA = overrides.d80TTA !== undefined ? overrides.d80TTA : 0;
    const stdDedOld = fyStart >= 2020 ? 50000 : 40000;
    const totalOldDeductions =
      stdDedOld +
      Math.min(d80C, 150000) +
      Math.min(d80D, 25000) +
      hra +
      Math.min(homeLoan, 200000) +
      Math.min(nps, 50000) +
      (d80CCD2 || 0) +
      (d80G || 0) +
      (d80E || 0) +
      Math.min(d80TTA || 0, 10000);
    return calcTaxOldByFY(income, totalOldDeductions, fy).total;
  }, [income, regime, fy, fyStart, state]);

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

  // Count-up animation for the headline "Remaining to Pay" figure and the
  // supporting stat tiles below it.
  const animatedRemaining = useAnimatedNumber(remaining);
  const animatedTaxLiability = useAnimatedNumber(taxLiability);
  const animatedTdsPaid = useAnimatedNumber(tdsPaid);
  const animatedNetTaxDue = useAnimatedNumber(netTaxDue);
  const animatedTotalPaid = useAnimatedNumber(totalPaid);

  const todayStr = today();

  // Bug fix: this previously derived "current quarter" from today's real
  // calendar month alone (e.g. Aug → Q2), regardless of which FY was
  // selected in the FYSelector above. That made every quarter in a *past*
  // FY after the first one render as "current" (blue highlight) instead of
  // "past" (green check), and every quarter in a *future* FY render with a
  // bogus "Overdue!"/days-left figure. Instead, compute each quarter's real
  // deadline date for the *selected* fy and derive past/current from that.
  const schedule = useMemo(() => {
    const rows = ADVANCE_TAX_DEADLINES.map((q, idx) => {
      const qAmount = (netTaxDue * q.cumPct) / 100;
      const prevCum = idx > 0 ? (netTaxDue * ADVANCE_TAX_DEADLINES[idx - 1].cumPct) / 100 : 0;
      const installment = qAmount - prevCum;
      const deadlineYear = q.date.startsWith("03") ? fyStart + 1 : fyStart;
      const deadlineFull = `${deadlineYear}-${q.date}`;
      const daysLeft = Math.ceil(
        (new Date(deadlineFull).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      return { ...q, idx, installment, deadlineFull, daysLeft, isPast: daysLeft < 0 };
    });
    // The "current" quarter is the first one whose deadline hasn't passed yet.
    // If every deadline for this FY has already passed (fully past FY), none
    // is "current" — they should all render with the past/checked styling.
    const currentIdx = rows.findIndex((r) => !r.isPast);
    return rows.map((r) => ({ ...r, isCurrent: r.idx === currentIdx }));
  }, [netTaxDue, fyStart, todayStr]);

  const exportScheduleCSV = () => {
    const rows = ["Quarter,Due Date,Cumulative %,Installment Due,Status"];
    schedule.forEach((q) => {
      const status = q.isPast ? "Past" : q.isCurrent ? "Current" : "Upcoming";
      rows.push(
        [q.label.replace(",", " "), q.deadlineFull, `${q.cumPct}%`, q.installment.toFixed(2), status].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advance-tax-schedule-FY${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="form-grid-2">
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
                className="form-input"
                style={{ padding: "8px 12px", fontSize: 14 }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tax Summary — "Remaining to Pay" is the number that actually drives
          action, so it leads as a headline card instead of competing equally
          with the four supporting figures below it. */}
      <Card
        style={{
          marginTop: 16,
          borderTop: `3px solid ${remaining > 0 ? THEME.rust : THEME.sage}`,
          background: `color-mix(in srgb, ${remaining > 0 ? THEME.rust : THEME.sage} 4%, transparent)`,
        }}
      >
        <div style={{ padding: "18px 20px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {remaining > 0 ? "Remaining to Pay" : "Advance Tax — Fully Paid"}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: remaining > 0 ? THEME.rust : THEME.sage,
              letterSpacing: "-0.03em",
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Prv>{fmtINRFull(animatedRemaining)}</Prv>
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Net tax due <Prv>{fmtINRFull(netTaxDue)}</Prv> · already paid{" "}
            <Prv>{fmtINRFull(totalPaid)}</Prv>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
        {[
          { label: "Estimated Tax", value: fmtINRFull(animatedTaxLiability), color: THEME.accent },
          { label: "TDS Already Paid", value: fmtINRFull(animatedTdsPaid), color: THEME.sage },
          { label: "Net Tax Due", value: fmtINRFull(animatedNetTaxDue), color: THEME.gold },
          { label: "Advance Tax Paid", value: fmtINRFull(animatedTotalPaid), color: THEME.accent },
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
              Quarterly Payment Schedule
            </div>
            <Button onClick={exportScheduleCSV} variant="secondary" size="sm">
              <Download size={14} style={{ marginRight: 4 }} /> Export CSV
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schedule.map((q) => {
              const { idx, installment, daysLeft, isPast, isCurrent } = q;

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
                      ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                      : isPast
                        ? `color-mix(in srgb, ${THEME.sage} 5%, transparent)`
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
                        ? `color-mix(in srgb, ${THEME.sage} 13%, transparent)`
                        : isCurrent
                          ? `color-mix(in srgb, ${THEME.accent} 13%, transparent)`
                          : `color-mix(in srgb, ${THEME.line} 31%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isPast ? (
                      <CheckCircle2 size={16} style={{ color: THEME.sage }} />
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
                      <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 600 }}>
                        {daysLeft} days left
                      </div>
                    )}
                    {isCurrent && daysLeft <= 0 && (
                      <div style={{ fontSize: 11, color: THEME.rust, fontWeight: 600 }}>
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
                background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle size={16} style={{ color: THEME.gold, flexShrink: 0 }} />
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
  const { privacyMode } = usePrivacy();
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
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());
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
          <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;background:#1a1a1a;color:#fff;border:none;border-radius:8px;">Print / Save PDF</button>
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
            <div class="amount">Amount: ${fmtINRFull(r.amount)}</div>
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
          <div class="receipt-row"><label>Total Rent Paid:</label><span>${fmtINRFull(totalRent)}</span></div>
          <div class="receipt-row"><label>Tenant:</label><span>${escapeHtml(tenantName)}</span></div>
          <div class="receipt-row"><label>Landlord:</label><span>${escapeHtml(landlordName)}</span></div>
          ${landlordPan ? `<div class="receipt-row"><label>Landlord PAN:</label><span>${escapeHtml(landlordPan)}</span></div>` : ""}
        </div>
      </body></html>
    `;
    const w = window.open("", "_blank");
    // window.open returns null when the browser's popup blocker intercepts it
    // (a real, common state — not a hypothetical) — matches the same guard
    // used by TaxVaultTab's print popup for the identical reason.
    if (!w) return;
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
        <EmptyState
          icon={Home}
          title="No Rented Properties Yet"
          description="Add a rented property in the Rental Details tab to start generating HRA rent receipts."
        />
      ) : (
        <>
          <Card>
            <div style={{ padding: 20 }}>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
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
                    aria-label="Select property"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  >
                    <option value="">— Select —</option>
                    {rentedProps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.address || "Property"} —{" "}
                        {privacyMode ? "••••" : fmtINRFull(getEffectiveRent(p))}/mo
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
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  />
                </div>
              </div>
              <div className="form-grid-3">
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
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
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
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14, textTransform: "uppercase" }}
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
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
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
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  {months.length === fyMonths.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
                  gap: 8,
                }}
              >
                {fyMonths.map((m) => {
                  const isSelected = months.includes(m.key);
                  const rent = selectedProp ? getEffectiveRent(selectedProp, m.key) : 0;
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMonth(m.key)}
                      aria-pressed={isSelected}
                      className={isSelected ? "" : "table-row-hover"}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? THEME.accent : THEME.line}`,
                        background: isSelected
                          ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                          : "transparent",
                        color: isSelected ? THEME.accent : THEME.ink,
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                      {rent > 0 && (
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          <Prv>{fmtINRFull(rent)}</Prv>
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
                        background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
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
                      background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: THEME.gold }} />
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

const Form26ASSection = ({ state, addItem, removeItem }) => {
  // Form 26AS entries now live in state.form26as — a real Supabase-synced,
  // per-profile-owner-filtered array (see database/84_form26as.sql and the
  // addItem/removeItem plumbing in App.tsx). This used to be a raw
  // localStorage key that never synced across devices, was excluded from
  // Export/Import backups, and wasn't scoped per family profile — the exact
  // same bug class already fixed once before for tax_payments.
  const entries = state.form26as || [];
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());

  const taxPayments = useMemo(() => {
    return (state.taxPayments || []).filter((t) => t.fy === fy);
  }, [state.taxPayments, fy]);

  const addEntry = async () => {
    if (!newEntry.deductor || !newEntry.amount || saving) return;
    setSaving(true);
    try {
      await addItem("form26as", {
        deductor: newEntry.deductor,
        tan: newEntry.tan || null,
        amount: Number(newEntry.amount),
        dateOfPayment: newEntry.dateOfPayment || null,
        section: newEntry.section,
        fy,
      });
      setNewEntry({ deductor: "", tan: "", amount: "", dateOfPayment: "", section: "192" });
      setShowAdd(false);
    } catch (e) {
      showToast?.(`Failed to save 26AS entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id, deductor) => {
    if (!window.confirm(`Delete this 26AS entry from ${deductor || "this deductor"}? This cannot be undone.`)) return;
    try {
      await removeItem("form26as", id);
    } catch (e) {
      showToast?.(`Failed to delete 26AS entry: ${e?.message || "Unknown error"}`, "error");
    }
  };

  // Entries created before the Supabase migration (imported/legacy data)
  // may have no `fy` field — fall back to deriving FY from dateOfPayment so
  // those entries still scope correctly instead of disappearing.
  const entryFY = (e: any): string | null => {
    if (e.fy) return e.fy;
    if (!e.dateOfPayment) return null;
    const dt = new Date(e.dateOfPayment + "T00:00:00");
    if (isNaN(dt.getTime())) return null;
    const y = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
    return `${y}-${String(y + 1).slice(-2)}`;
  };
  const entriesForFY = entries.filter((e) => entryFY(e) === fy);
  const total26AS = entriesForFY.reduce((s, e) => s + Number(e.amount || 0), 0);
  const animatedTotal26AS = useAnimatedNumber(total26AS);
  const appTdsAmounts = taxPayments
    .filter((t) => t.taxType === "TDS" || t.type === "TDS")
    .map((t) => Number(t.amount || 0));
  const totalApp = appTdsAmounts.reduce((s, a) => s + a, 0);
  const animatedTotalApp = useAnimatedNumber(totalApp);
  const mismatch = Math.abs(total26AS - totalApp);
  const animatedMismatch = useAnimatedNumber(mismatch);
  const isMatch = mismatch < 100;

  // Best-effort per-entry reconciliation: flag a 26AS entry as "Matched" if
  // there's an app-side TDS payment for the same FY with the same amount
  // (within a ₹1 rounding tolerance). Purely a computed UI hint — no new
  // column/state needed, and never blocks editing/deleting.
  const isEntryMatched = (amount: number) =>
    appTdsAmounts.some((a) => Math.abs(a - Number(amount || 0)) < 1);

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
        Compare your recorded TDS entries against Form 26AS / AIS data — FY {fy}. Adding many
        entries at once? Tax Vault → 26AS Reconciler can parse a pasted TRACES export and save them
        here in bulk.
      </div>

      {/* Summary */}
      <div className="form-grid-3" style={{ marginBottom: 20 }}>
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              26AS / AIS Total
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent }}>
              <Prv>{fmtINRFull(animatedTotal26AS)}</Prv>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>App Records</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent }}>
              <Prv>{fmtINRFull(animatedTotalApp)}</Prv>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Mismatch</div>
            <div
              style={{ fontSize: 20, fontWeight: 800, color: isMatch ? THEME.sage : THEME.rust }}
            >
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
                <Prv>{fmtINRFull(animatedMismatch)}</Prv>
              )}
            </div>
          </div>
        </Card>
      </div>

      {!isMatch && entriesForFY.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
            fontSize: 12,
            color: THEME.muted,
            marginBottom: 20,
          }}
        >
          <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: THEME.rust }} />
          <span>
            A mismatch usually means either an entry here doesn't match what's actually reflected
            in Form 26AS/AIS on the Income Tax portal, or your deductor (employer/bank/tenant)
            hasn't filed or corrected their TDS return yet. Reconcile against the portal before
            filing your ITR — a mismatch there can delay your refund.
          </span>
        </div>
      )}

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
                background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                marginBottom: 14,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
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
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
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
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13, textTransform: "uppercase" }}
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
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
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
                    aria-label="Select section"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                    Date of Payment
                  </label>
                  <input
                    type="date"
                    value={newEntry.dateOfPayment}
                    onChange={(e) => setNewEntry({ ...newEntry, dateOfPayment: e.target.value })}
                    aria-label="Date of payment"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  />
                </div>
                <Button onClick={addEntry} size="sm" disabled={saving}>
                  {saving ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          )}

          {entriesForFY.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: THEME.muted, fontSize: 13 }}>
              No 26AS entries added yet for FY {fy}. Add entries manually from your Form 26AS / AIS
              statement.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                    {["Deductor", "TAN", "Section", "Amount", "Status", ""].map((h) => (
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
                  {entriesForFY.map((e) => (
                    <tr
                      key={e.id}
                      className="table-row-hover"
                      style={{ borderBottom: `1px solid ${THEME.line}` }}
                    >
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
                        {isEntryMatched(e.amount) ? (
                          <Badge variant="sage">
                            <CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: -1 }} />
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="muted">Unmatched</Badge>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          onClick={() => deleteEntry(e.id, e.deductor)}
                          aria-label={`Remove 26AS entry from ${e.deductor || "deductor"}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: THEME.rust,
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
                    <tr
                      key={t.id}
                      className="table-row-hover"
                      style={{ borderBottom: `1px solid ${THEME.line}` }}
                    >
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

export const TaxToolsTab = ({ state, metrics, addItem, removeItem, updateItem, showToast }) => {
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
              aria-pressed={active}
              className={active ? "" : "btn-ghost"}
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
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={15} /> {s.label}
            </button>
          );
        })}
      </div>

      {activeSection === "advance" && <AdvanceTaxSection state={state} metrics={metrics} />}
      {activeSection === "26as" && (
        <Form26ASSection state={state} addItem={addItem} removeItem={removeItem} />
      )}
      {activeSection === "hra" && <HraReceiptSection state={state} />}
    </div>
  );
};
