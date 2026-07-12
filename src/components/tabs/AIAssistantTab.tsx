// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Bookmark,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Shield,
  Target,
  PieChart,
  Wallet,
  BarChart3,
  AlertCircle,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { getCurrentFY } from "../../utils/appConstants";
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

// ── Advisor prompt categories ────────────────────────────────────────────────
const ADVISOR_PROMPTS: Record<string, string[]> = {
  Portfolio: [
    "Review my portfolio for diversification and rebalancing suggestions",
    "Which stocks should I consider selling based on fundamentals?",
    "Am I over-exposed to any single sector?",
  ],
  Tax: [
    "How can I maximize my tax savings this year?",
    "Should I switch to old or new tax regime?",
    "Calculate my estimated advance tax for this quarter",
  ],
  Goals: [
    "Am I on track for all my financial goals?",
    "What SIP amount do I need to retire by 55?",
    "Prioritize my goals by urgency and feasibility",
  ],
  Risk: [
    "Detect anomalies in my spending patterns",
    "What's my financial risk score?",
    "How vulnerable am I to a job loss scenario?",
  ],
};

const PROMPT_CATEGORY_ICONS: Record<string, any> = {
  Portfolio: PieChart,
  Tax: Wallet,
  Goals: Target,
  Risk: Shield,
};

// ── Main component ───────────────────────────────────────────────────────────
export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ state, metrics }) => {
  const [messages, setMessages] = useState<{ role: "model" | "user"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savedNoteIdx, setSavedNoteIdx] = useState<number | null>(null);
  const [activePromptCategory, setActivePromptCategory] = useState("Portfolio");
  const [showSavedNotes, setShowSavedNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState<{ text: string; savedAt: string }[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("finance_ai_notes") || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });

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

  // ── Save AI response as note ──
  const saveAsNote = (text: string, idx: number) => {
    try {
      const existing = JSON.parse(localStorage.getItem("finance_ai_notes") || "[]");
      const next = Array.isArray(existing) ? existing : [];
      next.push({ text, savedAt: new Date().toISOString() });
      localStorage.setItem("finance_ai_notes", JSON.stringify(next));
      setSavedNotes(next);
      setSavedNoteIdx(idx);
      setTimeout(() => setSavedNoteIdx(null), 2000);
    } catch {}
  };

  // ── Delete a saved note ──
  const deleteNote = (idx: number) => {
    setSavedNotes((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      try {
        localStorage.setItem("finance_ai_notes", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // ── Relative time for saved notes (e.g. "3h ago") ──
  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // ── Proactive insights ──
  const proactiveInsights = useMemo(() => {
    const insights: {
      icon: any;
      title: string;
      detail: string;
      severity: "critical" | "warning" | "opportunity";
      prompt: string;
    }[] = [];
    const savingsRate = metrics.savingsRate || 0;
    const creditUtil = metrics.creditUtilization || 0;
    const monthExpense = metrics.monthExpense || 0;
    const cashInBanks = metrics.cashInBanks || 0;
    const emergencyMonths = monthExpense > 0 ? cashInBanks / monthExpense : 0;

    // Savings rate check
    if (savingsRate < 20 && (metrics.monthIncome || 0) > 0) {
      insights.push({
        icon: TrendingDown,
        title: "Low Savings Rate",
        detail: `Your savings rate is ${savingsRate.toFixed(0)}% — below the recommended 20%`,
        severity: savingsRate < 10 ? "critical" : "warning",
        prompt: `My savings rate is only ${savingsRate.toFixed(0)}%. How can I increase it to at least 20%?`,
      });
    }

    // Credit utilization
    if (creditUtil > 30) {
      insights.push({
        icon: AlertCircle,
        title: "High Credit Utilization",
        detail: `Credit utilization at ${creditUtil.toFixed(0)}% — may impact credit score`,
        severity: creditUtil > 75 ? "critical" : "warning",
        prompt: `My credit utilization is ${creditUtil.toFixed(0)}%. How can I reduce it and improve my credit score?`,
      });
    }

    // Emergency fund
    if (emergencyMonths < 3 && monthExpense > 0) {
      insights.push({
        icon: Shield,
        title: "Weak Emergency Fund",
        detail: `Emergency fund covers only ${emergencyMonths.toFixed(1)} months`,
        severity: emergencyMonths < 1 ? "critical" : "warning",
        prompt: `My emergency fund only covers ${emergencyMonths.toFixed(1)} months of expenses. How should I build it up?`,
      });
    }

    // Goals behind schedule
    const behindGoals = (state.goals || []).filter((g: any) => {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      if (!g.targetDate || target <= 0) return false;
      const targetDate = new Date(g.targetDate);
      const now = new Date();
      const totalMonths = Math.max(
        1,
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const remaining = target - current;
      const monthlyNeeded = remaining / totalMonths;
      const monthlySavings = (metrics.monthIncome || 0) - (metrics.monthExpense || 0);
      return monthlyNeeded > monthlySavings * 0.5;
    });
    if (behindGoals.length > 0) {
      insights.push({
        icon: Target,
        title: "Goals Behind Schedule",
        detail: `${behindGoals.length} goal${behindGoals.length > 1 ? "s are" : " is"} behind schedule`,
        severity: "warning",
        prompt: `${behindGoals.length} of my financial goals are behind schedule. Which ones should I prioritize and how can I catch up?`,
      });
    }

    // Concentration risk
    const stocks = state.stocks || [];
    const totalStockVal = stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.currentPrice || st.avgPrice || 0),
      0
    );
    const concentrated = stocks.filter((s: any) => {
      const val = Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0);
      return totalStockVal > 0 && val / totalStockVal > 0.15;
    });
    if (concentrated.length > 0) {
      insights.push({
        icon: PieChart,
        title: "Concentration Risk",
        detail: `Portfolio concentrated in ${concentrated.map((s: any) => s.symbol).join(", ")}`,
        severity: "warning",
        prompt: `My portfolio has concentration risk in ${concentrated.map((s: any) => s.symbol).join(", ")}. Should I rebalance?`,
      });
    }

    // Insurance adequacy
    const termCover = (state.termPlans || []).reduce(
      (s: number, t: any) => s + Number(t.coverAmount || t.sumAssured || 0),
      0
    );
    const licCover = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.sumAssured || 0),
      0
    );
    const totalCover = termCover + licCover;
    const annualIncome = (metrics.monthIncome || 0) * 12;
    const coverMultiple = annualIncome > 0 ? totalCover / annualIncome : 0;
    if (coverMultiple < 10 && annualIncome > 0) {
      insights.push({
        icon: Shield,
        title: "Under-insured",
        detail: `Life cover is only ${coverMultiple.toFixed(0)}x income (recommend 10x)`,
        severity: coverMultiple < 5 ? "critical" : "warning",
        prompt: `My life insurance cover is only ${coverMultiple.toFixed(0)}x my annual income. How much more do I need?`,
      });
    }

    // NPS/PPF tax saving opportunity
    const npsContrib = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.yearContribution || 0),
      0
    );
    const remaining80CCD = 50000 - npsContrib;
    if (remaining80CCD > 0) {
      insights.push({
        icon: Lightbulb,
        title: "Tax Saving Opportunity",
        detail: `${fmtINRFull(remaining80CCD)} tax saving opportunity via NPS 80CCD(1B)`,
        severity: "opportunity",
        prompt: `I haven't utilized my 80CCD(1B) NPS deduction. How much can I save on taxes by investing ${fmtINRFull(remaining80CCD)} in NPS?`,
      });
    }

    // MF P&L negative
    const mfInvested = metrics.mfInvested || 0;
    const mfValue = metrics.mfValue || 0;
    if (mfInvested > 0 && mfValue < mfInvested) {
      const downPct = (((mfInvested - mfValue) / mfInvested) * 100).toFixed(1);
      insights.push({
        icon: TrendingDown,
        title: "MF Portfolio in Loss",
        detail: `Mutual fund portfolio is down ${downPct}%`,
        severity: Number(downPct) > 10 ? "critical" : "warning",
        prompt: `My mutual fund portfolio is down ${downPct}%. Should I stay invested, switch funds, or book losses for tax harvesting?`,
      });
    }

    // Return top 4
    const severityOrder = { critical: 0, warning: 1, opportunity: 2 };
    return insights
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 4);
  }, [metrics, state]);

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

    // Emergency fund
    const monthExpense = metrics.monthExpense || 0;
    const cashInBanks = metrics.cashInBanks || 0;
    const emergencyMonths = monthExpense > 0 ? cashInBanks / monthExpense : 0;
    const emergencyStatus =
      emergencyMonths < 3 ? "Critical" : emergencyMonths < 6 ? "Building" : "Healthy";

    // Net worth trend
    const nwHistory = state.netWorthHistory || [];
    const last6NW =
      nwHistory
        .slice(-6)
        .map((e: any) => `  ${e.month || e.date}: ${fmtCr(Number(e.value || e.netWorth || 0))}`)
        .join("\n") || "  No history";
    const momChange =
      nwHistory.length >= 2
        ? (
            ((Number(
              nwHistory[nwHistory.length - 1]?.value ||
                nwHistory[nwHistory.length - 1]?.netWorth ||
                0
            ) -
              Number(
                nwHistory[nwHistory.length - 2]?.value ||
                  nwHistory[nwHistory.length - 2]?.netWorth ||
                  0
              )) /
              Math.max(
                1,
                Number(
                  nwHistory[nwHistory.length - 2]?.value ||
                    nwHistory[nwHistory.length - 2]?.netWorth ||
                    1
                )
              )) *
            100
          ).toFixed(1)
        : "N/A";

    // Budget status
    const budgets = state.budgets || [];
    const txsThisMonth = (state.transactions || []).filter((t: any) => {
      if (t.type !== "debit" || !t.date) return false;
      const now = new Date();
      return t.date.startsWith(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      );
    });
    const spentByCat: Record<string, number> = {};
    txsThisMonth.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      spentByCat[cat] = (spentByCat[cat] || 0) + Number(t.amount || 0);
    });
    const overBudgetCats = budgets
      .filter((b: any) => {
        const spent = spentByCat[b.category] || 0;
        return Number(b.limit || b.amount || 0) > 0 && spent > Number(b.limit || b.amount || 0);
      })
      .map(
        (b: any) =>
          `  ${b.category}: ${fmtCr(spentByCat[b.category] || 0)} / ${fmtCr(Number(b.limit || b.amount || 0))}`
      );
    const totalBudgetLimit = budgets.reduce(
      (s: number, b: any) => s + Number(b.limit || b.amount || 0),
      0
    );
    const totalBudgetSpent = budgets.reduce(
      (s: number, b: any) => s + (spentByCat[b.category] || 0),
      0
    );
    const budgetUtilization =
      totalBudgetLimit > 0 ? ((totalBudgetSpent / totalBudgetLimit) * 100).toFixed(0) : "N/A";

    // Insurance coverage
    const termCover = (state.termPlans || []).reduce(
      (s: number, t: any) => s + Number(t.coverAmount || t.sumAssured || 0),
      0
    );
    const licCover = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.sumAssured || 0),
      0
    );
    const totalLifeCover = termCover + licCover;
    const annualIncome = (metrics.monthIncome || 0) * 12;
    const coverMultiple = annualIncome > 0 ? totalLifeCover / annualIncome : 0;
    const insuranceAdequacy =
      coverMultiple >= 10
        ? "Adequately insured"
        : coverMultiple >= 5
          ? "Under insured"
          : "Critically under insured";

    // Dividends & passive income
    const dividendTxs = (state.transactions || []).filter(
      (t: any) => t.type === "credit" && (t.category || "").toLowerCase().includes("dividend")
    );
    const totalDividends = dividendTxs.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const rentalIncome = (state.rentedProperties || [])
      .filter((p: any) => p.isLandlord || p.type === "owned")
      .reduce((s: number, p: any) => s + Number(p.monthlyRent || 0), 0);
    const realEstateRental = (state.realEstateProperties || [])
      .filter((p: any) => p.rentalIncome)
      .reduce((s: number, p: any) => s + Number(p.rentalIncome || 0), 0);
    const totalRentalMonthly = rentalIncome + realEstateRental;
    const monthlyPassive = totalDividends / 12 + totalRentalMonthly;
    const passiveRatio =
      (metrics.monthIncome || 0) > 0
        ? ((monthlyPassive / (metrics.monthIncome || 1)) * 100).toFixed(1)
        : "0";

    // Vehicles & real estate
    const properties = (state.realEstateProperties || []).filter((p: any) => p.status !== "sold");
    const propValue = properties.reduce(
      (s: number, p: any) => s + Number(p.currentValue || p.purchasePrice || 0),
      0
    );
    const vehicles = state.vehicles || [];
    const vehicleValue = vehicles.reduce(
      (s: number, v: any) => s + Number(v.currentValue || v.purchasePrice || 0),
      0
    );

    // Credit health
    const activeLoans = (state.loansTaken || []).length;
    const foir = metrics.foir || 0;

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
Real Estate:      ${fmtCr(metrics.realEstateAsset || 0)} (${properties.length} properties; sold excluded)
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

== EMERGENCY FUND ==
Months of expenses covered: ${emergencyMonths.toFixed(1)} months
Status: ${emergencyStatus}

== NET WORTH TREND ==
Last 6 months:
${last6NW}
MoM Change: ${momChange}%

== BUDGET STATUS ==
Categories over budget: ${overBudgetCats.length > 0 ? "\n" + overBudgetCats.join("\n") : "None"}
Overall utilization: ${budgetUtilization}%

== INSURANCE COVERAGE ==
Life cover: ${fmtCr(totalLifeCover)} (${coverMultiple.toFixed(0)}x annual income)
Adequacy: ${insuranceAdequacy}

== DIVIDENDS & PASSIVE INCOME ==
Total dividends received: ${fmtCr(totalDividends)}
Rental income: ${fmtCr(totalRentalMonthly)}/mo
Total passive income ratio: ${passiveRatio}%

== VEHICLES & REAL ESTATE ==
Properties: ${properties.length} (value ${fmtCr(propValue)})
Vehicles: ${vehicles.length} (value ${fmtCr(vehicleValue)})

== CREDIT HEALTH ==
Credit utilization: ${(metrics.creditUtilization || 0).toFixed(0)}%
FOIR: ${foir.toFixed(1)}%
Active loans: ${activeLoans}

You have access to local tools/functions to retrieve real-time and detailed transaction lists, holdings, loan prepayment calculations, net worth trends, budget status, and rebalancing suggestions. Use them when the user asks for detailed lists, specific transactions, loan prepayments, or portfolio rebalancing.`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, state]);

  const functionDeclarations = [
    {
      name: "get_financial_summary",
      description:
        "Retrieve a summary of the user's financial metrics including net worth, monthly income, monthly expenses, total savings, savings rate, cash in banks, asset values (mutual funds, stocks, fixed deposits, PPF, EPF, NPS, real estate), total liabilities, and debt ratios.",
      parameters: {
        type: "OBJECT",
        properties: {},
      },
    },
    {
      name: "get_investment_holdings",
      description:
        "Retrieve a list of all mutual funds and stocks holdings including symbol/scheme names, folio, units/quantity, buy price/NAV, live/current price/NAV, invested value, current value, and absolute gains/losses.",
      parameters: {
        type: "OBJECT",
        properties: {},
      },
    },
    {
      name: "find_transactions",
      description:
        "Search and filter the user's transactions ledger by a search keyword, category, or type. Returns up to 25 matched transactions.",
      parameters: {
        type: "OBJECT",
        properties: {
          queryText: {
            type: "STRING",
            description: "Optional search text matching the transaction note or description.",
          },
          category: {
            type: "STRING",
            description:
              "Optional exact category name (e.g., Food, Travel, Bills, Salary, Investment).",
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
      description:
        "Calculate interest savings and tenure reduction by simulating extra monthly EMI payments or a lump-sum prepayment on the user's active loan(s).",
      parameters: {
        type: "OBJECT",
        properties: {
          loanId: {
            type: "STRING",
            description:
              "Optional ID of the loan to calculate prepayments for. Defaults to the first active loan if not provided.",
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
      description:
        "Analyze the user's investment portfolio for diversification quality, concentration risk, asset allocation, top holdings, and sector exposure. Call this when the user asks to review or analyze their portfolio.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 22: Tax Optimizer
    {
      name: "get_tax_optimization",
      description:
        "Get the user's current tax deduction utilization (80C, 80D, NPS, HRA, home loan) vs limits, compare old vs new regime tax amounts, and suggest actionable tax-saving strategies. Call when the user asks about saving tax.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 23: Natural Language Queries
    {
      name: "get_spending_summary",
      description:
        "Get spending breakdown by category for a date range. Shows total spent per category.",
      parameters: {
        type: "OBJECT",
        properties: {
          startDate: {
            type: "STRING",
            description: "Start date YYYY-MM-DD. Defaults to current month start.",
          },
          endDate: { type: "STRING", description: "End date YYYY-MM-DD. Defaults to today." },
        },
      },
    },
    {
      name: "get_goal_status",
      description:
        "Get all financial goals with progress percentage, remaining amount, and target dates.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_insurance_summary",
      description:
        "Get insurance coverage summary: term plans with cover amounts, LIC policies with sum assured, and total family coverage.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_sip_summary",
      description:
        "Get all active SIPs with scheme names, amounts, frequency, and total monthly SIP outflow.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature 24: Anomaly Detection
    {
      name: "detect_anomalies",
      description:
        "Scan the user's financial data for anomalies: months with unusually high spending, missed SIP months, sudden bank balance drops, and credit utilization spikes. Call when the user asks about unusual patterns or to check their financial health.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature: Net Worth Trend
    {
      name: "get_net_worth_trend",
      description:
        "Returns the last 12 months of net worth history with month-over-month changes and growth percentages. Call when the user asks about net worth trends, growth, or historical progress.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature: Budget Status
    {
      name: "get_budget_status",
      description:
        "Returns current month's budget vs actual spending per category, showing over/under budget amounts and overall utilization. Call when the user asks about budget, spending limits, or category-wise spending.",
      parameters: { type: "OBJECT", properties: {} },
    },
    // Feature: Rebalancing Suggestion
    {
      name: "get_rebalancing_suggestion",
      description:
        "Computes target vs actual asset allocation percentages and suggests specific rebalancing trades (buy/sell amounts per asset class) to match target allocation. Call when the user asks about rebalancing, asset allocation, or portfolio adjustment.",
      parameters: {
        type: "OBJECT",
        properties: {
          targetEquityPct: {
            type: "NUMBER",
            description:
              "Target equity allocation percentage (0-100). Defaults to 60 if not provided.",
          },
          targetDebtPct: {
            type: "NUMBER",
            description:
              "Target debt/fixed income allocation percentage (0-100). Defaults to 30 if not provided.",
          },
          targetGoldPct: {
            type: "NUMBER",
            description:
              "Target gold allocation percentage (0-100). Defaults to 10 if not provided.",
          },
        },
      },
    },
  ];

  // ── Feature 21: Portfolio Review Handler ──
  const handleReviewPortfolio = () => {
    const mfs = state.mutualFunds || [];
    const stocks = state.stocks || [];
    const totalEquityMF = mfs
      .filter((m: any) => !(m.type || m.category || "").toLowerCase().includes("debt"))
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );
    const totalDebtMF = mfs
      .filter((m: any) => (m.type || m.category || "").toLowerCase().includes("debt"))
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );
    const totalStocks = stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.currentPrice || st.avgPrice || 0),
      0
    );
    const totalMF = mfs.reduce(
      (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
      0
    );
    const totalEquity = totalEquityMF + totalStocks;
    const totalPortfolio =
      totalEquity +
      totalDebtMF +
      (metrics.fdValue || 0) +
      (metrics.ppfValue || 0) +
      (metrics.npsValue || 0) +
      (metrics.epfValue || 0);
    const top5Holdings = [
      ...stocks.map((s: any) => ({
        name: s.symbol,
        value: Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0),
        type: "Stock",
      })),
      ...mfs.map((m: any) => ({
        name: m.name || m.scheme,
        value: Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        type: "MF",
      })),
    ]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const concentrationRisks = stocks
      .filter((s: any) => {
        const val = Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0);
        return totalStocks > 0 && val / totalStocks > 0.15;
      })
      .map((s: any) => ({
        symbol: s.symbol,
        pct: Math.round(
          ((Number(s.qty || 0) * Number(s.currentPrice || s.avgPrice || 0)) / totalStocks) * 100
        ),
      }));
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
      debtPct:
        totalPortfolio > 0
          ? Math.round(
              ((totalDebtMF +
                (metrics.fdValue || 0) +
                (metrics.ppfValue || 0) +
                (metrics.epfValue || 0)) /
                totalPortfolio) *
                100
            )
          : 0,
      top5Holdings,
      concentrationRisks,
      totalFunds: mfs.length,
      totalStocks: stocks.length,
    };
  };

  // ── Feature 22: Tax Optimizer Handler ──
  const handleGetTaxOptimization = () => {
    const fy = state.profile?.fy || getCurrentFY();
    const fyStart = Number(fy.split("-")[0]) || 2025;
    const fyStartStr = `${fyStart}-04-01`;
    const fyEndStr = `${fyStart + 1}-03-31`;
    const elss = (state.mutualFunds || [])
      .filter(
        (m: any) =>
          (m.type || m.category || "").toUpperCase().includes("ELSS") &&
          m.buyDate >= fyStartStr &&
          m.buyDate <= fyEndStr
      )
      .reduce((s: number, m: any) => s + Number(m.invested || 0), 0);
    const ppf = (state.ppf || []).reduce(
      (s: number, p: any) => s + Number(p.thisYearContribution || p.yearlyContribution || 0),
      0
    );
    const lic = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    const epfContrib = (state.epf || []).reduce((s: number, e: any) => {
      return (
        s +
        (e.transactions || [])
          .filter(
            (t: any) =>
              t.date >= fyStartStr &&
              t.date <= fyEndStr &&
              (t.type === "employee_contribution" || t.type === "monthly_contribution")
          )
          .reduce((sum: number, t: any) => sum + Number(t.amount || t.employeeShare || 0), 0)
      );
    }, 0);
    const used80C = Math.min(elss + ppf + lic + epfContrib, 150000);
    const remaining80C = Math.max(0, 150000 - used80C);
    const rentPaid = (state.rentedProperties || []).reduce(
      (s: number, p: any) => s + Number(p.monthlyRent || 0) * 12,
      0
    );
    const npsContrib = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.yearContribution || 0),
      0
    );
    const remaining80CCD = Math.max(0, 50000 - npsContrib);
    return {
      fy,
      regime: state.profile?.regime || "new",
      deductions: {
        "80C": {
          used: used80C,
          limit: 150000,
          remaining: remaining80C,
          sources: { elss, ppf, lic, epf: epfContrib },
        },
        "80CCD_1B_NPS": { used: npsContrib, limit: 50000, remaining: remaining80CCD },
        HRA: { rentPaidAnnually: rentPaid, eligible: rentPaid > 0 },
      },
      suggestions: [
        ...(remaining80C > 0
          ? [`Invest ${fmtINRFull(remaining80C)} more in ELSS/PPF to max out 80C`]
          : []),
        ...(remaining80CCD > 0
          ? [`Invest ${fmtINRFull(remaining80CCD)} in NPS for additional 80CCD(1B) deduction`]
          : []),
        ...(rentPaid > 0 && state.profile?.regime === "old"
          ? ["Claim HRA exemption under Sec 10(13A)"]
          : []),
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
    const txs = (state.transactions || []).filter(
      (t: any) => t.type === "debit" && t.date >= startDate && t.date <= endDate
    );
    const byCat: Record<string, number> = {};
    txs.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      byCat[cat] = (byCat[cat] || 0) + Number(t.amount || 0);
    });
    const sorted = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
    return {
      startDate,
      endDate,
      totalSpent: txs.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      categories: sorted,
      transactionCount: txs.length,
    };
  };

  // ── Feature 23: Goal Status Handler ──
  const handleGetGoalStatus = () => {
    return (state.goals || []).map((g: any) => {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      return {
        name: g.name,
        category: g.category,
        priority: g.priority,
        targetAmount: target,
        currentAmount: current,
        progress: target > 0 ? Math.round((current / target) * 100) : 0,
        remaining: Math.max(0, target - current),
        targetDate: g.targetDate || null,
      };
    });
  };

  // ── Feature 23: Insurance Summary Handler ──
  const handleGetInsuranceSummary = () => {
    const termPlans = (state.termPlans || []).map((t: any) => ({
      name: t.planName || t.name,
      insurer: t.insurer,
      coverAmount: Number(t.coverAmount || t.sumAssured || 0),
      annualPremium: Number(t.annualPremium || 0),
      maturityDate: t.maturityDate,
    }));
    const licPolicies = (state.lic || []).map((l: any) => ({
      name: l.planName,
      policyNumber: l.policyNumber,
      sumAssured: Number(l.sumAssured || 0),
      annualPremium: Number(l.annualPremium || 0),
    }));
    const totalCover =
      termPlans.reduce((s: number, t: any) => s + t.coverAmount, 0) +
      licPolicies.reduce((s: number, l: any) => s + l.sumAssured, 0);
    return {
      termPlans,
      licPolicies,
      totalCover,
      monthlyIncome: metrics.monthIncome || 0,
      coverageMultiple:
        metrics.monthIncome > 0 ? Math.round(totalCover / (metrics.monthIncome * 12)) : 0,
    };
  };

  // ── Feature 23: SIP Summary Handler ──
  const handleGetSipSummary = () => {
    const sips = (state.sips || []).map((s: any) => ({
      scheme: s.scheme || s.name,
      amount: Number(s.amount || 0),
      frequency: s.frequency || "monthly",
      startDate: s.startDate,
      fundType: s.fundType || s.type,
    }));
    const totalMonthlySIP = sips
      .filter((s: any) => s.frequency === "monthly")
      .reduce((sum: number, s: any) => sum + s.amount, 0);
    return { sips, totalMonthlySIP, activeSIPs: sips.length };
  };

  // ── Feature 24: Anomaly Detection Handler ──
  const handleDetectAnomalies = () => {
    const anomalies: any[] = [];
    const txs = state.transactions || [];
    const monthlySpend: Record<string, number> = {};
    txs
      .filter((t: any) => t.type === "debit")
      .forEach((t: any) => {
        if (t.date) {
          const m = t.date.slice(0, 7);
          monthlySpend[m] = (monthlySpend[m] || 0) + Number(t.amount || 0);
        }
      });
    const months = Object.keys(monthlySpend).sort();
    if (months.length >= 3) {
      const values = months.map((m) => monthlySpend[m]);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      months.forEach((m) => {
        if (monthlySpend[m] > avg * 2)
          anomalies.push({
            type: "high_spending",
            month: m,
            amount: monthlySpend[m],
            average: Math.round(avg),
            note: `Spending was ${Math.round(monthlySpend[m] / avg)}x the average`,
          });
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
      for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
        sipMonths.push(d.toISOString().slice(0, 7));
      }
      const buyMonths = new Set(
        mfBuys
          .filter((m: any) => (m.name || m.scheme || "").includes(sip.scheme || "___"))
          .map((m: any) => (m.buyDate || "").slice(0, 7))
      );
      const missed = sipMonths.filter((m) => !buyMonths.has(m));
      if (missed.length > 0)
        anomalies.push({
          type: "missed_sip",
          scheme: sip.scheme,
          missedMonths: missed.slice(-3),
          totalMissed: missed.length,
        });
    });
    // Credit utilization spikes
    (state.creditCards || []).forEach((cc: any) => {
      const util =
        Number(cc.cardLimit) > 0 ? (Number(cc.outstanding || 0) / Number(cc.cardLimit)) * 100 : 0;
      if (util > 80)
        anomalies.push({
          type: "high_credit_utilization",
          card: cc.issuer,
          utilization: Math.round(util),
          outstanding: Number(cc.outstanding || 0),
          limit: Number(cc.cardLimit || 0),
        });
    });
    return { anomalies, scannedAt: new Date().toISOString() };
  };

  // ── Net Worth Trend Handler ──
  const handleGetNetWorthTrend = () => {
    const history = (state.netWorthHistory || []).slice(-12);
    const trend = history.map((e: any, i: number, arr: any[]) => {
      const value = Number(e.value || e.netWorth || 0);
      const prevValue = i > 0 ? Number(arr[i - 1].value || arr[i - 1].netWorth || 0) : value;
      const momChange = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
      return {
        month: e.month || e.date || `Month ${i + 1}`,
        netWorth: value,
        momChange: i > 0 ? Number(momChange.toFixed(1)) : 0,
      };
    });
    const latest = trend.length > 0 ? trend[trend.length - 1].netWorth : 0;
    const oldest = trend.length > 0 ? trend[0].netWorth : 0;
    const overallGrowth = oldest > 0 ? (((latest - oldest) / oldest) * 100).toFixed(1) : "N/A";
    return {
      trend,
      periodMonths: trend.length,
      overallGrowthPct: overallGrowth,
      currentNetWorth: latest,
    };
  };

  // ── Budget Status Handler ──
  const handleGetBudgetStatus = () => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const txsThisMonth = (state.transactions || []).filter(
      (t: any) => t.type === "debit" && t.date && t.date.startsWith(monthPrefix)
    );
    const spentByCat: Record<string, number> = {};
    txsThisMonth.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      spentByCat[cat] = (spentByCat[cat] || 0) + Number(t.amount || 0);
    });
    const budgets = state.budgets || [];
    const categories = budgets.map((b: any) => {
      const limit = Number(b.limit || b.amount || 0);
      const spent = spentByCat[b.category] || 0;
      return {
        category: b.category,
        budgetLimit: limit,
        spent,
        remaining: Math.max(0, limit - spent),
        overBudget: spent > limit,
        utilizationPct: limit > 0 ? Number(((spent / limit) * 100).toFixed(0)) : 0,
      };
    });
    const totalLimit = budgets.reduce(
      (s: number, b: any) => s + Number(b.limit || b.amount || 0),
      0
    );
    const totalSpent = budgets.reduce((s: number, b: any) => s + (spentByCat[b.category] || 0), 0);
    // Include unbudgeted categories
    const budgetedCats = new Set(budgets.map((b: any) => b.category));
    const unbudgeted = Object.entries(spentByCat)
      .filter(([cat]) => !budgetedCats.has(cat))
      .map(([category, spent]) => ({ category, spent, budgetLimit: 0, note: "No budget set" }));
    return {
      month: monthPrefix,
      categories,
      unbudgetedSpending: unbudgeted,
      totalBudget: totalLimit,
      totalSpent,
      overallUtilizationPct:
        totalLimit > 0 ? Number(((totalSpent / totalLimit) * 100).toFixed(0)) : 0,
      overBudgetCount: categories.filter((c: any) => c.overBudget).length,
    };
  };

  // ── Rebalancing Suggestion Handler ──
  const handleGetRebalancingSuggestion = (args: any) => {
    const targetEquity = args.targetEquityPct ?? 60;
    const targetDebt = args.targetDebtPct ?? 30;
    const targetGold = args.targetGoldPct ?? 10;

    const mfs = state.mutualFunds || [];
    const stocks = state.stocks || [];
    const equityMF = mfs
      .filter((m: any) => !(m.type || m.category || "").toLowerCase().includes("debt"))
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );
    const debtMF = mfs
      .filter((m: any) => (m.type || m.category || "").toLowerCase().includes("debt"))
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );
    const stockVal = stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.currentPrice || st.avgPrice || 0),
      0
    );

    const totalEquity = equityMF + stockVal;
    const totalDebt =
      debtMF + (metrics.fdValue || 0) + (metrics.ppfValue || 0) + (metrics.epfValue || 0);
    const totalGold = metrics.goldValue || 0;
    const totalPortfolio = totalEquity + totalDebt + totalGold;

    if (totalPortfolio <= 0) {
      return { error: "No investment portfolio found to rebalance." };
    }

    const actualEquityPct = Number(((totalEquity / totalPortfolio) * 100).toFixed(1));
    const actualDebtPct = Number(((totalDebt / totalPortfolio) * 100).toFixed(1));
    const actualGoldPct = Number(((totalGold / totalPortfolio) * 100).toFixed(1));

    const targetEquityVal = totalPortfolio * (targetEquity / 100);
    const targetDebtVal = totalPortfolio * (targetDebt / 100);
    const targetGoldVal = totalPortfolio * (targetGold / 100);

    const suggestions: string[] = [];
    if (totalEquity > targetEquityVal * 1.05)
      suggestions.push(
        `Reduce equity by ${fmtCr(totalEquity - targetEquityVal)} — sell some stocks or equity MFs`
      );
    if (totalEquity < targetEquityVal * 0.95)
      suggestions.push(
        `Increase equity by ${fmtCr(targetEquityVal - totalEquity)} — buy equity MFs or stocks`
      );
    if (totalDebt > targetDebtVal * 1.05)
      suggestions.push(
        `Reduce debt by ${fmtCr(totalDebt - targetDebtVal)} — redeem FDs or debt MFs at maturity`
      );
    if (totalDebt < targetDebtVal * 0.95)
      suggestions.push(
        `Increase debt by ${fmtCr(targetDebtVal - totalDebt)} — invest in debt MFs or FDs`
      );
    if (totalGold > targetGoldVal * 1.1)
      suggestions.push(`Reduce gold by ${fmtCr(totalGold - targetGoldVal)}`);
    if (totalGold < targetGoldVal * 0.9 && targetGold > 0)
      suggestions.push(
        `Increase gold by ${fmtCr(targetGoldVal - totalGold)} — consider Sovereign Gold Bonds or Gold ETFs`
      );

    return {
      totalPortfolioValue: totalPortfolio,
      current: {
        equity: { value: totalEquity, pct: actualEquityPct },
        debt: { value: totalDebt, pct: actualDebtPct },
        gold: { value: totalGold, pct: actualGoldPct },
      },
      target: {
        equity: { pct: targetEquity, value: targetEquityVal },
        debt: { pct: targetDebt, value: targetDebtVal },
        gold: { pct: targetGold, value: targetGoldVal },
      },
      deviations: {
        equity: Number((actualEquityPct - targetEquity).toFixed(1)),
        debt: Number((actualDebtPct - targetDebt).toFixed(1)),
        gold: Number((actualGoldPct - targetGold).toFixed(1)),
      },
      suggestions,
      needsRebalancing: suggestions.length > 0,
    };
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
      gain:
        (Number(s.currentPrice || s.avgPrice || 0) - Number(s.avgPrice || 0)) * Number(s.qty || 0),
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
      return {
        error: "Invalid loan details. Balance, EMI and Interest Rate must be greater than zero.",
      };
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
            } else if (name === "get_net_worth_trend") {
              contentData = handleGetNetWorthTrend();
            } else if (name === "get_budget_status") {
              contentData = handleGetBudgetStatus();
            } else if (name === "get_rebalancing_suggestion") {
              contentData = handleGetRebalancingSuggestion(args);
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
                background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
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
                background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
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
            <button
              onClick={() => setShowSavedNotes((p) => !p)}
              title="Saved notes"
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${showSavedNotes ? THEME.accent : THEME.line}`,
                background: showSavedNotes
                  ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                  : "transparent",
                color: showSavedNotes ? THEME.accent : THEME.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              <Bookmark size={13} /> Notes{savedNotes.length > 0 ? ` (${savedNotes.length})` : ""}
            </button>
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

          {/* ── Saved Notes Panel ── */}
          {showSavedNotes && (
            <div
              style={{
                padding: "12px 18px",
                borderBottom: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                flexShrink: 0,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Bookmark size={14} style={{ color: THEME.accent }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.ink,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Saved Notes
                </span>
              </div>
              {savedNotes.length === 0 ? (
                <div style={{ fontSize: 13, color: THEME.muted, padding: "8px 0" }}>
                  No saved notes yet. Use "Save as Note" on any AI response to keep it here.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {savedNotes
                    .slice()
                    .reverse()
                    .map((note, revIdx) => {
                      const idx = savedNotes.length - 1 - revIdx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${THEME.line}`,
                            background: "var(--surface-0)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                color: THEME.ink,
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {note.text}
                            </div>
                            <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 4 }}>
                              {timeAgo(note.savedAt)}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteNote(idx)}
                            title="Delete note"
                            style={{
                              flexShrink: 0,
                              padding: 6,
                              borderRadius: 8,
                              border: `1px solid ${THEME.line}`,
                              background: "transparent",
                              color: THEME.muted,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── Proactive Insights Panel ── */}
          {proactiveInsights.length > 0 && !hasUserMessages && (
            <div
              style={{
                padding: "12px 18px",
                borderBottom: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Lightbulb size={14} style={{ color: "#f59e0b" }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.ink,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Smart Insights
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {proactiveInsights.map((insight, idx) => {
                  const Icon = insight.icon;
                  const borderColor =
                    insight.severity === "critical"
                      ? "#ef4444"
                      : insight.severity === "warning"
                        ? "#f59e0b"
                        : "#22c55e";
                  const bgColor =
                    insight.severity === "critical"
                      ? "rgba(239,68,68,0.05)"
                      : insight.severity === "warning"
                        ? "rgba(245,158,11,0.05)"
                        : "rgba(34,197,94,0.05)";
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(insight.prompt)}
                      disabled={loading}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${THEME.line}`,
                        borderLeft: `3px solid ${borderColor}`,
                        background: bgColor,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        width: "100%",
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        <Icon size={15} style={{ color: borderColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: THEME.ink,
                            marginBottom: 2,
                          }}
                        >
                          {insight.title}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                          {insight.detail}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: borderColor,
                            marginTop: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          Ask AI <ChevronRight size={10} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                      background: isUser
                        ? THEME.ink
                        : `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
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
                    {/* Action buttons sit BELOW the bubble in normal flow — never overlaps text */}
                    {!isUser && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5 }}>
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
                        <button
                          onClick={() => saveAsNote(msg.text, i)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.line}`,
                            background: "var(--t-paper)",
                            color: savedNoteIdx === i ? THEME.sage : THEME.muted,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            transition: "all 0.15s",
                          }}
                        >
                          {savedNoteIdx === i ? <Check size={11} /> : <Bookmark size={11} />}
                          {savedNoteIdx === i ? "Saved!" : "Save as Note"}
                        </button>
                        <button
                          onClick={() => {
                            setInput("Can you elaborate on that?");
                            setTimeout(() => textareaRef.current?.focus(), 50);
                          }}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.line}`,
                            background: "var(--t-paper)",
                            color: THEME.muted,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            transition: "all 0.15s",
                          }}
                        >
                          <MessageSquare size={11} />
                          Follow Up
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
                    background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
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
            {/* Categorized advisor prompts — visible until first user message or when input is empty */}
            {(!hasUserMessages || !input.trim()) && (
              <div style={{ marginBottom: 10 }}>
                {/* Category tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 8,
                    overflowX: "auto",
                    paddingBottom: 2,
                  }}
                  className="no-scrollbar"
                >
                  {Object.keys(ADVISOR_PROMPTS).map((cat) => {
                    const CatIcon = PROMPT_CATEGORY_ICONS[cat];
                    const isActive = activePromptCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActivePromptCategory(cat)}
                        style={{
                          padding: "5px 14px",
                          borderRadius: 20,
                          border: `1px solid ${isActive ? THEME.accent : THEME.line}`,
                          background: isActive ? THEME.accent : "var(--surface-0)",
                          color: isActive ? "#fff" : THEME.ink,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {CatIcon && <CatIcon size={12} />}
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {/* Prompt chips for active category */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {(ADVISOR_PROMPTS[activePromptCategory] || []).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      disabled={loading}
                      style={{
                        padding: "6px 13px",
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
                        lineHeight: 1.4,
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
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
                  border: `1.5px solid ${input.trim() ? THEME.accent : THEME.line}`,
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
                      ? `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`
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
              AI-generated advice is informational only · Not a substitute for professional
              financial guidance
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
