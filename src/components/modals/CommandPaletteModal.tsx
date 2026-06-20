import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Search,
  PieChart,
  Bot,
  History,
  Landmark,
  BarChart3,
  TrendingUp,
  Target,
  Home,
  Car,
  CreditCard,
  Calculator,
  Activity,
  Heart,
  Wallet,
  Building2,
  Repeat,
  Bell,
  Hash,
  Settings,
  Coins,
  FileText,
  Shield,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  User,
  IndianRupee,
  Sparkles,
} from "lucide-react";

interface CmdItem {
  id: string;
  type: "nav" | "action";
  icon: React.ReactNode;
  label: string;
  keywords: string;
  tab?: string;
  subTab?: string;
  action?: string;
}

export const CommandPaletteModal = ({
  isOpen,
  onClose,
  onNavigate,
  onAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, subTab?: string) => void;
  onAction: (action: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions: CmdItem[] = [
    // Overview
    { id: "nav-analytics", type: "nav", icon: <PieChart size={16} />, label: "Executive Dashboard", keywords: "dashboard home overview analytics", tab: "analytics" },
    { id: "nav-ai", type: "nav", icon: <Bot size={16} />, label: "AI Advisor", keywords: "ai assistant chatbot advisor", tab: "ai" },
    { id: "nav-ledger", type: "nav", icon: <History size={16} />, label: "Global Ledger", keywords: "ledger transactions history all", tab: "txnhistory" },

    // Wealth & Assets
    { id: "nav-banks", type: "nav", icon: <Landmark size={16} />, label: "Banks & Transactions", keywords: "banks accounts savings current transactions", tab: "banks" },
    { id: "nav-demat", type: "nav", icon: <BarChart3 size={16} />, label: "Demat & Stocks", keywords: "demat stocks shares equity portfolio broker", tab: "demat" },
    { id: "nav-investments", type: "nav", icon: <TrendingUp size={16} />, label: "Investments Portfolio", keywords: "investments portfolio fixed income deposits", tab: "investments" },
    { id: "nav-fd", type: "nav", icon: <Coins size={16} />, label: "Fixed Deposits", keywords: "fd fixed deposit interest maturity", tab: "investments", subTab: "fd" },
    { id: "nav-rd", type: "nav", icon: <Repeat size={16} />, label: "Recurring Deposits", keywords: "rd recurring deposit monthly", tab: "investments", subTab: "rd" },
    { id: "nav-bonds", type: "nav", icon: <FileText size={16} />, label: "Bonds", keywords: "bonds sgb government corporate", tab: "investments", subTab: "bond" },
    { id: "nav-ppf", type: "nav", icon: <Shield size={16} />, label: "PPF", keywords: "ppf public provident fund", tab: "investments", subTab: "ppf" },
    { id: "nav-nps", type: "nav", icon: <Briefcase size={16} />, label: "NPS", keywords: "nps national pension system", tab: "investments", subTab: "nps" },
    { id: "nav-epf", type: "nav", icon: <Shield size={16} />, label: "EPF (EPFO)", keywords: "epf epfo employee provident fund pf", tab: "investments", subTab: "epf" },
    { id: "nav-mf", type: "nav", icon: <BarChart3 size={16} />, label: "Mutual Funds", keywords: "mutual funds mf sip nav units", tab: "investments", subTab: "mf" },
    { id: "nav-yield", type: "nav", icon: <Activity size={16} />, label: "Yield Tracker", keywords: "yield tracker income interest returns", tab: "investments", subTab: "income" },
    { id: "nav-goals", type: "nav", icon: <Target size={16} />, label: "Financial Goals", keywords: "goals target planning savings", tab: "goals" },
    { id: "nav-realestate", type: "nav", icon: <Home size={16} />, label: "Real Estate", keywords: "real estate property house flat land", tab: "realestate" },
    { id: "nav-vehicles", type: "nav", icon: <Car size={16} />, label: "Vehicles", keywords: "vehicles car bike auto service", tab: "vehicles" },

    // Liabilities & Credit
    { id: "nav-credit", type: "nav", icon: <CreditCard size={16} />, label: "Credit & Liabilities", keywords: "credit liabilities loans cards debt", tab: "credit" },
    { id: "nav-cc", type: "nav", icon: <CreditCard size={16} />, label: "Credit Cards", keywords: "credit cards outstanding due limit", tab: "credit", subTab: "cc" },
    { id: "nav-prepaid", type: "nav", icon: <Wallet size={16} />, label: "Prepaid Cards", keywords: "prepaid cards wallet balance", tab: "credit", subTab: "prepaid" },
    { id: "nav-loans-taken", type: "nav", icon: <ArrowLeft size={16} />, label: "Loans Taken", keywords: "loans taken emi home car personal", tab: "credit", subTab: "taken" },
    { id: "nav-loans-given", type: "nav", icon: <ArrowRight size={16} />, label: "Loans Given", keywords: "loans given lent", tab: "credit", subTab: "given" },
    { id: "nav-borrowed", type: "nav", icon: <User size={16} />, label: "Borrowed From People", keywords: "borrowed from people informal debt", tab: "credit", subTab: "borrowed" },
    { id: "nav-lent", type: "nav", icon: <IndianRupee size={16} />, label: "Lent To People", keywords: "lent to people informal credit", tab: "credit", subTab: "lent" },
    { id: "nav-optimizer", type: "nav", icon: <Sparkles size={16} />, label: "Payoff Optimizer", keywords: "payoff optimizer debt strategy snowball", tab: "credit", subTab: "optimizer" },

    // Planning & Spends
    { id: "nav-tax", type: "nav", icon: <Calculator size={16} />, label: "Tax Vault", keywords: "tax vault 80c deductions itr filing", tab: "tax" },
    { id: "nav-sip", type: "nav", icon: <Activity size={16} />, label: "SIP Tracker", keywords: "sip tracker systematic investment plan monthly", tab: "sip" },
    { id: "nav-insurance", type: "nav", icon: <Heart size={16} />, label: "Insurance", keywords: "insurance health life term lic premium", tab: "insurance" },
    { id: "nav-budget", type: "nav", icon: <Wallet size={16} />, label: "Budgeting", keywords: "budget budgeting expenses spending", tab: "budget" },
    { id: "nav-rental", type: "nav", icon: <Building2 size={16} />, label: "Rental Details", keywords: "rental rent tenant property lease", tab: "rental" },
    { id: "nav-subs", type: "nav", icon: <Repeat size={16} />, label: "Subscriptions", keywords: "subscriptions recurring netflix spotify ott", tab: "subs" },

    // System
    { id: "nav-reminders", type: "nav", icon: <Bell size={16} />, label: "Reminders & Alerts", keywords: "reminders alerts notifications due", tab: "reminders" },
    { id: "nav-calculators", type: "nav", icon: <Hash size={16} />, label: "Financial Calculators", keywords: "calculators emi sip fd compound interest", tab: "calculators" },
    { id: "nav-settings", type: "nav", icon: <Settings size={16} />, label: "Settings", keywords: "settings preferences theme export import backup", tab: "settings" },
  ];

  const filtered = query.trim()
    ? actions.filter((a) => {
        const q = query.toLowerCase();
        return a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q);
      })
    : actions;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setActiveIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const execute = useCallback(
    (item: CmdItem) => {
      if (item.type === "nav" && item.tab) onNavigate(item.tab, item.subTab);
      if (item.type === "action" && item.action) onAction(item.action);
      onClose();
    },
    [onNavigate, onAction, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        execute(filtered[activeIdx]);
      }
    },
    [filtered, activeIdx, execute],
  );

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          background: "var(--surface-0)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid color-mix(in srgb, var(--t-line) 50%, transparent)",
          boxShadow: "var(--shadow-2xl)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--t-line)",
          }}
        >
          <Search size={20} color="var(--t-muted)" style={{ marginRight: 12 }} />
          <input
            ref={inputRef}
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 18,
              color: "var(--t-ink)",
              boxShadow: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                background: "var(--surface-1)",
                borderRadius: 4,
                color: "var(--t-muted)",
                fontWeight: 600,
              }}
            >
              esc
            </span>
          </div>
        </div>

        <div ref={listRef} style={{ maxHeight: "50vh", overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--t-muted)" }}>
              No commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((act, idx) => (
              <div
                key={act.id}
                onClick={() => execute(act)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  background:
                    idx === activeIdx
                      ? "color-mix(in srgb, var(--t-accent) 8%, transparent)"
                      : "transparent",
                  color: idx === activeIdx ? "var(--t-accent)" : "var(--t-ink)",
                }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <div style={{ color: "var(--t-muted)", display: "flex" }}>{act.icon}</div>
                <div style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>{act.label}</div>
                {act.subTab && (
                  <span style={{ fontSize: 10, color: "var(--t-muted)", opacity: 0.7 }}>
                    Sub-section
                  </span>
                )}
                {!act.subTab && act.type === "nav" && (
                  <span style={{ fontSize: 10, color: "var(--t-muted)" }}>Navigation</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
