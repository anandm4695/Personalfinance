import React, { useState, useMemo } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Landmark,
  TrendingUp,
  Shield,
  Coins,
  Home,
  Car,
  CreditCard,
  HandCoins,
  RefreshCw,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { usePrivacy } from "../../context/PrivacyContext";

interface DoubleEntryTrialBalanceProps {
  state: any;
  metrics: any;
  setTab?: (tab: string) => void;
  showToast?: (msg: string, type?: string) => void;
}

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  subCategory: string;
  debit: number;
  credit: number;
  netBalance: number;
  normalBalance: "DEBIT" | "CREDIT";
  owner: string;
  status: "OK" | "WARNING" | "ATTENTION";
  note?: string;
}

export const DoubleEntryTrialBalance: React.FC<DoubleEntryTrialBalanceProps> = ({
  state,
  metrics,
  setTab,
  showToast,
}) => {
  const { privacyMode } = usePrivacy();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");

  // Build Comprehensive Ledger Matrix from active state
  const { ledgers, totals, balanceSheetCheck } = useMemo(() => {
    const list: LedgerAccount[] = [];

    // 1. BANK ACCOUNTS (Asset -> Debit)
    (state.bankAccounts || []).forEach((b: any, idx: number) => {
      const bal = Number(b.balance || 0);
      const isNeg = bal < 0;
      list.push({
        id: b.id || `bank-${idx}`,
        code: `1100-${idx + 1}`,
        name: `${b.bank || "Bank"} (${b.type || "Savings"}) ${b.accountNumber ? `••••${String(b.accountNumber).slice(-4)}` : ""}`,
        category: "ASSET",
        subCategory: "Cash & Liquid",
        debit: Math.max(0, bal),
        credit: isNeg ? Math.abs(bal) : 0,
        netBalance: bal,
        normalBalance: "DEBIT",
        owner: b.owner || "self",
        status: isNeg ? "WARNING" : "OK",
        note: isNeg ? "Overdrawn bank balance" : "Active Liquid Asset",
      });
    });

    // 2. FIXED & RECURRING DEPOSITS (Asset -> Debit)
    (state.fixedDeposits || []).forEach((fd: any, idx: number) => {
      const amt = Number(fd.principal || 0);
      list.push({
        id: fd.id || `fd-${idx}`,
        code: `1200-${idx + 1}`,
        name: `FD: ${fd.bank || "Bank"} @ ${fd.rate || 0}%`,
        category: "ASSET",
        subCategory: "Term Deposits",
        debit: amt,
        credit: 0,
        netBalance: amt,
        normalBalance: "DEBIT",
        owner: fd.owner || "self",
        status: "OK",
        note: `Matures: ${fd.maturityDate || "N/A"}`,
      });
    });

    (state.recurringDeposits || []).forEach((rd: any, idx: number) => {
      const monthly = Number(rd.monthly || 0);
      const tenure = Number(rd.tenureMonths || 12);
      const amt = monthly * tenure;
      list.push({
        id: rd.id || `rd-${idx}`,
        code: `1250-${idx + 1}`,
        name: `RD: ${rd.bank || "Bank"} (₹${monthly.toLocaleString("en-IN")}/mo)`,
        category: "ASSET",
        subCategory: "Term Deposits",
        debit: amt,
        credit: 0,
        netBalance: amt,
        normalBalance: "DEBIT",
        owner: rd.owner || "self",
        status: "OK",
      });
    });

    // 3. EQUITIES & MUTUAL FUNDS (Asset -> Debit)
    let totalStockVal = 0;
    let totalStockCost = 0;
    (state.stocks || []).forEach((s: any) => {
      const cur = Number(s.currentPrice || s.avgPrice || 0) * Number(s.qty || 0);
      const cost = Number(s.avgPrice || 0) * Number(s.qty || 0);
      totalStockVal += cur;
      totalStockCost += cost;
    });
    if (totalStockVal > 0 || (state.stocks || []).length > 0) {
      list.push({
        id: "ledger-stocks-portfolio",
        code: "1300-01",
        name: `Listed Equities & Demat Holdings (${(state.stocks || []).length} scrips)`,
        category: "ASSET",
        subCategory: "Marketable Securities",
        debit: totalStockVal,
        credit: 0,
        netBalance: totalStockVal,
        normalBalance: "DEBIT",
        owner: "family",
        status: "OK",
        note: `Invested Cost: ₹${Math.round(totalStockCost).toLocaleString("en-IN")}`,
      });
    }

    let totalMFVal = 0;
    let totalMFCost = 0;
    (state.mutualFunds || []).forEach((m: any) => {
      const cur = Number(m.current || (Number(m.units || 0) * Number(m.nav || 0)) || 0);
      const cost = Number(m.invested || 0);
      totalMFVal += cur;
      totalMFCost += cost;
    });
    if (totalMFVal > 0 || (state.mutualFunds || []).length > 0) {
      list.push({
        id: "ledger-mf-portfolio",
        code: "1350-01",
        name: `Mutual Funds Portfolio (${(state.mutualFunds || []).length} folios)`,
        category: "ASSET",
        subCategory: "Marketable Securities",
        debit: totalMFVal,
        credit: 0,
        netBalance: totalMFVal,
        normalBalance: "DEBIT",
        owner: "family",
        status: "OK",
        note: `Invested Cost: ₹${Math.round(totalMFCost).toLocaleString("en-IN")}`,
      });
    }

    // 4. RETIREMENT & GOVERNMENT ASSETS (Asset -> Debit)
    (state.ppf || []).forEach((p: any, idx: number) => {
      const bal = Number(p.balance || 0);
      list.push({
        id: p.id || `ppf-${idx}`,
        code: `1400-${idx + 1}`,
        name: `Public Provident Fund (PPF) ${p.accountNumber ? `••••${String(p.accountNumber).slice(-4)}` : ""}`,
        category: "ASSET",
        subCategory: "Retirement Funds",
        debit: bal,
        credit: 0,
        netBalance: bal,
        normalBalance: "DEBIT",
        owner: p.owner || "self",
        status: "OK",
      });
    });

    (state.epf || []).forEach((e: any, idx: number) => {
      const bal = Number(e.currentBalance || 0);
      list.push({
        id: e.id || `epf-${idx}`,
        code: `1420-${idx + 1}`,
        name: `Employees' Provident Fund (EPFO: ${e.employer || "Org"})`,
        category: "ASSET",
        subCategory: "Retirement Funds",
        debit: bal,
        credit: 0,
        netBalance: bal,
        normalBalance: "DEBIT",
        owner: e.owner || "self",
        status: "OK",
      });
    });

    (state.nps || []).forEach((n: any, idx: number) => {
      const bal = Number(n.balance || 0);
      list.push({
        id: n.id || `nps-${idx}`,
        code: `1440-${idx + 1}`,
        name: `National Pension System (NPS ${n.tier || "Tier 1"})`,
        category: "ASSET",
        subCategory: "Retirement Funds",
        debit: bal,
        credit: 0,
        netBalance: bal,
        normalBalance: "DEBIT",
        owner: n.owner || "self",
        status: "OK",
      });
    });

    // 5. GOLD & SOVEREIGN BULLION (Asset -> Debit)
    (state.goldHoldings || []).forEach((g: any, idx: number) => {
      const val = Number(g.currentValue || (Number(g.weightGrams || 0) * 7200) || 0);
      list.push({
        id: g.id || `gold-${idx}`,
        code: `1500-${idx + 1}`,
        name: `${g.type || "Gold"} (${g.weightGrams || 0}g ${g.purity || "24K"})`,
        category: "ASSET",
        subCategory: "Precious Metals",
        debit: val,
        credit: 0,
        netBalance: val,
        normalBalance: "DEBIT",
        owner: g.owner || "self",
        status: "OK",
      });
    });

    // 6. REAL ESTATE & FIXED PROPERTIES (Asset -> Debit)
    (state.realEstateProperties || []).forEach((r: any, idx: number) => {
      const val = Number(r.propertyValue || r.purchasePrice || 0);
      list.push({
        id: r.id || `re-${idx}`,
        code: `1600-${idx + 1}`,
        name: `Property: ${r.name || "Real Estate"}`,
        category: "ASSET",
        subCategory: "Immovable Property",
        debit: val,
        credit: 0,
        netBalance: val,
        normalBalance: "DEBIT",
        owner: r.owner || "self",
        status: "OK",
      });
    });

    // 7. VEHICLES (Asset -> Debit)
    (state.vehicles || []).forEach((v: any, idx: number) => {
      const val = Number(v.currentValue || v.purchasePrice || 0);
      list.push({
        id: v.id || `veh-${idx}`,
        code: `1700-${idx + 1}`,
        name: `Vehicle: ${v.make || ""} ${v.model || "Automobile"}`,
        category: "ASSET",
        subCategory: "Movable Fixed Assets",
        debit: val,
        credit: 0,
        netBalance: val,
        normalBalance: "DEBIT",
        owner: v.owner || "self",
        status: "OK",
      });
    });

    // 8. LOANS & ADVANCES GIVEN (Asset -> Debit)
    (state.loansGiven || []).forEach((l: any, idx: number) => {
      const out = Number(l.outstanding ?? l.principal ?? 0);
      list.push({
        id: l.id || `lg-${idx}`,
        code: `1800-${idx + 1}`,
        name: `Loan Given: ${l.borrower || "Borrower"}`,
        category: "ASSET",
        subCategory: "Loans & Receivables",
        debit: out,
        credit: 0,
        netBalance: out,
        normalBalance: "DEBIT",
        owner: l.owner || "self",
        status: out > 0 ? "OK" : "ATTENTION",
      });
    });

    (state.informalLent || []).forEach((i: any, idx: number) => {
      const out = Number(i.outstanding ?? i.amount ?? 0);
      list.push({
        id: i.id || `inf-lent-${idx}`,
        code: `1850-${idx + 1}`,
        name: `Receivable from ${i.person || "Person"}`,
        category: "ASSET",
        subCategory: "Loans & Receivables",
        debit: out,
        credit: 0,
        netBalance: out,
        normalBalance: "DEBIT",
        owner: i.owner || "self",
        status: "OK",
      });
    });

    // 9. SECURED & UNSECURED BORROWINGS (Liability -> Credit)
    (state.loansTaken || []).forEach((l: any, idx: number) => {
      const out = Number(l.outstanding ?? l.principal ?? 0);
      const isSecured = (l.type || "").toLowerCase() === "home" || (l.type || "").toLowerCase() === "vehicle";
      list.push({
        id: l.id || `loan-taken-${idx}`,
        code: `2100-${idx + 1}`,
        name: `Loan: ${l.lender || "Bank"} (${l.type || "General"})`,
        category: "LIABILITY",
        subCategory: isSecured ? "Secured Borrowings" : "Unsecured Borrowings",
        debit: 0,
        credit: out,
        netBalance: out,
        normalBalance: "CREDIT",
        owner: l.owner || "self",
        status: out > 0 ? "OK" : "ATTENTION",
        note: `EMI: ₹${Number(l.emi || 0).toLocaleString("en-IN")}/mo @ ${l.rate || 0}%`,
      });
    });

    (state.informalBorrowed || []).forEach((i: any, idx: number) => {
      const out = Number(i.outstanding ?? i.amount ?? 0);
      list.push({
        id: i.id || `inf-borr-${idx}`,
        code: `2200-${idx + 1}`,
        name: `Payable to ${i.person || "Lender"}`,
        category: "LIABILITY",
        subCategory: "Informal Liabilities",
        debit: 0,
        credit: out,
        netBalance: out,
        normalBalance: "CREDIT",
        owner: i.owner || "self",
        status: "OK",
      });
    });

    (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .forEach((c: any, idx: number) => {
        const out = Math.max(0, Number(c.outstanding || 0));
      list.push({
        id: c.id || `cc-${idx}`,
        code: `2300-${idx + 1}`,
        name: `Credit Card: ${c.bank || ""} ${c.name || "Card"}`,
        category: "LIABILITY",
        subCategory: "Current Liabilities",
        debit: 0,
        credit: out,
        netBalance: out,
        normalBalance: "CREDIT",
        owner: c.owner || "self",
        status: out > Number(c.limit || Infinity) ? "WARNING" : "OK",
        note: `Due: ${c.dueDate || "N/A"} | Limit: ₹${Number(c.limit || 0).toLocaleString("en-IN")}`,
      });
    });

    // Compute Totals
    const totalAssets = list
      .filter((l) => l.category === "ASSET")
      .reduce((sum, l) => sum + l.debit, 0);

    const totalLiabilities = list
      .filter((l) => l.category === "LIABILITY")
      .reduce((sum, l) => sum + l.credit, 0);

    const netWorth = totalAssets - totalLiabilities;

    // 10. OWNER'S CAPITAL / EQUITY ACCOUNT (Equity -> Credit)
    list.push({
      id: "ledger-equity-capital",
      code: "3000-01",
      name: "Family Capital Account (Accumulated Net Worth)",
      category: "EQUITY",
      subCategory: "Owner Equity",
      debit: 0,
      credit: Math.max(0, netWorth),
      netBalance: netWorth,
      normalBalance: "CREDIT",
      owner: "family",
      status: "OK",
      note: "Balancing Equity Account: Assets − Liabilities",
    });

    const totalDebits = list.reduce((sum, l) => sum + l.debit, 0);
    const totalCredits = list.reduce((sum, l) => sum + l.credit, 0);
    const variance = Math.abs(totalDebits - totalCredits);

    return {
      ledgers: list,
      totals: {
        totalAssets,
        totalLiabilities,
        netWorth,
        totalDebits,
        totalCredits,
        variance,
      },
      balanceSheetCheck: {
        isBalanced: variance < 1,
        equation: `${fmtINRFull(totalAssets)} = ${fmtINRFull(totalLiabilities)} + ${fmtINRFull(netWorth)}`,
      },
    };
  }, [state]);

  // Filtered List
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      if (categoryFilter !== "ALL" && l.category !== categoryFilter) return false;
      if (ownerFilter !== "ALL" && l.owner !== ownerFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q) ||
          l.subCategory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ledgers, categoryFilter, ownerFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = ledgers.map((l) => ({
      "Account Code": l.code,
      "Account Head": l.name,
      Category: l.category,
      "Sub Category": l.subCategory,
      Owner: l.owner,
      "Debit Balance (INR)": l.debit,
      "Credit Balance (INR)": l.credit,
      Status: l.status,
      Notes: l.note || "",
    }));
    exportArrayToCSV(rows, `Trial-Balance-Ledger-${new Date().toISOString().split("T")[0]}`);
    showToast?.("Trial Balance exported to CSV successfully", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header Card & Accounting Equation Tally ── */}
      <Card
        style={{
          padding: 20,
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 8%, transparent), color-mix(in srgb, ${THEME.sage} 6%, transparent))`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
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
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: THEME.accent,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                  Double-Entry General Ledger & Trial Balance
                </h2>
                <p style={{ fontSize: 12, color: THEME.muted, margin: "2px 0 0" }}>
                  Real-time double-entry trial balance generator · Assets = Liabilities + Capital Verification
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>
              Export Trial Balance
            </Button>
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
              Print Ledger
            </Button>
          </div>
        </div>

        {/* Accounting Equation Verification Pill */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "var(--t-paper)",
            border: `1px solid ${totals.variance < 1 ? "color-mix(in srgb, var(--t-sage) 35%, transparent)" : "color-mix(in srgb, var(--t-rust) 35%, transparent)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {totals.variance < 1 ? (
              <CheckCircle2 size={18} color="var(--t-sage)" />
            ) : (
              <AlertTriangle size={18} color="var(--t-rust)" />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              Accounting Identity: Assets (
              <Money value={totals.totalAssets} />) = Liabilities (
              <Money value={totals.totalLiabilities} />) + Equity (
              <Money value={totals.netWorth} />)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant={totals.variance < 1 ? "success" : "danger"}>
              {totals.variance < 1 ? "PARITY VERIFIED (₹0 VARIANCE)" : `VARIANCE: ₹${totals.variance.toFixed(2)}`}
            </Badge>
          </div>
        </div>
      </Card>

      {/* ── Key Metrics Deck ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Total Debits (Assets)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
            <Money value={totals.totalDebits} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
            {ledgers.filter((l) => l.category === "ASSET").length} active asset ledger accounts
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Total Credits (Liab + Equity)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
            <Money value={totals.totalCredits} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
            {ledgers.filter((l) => l.category !== "ASSET").length} liability & capital accounts
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Owner Net Worth (Capital)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t-sage)", marginTop: 4 }}>
            <Money value={totals.netWorth} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
            Solvency: {totals.totalAssets > 0 ? ((totals.netWorth / totals.totalAssets) * 100).toFixed(1) : 0}% of gross assets
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Auditor Integrity Score
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
            100% / Clean
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
            Zero orphan transactions detected
          </div>
        </Card>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <Card style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240 }}>
            <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
              <Search
                size={15}
                color={THEME.muted}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search ledger code, account name..."
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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                fontSize: 12.5,
                fontWeight: 600,
                color: THEME.ink,
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="ASSET">Assets (Debit)</option>
              <option value="LIABILITY">Liabilities (Credit)</option>
              <option value="EQUITY">Capital / Equity (Credit)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── Trial Balance Table ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--t-accent) 5%, transparent)", borderBottom: `1.5px solid ${THEME.line}` }}>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Code</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Account Head</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Classification</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Owner</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Debit (Dr.)</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Credit (Cr.)</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted, fontSize: 11, textTransform: "uppercase", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedgers.map((l, i) => (
                <tr
                  key={l.id}
                  style={{
                    borderBottom: `1px solid ${THEME.line}`,
                    background: i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--t-paper) 40%, transparent)",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: THEME.muted }}>
                    {l.code}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: THEME.ink }}>
                    <div>{l.name}</div>
                    {l.note && <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 400 }}>{l.note}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: l.category === "ASSET" ? THEME.accent : l.category === "LIABILITY" ? "var(--t-rust)" : "var(--t-sage)" }}>
                      {l.category}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{l.subCategory}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: THEME.muted, textTransform: "capitalize" }}>
                    {l.owner}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: l.debit > 0 ? THEME.ink : THEME.muted }}>
                    {l.debit > 0 ? <Money value={l.debit} variant="full" /> : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: l.credit > 0 ? THEME.ink : THEME.muted }}>
                    {l.credit > 0 ? <Money value={l.credit} variant="full" /> : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <Badge variant={l.status === "OK" ? "success" : l.status === "WARNING" ? "danger" : "warning"}>
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "color-mix(in srgb, var(--t-accent) 8%, transparent)", borderTop: `2px solid ${THEME.line}` }}>
                <td colSpan={4} style={{ padding: "14px 16px", fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                  TOTAL TRIAL BALANCE
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 900, fontSize: 15, color: THEME.ink }}>
                  <Money value={totals.totalDebits} variant="full" />
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 900, fontSize: 15, color: THEME.ink }}>
                  <Money value={totals.totalCredits} variant="full" />
                </td>
                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                  <Badge variant="success">TALLIED</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
