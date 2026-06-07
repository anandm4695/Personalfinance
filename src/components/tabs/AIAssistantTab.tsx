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
  "How can I improve my savings rate?",
  "Should I prepay my loan or invest the surplus?",
  "Am I diversified enough?",
  "How much should I keep as an emergency fund?",
  "Which tax-saving investments should I consider?",
  "Am I on track for retirement?",
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
Total Assets:     ${fmtCr(metrics.totalAssets || 0)}

== LIABILITIES ==
Credit Cards:     ${fmtCr(metrics.ccOutstanding || 0)} outstanding (util ${(metrics.creditUtilization || 0).toFixed(0)}%)
Loans:
${loans}
Total Liabilities: ${fmtCr(metrics.totalLiabilities || 0)}
FOIR:              ${(metrics.foir || 0).toFixed(1)}%
Debt-to-Asset:     ${(metrics.debtToAssetRatio || 0).toFixed(1)}%

== TOP EXPENSES THIS MONTH ==
${topExpenses}

== ACTIVE SUBSCRIPTIONS ==
${subs}

== GOALS PROGRESS ==
${goals}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, state]);

  const handleSend = async (prefill?: string) => {
    const userText = (prefill ?? input).trim();
    if (!userText || !apiKey || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // First message: create a new chat session and prepend full financial context
      if (!chatRef.current) {
        chatRef.current = model.startChat();
        isFirstRef.current = true;
      }

      const payload = isFirstRef.current
        ? `${generateContext()}\n\nUSER QUESTION:\n${userText}`
        : userText;

      isFirstRef.current = false;

      const result = await chatRef.current.sendMessage(payload);
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
        height: "calc(100dvh - 110px)",
        minHeight: 500,
        maxHeight: 920,
      }}
    >
      <SectionTitle sub="Powered by Gemini 2.5 Flash · Context anonymised locally · Multi-turn">
        AI Advisor
      </SectionTitle>

      <Card
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: `1.5px solid ${THEME.line}`,
          minHeight: 0,
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
      </Card>
    </div>
  );
};
