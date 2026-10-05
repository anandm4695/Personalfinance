import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Info,
  Building2,
  CreditCard,
  TrendingUp,
  Landmark,
  Coins,
  FileText,
  HelpCircle,
  Search,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";

interface SftTaxRadarProps {
  state: any;
  metrics: any;
  showToast?: (msg: string, type?: string) => void;
}

interface SftItem {
  id: string;
  code: string;
  title: string;
  section: string;
  ruleThreshold: number;
  detectedAmount: number;
  thresholdDisplay: string;
  status: "CLEAN" | "SFT_TRIGGERED" | "ATTENTION";
  description: string;
  reportingEntity: string;
  documentationRequired: string[];
}

export const SftTaxRadar: React.FC<SftTaxRadarProps> = ({ state, metrics, showToast }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const sftChecks = useMemo((): SftItem[] => {
    // 1. SFT-001: Cash Deposits / Withdrawals in Bank Accounts (Threshold: >= ₹10 Lakhs in a FY)
    const totalBankCashTxns = (state.transactions || [])
      .filter((t: any) => {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return (
          desc.includes("cash deposit") ||
          desc.includes("cash withdraw") ||
          cat.includes("cash") ||
          desc.includes("atm withdrawal")
        );
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount || 0)), 0);

    // 2. SFT-002: Credit Card Bill Payments (Threshold: >= ₹1 Lakh Cash or >= ₹10 Lakhs any mode)
    const totalCCPayments = (state.transactions || [])
      .filter((t: any) => {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return desc.includes("credit card") || desc.includes("cc payment") || cat.includes("credit card");
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount || 0)), 0);

    // 3. SFT-003: Mutual Funds & Equities Purchase (Threshold: >= ₹10 Lakhs in a FY)
    const totalMFInvestments = (state.mutualFunds || []).reduce(
      (sum: number, m: any) => sum + Number(m.invested || 0),
      0
    );
    const totalStockInvestments = (state.stocks || []).reduce(
      (sum: number, s: any) => sum + Number(s.avgPrice || 0) * Number(s.qty || 0),
      0
    );
    const totalSecuritiesInvestment = totalMFInvestments + totalStockInvestments;

    // 4. SFT-004: Purchase or Sale of Immovable Property (Threshold: >= ₹30 Lakhs)
    const totalPropertyValue = (state.realEstateProperties || []).reduce(
      (sum: number, r: any) => sum + Math.max(Number(r.propertyValue || 0), Number(r.purchasePrice || 0)),
      0
    );

    // 5. SFT-005: Fixed Deposits / Time Deposits Creation (Threshold: >= ₹10 Lakhs in a FY)
    const totalFDInvestments = (state.fixedDeposits || []).reduce(
      (sum: number, f: any) => sum + Number(f.principal || 0),
      0
    );

    // 6. SFT-006: High Value Informal Borrowing / Cash Transactions u/s 269ST (Threshold: >= ₹2 Lakhs)
    const totalInformalLarge = (state.informalBorrowed || [])
      .filter((i: any) => Number(i.amount || 0) >= 200000)
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

    return [
      {
        id: "sft-001",
        code: "SFT-001",
        title: "Cash Deposits / Withdrawals in Savings Bank",
        section: "Section 285BA · Rule 114E(2) Item 1",
        ruleThreshold: 1000000,
        detectedAmount: totalBankCashTxns,
        thresholdDisplay: "₹10,00,000 / Financial Year",
        status: totalBankCashTxns >= 1000000 ? "SFT_TRIGGERED" : totalBankCashTxns >= 500000 ? "ATTENTION" : "CLEAN",
        description: "Aggregate cash deposits or withdrawals in one or more accounts (other than current accounts) of a person.",
        reportingEntity: "Banking Company / Co-operative Bank",
        documentationRequired: ["Cash deposit slips", "Source of cash ledger", "Bank statement reconciliations"],
      },
      {
        id: "sft-002",
        code: "SFT-002",
        title: "Credit Card Bill Payments",
        section: "Section 285BA · Rule 114E(2) Item 2",
        ruleThreshold: 1000000,
        detectedAmount: totalCCPayments,
        thresholdDisplay: "₹1,00,000 (Cash) / ₹10,00,000 (Any Mode)",
        status: totalCCPayments >= 1000000 ? "SFT_TRIGGERED" : totalCCPayments >= 500000 ? "ATTENTION" : "CLEAN",
        description: "Payment made by any person aggregating to ₹1L+ in cash or ₹10L+ by any other mode against credit card bills.",
        reportingEntity: "Credit Card Issuing Banks (HDFC, SBI, ICICI, Axis, etc.)",
        documentationRequired: ["Credit card statements", "Bank debit entries", "Expense business vs personal vouchers"],
      },
      {
        id: "sft-003",
        code: "SFT-003",
        title: "Purchase of Mutual Fund Units / Shares",
        section: "Section 285BA · Rule 114E(2) Item 3 & 4",
        ruleThreshold: 1000000,
        detectedAmount: totalSecuritiesInvestment,
        thresholdDisplay: "₹10,00,000 / Financial Year",
        status: totalSecuritiesInvestment >= 1000000 ? "SFT_TRIGGERED" : totalSecuritiesInvestment >= 600000 ? "ATTENTION" : "CLEAN",
        description: "Receipt from any person for acquiring units of one or more schemes of a Mutual Fund or shares/bonds of a company.",
        reportingEntity: "Asset Management Companies (AMCs) & Stock Brokers",
        documentationRequired: ["CAS Statement", "Contract notes", "Bank fund outflow trail", "AIS entry match"],
      },
      {
        id: "sft-004",
        code: "SFT-004",
        title: "Immovable Property Acquisition / Sale",
        section: "Section 285BA · Rule 114E(2) Item 7 & Sec 194-IA",
        ruleThreshold: 3000000,
        detectedAmount: totalPropertyValue,
        thresholdDisplay: "₹30,00,000 (Stamp Duty / Registered Value)",
        status: totalPropertyValue >= 3000000 ? "SFT_TRIGGERED" : "CLEAN",
        description: "Purchase or sale by any person of immovable property of an amount or value exceeding ₹30 Lakhs. Triggers 1% TDS u/s 194-IA if >= ₹50L.",
        reportingEntity: "Inspector-General of Registration / Sub-Registrar",
        documentationRequired: ["Registered Sale Deed", "Form 26QB (1% TDS)", "Bank loan disbursement letter", "Capital gains computation"],
      },
      {
        id: "sft-005",
        code: "SFT-005",
        title: "Time Deposits / Fixed Deposits Placement",
        section: "Section 285BA · Rule 114E(2) Item 5",
        ruleThreshold: 1000000,
        detectedAmount: totalFDInvestments,
        thresholdDisplay: "₹10,00,000 / Financial Year",
        status: totalFDInvestments >= 1000000 ? "SFT_TRIGGERED" : totalFDInvestments >= 500000 ? "ATTENTION" : "CLEAN",
        description: "Receipt from any person for acquiring time deposits (other than renewals) aggregating to ₹10 Lakhs or more.",
        reportingEntity: "Banking Company / Post Office",
        documentationRequired: ["FD advice certificates", "Form 26AS TDS credits u/s 194A", "Bank debit confirmations"],
      },
      {
        id: "sft-006",
        code: "SFT-006",
        title: "Cash Receipts Limit & Prohibition (Sec 269ST)",
        section: "Section 269ST · Income-tax Act",
        ruleThreshold: 200000,
        detectedAmount: totalInformalLarge,
        thresholdDisplay: "₹2,00,000 per Day / Event",
        status: totalInformalLarge > 0 ? "ATTENTION" : "CLEAN",
        description: "Prohibits receipt of ₹2 Lakhs or more in cash in aggregate from a person in a day or in respect of a single transaction.",
        reportingEntity: "Income Tax Department Scrutiny Flag",
        documentationRequired: ["Account payee cheque/NEFT confirmation", "Promissory note / Agreement"],
      },
    ];
  }, [state]);

  const filteredChecks = useMemo(() => {
    if (!searchTerm.trim()) return sftChecks;
    const q = searchTerm.toLowerCase();
    return sftChecks.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [sftChecks, searchTerm]);

  const triggeredCount = sftChecks.filter((c) => c.status === "SFT_TRIGGERED").length;

  const handleExportCSV = () => {
    const rows = sftChecks.map((c) => ({
      "SFT Code": c.code,
      Title: c.title,
      Section: c.section,
      "Threshold Limit": c.thresholdDisplay,
      "Detected Portfolio Value (INR)": c.detectedAmount,
      "Audit Compliance Status": c.status,
      "Reporting Authority": c.reportingEntity,
      "Required Documentation": c.documentationRequired.join(" | "),
    }));
    exportArrayToCSV(rows, `SFT-Compliance-Audit-Report-${new Date().toISOString().split("T")[0]}`);
    showToast?.("SFT Compliance Audit exported to CSV", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Banner Card ── */}
      <Card
        style={{
          padding: 20,
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 8%, transparent), color-mix(in srgb, ${THEME.accent} 5%, transparent))`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: THEME.gold,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                Statement of Financial Transactions (SFT) & Scrutiny Radar
              </h2>
              <p style={{ fontSize: 12, color: THEME.muted, margin: "2px 0 0" }}>
                Section 285BA · Rule 114E Automated Compliance Scanner & Annual Information Statement (AIS) Readiness
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>
              Export SFT Audit Report
            </Button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "var(--t-paper)",
            border: `1px solid ${THEME.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Info size={18} color={THEME.accent} />
            <span style={{ fontSize: 12.5, color: THEME.ink }}>
              Under Indian Income Tax law, banks, AMCs, registrars, and card issuers automatically report these high-value transactions to the Income Tax Department for populating your AIS and Form 26AS.
            </span>
          </div>

          <Badge variant={triggeredCount > 0 ? "warning" : "success"}>
            {triggeredCount > 0 ? `${triggeredCount} SFT REPORTABLE ITEMS` : "ALL TRANSACTIONS NORMAL"}
          </Badge>
        </div>
      </Card>

      {/* ── SFT Items Table ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${THEME.line}` }}>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <Search
              size={15}
              color={THEME.muted}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search SFT code, rule, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                fontSize: 13,
                color: THEME.ink,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--t-gold) 5%, transparent)", borderBottom: `1.5px solid ${THEME.line}` }}>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>SFT Code & Title</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Statutory Rule & Section</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Statutory Threshold</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Detected Value</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase", textAlign: "center" }}>AIS / SFT Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Audit Dossier Required</th>
              </tr>
            </thead>
            <tbody>
              {filteredChecks.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: `1px solid ${THEME.line}`,
                    background: i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--t-paper) 40%, transparent)",
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: THEME.accent }}>
                        {c.code}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13, marginTop: 2 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, maxWidth: 320 }}>
                      {c.description}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: THEME.ink }}>
                    <div style={{ fontWeight: 600 }}>{c.section}</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      Reported By: {c.reportingEntity}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12.5, fontWeight: 600, color: THEME.muted }}>
                    {c.thresholdDisplay}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, fontSize: 14 }}>
                    <Money value={c.detectedAmount} variant="full" />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <Badge
                      variant={
                        c.status === "SFT_TRIGGERED"
                          ? "warning"
                          : c.status === "ATTENTION"
                            ? "danger"
                            : "success"
                      }
                    >
                      {c.status === "SFT_TRIGGERED"
                        ? "SFT REPORTABLE"
                        : c.status === "ATTENTION"
                          ? "ATTENTION"
                          : "CLEAN"}
                    </Badge>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: THEME.muted }}>
                      {c.documentationRequired.map((doc, dIdx) => (
                        <li key={dIdx} style={{ marginBottom: 2 }}>{doc}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
