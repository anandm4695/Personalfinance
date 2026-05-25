// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, AlertTriangle, Lightbulb, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";

interface AIAssistantTabProps {
  state: any;
  metrics: any;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ state, metrics }) => {
  const [messages, setMessages] = useState<{ role: "model" | "user"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiKey = state?.settings?.geminiApiKey || "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0 && apiKey) {
      setMessages([
        {
          role: "model",
          text: "Hello! I am your AI Financial Advisor. I have analyzed your anonymized financial state. How can I help you today? Try asking about ways to improve your savings rate, how to reduce your debt, or where to invest.",
        },
      ]);
    }
  }, [apiKey, messages.length]);

  const generateContext = () => {
    return `
You are a highly professional, expert financial advisor for an Indian user.
Analyze their financial state and give concise, hyper-personalized, actionable advice. Format your responses with markdown (bolding, bullet points).
Do NOT include PII or actual account numbers.

USER METRICS:
- Net Worth: ₹${metrics.netWorth}
- Monthly Income: ₹${metrics.monthIncome}
- Monthly Expenses: ₹${metrics.monthExpense}
- Savings Rate: ${metrics.savingsRate.toFixed(1)}%
- Debt-to-Asset Ratio: ${metrics.debtToAssetRatio.toFixed(1)}%
- FOIR (EMI Burden): ${metrics.foir.toFixed(1)}%

ASSETS SNAPSHOT:
- Cash/Banks: ₹${metrics.cashInBanks}
- Mutual Funds: ${state.mutualFunds?.length || 0} funds
- Stocks: ${state.stocks?.length || 0} stocks
- FDs: ${state.fixedDeposits?.length || 0} deposits
- PPF/NPS: ${state.ppf?.length > 0 || state.nps?.length > 0 ? "Yes" : "No"}

LIABILITIES SNAPSHOT:
- Active Loans: ${state.loansTaken?.length || 0}
- Total Loan Outstanding: ₹${metrics.totalLiabilities}
`;
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey) return;
    
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
${generateContext()}

USER QUESTION:
${userText}
      `;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      setMessages((prev) => [...prev, { role: "model", text: responseText }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while communicating with Gemini.");
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

  const SUGGESTIONS = [
    "How can I improve my savings rate?",
    "Should I prepay my loans or invest?",
    "Are my investments diversified enough?",
  ];

  if (!apiKey) {
    return (
      <div className="tab-content-enter animate-fade-in-up">
        <SectionTitle sub="Get hyper-personalized insights from your AI Financial Advisor">
          AI Advisor
        </SectionTitle>
        <Card style={{ padding: 40, textAlign: "center", border: `1.5px dashed ${THEME.line}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(14, 165, 233, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#0ea5e9" }}>
            <Bot size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginBottom: 12 }}>Unlock AI Financial Advice</h2>
          <p style={{ fontSize: 14, color: THEME.muted, maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.6 }}>
            To protect your privacy and ensure you have full control over your data, we require you to provide your own Gemini API Key. Your financial context is anonymized before being sent to Google's API.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 12, background: "var(--t-paper)", color: THEME.ink, border: `1.5px solid ${THEME.line}`,
                fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}
            >
              Get Free API Key <ArrowRight size={16} />
            </a>
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: THEME.muted }}>
            Once you have the key, add it in the <strong>Settings &gt; AI Advisor</strong> tab.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content-enter animate-fade-in-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxHeight: 900 }}>
      <SectionTitle sub="Powered by Gemini. Your data is contextualized locally.">
        AI Advisor
      </SectionTitle>

      <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", border: `1.5px solid ${THEME.line}`, background: "var(--surface-0)" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", gap: 12, background: "var(--t-paper)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>Gemini Advisor</div>
            <div style={{ fontSize: 12, color: THEME.sage, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={12} /> Privacy Preserved
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 12, alignItems: "flex-end" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: isUser ? THEME.ink : "linear-gradient(135deg,#0ea5e9,#3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
                }}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  borderRadius: 16,
                  borderBottomRightRadius: isUser ? 4 : 16,
                  borderBottomLeftRadius: !isUser ? 4 : 16,
                  background: isUser ? THEME.ink : "var(--t-paper)",
                  color: isUser ? "var(--surface-0)" : THEME.ink,
                  border: isUser ? "none" : `1px solid ${THEME.line}`,
                  fontSize: 14,
                  lineHeight: 1.6,
                  boxShadow: "var(--shadow-sm)"
                }}>
                  {/* Basic markdown parsing (bold/newlines) for display */}
                  {msg.text.split("\n").map((line, idx) => (
                    <div key={idx} style={{ minHeight: line ? "auto" : 8 }}>
                      {line.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: 800;">$1</span>')
                           .replace(/\*(.*?)\*/g, '<span style="font-style: italic;">$1</span>')
                           .replace(/# (.*?)$/g, '<span style="font-size: 16px; font-weight: 800;">$1</span>')
                           .split('<span').map((part, pIdx) => 
                             pIdx === 0 ? part : <span key={pIdx} dangerouslySetInnerHTML={{ __html: "<span" + part }} />
                           )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <Bot size={16} />
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 16, borderBottomLeftRadius: 4, background: "var(--t-paper)", border: `1px solid ${THEME.line}`, fontSize: 14, color: THEME.muted, display: "flex", gap: 4 }}>
                <span className="animate-pulse">●</span>
                <span className="animate-pulse" style={{ animationDelay: "200ms" }}>●</span>
                <span className="animate-pulse" style={{ animationDelay: "400ms" }}>●</span>
              </div>
            </div>
          )}
          
          {error && (
            <div style={{ display: "flex", gap: 8, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 8, color: THEME.rust, fontSize: 13, alignItems: "center" }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: 20, background: "var(--t-paper)", borderTop: `1px solid ${THEME.line}` }}>
          {messages.length <= 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }} className="no-scrollbar">
              {SUGGESTIONS.map(sug => (
                <button
                  key={sug}
                  onClick={() => setInput(sug)}
                  style={{
                    padding: "6px 12px", borderRadius: 20, border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)", color: THEME.ink, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
          
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for advice, insights, or planning..."
              style={{
                flex: 1, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)", color: THEME.ink, fontSize: 14, fontFamily: "inherit",
                resize: "none", outline: "none", minHeight: 52, maxHeight: 120
              }}
              rows={input.split("\n").length > 1 ? Math.min(input.split("\n").length, 4) : 1}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? THEME.ink : "var(--t-paper)",
                color: input.trim() && !loading ? "var(--surface-0)" : THEME.muted,
                border: input.trim() && !loading ? "none" : `1px solid ${THEME.line}`,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}
            >
              <Send size={20} />
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: THEME.muted, marginTop: 12 }}>
            AI-generated advice is for informational purposes only. Do not consider it as formal financial or legal advice.
          </div>
        </div>
      </Card>
    </div>
  );
};
