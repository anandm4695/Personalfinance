// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";

interface AIAssistantTabProps {
  state: any;
  metrics: any;
}

// ── Inline markdown parser: **bold**, *italic*, `code` ──────────────────────
// Character-based scanner so *label:** (Gemini's inconsistent bold-close) is
// treated as bold rather than leaving a stray * on screen.
const parseInline = (text: string): React.ReactNode => {
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let buf = "";
  let k = 0;

  const flush = () => {
    if (buf) {
      nodes.push(<React.Fragment key={k++}>{buf}</React.Fragment>);
      buf = "";
    }
  };

  while (pos < text.length) {
    const c = text[pos];
    const c2 = text[pos + 1];

    // Bold: **text**
    if (c === "*" && c2 === "*") {
      const end = text.indexOf("**", pos + 2);
      if (end !== -1) {
        flush();
        nodes.push(
          <strong key={k++} style={{ fontWeight: 700 }}>
            {text.slice(pos + 2, end)}
          </strong>
        );
        pos = end + 2;
        continue;
      }
    }

    // Italic: *text*  — if closing * is followed by another *, consume both
    // so *label:** renders as bold "label:" instead of italic + stray *
    if (c === "*" && c2 !== "*") {
      const end = text.indexOf("*", pos + 1);
      if (end !== -1) {
        const content = text.slice(pos + 1, end);
        flush();
        if (text[end + 1] === "*") {
          // *text:** → treat as bold (Gemini's mixed marker)
          nodes.push(
            <strong key={k++} style={{ fontWeight: 700 }}>
              {content}
            </strong>
          );
          pos = end + 2;
        } else {
          nodes.push(<em key={k++}>{content}</em>);
          pos = end + 1;
        }
        continue;
      }
    }

    // Inline code: `text`
    if (c === "`") {
      const end = text.indexOf("`", pos + 1);
      if (end !== -1) {
        flush();
        nodes.push(
          <code
            key={k++}
            style={{
              background: "rgba(99,102,241,0.12)",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
            }}
          >
            {text.slice(pos + 1, end)}
          </code>
        );
        pos = end + 1;
        continue;
      }
    }

    buf += c;
    pos++;
  }

  flush();
  return <>{nodes}</>;
};

// ── Block markdown renderer ─────────────────────────────────────────────────
const MarkdownRenderer = ({ text }: { text: string }) => {
  const rawLines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    // trimStart so indented lines (e.g. "   - sub bullet" or "   **label:**")
    // are recognised as list items / paragraphs instead of falling through as
    // literal text. Trailing whitespace is handled per-check via .trim().
    const line = rawLines[i].trimStart();

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trimStart().startsWith("```")) {
        codeLines.push(rawLines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={`code-${i}`}
          style={{
            background: "var(--surface-1, rgba(0,0,0,0.06))",
            padding: "12px 16px",
            borderRadius: 10,
            overflowX: "auto",
            fontSize: 13,
            lineHeight: 1.6,
            margin: "4px 0",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <code style={{ fontFamily: "ui-monospace, monospace" }}>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      nodes.push(
        <div key={i} style={{ fontWeight: 800, fontSize: 17, marginTop: 6, marginBottom: 2 }}>
          {parseInline(line.slice(2))}
        </div>
      );
      i++;
      continue;
    }
    // H2
    if (line.startsWith("## ")) {
      nodes.push(
        <div
          key={i}
          style={{ fontWeight: 700, fontSize: 15, marginTop: 4, marginBottom: 2, color: THEME.ink }}
        >
          {parseInline(line.slice(3))}
        </div>
      );
      i++;
      continue;
    }
    // H3
    if (line.startsWith("### ")) {
      nodes.push(
        <div key={i} style={{ fontWeight: 600, fontSize: 14, marginTop: 4, marginBottom: 2 }}>
          {parseInline(line.slice(4))}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push(
        <hr
          key={i}
          style={{ border: "none", borderTop: `1px solid ${THEME.line}`, margin: "6px 0" }}
        />
      );
      i++;
      continue;
    }

    // Bullet list — collect consecutive (trimStart lets indented bullets work)
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^[-*+] /.test(rawLines[i].trimStart())) {
        items.push(rawLines[i].trimStart().replace(/^[-*+] /, ""));
        i++;
      }
      nodes.push(
        <ul
          key={`ul-${i}`}
          style={{
            margin: "2px 0",
            paddingLeft: 20,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.7, fontSize: 15 }}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — items stay in one <ol> even when separated by blank lines;
    // sub-bullets are absorbed into their parent <li> even when Gemini puts a
    // blank line between the numbered item and its bullets.
    if (/^\d+\. /.test(line)) {
      const startNum = parseInt(line.match(/^(\d+)\./)[1], 10);
      const items: { text: string; subs: string[] }[] = [];
      while (i < rawLines.length) {
        // Skip one blank line between numbered items so the whole list stays together
        let ci = i;
        if (rawLines[ci]?.trim() === "") ci++;
        const tl = ci < rawLines.length ? rawLines[ci].trimStart() : "";
        if (!/^\d+\. /.test(tl)) break;
        i = ci; // advance past optional blank separator
        const itemText = tl.replace(/^\d+\. /, "");
        i++;
        // Absorb sub-bullets — skip blank lines freely, stop at any non-blank non-bullet line
        const subs: string[] = [];
        let j = i;
        while (j < rawLines.length) {
          const sl = rawLines[j].trimStart();
          if (!sl) {
            j++;
            continue;
          }
          if (/^[-*+] /.test(sl)) {
            subs.push(sl.replace(/^[-*+] /, ""));
            j++;
            continue;
          }
          break;
        }
        if (subs.length > 0) i = j; // advance past consumed sub-bullets
        items.push({ text: itemText, subs });
      }
      nodes.push(
        <ol
          key={`ol-${i}`}
          start={startNum}
          style={{
            margin: "2px 0",
            paddingLeft: 22,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.7, fontSize: 15 }}>
              {parseInline(item.text)}
              {item.subs.length > 0 && (
                <ul
                  style={{
                    margin: "4px 0 2px",
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {item.subs.map((s, si) => (
                    <li key={si} style={{ lineHeight: 1.65, fontSize: 14 }}>
                      {parseInline(s)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: 4 }} />);
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(
      <p key={i} style={{ margin: 0, lineHeight: 1.75, fontSize: 15 }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{nodes}</div>;
};

// ── Animated typing dots ────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
    {[0, 1, 2].map((n) => (
      <span
        key={n}
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: THEME.muted,
          display: "block",
          animation: "ai-typing 1.2s ease-in-out infinite",
          animationDelay: `${n * 0.2}s`,
        }}
      />
    ))}
  </div>
);

// ── Suggestions ─────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Review my portfolio for diversification and risk",
  "How can I save more tax this year?",
  "Detect any anomalies in my finances",
  "What's my spending breakdown this month?",
  "Am I on track for my financial goals?",
  "Is my insurance coverage adequate?",
];

// ── Main component ───────────────────────────────────────────────────────────
export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ state, metrics }) => {
  const [messages, setMessages] = useState<{ role: "model" | "user"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const isFirstRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = state?.settings?.geminiApiKey || "";

  const WELCOME: { role: "model"; text: string } = {
    role: "model",
    text: "Hello! I'm your **AI Financial Advisor**.\n\nI've analysed your anonymised financial snapshot. Ask me anything — savings strategy, debt management, investment allocation, tax planning, or retirement goals.\n\nOr pick a suggestion below to get started.",
  };

  // Restore session from sessionStorage on mount
  useEffect(() => {
    if (!apiKey) return;
    try {
      const saved = sessionStorage.getItem("ai_advisor_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          isFirstRef.current = false;
          return;
        }
      }
    } catch {}
    setMessages([WELCOME]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Persist to sessionStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("ai_advisor_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom only when a new message arrives or typing indicator appears.
  // Do NOT re-scroll when loading → false; that would snap the user back to bottom
  // while they're reading an earlier part of a long response.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading]);

  const fmtCr = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(2)}Cr`;
    if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(abs / 1000).toFixed(0)}K`;
    return `₹${Math.round(abs)}`;
  };

  const generateContext = useCallback(() => {
    const topExpenses =
      (metrics.expenseBreakdown || [])
        .slice(0, 5)
        .map((e: any) => `  • ${e.name}: ${fmtCr(e.value)}`)
        .join("\n") || "  No data";
    const goals =
      (state.goals || [])
        .slice(0, 5)
        .map((g: any) => {
          const pct =
            Number(g.targetAmount) > 0
              ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
              : 0;
          return `  • ${g.name}: ${pct}% of ${fmtCr(Number(g.targetAmount))} (target: ${g.targetDate || "—"})`;
        })
        .join("\n") || "  No goals set";
    const subs =
      (state.subscriptions || [])
        .filter((s: any) => !s.paused)
        .slice(0, 5)
        .map((s: any) => `  • ${s.name}: ${fmtCr(Number(s.amount))}/${s.cycle}`)
        .join("\n") || "  None";
    const loans =
      (state.loansTaken || [])
        .map(
          (l: any) =>
            `  • ${l.type || "Loan"} @ ${l.rate || "?"}%: ${fmtCr(Number(l.outstanding || 0))} outstanding, EMI ${fmtCr(Number(l.emi || 0))}`
        )
        .join("\n") || "  No loans";
    const regime = state.profile?.regime === "old" ? "Old Regime" : "New Regime (FY 2025-26)";

    return `You are a highly professional, expert financial advisor for an Indian user.
Analyse their financial state and give concise, hyper-personalised, actionable advice.
Use markdown (## bold headings, bullet points). Be specific with numbers. No PII.

== FINANCIAL SNAPSHOT ==
Net Worth:        ${fmtCr(metrics.netWorth || 0)}
Monthly Income:   ${fmtCr(metrics.monthIncome || 0)}
Monthly Expenses: ${fmtCr(metrics.monthExpense || 0)}
Monthly Savings:  ${fmtCr((metrics.monthIncome || 0) - (metrics.monthExpense || 0))} (${(metrics.savingsRate || 0).toFixed(1)}% rate)
Tax Regime:       ${regime}

== ASSETS ==
Cash / Banks:     ${fmtCr(metrics.cashInBanks || 0)}
Mutual Funds:     ${fmtCr(metrics.mfValue || 0)} (${state.mutualFunds?.length || 0} funds, invested ${fmtCr(metrics.mfInvested || 0)})
Stocks:           ${fmtCr(metrics.stockValue || 0)} (${state.stocks?.length || 0} stocks, invested ${fmtCr(metrics.stockInvested || 0)})
Fixed Deposits:   ${fmtCr(metrics.fdValue || 0)}
PPF:              ${fmtCr(metrics.ppfValue || 0)}
EPF:              ${fmtCr(metrics.epfValue || 0)}
NPS:              ${fmtCr(metrics.npsValue || 0)}
Real Estate:      ${fmtCr(metrics.realEstateAsset || 0)} (${(state.realEstateProperties || []).filter((p: any) => p.status !== 'sold').length} properties; sold excluded)
Total Assets:     ${fmtCr(metrics.totalAssets || 0)}

== LIABILITIES ==
Credit Cards:     ${fmtCr(metrics.ccOutstanding || 0)} outstanding (util ${(metrics.creditUtilization || 0).toFixed(0)}%)
Loans:
${loans}
Real Estate (builder dues): ${fmtCr(metrics.realEstateOutstanding || 0)} outstanding to builder
Total Liabilities: ${fmtCr(metrics.totalLiabilities || 0)}
FOIR:              ${(metrics.foir || 0).toFixed(1)}%
Debt-to-Asset:     ${(metrics.debtToAssetRatio || 0).toFixed(1)}%

== TOP EXPENSES THIS MONTH ==
${topExpenses}

== ACTIVE SUBSCRIPTIONS ==
${subs}

== GOALS PROGRESS ==
${goals}

You have access to local tools/functions to retrieve real-time and detailed transaction lists, holdings, and loan prepayment calculations. Use them when the user asks for detailed lists, specific transactions, or loan prepayments.`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, state]);

  const functionDeclarations = [
    {
      name: "get_financial_summary",
      description: "Retrieve a summary of the user's financial metrics including net worth, monthly income, monthly expenses, total savings, savings rate, cash in banks, asset values (mutual funds, stocks, fixed deposits, PPF, EPF, NPS, real estate), total liabilities, and debt ratios.",
      parameters: {
        type: "OBJECT",
        properties: {},
      },
    },
    {
      name: "get_investment_holdings",
      description: "Retrieve a list of all mutual funds and stocks holdings including symbol/scheme names, folio, units/quantity, buy price/NAV, live/current price/NAV, invested value, current value, and absolute gains/losses.",
      parameters: {
        type: "OBJECT",
        properties: {},
      },
    },
    {
      name: "find_transactions",
      description: "Search and filter the user's transactions ledger by a search keyword, category, or type. Returns up to 25 matched transactions.",
      parameters: {
        type: "OBJECT",
        properties: {
          queryText: {
            type: "STRING",
            description: "Optional search text matching the transaction note or description.",
          },
          category: {
            type: "STRING",
            description: "Optional exact category name (e.g., Food, Travel, Bills, Salary, Investment).",
          },
          type: {
            type: "STRING",
            description: "Optional transaction type. Allowed values: 'credit', 'debit'.",
          },
        },
      },
    },
    {
      name: "calculate_loan_prepayment",
      description: "Calculate interest savings and tenure reduction by simulating extra monthly EMI payments or a lump-sum prepayment on the user's active loan(s).",
      parameters: {
        type: "OBJECT",
        properties: {
          loanId: {
            type: "STRING",
            description: "Optional ID of the loan to calculate prepayments for. Defaults to the first active loan if not provided.",
          },
          extraMonthlyAmount: {
            type: "NUMBER",
            description: "Optional extra amount to pay on top of the regular EMI every month.",
          },
          oneTimePaymentAmount: {
            type: "NUMBER",
            description: "Optional lump-sum / one-time prepayment to make immediately.",
          },
        },
      },
    },
    // Feature 21: Portfolio Review
    {
      name: "review_portfolio",
      description: "Analyze the user's investment portfolio for diversification quality, concentration risk, asset allocation, top holdings, and sector exposure. Call this when the user asks to review or analyze their portfolio.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 22: Tax Optimizer
    {
      name: "get_tax_optimization",
      description: "Get the user's current tax deduction utilization (80C, 80D, NPS, HRA, home loan) vs limits, compare old vs new regime tax amounts, and suggest actionable tax-saving strategies. Call when the user asks about saving tax.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 23: Natural Language Queries
    {
      name: "get_spending_summary",
      description: "Get spending breakdown by category for a date range. Shows total spent per category.",
      parameters: {
        type: "OBJECT",
        properties: {
          startDate: { type: "STRING", description: "Start date YYYY-MM-DD. Defaults to current month start." },
          endDate: { type: "STRING", description: "End date YYYY-MM-DD. Defaults to today." },
        },
      },
    },
    {
      name: "get_goal_status",
      description: "Get all financial goals with progress percentage, remaining amount, and target dates.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_insurance_summary",
      description: "Get insurance coverage summary: term plans with cover amounts, LIC policies with sum assured, and total family coverage.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_sip_summary",
      description: "Get all active SIPs with scheme names, amounts, frequency, and total monthly SIP outflow.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 24: Anomaly Detection
    {
      name: "detect_anomalies",
      description: "Scan the user's financial data for anomalies: months with unusually high spending, missed SIP months, sudden bank balance drops, and credit utilization spikes. Call when the user asks about unusual patterns or to check their financial health.",
      parameters: { type: "OBJECT", properties: {} },
    },
  ];

  // ── Feature 21: Portfolio Review Handler ──
  const handleReviewPortfolio = () => {
    const mfs = state.mutualFunds || [];
    const stocks = state.stocks || [];
    const totalEquityMF = mfs.filter((m: any) => !(m.type || m.category || "").toLowerCase().includes("debt")).reduce((s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0), 0);
    const totalDebtMF = mfs.filter((m: any) => (m.type || m.category || "").toLowerCase().includes("debt")).reduce((s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0), 0);
    const totalStocks = stocks.reduce((s: number, st: any) => s + Number(st.qty || 0) * Number(st.currentPrice || st.avgPrice || 0), 0);
    const totalMF = mfs.reduce((s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0), 0);
    const totalEquity = totalEquityMF + totalStocks;
    const totalPortfolio = totalEquity + totalDebtMF + (metrics.fdValue || 0) + (metrics.ppfValue || 0) + (metrics.npsValue || 0) + (metrics.epfValue || 0);
    const top5Holdings = [...stocks.map((s: any) => ({ name: s.symbol, value: Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0), type: "Stock" })),
      ...mfs.map((m: any) => ({ name: m.name || m.scheme, value: Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0), type: "MF" }))
    ].sort((a, b) => b.value - a.value).slice(0, 5);
    const concentrationRisks = stocks.filter((s: any) => {
      const val = Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0);
      return totalStocks > 0 && (val / totalStocks) > 0.15;
    }).map((s: any) => ({ symbol: s.symbol, pct: Math.round((Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0) / totalStocks) * 100) }));
    return {
      totalPortfolioValue: totalPortfolio,
      allocation: {
        equityStocks: totalStocks,
        equityMF: totalEquityMF,
        debtMF: totalDebtMF,
        fixedDeposits: metrics.fdValue || 0,
        ppf: metrics.ppfValue || 0,
        epf: metrics.epfValue || 0,
        nps: metrics.npsValue || 0,
      },
      equityPct: totalPortfolio > 0 ? Math.round((totalEquity / totalPortfolio) * 100) : 0,
      debtPct: totalPortfolio > 0 ? Math.round(((totalDebtMF + (metrics.fdValue || 0) + (metrics.ppfValue || 0) + (metrics.epfValue || 0)) / totalPortfolio) * 100) : 0,
      top5Holdings,
      concentrationRisks,
      totalFunds: mfs.length,
      totalStocks: stocks.length,
    };
  };

  // ── Feature 22: Tax Optimizer Handler ──
  const handleGetTaxOptimization = () => {
    const fy = state.profile?.fy || "2025-26";
    const fyStart = Number(fy.split("-")[0]) || 2025;
    const fyStartStr = `${fyStart}-04-01`;
    const fyEndStr = `${fyStart + 1}-03-31`;
    const elss = (state.mutualFunds || []).filter((m: any) => (m.type || m.category || "").toUpperCase().includes("ELSS") && m.buyDate >= fyStartStr && m.buyDate <= fyEndStr).reduce((s: number, m: any) => s + Number(m.invested || 0), 0);
    const ppf = (state.ppf || []).reduce((s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0), 0);
    const lic = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
    const epfContrib = (state.epf || []).reduce((s: number, e: any) => {
      return s + (e.transactions || []).filter((t: any) => t.date >= fyStartStr && t.date <= fyEndStr && (t.type === "employee_contribution" || t.type === "monthly_contribution")).reduce((sum: number, t: any) => sum + Number(t.amount || t.employeeShare || 0), 0);
    }, 0);
    const used80C = Math.min(elss + ppf + lic + epfContrib, 150000);
    const remaining80C = Math.max(0, 150000 - used80C);
    const rentPaid = (state.rentedProperties || []).reduce((s: number, p: any) => s + Number(p.monthlyRent || 0) * 12, 0);
    const npsContrib = 0;
    const remaining80CCD = 50000 - npsContrib;
    return {
      fy,
      regime: state.profile?.regime || "new",
      deductions: {
        "80C": { used: used80C, limit: 150000, remaining: remaining80C, sources: { elss, ppf, lic, epf: epfContrib } },
        "80CCD_1B_NPS": { used: npsContrib, limit: 50000, remaining: remaining80CCD },
        "HRA": { rentPaidAnnually: rentPaid, eligible: rentPaid > 0 },
      },
      suggestions: [
        ...(remaining80C > 0 ? [`Invest ₹${remaining80C.toLocaleString()} more in ELSS/PPF to max out 80C`] : []),
        ...(remaining80CCD > 0 ? [`Invest ₹${remaining80CCD.toLocaleString()} in NPS for additional 80CCD(1B) deduction`] : []),
        ...(rentPaid > 0 && state.profile?.regime === "old" ? ["Claim HRA exemption under Sec 10(13A)"] : []),
      ],
    };
  };

  // ── Feature 23: Spending Summary Handler ──
  const handleGetSpendingSummary = (args: any) => {
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultEnd = now.toISOString().slice(0, 10);
    const startDate = args.startDate || defaultStart;
    const endDate = args.endDate || defaultEnd;
    const txs = (state.transactions || []).filter((t: any) => t.type === "debit" && t.date >= startDate && t.date <= endDate);
    const byCat: Record<string, number> = {};
    txs.forEach((t: any) => { const cat = t.category || "Uncategorized"; byCat[cat] = (byCat[cat] || 0) + Number(t.amount || 0); });
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
    return { startDate, endDate, totalSpent: txs.reduce((s: number, t: any) => s + Number(t.amount || 0), 0), categories: sorted, transactionCount: txs.length };
  };

  // ── Feature 23: Goal Status Handler ──
  const handleGetGoalStatus = () => {
    return (state.goals || []).map((g: any) => {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      return { name: g.name, category: g.category, priority: g.priority, targetAmount: target, currentAmount: current, progress: target > 0 ? Math.round((current / target) * 100) : 0, remaining: Math.max(0, target - current), targetDate: g.targetDate || null };
    });
  };

  // ── Feature 23: Insurance Summary Handler ──
  const handleGetInsuranceSummary = () => {
    const termPlans = (state.termPlans || []).map((t: any) => ({ name: t.planName || t.name, insurer: t.insurer, coverAmount: Number(t.coverAmount || t.sumAssured || 0), annualPremium: Number(t.annualPremium || 0), maturityDate: t.maturityDate }));
    const licPolicies = (state.lic || []).map((l: any) => ({ name: l.planName, policyNumber: l.policyNumber, sumAssured: Number(l.sumAssured || 0), annualPremium: Number(l.annualPremium || 0) }));
    const totalCover = termPlans.reduce((s: number, t: any) => s + t.coverAmount, 0) + licPolicies.reduce((s: number, l: any) => s + l.sumAssured, 0);
    return { termPlans, licPolicies, totalCover, monthlyIncome: metrics.monthIncome || 0, coverageMultiple: metrics.monthIncome > 0 ? Math.round(totalCover / (metrics.monthIncome * 12)) : 0 };
  };

  // ── Feature 23: SIP Summary Handler ──
  const handleGetSipSummary = () => {
    const sips = (state.sips || []).map((s: any) => ({ scheme: s.scheme || s.name, amount: Number(s.amount || 0), frequency: s.frequency || "monthly", startDate: s.startDate, fundType: s.fundType || s.type }));
    const totalMonthlySIP = sips.filter((s: any) => s.frequency === "monthly").reduce((sum: number, s: any) => sum + s.amount, 0);
    return { sips, totalMonthlySIP, activeSIPs: sips.length };
  };

  // ── Feature 24: Anomaly Detection Handler ──
  const handleDetectAnomalies = () => {
    const anomalies: any[] = [];
    const txs = state.transactions || [];
    const monthlySpend: Record<string, number> = {};
    txs.filter((t: any) => t.type === "debit").forEach((t: any) => {
      if (t.date) { const m = t.date.slice(0, 7); monthlySpend[m] = (monthlySpend[m] || 0) + Number(t.amount || 0); }
    });
    const months = Object.keys(monthlySpend).sort();
    if (months.length >= 3) {
      const values = months.map((m) => monthlySpend[m]);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      months.forEach((m) => {
        if (monthlySpend[m] > avg * 2) anomalies.push({ type: "high_spending", month: m, amount: monthlySpend[m], average: Math.round(avg), note: `Spending was ${Math.round(monthlySpend[m] / avg)}x the average` });
      });
    }
    // Missed SIP detection
    const sips = state.sips || [];
    const mfBuys = state.mutualFunds || [];
    sips.forEach((sip: any) => {
      if (!sip.startDate) return;
      const start = new Date(sip.startDate);
      const now = new Date();
      const sipMonths: string[] = [];
      for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) { sipMonths.push(d.toISOString().slice(0, 7)); }
      const buyMonths = new Set(mfBuys.filter((m: any) => (m.name || m.scheme || "").includes(sip.scheme || "___")).map((m: any) => (m.buyDate || "").slice(0, 7)));
      const missed = sipMonths.filter((m) => !buyMonths.has(m));
      if (missed.length > 0) anomalies.push({ type: "missed_sip", scheme: sip.scheme, missedMonths: missed.slice(-3), totalMissed: missed.length });
    });
    // Credit utilization spikes
    (state.creditCards || []).forEach((cc: any) => {
      const util = Number(cc.cardLimit) > 0 ? (Number(cc.outstanding || 0) / Number(cc.cardLimit)) * 100 : 0;
      if (util > 80) anomalies.push({ type: "high_credit_utilization", card: cc.issuer, utilization: Math.round(util), outstanding: Number(cc.outstanding || 0), limit: Number(cc.cardLimit || 0) });
    });
    return { anomalies, scannedAt: new Date().toISOString() };
  };

  const handleGetFinancialSummary = () => {
    return {
      netWorth: metrics.netWorth || 0,
      monthlyIncome: metrics.monthIncome || 0,
      monthlyExpenses: metrics.monthExpense || 0,
      monthlySavings: (metrics.monthIncome || 0) - (metrics.monthExpense || 0),
      savingsRate: metrics.savingsRate || 0,
      cashInBanks: metrics.cashInBanks || 0,
      mutualFundsValue: metrics.mfValue || 0,
      mutualFundsInvested: metrics.mfInvested || 0,
      stocksValue: metrics.stockValue || 0,
      stocksInvested: metrics.stockInvested || 0,
      fixedDepositsValue: metrics.fdValue || 0,
      ppfValue: metrics.ppfValue || 0,
      epfValue: metrics.epfValue || 0,
      npsValue: metrics.npsValue || 0,
      realEstateValue: metrics.realEstateAsset || 0,
      creditCardOutstanding: metrics.ccOutstanding || 0,
      totalLiabilities: metrics.totalLiabilities || 0,
      foir: metrics.foir || 0,
      debtToAssetRatio: metrics.debtToAssetRatio || 0,
    };
  };

  const handleGetInvestmentHoldings = () => {
    const mutualFunds = (state.mutualFunds || []).map((m: any) => ({
      name: m.name || m.scheme || "Mutual Fund",
      units: Number(m.units || 0),
      buyNav: Number(m.buyNav || 0),
      currentNav: Number(m.currentNav || m.buyNav || 0),
      investedAmount: Number(m.units || 0) * Number(m.buyNav || 0),
      currentValue: Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
      gain: (Number(m.currentNav || m.buyNav || 0) - Number(m.buyNav || 0)) * Number(m.units || 0),
      folio: m.folio || "N/A",
    }));

    const stocks = (state.stocks || []).map((s: any) => ({
      symbol: s.symbol,
      quantity: Number(s.qty || 0),
      avgBuyPrice: Number(s.avgPrice || 0),
      currentPrice: Number(s.currentPrice || s.avgPrice || 0),
      investedAmount: Number(s.qty || 0) * Number(s.avgPrice || 0),
      currentValue: Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0),
      gain: (Number(s.currentPrice || s.avgPrice || 0) - Number(s.avgPrice || 0)) * Number(s.qty || 0),
    }));

    return { mutualFunds, stocks };
  };

  const handleFindTransactions = (args: any) => {
    const queryText = (args.queryText || "").toLowerCase().trim();
    const category = (args.category || "").toLowerCase().trim();
    const type = (args.type || "").toLowerCase().trim();

    let txs = state.transactions || [];

    if (queryText) {
      txs = txs.filter(
        (t: any) =>
          (t.note || "").toLowerCase().includes(queryText) ||
          (t.description || "").toLowerCase().includes(queryText) ||
          (t.category || "").toLowerCase().includes(queryText)
      );
    }
    if (category) {
      txs = txs.filter((t: any) => (t.category || "").toLowerCase() === category);
    }
    if (type) {
      txs = txs.filter((t: any) => (t.type || "").toLowerCase() === type);
    }

    return txs.slice(0, 25).map((t: any) => ({
      id: t.id,
      date: t.date,
      amount: Number(t.amount || 0),
      type: t.type,
      category: t.category || "Uncategorized",
      note: t.note || t.description || "",
    }));
  };

  const handleCalculateLoanPrepayment = (args: any) => {
    const { loanId, extraMonthlyAmount = 0, oneTimePaymentAmount = 0 } = args;

    let loan = null;
    if (loanId) {
      loan = (state.loansTaken || []).find((l: any) => l.id === loanId);
    } else if ((state.loansTaken || []).length > 0) {
      loan = state.loansTaken[0];
    }

    if (!loan) {
      return { error: "No active loan found to calculate prepayment for." };
    }

    const balance = Number(loan.outstanding || 0);
    const emi = Number(loan.emi || 0);
    const rate = Number(loan.rate || 0);

    if (balance <= 0 || emi <= 0 || rate <= 0) {
      return { error: "Invalid loan details. Balance, EMI and Interest Rate must be greater than zero." };
    }

    const monthlyRate = rate / 100 / 12;

    // 1. Baseline simulation
    let baseBalance = balance;
    let baseInterest = 0;
    let baseMonths = 0;
    while (baseBalance > 0 && baseMonths < 600) {
      const interest = baseBalance * monthlyRate;
      const principal = emi - interest;
      if (principal <= 0) {
        return { error: "EMI is too low to cover monthly interest. Loan will never be paid off." };
      }
      const actualPay = Math.min(baseBalance + interest, emi);
      baseInterest += interest;
      baseBalance = baseBalance + interest - actualPay;
      baseMonths++;
    }

    // 2. Prepayment simulation
    let prepayBalance = balance;
    if (oneTimePaymentAmount > 0) {
      prepayBalance = Math.max(0, prepayBalance - oneTimePaymentAmount);
    }

    let prepayInterest = 0;
    let prepayMonths = 0;

    while (prepayBalance > 0 && prepayMonths < 600) {
      const interest = prepayBalance * monthlyRate;
      const totalPayment = emi + extraMonthlyAmount;
      const actualPay = Math.min(prepayBalance + interest, totalPayment);
      prepayInterest += interest;
      prepayBalance = prepayBalance + interest - actualPay;
      prepayMonths++;
    }

    const interestSavings = Math.max(0, baseInterest - prepayInterest);
    const monthsSaved = Math.max(0, baseMonths - prepayMonths);

    return {
      loanName: `${loan.type || "Loan"} (${loan.bankName || "Active"})`,
      outstandingBalance: balance,
      interestRate: rate,
      currentEmi: emi,
      baselineRemainingTenureMonths: baseMonths,
      baselineTotalInterest: baseInterest,
      prepaymentRemainingTenureMonths: prepayMonths,
      prepaymentTotalInterest: prepayInterest,
      interestSaved: interestSavings,
      monthsSaved: monthsSaved,
      yearsSaved: Number((monthsSaved / 12).toFixed(1)),
    };
  };

  const handleSend = async (prefill?: string) => {
    const userText = (prefill ?? input).trim();
    if (!userText || !apiKey || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ functionDeclarations }],
      });

      // First message: create a new chat session and prepend full financial context
      if (!chatRef.current) {
        chatRef.current = model.startChat();
        isFirstRef.current = true;
      }

      const payload = isFirstRef.current
        ? `${generateContext()}\n\nUSER QUESTION:\n${userText}`
        : userText;

      isFirstRef.current = false;

      let result = await chatRef.current.sendMessage(payload);
      let functionCalls = result.response.functionCalls();

      // Loop executing client-side tool calls while the model requests them
      while (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];

        for (const call of functionCalls) {
          const { name, args } = call;
          let contentData;

          try {
            if (name === "get_financial_summary") {
              contentData = handleGetFinancialSummary();
            } else if (name === "get_investment_holdings") {
              contentData = handleGetInvestmentHoldings();
            } else if (name === "find_transactions") {
              contentData = handleFindTransactions(args);
            } else if (name === "calculate_loan_prepayment") {
              contentData = handleCalculateLoanPrepayment(args);
            } else if (name === "review_portfolio") {
              contentData = handleReviewPortfolio();
            } else if (name === "get_tax_optimization") {
              contentData = handleGetTaxOptimization();
            } else if (name === "get_spending_summary") {
              contentData = handleGetSpendingSummary(args);
            } else if (name === "get_goal_status") {
              contentData = handleGetGoalStatus();
            } else if (name === "get_insurance_summary") {
              contentData = handleGetInsuranceSummary();
            } else if (name === "get_sip_summary") {
              contentData = handleGetSipSummary();
            } else if (name === "detect_anomalies") {
              contentData = handleDetectAnomalies();
            } else {
              contentData = { error: `Function '${name}' not implemented.` };
            }
          } catch (execErr: any) {
            contentData = { error: `Failed to execute: ${execErr.message}` };
          }

          functionResponses.push({
            functionResponse: {
              name,
              response: { result: contentData },
            },
          });
        }

        // Send function responses back to model
        result = await chatRef.current.sendMessage(functionResponses);
        functionCalls = result.response.functionCalls();
      }

      setMessages((prev) => [...prev, { role: "model", text: result.response.text() }]);
    } catch (err: any) {
      setError(err?.message || "Failed to reach Gemini. Check your API key in Settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    chatRef.current = null;
    isFirstRef.current = true;
    setMessages([WELCOME]);
    setError(null);
    sessionStorage.removeItem("ai_advisor_messages");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      })
      .catch(() => {});
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  // ── No API key: setup screen ──────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="tab-content-enter animate-fade-in-up">
        <SectionTitle sub="Get hyper-personalised insights from your AI Financial Advisor">
          AI Advisor
        </SectionTitle>
        <Card style={{ padding: 48, textAlign: "center", border: `1.5px dashed ${THEME.line}` }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))",
              border: `1.5px solid rgba(14,165,233,0.2)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "#0ea5e9",
            }}
          >
            <Sparkles size={32} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: THEME.ink, marginBottom: 12 }}>
            Unlock AI Financial Advice
          </h2>
          <p
            style={{
              fontSize: 14,
              color: THEME.muted,
              maxWidth: 480,
              margin: "0 auto 28px",
              lineHeight: 1.7,
            }}
          >
            Connect your own free Gemini API key to get hyper-personalised financial advice. Your
            data is anonymised locally before every API call — nothing sensitive leaves your device.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 12,
                background: "linear-gradient(135deg,#0ea5e9,#3b82f6)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(14,165,233,0.25)",
              }}
            >
              Get Free Gemini API Key <ArrowRight size={16} />
            </a>
            <span style={{ fontSize: 13, color: THEME.muted }}>
              Then paste it in <strong>Settings → AI Advisor</strong>
            </span>
          </div>
          <div
            style={{
              marginTop: 28,
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(14,165,233,0.06)",
              border: `1px solid rgba(14,165,233,0.15)`,
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              fontSize: 13,
              color: THEME.muted,
            }}
          >
            <ShieldCheck size={15} style={{ color: "#0ea5e9", flexShrink: 0 }} />
            Context is anonymised before each request · API key stored only on this device
          </div>
        </Card>
      </div>
    );
  }

  // ── Chat interface ────────────────────────────────────────────────────────
  return (
    <div
      className="tab-content-enter animate-fade-in-up"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <SectionTitle sub="Powered by Gemini 2.5 Flash · Context anonymised locally · Multi-turn">
        AI Advisor
      </SectionTitle>

      <Card
        style={{
          flex: 1,
          border: `1.5px solid ${THEME.line}`,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            borderRadius: "inherit",
          }}
        >
        {/* ── Header ── */}
        <div
          style={{
            padding: "13px 18px",
            borderBottom: `1px solid ${THEME.line}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--t-paper)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              flexShrink: 0,
              background: "linear-gradient(135deg,#0ea5e9,#3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Bot size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, lineHeight: 1.2 }}>
              Gemini Advisor
            </div>
            <div
              style={{
                fontSize: 11,
                color: THEME.sage,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 1,
              }}
            >
              <ShieldCheck size={11} />
              Privacy preserved · multi-turn conversation
            </div>
          </div>
          {hasUserMessages && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "transparent",
                color: THEME.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 18px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minHeight: 0,
          }}
        >
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={i}
                className="animate-fade-in-up"
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    flexShrink: 0,
                    marginTop: 2,
                    background: isUser ? THEME.ink : "linear-gradient(135deg,#0ea5e9,#3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble + copy */}
                <div
                  style={{
                    maxWidth: isUser ? "78%" : "93%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 15,
                      borderTopRightRadius: isUser ? 3 : 15,
                      borderTopLeftRadius: isUser ? 15 : 3,
                      background: isUser
                        ? "linear-gradient(135deg, var(--t-ink), color-mix(in srgb, var(--t-ink) 80%, #3b82f6))"
                        : "var(--t-paper)",
                      color: isUser ? "#fff" : THEME.ink,
                      border: isUser ? "none" : `1px solid ${THEME.line}`,
                      boxShadow: "var(--shadow-sm)",
                      wordBreak: "break-word",
                      userSelect: "text",
                    }}
                  >
                    {isUser ? (
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{msg.text}</p>
                    ) : (
                      <MarkdownRenderer text={msg.text} />
                    )}
                  </div>
                  {/* Copy button sits BELOW the bubble in normal flow — never overlaps text */}
                  {!isUser && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => copyMessage(msg.text, i)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--t-paper)",
                          color: copiedIdx === i ? THEME.sage : THEME.muted,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
                        {copiedIdx === i ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  flexShrink: 0,
                  marginTop: 2,
                  background: "linear-gradient(135deg,#0ea5e9,#3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Bot size={14} />
              </div>
              <div
                style={{
                  padding: "13px 17px",
                  borderRadius: 15,
                  borderTopLeftRadius: 3,
                  background: "var(--t-paper)",
                  border: `1px solid ${THEME.line}`,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "13px 16px",
                background: "rgba(220,38,38,0.07)",
                borderRadius: 12,
                border: `1px solid rgba(220,38,38,0.18)`,
                color: THEME.rust,
                fontSize: 13,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Gemini API error</div>
                <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{error}</div>
                <button
                  onClick={() => setError(null)}
                  style={{
                    marginTop: 8,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid rgba(220,38,38,0.25)`,
                    background: "transparent",
                    color: THEME.rust,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div
          style={{
            padding: "10px 18px 14px",
            background: "var(--t-paper)",
            borderTop: `1px solid ${THEME.line}`,
            flexShrink: 0,
          }}
        >
          {/* Suggestions — visible until first user message */}
          {!hasUserMessages && (
            <div
              style={{
                display: "flex",
                gap: 7,
                marginBottom: 10,
                overflowX: "auto",
                paddingBottom: 2,
              }}
              className="no-scrollbar"
            >
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSend(sug)}
                  disabled={loading}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about savings, investments, tax planning, debt…"
              disabled={loading}
              style={{
                flex: 1,
                padding: "11px 14px",
                borderRadius: 12,
                border: `1.5px solid ${input.trim() ? "var(--t-accent, #4F46E5)" : THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                minHeight: 46,
                maxHeight: 120,
                lineHeight: 1.5,
                transition: "border-color 0.15s",
                overflowY: "auto",
              }}
              rows={Math.min(Math.max(input.split("\n").length, 1), 4)}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                flexShrink: 0,
                background:
                  input.trim() && !loading
                    ? "linear-gradient(135deg,#0ea5e9,#3b82f6)"
                    : "var(--surface-0)",
                color: input.trim() && !loading ? "#fff" : THEME.muted,
                border: input.trim() && !loading ? "none" : `1.5px solid ${THEME.line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: input.trim() && !loading ? "0 4px 12px rgba(14,165,233,0.28)" : "none",
              }}
            >
              <Send size={17} />
            </button>
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: THEME.muted,
              marginTop: 9,
              lineHeight: 1.4,
            }}
          >
            AI-generated advice is informational only · Not a substitute for professional financial
            guidance
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
};
